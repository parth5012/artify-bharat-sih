package com.artifybharat.android.navigation

sealed class Screen(
    val route: String,
    val hindiTitle: String,
    val englishTitle: String
) {
    object Splash : Screen(
        route = "splash",
        hindiTitle = "स्वागत",
        englishTitle = "Welcome"
    )

    object Onboarding : Screen(
        route = "onboarding",
        hindiTitle = "कारीगर ऑनबोर्डिंग",
        englishTitle = "Artisan Onboarding"
    )

    object VoiceCatalog : Screen(
        route = "voice_catalog",
        hindiTitle = "आवाज़ से कैटलॉग",
        englishTitle = "Voice Cataloging"
    )

    object AuthenticityStudio : Screen(
        route = "authenticity_studio?draftId={draftId}",
        hindiTitle = "क्राफ्ट स्टूडियो",
        englishTitle = "Authenticity Studio"
    ) {
        fun createRoute(draftId: String) = "authenticity_studio?draftId=$draftId"
    }

    object FairWagePricing : Screen(
        route = "fair_wage_pricing",
        hindiTitle = "उचित पारिश्रमिक मूल्य",
        englishTitle = "Fair Wage Pricing"
    )

    object DigitalPassport : Screen(
        route = "digital_passport?productId={productId}",
        hindiTitle = "डिजिटल विरासत पासपोर्ट",
        englishTitle = "Digital Craft Passport"
    ) {
        fun createRoute(productId: String): String {
            val encoded = java.net.URLEncoder.encode(productId, "UTF-8")
            return "digital_passport?productId=$encoded"
        }
    }

    object ThermalPrint : Screen(
        route = "thermal_print?shortcode={shortcode}",
        hindiTitle = "थर्मल टैग प्रिंटर",
        englishTitle = "Thermal Label Printer"
    ) {
        fun createRoute(shortcode: String): String {
            val encoded = java.net.URLEncoder.encode(shortcode, "UTF-8")
            return "thermal_print?shortcode=$encoded"
        }
    }

    object OfflineSyncQueue : Screen(
        route = "offline_sync_queue",
        hindiTitle = "ऑफ़लाइन सिंक कतार",
        englishTitle = "Offline Sync Queue"
    )

    object ShgCoordinatorHub : Screen(
        route = "shg_coordinator_hub",
        hindiTitle = "एसएचजी समन्वयक केंद्र",
        englishTitle = "SHG Coordinator Hub"
    )

    object DirectMarketplace : Screen(
        route = "direct_marketplace",
        hindiTitle = "हथकरघा हाट",
        englishTitle = "Direct Craft Marketplace"
    )

    // Voice Registration Flow
    object VoiceRegistrationModeSelection : Screen(
        route = "voice_registration_mode",
        hindiTitle = "पंजीकरण मोड",
        englishTitle = "Registration Mode"
    )

    object VoiceRegistrationLanguageSelection : Screen(
        route = "voice_registration_language",
        hindiTitle = "भाषा चुनें",
        englishTitle = "Select Language"
    )

    object VoiceRegistrationFlow : Screen(
        route = "voice_registration_flow",
        hindiTitle = "आवाज़ पंजीकरण",
        englishTitle = "Voice Registration"
    )

    object VoiceRegistrationPreview : Screen(
        route = "voice_registration_preview",
        hindiTitle = "जानकारी की समीक्षा करें",
        englishTitle = "Review Information"
    )
}
