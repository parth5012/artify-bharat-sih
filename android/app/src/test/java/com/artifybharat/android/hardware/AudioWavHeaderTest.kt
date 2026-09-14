package com.artifybharat.android.hardware

import com.artifybharat.android.hardware.audio.AudioRecorder
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.nio.ByteBuffer
import java.nio.ByteOrder

class AudioWavHeaderTest {

    @Test
    fun testWavHeaderFormatAndByteCounts() {
        val pcmDataSize = 32000L // 1 second of 16kHz 16-bit mono
        val header = AudioRecorder.createWavHeader(pcmDataSize, sampleRate = 16000, channels = 1)

        assertEquals(44, header.size)

        val bb = ByteBuffer.wrap(header).order(ByteOrder.LITTLE_ENDIAN)

        // RIFF header
        val riff = ByteArray(4)
        bb.get(riff)
        assertEquals("RIFF", String(riff, Charsets.US_ASCII))

        val totalDataLen = bb.getInt()
        assertEquals((pcmDataSize + 36).toInt(), totalDataLen)

        val wave = ByteArray(4)
        bb.get(wave)
        assertEquals("WAVE", String(wave, Charsets.US_ASCII))

        // fmt chunk
        val fmt = ByteArray(4)
        bb.get(fmt)
        assertEquals("fmt ", String(fmt, Charsets.US_ASCII))

        val subchunk1Size = bb.getInt()
        assertEquals(16, subchunk1Size)

        val audioFormat = bb.getShort()
        assertEquals(1, audioFormat.toInt()) // PCM = 1

        val numChannels = bb.getShort()
        assertEquals(1, numChannels.toInt())

        val sampleRate = bb.getInt()
        assertEquals(16000, sampleRate)

        val byteRate = bb.getInt()
        assertEquals(32000, byteRate) // 16000 * 1 * 2

        val blockAlign = bb.getShort()
        assertEquals(2, blockAlign.toInt())

        val bitsPerSample = bb.getShort()
        assertEquals(16, bitsPerSample.toInt())

        // data chunk
        val data = ByteArray(4)
        bb.get(data)
        assertEquals("data", String(data, Charsets.US_ASCII))

        val subchunk2Size = bb.getInt()
        assertEquals(pcmDataSize.toInt(), subchunk2Size)
    }

    @Test
    fun testRmsAndDecibelsCalculation() {
        // Silence test
        val silence = ShortArray(100) { 0 }
        val (rmsSilence, dbSilence) = AudioRecorder.calculateRmsAndDecibels(silence, 100)
        assertEquals(0.0f, rmsSilence, 0.001f)
        assertEquals(0.0f, dbSilence, 0.001f)

        // Full scale sine wave / maximum amplitude test
        val maxWave = ShortArray(100) { 32767 }
        val (rmsMax, dbMax) = AudioRecorder.calculateRmsAndDecibels(maxWave, 100)
        assertEquals(1.0f, rmsMax, 0.01f)
        assertTrue(dbMax > 80.0f)

        // Normal spoken voice buffer
        val voice = ShortArray(100) { (it % 10 * 1000).toShort() }
        val (rmsVoice, dbVoice) = AudioRecorder.calculateRmsAndDecibels(voice, 100)
        assertTrue(rmsVoice > 0.0f && rmsVoice < 1.0f)
        assertTrue(dbVoice in 40.0f..85.0f)
    }
}
