package com.artifybharat.android.hardware.audio

import android.annotation.SuppressLint
import android.content.Context
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.io.File
import java.io.FileOutputStream
import java.io.RandomAccessFile
import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.math.log10
import kotlin.math.sqrt

data class AudioRecordingState(
    val isRecording: Boolean = false,
    val durationSeconds: Int = 0,
    val currentRms: Float = 0.0f,
    val ambientDecibels: Float = 0.0f,
    val isExcessiveNoise: Boolean = false, // True if > 65dB
    val recordedFile: File? = null,
    val errorMessage: String? = null
)

class AudioRecorder(private val context: Context) {

    companion object {
        const val SAMPLE_RATE = 16000 // 16kHz for Whisper / IndicTrans2
        const val CHANNEL_CONFIG = AudioFormat.CHANNEL_IN_MONO
        const val AUDIO_FORMAT = AudioFormat.ENCODING_PCM_16BIT
        const val NOISE_THRESHOLD_DB = 65.0f

        fun createWavHeader(pcmDataSize: Long, sampleRate: Int = SAMPLE_RATE, channels: Int = 1): ByteArray {
            val totalDataLen = pcmDataSize + 36
            val byteRate = sampleRate * channels * 2

            val header = ByteBuffer.allocate(44).order(ByteOrder.LITTLE_ENDIAN)
            // RIFF header
            header.put("RIFF".toByteArray(Charsets.US_ASCII))
            header.putInt(totalDataLen.toInt())
            header.put("WAVE".toByteArray(Charsets.US_ASCII))

            // fmt sub-chunk
            header.put("fmt ".toByteArray(Charsets.US_ASCII))
            header.putInt(16) // Sub-chunk size (16 for PCM)
            header.putShort(1) // AudioFormat 1 = PCM
            header.putShort(channels.toShort())
            header.putInt(sampleRate)
            header.putInt(byteRate)
            header.putShort((channels * 2).toShort()) // Block align
            header.putShort(16) // Bits per sample

            // data sub-chunk
            header.put("data".toByteArray(Charsets.US_ASCII))
            header.putInt(pcmDataSize.toInt())

            return header.array()
        }

        fun calculateRmsAndDecibels(buffer: ShortArray, readSize: Int): Pair<Float, Float> {
            if (readSize <= 0) return Pair(0f, 0f)
            var sum = 0.0
            for (i in 0 until readSize) {
                sum += buffer[i] * buffer[i]
            }
            val rms = sqrt(sum / readSize).toFloat()
            // Normalize RMS to 0.0 .. 1.0 (relative to max short 32767)
            val normalizedRms = (rms / 32767.0f).coerceIn(0.0f, 1.0f)
            val db = if (rms > 1.0f) {
                (20.0 * log10((rms / 32767.0) + 1e-6)).toFloat() + 90.0f
            } else {
                0.0f
            }
            return Pair(normalizedRms, db.coerceIn(0.0f, 120.0f))
        }
    }

    private val _state = MutableStateFlow(AudioRecordingState())
    val state: StateFlow<AudioRecordingState> = _state.asStateFlow()

    private var audioRecord: AudioRecord? = null
    private var recordingJob: Job? = null
    private var currentPcmFile: File? = null
    private var currentWavFile: File? = null

    @SuppressLint("MissingPermission")
    fun startRecording(outputFile: File? = null) {
        if (_state.value.isRecording) return

        val minBufSize = AudioRecord.getMinBufferSize(SAMPLE_RATE, CHANNEL_CONFIG, AUDIO_FORMAT)
        val bufferSize = (minBufSize * 2).coerceAtLeast(1024)

        try {
            audioRecord = AudioRecord(
                MediaRecorder.AudioSource.MIC,
                SAMPLE_RATE,
                CHANNEL_CONFIG,
                AUDIO_FORMAT,
                bufferSize
            )

            if (audioRecord?.state != AudioRecord.STATE_INITIALIZED) {
                _state.value = _state.value.copy(errorMessage = "AudioRecord initialization failed.")
                return
            }

            val storageDir = context.filesDir
            currentWavFile = outputFile ?: File(storageDir, "voice_rec_${System.currentTimeMillis()}.wav")
            currentPcmFile = File(storageDir, "temp_rec_${System.currentTimeMillis()}.pcm")

            audioRecord?.startRecording()
            _state.value = AudioRecordingState(isRecording = true)

            recordingJob = CoroutineScope(Dispatchers.IO).launch {
                val pcmOut = FileOutputStream(currentPcmFile)
                val buffer = ShortArray(bufferSize / 2)
                val byteBuffer = ByteBuffer.allocate(bufferSize).order(ByteOrder.LITTLE_ENDIAN)

                var totalSamples = 0L
                val startTime = System.currentTimeMillis()

                try {
                    while (isActive && _state.value.isRecording) {
                        val readCount = audioRecord?.read(buffer, 0, buffer.size) ?: 0
                        if (readCount > 0) {
                            byteBuffer.clear()
                            for (i in 0 until readCount) {
                                byteBuffer.putShort(buffer[i])
                            }
                            pcmOut.write(byteBuffer.array(), 0, readCount * 2)
                            totalSamples += readCount

                            val (rms, db) = calculateRmsAndDecibels(buffer, readCount)
                            val durationSec = ((System.currentTimeMillis() - startTime) / 1000).toInt()

                            _state.value = _state.value.copy(
                                durationSeconds = durationSec,
                                currentRms = rms,
                                ambientDecibels = db,
                                isExcessiveNoise = db > NOISE_THRESHOLD_DB
                            )
                        }
                    }
                } finally {
                    pcmOut.close()
                }
            }
        } catch (e: Exception) {
            _state.value = _state.value.copy(isRecording = false, errorMessage = e.localizedMessage)
        }
    }

    suspend fun stopRecording(): File? = kotlinx.coroutines.withContext(Dispatchers.IO) {
        if (!_state.value.isRecording) return@withContext currentWavFile

        _state.value = _state.value.copy(isRecording = false)

        try {
            audioRecord?.stop()
            recordingJob?.join()
            audioRecord?.release()
            audioRecord = null
        } catch (e: Exception) {
            // Safe cleanup
        }

        // Convert PCM file into standard WAV with 44-byte header
        val pcm = currentPcmFile
        val wav = currentWavFile

        if (pcm != null && pcm.exists() && wav != null) {
            val pcmSize = pcm.length()
            val header = createWavHeader(pcmSize, SAMPLE_RATE, 1)

            val wavOut = FileOutputStream(wav)
            wavOut.write(header)
            pcm.inputStream().use { input ->
                input.copyTo(wavOut)
            }
            wavOut.close()
            pcm.delete() // Clean up raw PCM
        }

        _state.value = _state.value.copy(
            recordedFile = wav
        )
        wav
    }
}
