package com.artifybharat.android.features.voice.domain.models

/**
 * Represents a single registration field in voice-guided flow
 * Tracks capture state, confidence scores, and validation status
 * 
 * @property id Unique field identifier (e.g., "name", "phone", "craft")
 * @property labelKey i18n resource key for field label
 * @property type Field type for validation rules
 * @property isMandatory Whether field is required for submission
 * @property capturedValue The actual captured value (text)
 * @property voiceAudioPath Local path to recorded audio file
 * @property transcriptionConfidence Confidence score (0.0-1.0) from speech-to-text
 * @property nlpExtractedValue Value extracted via NLP from transcription
 * @property nlpConfidence Confidence score (0.0-1.0) for NLP extraction
 * @property validationError Validation error message if field is invalid
 */
data class RegistrationField(
    val id: String,
    val labelKey: String,
    val type: FieldType,
    val isMandatory: Boolean,
    val capturedValue: String? = null,
    val voiceAudioPath: String? = null,
    val transcriptionConfidence: Float = 0f,
    val nlpExtractedValue: String? = null,
    val nlpConfidence: Float = 0f,
    val validationError: String? = null
) {
    /**
     * Check if field has been captured with acceptable confidence
     */
    val isValid: Boolean
        get() = capturedValue != null && 
                transcriptionConfidence >= 0.70f && 
                validationError == null

    /**
     * Check if confidence is low and requires user review
     */
    val requiresReview: Boolean
        get() = transcriptionConfidence in 0.70f..0.85f

    /**
     * Confidence indicator color level
     * - HIGH: 95%+ (green checkmark)
     * - MEDIUM: 85-94% (yellow warning)
     * - LOW: <85% (red alert)
     */
    val confidenceLevel: ConfidenceLevel
        get() = when {
            transcriptionConfidence >= 0.95f -> ConfidenceLevel.HIGH
            transcriptionConfidence >= 0.85f -> ConfidenceLevel.MEDIUM
            else -> ConfidenceLevel.LOW
        }

    enum class ConfidenceLevel {
        HIGH,
        MEDIUM,
        LOW
    }

    companion object {
        /**
         * Create template fields for voice registration flow
         * Validates: Requirements 6.2
         */
        fun createRegistrationTemplate(): List<RegistrationField> {
            return listOf(
                RegistrationField(
                    id = "name",
                    labelKey = "label_name",
                    type = FieldType.TEXT,
                    isMandatory = true
                ),
                RegistrationField(
                    id = "phone",
                    labelKey = "label_phone",
                    type = FieldType.PHONE,
                    isMandatory = true
                ),
                RegistrationField(
                    id = "pin",
                    labelKey = "label_pin",
                    type = FieldType.PIN,
                    isMandatory = true
                ),
                RegistrationField(
                    id = "craft_type",
                    labelKey = "label_craft",
                    type = FieldType.CRAFT_TYPE,
                    isMandatory = true
                ),
                RegistrationField(
                    id = "experience_years",
                    labelKey = "label_experience",
                    type = FieldType.NUMBER,
                    isMandatory = true
                ),
                RegistrationField(
                    id = "location",
                    labelKey = "label_location",
                    type = FieldType.TEXT,
                    isMandatory = true
                ),
                RegistrationField(
                    id = "pincode",
                    labelKey = "label_pincode",
                    type = FieldType.PINCODE,
                    isMandatory = true
                )
            )
        }
    }
}
