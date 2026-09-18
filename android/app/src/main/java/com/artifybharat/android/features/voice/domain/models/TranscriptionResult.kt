package com.artifybharat.android.features.voice.domain.models

/**
 * Result from speech-to-text transcription service
 * 
 * @property originalText Transcribed text in selected language script
 * @property transliteratedText Roman/English script representation
 * @property confidence Overall transcription confidence score (0.0-1.0)
 * @property languageDetected Detected language code (should match selected)
 * @property durationMs Audio duration in milliseconds
 * @property segments Individual transcription segments with timestamps
 */
data class TranscriptionResult(
    val originalText: String,
    val transliteratedText: String,
    val confidence: Float,
    val languageDetected: String,
    val durationMs: Long,
    val segments: List<TranscriptionSegment> = emptyList()
) {
    /**
     * Check if transcription confidence is acceptable (>=70%)
     * Validates: Requirements 5.4
     */
    val isAcceptableConfidence: Boolean
        get() = confidence >= 0.70f

    /**
     * Check if sensitive field confidence is acceptable (>=85%)
     * Validates: Requirements 7.6
     */
    val isSensitiveFieldConfidence: Boolean
        get() = confidence >= 0.85f

    /**
     * Average segment confidence
     */
    val averageSegmentConfidence: Float
        get() = if (segments.isEmpty()) confidence
                else segments.map { it.confidence }.average().toFloat()
}

/**
 * Individual segment of transcription with timing information
 * Useful for word-level confidence and playback synchronization
 * 
 * @property text Segment text
 * @property startMs Start time in milliseconds
 * @property endMs End time in milliseconds
 * @property confidence Segment confidence score (0.0-1.0)
 */
data class TranscriptionSegment(
    val text: String,
    val startMs: Long,
    val endMs: Long,
    val confidence: Float
) {
    /**
     * Duration of this segment
     */
    val durationMs: Long
        get() = endMs - startMs
}
