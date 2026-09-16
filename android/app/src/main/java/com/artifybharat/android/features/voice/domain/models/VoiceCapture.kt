package com.artifybharat.android.features.voice.domain.models

import java.io.File

/**
 * Represents a voice recording capture session
 * 
 * @property fieldId The registration field this capture is for
 * @property audioFile Local file containing recorded audio
 * @property durationMs Recording duration in milliseconds
 * @property sampleRate Audio sample rate (typically 16000 Hz)
 * @property ambientNoiseLevel Ambient noise measured in decibels
 * @property timestamp Unix timestamp when recording was captured
 * @property encrypted Whether audio file has been encrypted
 */
data class VoiceCapture(
    val fieldId: String,
    val audioFile: File,
    val durationMs: Long,
    val sampleRate: Int = 16000,
    val ambientNoiseLevel: Float = 0f,
    val timestamp: Long = System.currentTimeMillis(),
    val encrypted: Boolean = false
) {
    /**
     * Check if ambient noise is excessive (>70 dB)
     * Validates: Requirements 12.2
     */
    val isExcessiveNoise: Boolean
        get() = ambientNoiseLevel > 70f

    /**
     * Check if recording duration is within acceptable range
     */
    val isValidDuration: Boolean
        get() = durationMs in 500..30000 // 0.5s to 30s

    /**
     * File size in MB
     */
    val fileSizeMB: Float
        get() = audioFile.length() / (1024f * 1024f)

    /**
     * Check if file size exceeds limit (5 MB)
     * Validates: Requirements 14.4
     */
    val exceedsSizeLimit: Boolean
        get() = fileSizeMB > 5f
}
