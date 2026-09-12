package com.artifybharat.android.hardware.camera

import android.content.Context
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageCapture
import androidx.camera.core.ImageCaptureException
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.core.content.ContextCompat
import androidx.exifinterface.media.ExifInterface
import androidx.lifecycle.LifecycleOwner
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.suspendCancellableCoroutine
import java.io.File
import java.io.FileOutputStream
import java.nio.ByteBuffer
import java.security.MessageDigest
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

data class CapturedPhotoResult(
    val file: File,
    val sha256Hex: String,
    val isNaturalLight: Boolean,
    val averageLuminance: Double,
    val timestampIso: String,
    val gpsLat: Double? = null,
    val gpsLng: Double? = null
)

class CameraManager(private val context: Context) {

    companion object {
        const val NATURAL_LIGHT_MIN_LUMA = 45.0
        const val NATURAL_LIGHT_MAX_LUMA = 220.0

        fun computeSha256(bytes: ByteArray): String {
            val md = MessageDigest.getInstance("SHA-256")
            val digest = md.digest(bytes)
            return digest.joinToString("") { "%02x".format(it) }
        }

        fun calculateLuminance(imageProxy: ImageProxy): Double {
            val plane = imageProxy.planes[0]
            val buffer = plane.buffer
            val data = ByteArray(buffer.remaining())
            buffer.get(data)

            var sum = 0L
            val pixelCount = data.size
            if (pixelCount == 0) return 0.0

            for (b in data) {
                sum += (b.toInt() and 0xFF)
            }
            return sum.toDouble() / pixelCount
        }

        fun writeExifWatermark(
            file: File,
            sha256Hex: String,
            timestampIso: String,
            gpsLat: Double? = null,
            gpsLng: Double? = null
        ) {
            try {
                val exif = ExifInterface(file)
                val watermarkComment = "ArtifyBharat-WIP-GPS-TS-HASH:$sha256Hex;TS:$timestampIso"
                exif.setAttribute(ExifInterface.TAG_USER_COMMENT, watermarkComment)
                exif.setAttribute(ExifInterface.TAG_DATETIME_ORIGINAL, timestampIso)

                if (gpsLat != null && gpsLng != null) {
                    exif.setLatLong(gpsLat, gpsLng)
                }
                exif.saveAttributes()
            } catch (e: Exception) {
                // Ignore non-fatal EXIF write failures
            }
        }
    }

    private var imageCapture: ImageCapture? = null
    private val _ambientLuminance = MutableStateFlow(100.0)
    val ambientLuminance: StateFlow<Double> = _ambientLuminance.asStateFlow()

    private val _isNaturalLightGood = MutableStateFlow(true)
    val isNaturalLightGood: StateFlow<Boolean> = _isNaturalLightGood.asStateFlow()

    suspend fun bindCamera(
        lifecycleOwner: LifecycleOwner,
        surfaceProvider: Preview.SurfaceProvider
    ): ProcessCameraProvider = suspendCancellableCoroutine { continuation ->
        val cameraProviderFuture = ProcessCameraProvider.getInstance(context)
        cameraProviderFuture.addListener({
            val cameraProvider = cameraProviderFuture.get()

            val preview = Preview.Builder().build().also {
                it.setSurfaceProvider(surfaceProvider)
            }

            imageCapture = ImageCapture.Builder()
                .setCaptureMode(ImageCapture.CAPTURE_MODE_MAXIMIZE_QUALITY)
                .build()

            val imageAnalyzer = ImageAnalysis.Builder()
                .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                .build()
                .also { analysis ->
                    analysis.setAnalyzer(ContextCompat.getMainExecutor(context)) { imageProxy ->
                        val luma = calculateLuminance(imageProxy)
                        _ambientLuminance.value = luma
                        _isNaturalLightGood.value = luma in NATURAL_LIGHT_MIN_LUMA..NATURAL_LIGHT_MAX_LUMA
                        imageProxy.close()
                    }
                }

            val cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA

            try {
                cameraProvider.unbindAll()
                cameraProvider.bindToLifecycle(
                    lifecycleOwner,
                    cameraSelector,
                    preview,
                    imageCapture,
                    imageAnalyzer
                )
                continuation.resume(cameraProvider)
            } catch (e: Exception) {
                continuation.resumeWithException(e)
            }
        }, ContextCompat.getMainExecutor(context))
    }

    suspend fun captureCraftPhoto(
        photoType: String = "WIP",
        gpsLat: Double? = null,
        gpsLng: Double? = null
    ): CapturedPhotoResult = suspendCancellableCoroutine { continuation ->
        val capture = imageCapture
        if (capture == null) {
            continuation.resumeWithException(IllegalStateException("Camera not bound or ImageCapture is null"))
            return@suspendCancellableCoroutine
        }

        val photoFile = File(
            context.filesDir,
            "craft_${photoType.lowercase()}_${System.currentTimeMillis()}.jpg"
        )
        val outputOptions = ImageCapture.OutputFileOptions.Builder(photoFile).build()

        capture.takePicture(
            outputOptions,
            ContextCompat.getMainExecutor(context),
            object : ImageCapture.OnImageSavedCallback {
                override fun onImageSaved(output: ImageCapture.OutputFileResults) {
                    val isoFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).apply {
                        timeZone = TimeZone.getTimeZone("UTC")
                    }
                    val timestamp = isoFormat.format(Date())

                    // 1. Write EXIF provenance watermark & GPS tags first
                    writeExifWatermark(photoFile, "WIP-CRAFT", timestamp, gpsLat, gpsLng)

                    // 2. Compute cryptographic SHA-256 over the final mutated file on disk
                    val finalBytes = photoFile.readBytes()
                    val sha256 = computeSha256(finalBytes)

                    val result = CapturedPhotoResult(
                        file = photoFile,
                        sha256Hex = sha256,
                        isNaturalLight = _isNaturalLightGood.value,
                        averageLuminance = _ambientLuminance.value,
                        timestampIso = timestamp,
                        gpsLat = gpsLat,
                        gpsLng = gpsLng
                    )
                    continuation.resume(result)
                }

                override fun onError(exc: ImageCaptureException) {
                    continuation.resumeWithException(exc)
                }
            }
        )
    }
}
