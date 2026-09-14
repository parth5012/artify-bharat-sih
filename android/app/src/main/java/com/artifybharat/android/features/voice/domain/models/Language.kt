package com.artifybharat.android.features.voice.domain.models

/**
 * Represents a language supported for voice registration
 * 
 * @property code ISO 639-1 language code (e.g., "hi", "bn", "te")
 * @property nativeName Language name in native script (e.g., "हिन्दी", "বাংলা")
 * @property englishName Language name in English (e.g., "Hindi", "Bengali")
 * @property ttsSupported Whether Text-to-Speech is available for this language
 * @property asrSupported Whether Automatic Speech Recognition is available
 */
data class Language(
    val code: String,
    val nativeName: String,
    val englishName: String,
    val ttsSupported: Boolean = true,
    val asrSupported: Boolean = true
) {
    companion object {
        /**
         * 12 Indian languages supported for voice registration
         * Validates: Requirements 2.1
         */
        val SUPPORTED_LANGUAGES = listOf(
            Language(
                code = "hi",
                nativeName = "हिन्दी",
                englishName = "Hindi"
            ),
            Language(
                code = "bn",
                nativeName = "বাংলা",
                englishName = "Bengali"
            ),
            Language(
                code = "te",
                nativeName = "తెలుగు",
                englishName = "Telugu"
            ),
            Language(
                code = "mr",
                nativeName = "मराठी",
                englishName = "Marathi"
            ),
            Language(
                code = "ta",
                nativeName = "தமிழ்",
                englishName = "Tamil"
            ),
            Language(
                code = "gu",
                nativeName = "ગુજરાતી",
                englishName = "Gujarati"
            ),
            Language(
                code = "kn",
                nativeName = "ಕನ್ನಡ",
                englishName = "Kannada"
            ),
            Language(
                code = "ml",
                nativeName = "മലയാളം",
                englishName = "Malayalam"
            ),
            Language(
                code = "or",
                nativeName = "ଓଡ଼ିଆ",
                englishName = "Odia"
            ),
            Language(
                code = "pa",
                nativeName = "ਪੰਜਾਬੀ",
                englishName = "Punjabi"
            ),
            Language(
                code = "as",
                nativeName = "অসমীয়া",
                englishName = "Assamese"
            ),
            Language(
                code = "ur",
                nativeName = "اردو",
                englishName = "Urdu"
            )
        )

        /**
         * Get language by code
         */
        fun getByCode(code: String): Language? {
            return SUPPORTED_LANGUAGES.find { it.code == code }
        }
    }
}
