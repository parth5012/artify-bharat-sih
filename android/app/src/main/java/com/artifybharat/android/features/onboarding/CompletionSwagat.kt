package com.artifybharat.android.features.onboarding

import androidx.compose.ui.graphics.Color
import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow

/**
 * Ticket #113: [Onboarding T5] Swagat completion and accessibility domain logic.
 *
 * Implements:
 * - MoSJE Seal State resolution (Verified vs Unverified-pending)
 * - 56dp minimum touch targets and 20sp+ title typography rules
 * - WCAG AA 4.5:1 color contrast validation
 * - Pending-sync badge rules for offline-queued registrations
 * - TalkBack semantics and content descriptions
 * - Voice-first "Ask Dadi" live readout stub
 */
enum class MoSjeSealState(val label: String, val hindiTitle: String) {
    VERIFIED(
        label = "Verified",
        hindiTitle = "सत्यापित (MoSJE Verified)"
    ),
    UNVERIFIED_PENDING(
        label = "Unverified-pending",
        hindiTitle = "सत्यापन लंबित (Unverified-pending)"
    )
}

object CompletionSwagat {
    const val MIN_TOUCH_TARGET_DP: Int = 56
    const val MIN_TITLE_FONT_SP: Int = 20
    const val MIN_PADDING_DP: Int = 12
    const val CTA_HEIGHT_DP: Int = 56

    const val CTA_TEXT_HINDI: String = "आर्टिफ़ाई भारत में प्रवेश करें"
    const val CTA_SUBTEXT: String = "Enter Artisan Workplace (Artify Bharat pravesh karein)"

    const val ASK_DADI_STUB_TEXT: String = "दादी से पूछें • Ask Dadi"
    const val ASK_DADI_CONTENT_DESCRIPTION: String = "दादी की आवाज़ में सुनें (Ask Dadi voice readout)"

    // Test & Semantics Tags
    const val SEAL_TAG: String = "completion_mosje_seal"
    const val ARTISAN_CARD_TAG: String = "completion_artisan_card"
    const val PENDING_BADGE_TAG: String = "completion_pending_badge"
    const val CTA_BUTTON_TAG: String = "completion_enter_app_cta"
    const val ASK_DADI_READOUT_TAG: String = "completion_ask_dadi_readout"

    /**
     * Resolve MoSJE Seal State:
     * - Verified: Online and verified by Zero-Trust Peer Jury.
     * - Unverified-pending: Unverified online, or currently queued offline.
     */
    fun resolveMoSjeSealState(isVerified: Boolean, queuedOffline: Boolean): MoSjeSealState {
        return if (isVerified && !queuedOffline) {
            MoSjeSealState.VERIFIED
        } else {
            MoSjeSealState.UNVERIFIED_PENDING
        }
    }

    /**
     * TalkBack content description for the MoSJE seal.
     */
    fun getSealContentDescription(state: MoSjeSealState): String {
        return when (state) {
            MoSjeSealState.VERIFIED -> "MoSJE सील: सत्यापित (MoSJE Seal: Verified)"
            MoSjeSealState.UNVERIFIED_PENDING -> "MoSJE सील: सत्यापन लंबित (MoSJE Seal: Unverified-pending)"
        }
    }

    /**
     * Pending badge is visible if queued offline or if there are pending items in the Room queue.
     */
    fun isPendingBadgeVisible(queuedOffline: Boolean, pendingQueueCount: Int): Boolean {
        return queuedOffline || pendingQueueCount > 0
    }

    fun getPendingBadgeText(pendingQueueCount: Int): String {
        val count = pendingQueueCount.coerceAtLeast(1)
        return "ऑफ़लाइन सिंक लंबित ($count) • Pending Sync"
    }

    fun getPendingBadgeContentDescription(pendingQueueCount: Int): String {
        val count = pendingQueueCount.coerceAtLeast(1)
        return "लंबित सिंक बैज: $count आइटम कतार में (Pending sync queue: $count items)"
    }

    fun getCardContentDescription(
        artisanName: String,
        clusterName: String,
        craftCategory: String
    ): String {
        val name = artisanName.ifBlank { "कारीगर (Artisan)" }
        return "कारीगर विवरण कार्ड: नाम $name, क्लस्टर $clusterName, हस्तशिल्प $craftCategory (Artisan card: $name, $clusterName, $craftCategory)"
    }

    fun getCtaContentDescription(): String {
        return "आर्टिफ़ाई भारत में प्रवेश करें (Enter Artisan Workplace)"
    }

    /**
     * Generates welcoming voice readout audio text for the Ask Dadi voice assistant stub.
     */
    fun generateSwagatVoiceReadout(
        artisanName: String,
        clusterName: String,
        craftCategory: String,
        isVerified: Boolean,
        queuedOffline: Boolean
    ): String {
        val name = artisanName.ifBlank { "कारीगर" }
        val statusLine = if (isVerified && !queuedOffline) {
            "आपका MoSJE सत्यापन पूरा हो चुका है।"
        } else {
            "आपका पंजीकरण सुरक्षित है और ऑनलाइन होते ही सत्यापित होगा।"
        }
        return "स्वागत है $name जी! आर्टिफ़ाई भारत में आपका स्वागत है। क्लस्टर: $clusterName, शिल्प: $craftCategory। $statusLine किसी भी सहायता के लिए दादी से पूछें (Ask Dadi)।"
    }

    /**
     * Computes WCAG relative luminance contrast ratio between two colors.
     */
    fun calculateContrastRatio(foreground: Color, background: Color): Double {
        fun channelLuminance(channel: Float): Double {
            return if (channel <= 0.04045f) {
                channel.toDouble() / 12.92
            } else {
                ((channel.toDouble() + 0.055) / 1.055).pow(2.4)
            }
        }

        fun relativeLuminance(color: Color): Double {
            val r = channelLuminance(color.red)
            val g = channelLuminance(color.green)
            val b = channelLuminance(color.blue)
            return 0.2126 * r + 0.7152 * g + 0.0722 * b
        }

        val l1 = relativeLuminance(foreground)
        val l2 = relativeLuminance(background)
        val lighter = max(l1, l2)
        val darker = min(l1, l2)
        return (lighter + 0.05) / (darker + 0.05)
    }
}
