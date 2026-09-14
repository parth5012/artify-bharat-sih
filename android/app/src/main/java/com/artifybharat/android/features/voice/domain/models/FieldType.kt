package com.artifybharat.android.features.voice.domain.models

/**
 * Enum representing types of registration fields
 * Each type has specific validation rules and input patterns
 */
enum class FieldType {
    /**
     * Text fields (name, location) - free-form text input
     */
    TEXT,

    /**
     * Phone number - must be exactly 10 digits starting with 6-9
     */
    PHONE,

    /**
     * PIN/password - 4-6 digits for authentication
     */
    PIN,

    /**
     * Craft type - selected from known craft taxonomy
     */
    CRAFT_TYPE,

    /**
     * Numeric fields (experience years) - integer values
     */
    NUMBER,

    /**
     * Indian postal code - exactly 6 digits
     */
    PINCODE
}
