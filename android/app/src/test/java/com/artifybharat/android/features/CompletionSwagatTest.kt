package com.artifybharat.android.features

import com.artifybharat.android.features.onboarding.CompletionSwagat
import com.artifybharat.android.features.onboarding.MoSjeSealState
import com.artifybharat.android.features.onboarding.OnboardingMode
import com.artifybharat.android.features.onboarding.OnboardingStep
import com.artifybharat.android.features.onboarding.OnboardingUiState
import com.artifybharat.android.features.onboarding.next
import com.artifybharat.android.ui.theme.KhadiBackground
import com.artifybharat.android.ui.theme.TerracottaPrimary
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Ticket #113: [Onboarding T5] Swagat completion and accessibility pass.
 *
 * TDD: Test-first verification for:
 * 1. MoSJE seal state (Verified vs Unverified-pending)
 * 2. Artisan/Cluster/Craft card semantics & TalkBack labels
 * 3. Pending-sync badge visibility when queuedOffline=true
 * 4. Single CTA "Artify Bharat pravesh karein" with 56dp min touch target
 * 5. A11y standards: 20sp+ Hindi titles, 56dp touch targets, 12dp+ padding, 4.5:1 contrast
 * 6. Live voice readout "Ask Dadi stub"
 * 7. End-to-end tap budget (<10 taps for Hindi-only tester)
 */
class CompletionSwagatTest {

    @Test
    fun testAccessibilityStandardsConstants() {
        // 56dp touch target minimum across all interactive elements
        assertTrue(
            "Touch target must be at least 56dp",
            CompletionSwagat.MIN_TOUCH_TARGET_DP >= 56
        )
        // 20sp+ Hindi titles for low-literacy rural artisans
        assertTrue(
            "Hindi titles must be at least 20sp",
            CompletionSwagat.MIN_TITLE_FONT_SP >= 20
        )
        // 12dp+ minimum padding for cards and containers
        assertTrue(
            "Padding must be at least 12dp",
            CompletionSwagat.MIN_PADDING_DP >= 12
        )
        // 4.5:1 WCAG AA contrast ratio for TerracottaPrimary on KhadiBackground
        val contrastRatio = CompletionSwagat.calculateContrastRatio(
            foreground = TerracottaPrimary,
            background = KhadiBackground
        )
        assertTrue(
            "TerracottaPrimary on KhadiBackground contrast must exceed 4.5:1 (actual: $contrastRatio)",
            contrastRatio >= 4.5
        )
    }

    @Test
    fun testMoSjeSealState_verifiedWhenOnlineAndVerified() {
        val state = CompletionSwagat.resolveMoSjeSealState(
            isVerified = true,
            queuedOffline = false
        )
        assertEquals(MoSjeSealState.VERIFIED, state)
        assertEquals("Verified", state.label)
        assertTrue(state.hindiTitle.contains("सत्यापित"))
        assertTrue(
            "TalkBack content description must mention verified seal",
            CompletionSwagat.getSealContentDescription(state).contains("Verified")
        )
    }

    @Test
    fun testMoSjeSealState_unverifiedPendingWhenUnverifiedOrOffline() {
        // Case 1: Online but unverified peer jury pending
        val unverifiedState = CompletionSwagat.resolveMoSjeSealState(
            isVerified = false,
            queuedOffline = false
        )
        assertEquals(MoSjeSealState.UNVERIFIED_PENDING, unverifiedState)
        assertEquals("Unverified-pending", unverifiedState.label)
        assertTrue(unverifiedState.hindiTitle.contains("सत्यापन लंबित"))

        // Case 2: Offline queued registration (cannot be verified until synced)
        val offlineState = CompletionSwagat.resolveMoSjeSealState(
            isVerified = true,
            queuedOffline = true
        )
        assertEquals(
            "Offline queue must show Unverified-pending seal state until synced",
            MoSjeSealState.UNVERIFIED_PENDING,
            offlineState
        )
        assertTrue(
            CompletionSwagat.getSealContentDescription(offlineState).contains("Unverified-pending")
        )
    }

    @Test
    fun testPendingSyncBadge_visibleWhenQueuedOffline() {
        // When queued offline with count > 0, pending sync badge must be visible
        assertTrue(
            "Badge must be visible when queuedOffline is true",
            CompletionSwagat.isPendingBadgeVisible(queuedOffline = true, pendingQueueCount = 1)
        )

        // When pendingQueueCount > 0 even if queuedOffline flag is false (e.g. restored from Room)
        assertTrue(
            "Badge must be visible when pendingQueueCount > 0",
            CompletionSwagat.isPendingBadgeVisible(queuedOffline = false, pendingQueueCount = 3)
        )

        // When online and no pending queue
        assertFalse(
            "Badge must NOT be visible when online and queue is empty",
            CompletionSwagat.isPendingBadgeVisible(queuedOffline = false, pendingQueueCount = 0)
        )
    }

    @Test
    fun testPendingSyncBadge_labelsAndSemantics() {
        val badgeText = CompletionSwagat.getPendingBadgeText(pendingQueueCount = 2)
        assertTrue("Badge text must contain queue count", badgeText.contains("2"))
        assertTrue("Badge text must contain Hindi label", badgeText.contains("ऑफ़लाइन सिंक लंबित"))

        val contentDesc = CompletionSwagat.getPendingBadgeContentDescription(pendingQueueCount = 2)
        assertTrue("Content description must contain count", contentDesc.contains("2"))
        assertTrue("Content description must describe pending sync", contentDesc.contains("Pending sync"))
    }

    @Test
    fun testArtisanCardContentDescription() {
        val desc = CompletionSwagat.getCardContentDescription(
            artisanName = "पार्वती देवी (Parvati Devi)",
            clusterName = "Varanasi Handloom Cluster",
            craftCategory = "handloom"
        )
        assertTrue("Content description must include artisan name", desc.contains("पार्वती देवी"))
        assertTrue("Content description must include cluster", desc.contains("Varanasi"))
        assertTrue("Content description must include craft category", desc.contains("handloom"))
    }

    @Test
    fun testSingleCtaPraveshKarein() {
        // Single CTA text requirement: "Artify Bharat pravesh karein"
        val ctaText = CompletionSwagat.CTA_TEXT_HINDI
        assertEquals("आर्टिफ़ाई भारत में प्रवेश करें", ctaText)

        val ctaSubtext = CompletionSwagat.CTA_SUBTEXT
        assertTrue(
            "Subtext must indicate entering artisan workplace",
            ctaSubtext.contains("Enter Artisan Workplace") || ctaSubtext.contains("Artify Bharat pravesh karein")
        )

        val ctaContentDesc = CompletionSwagat.getCtaContentDescription()
        assertTrue(
            "CTA content description must include Hindi and English action",
            ctaContentDesc.contains("आर्टिफ़ाई भारत") && ctaContentDesc.contains("Enter")
        )

        // Height must be exactly 56dp
        assertEquals(56, CompletionSwagat.CTA_HEIGHT_DP)
    }

    @Test
    fun testAskDadiLiveVoiceReadoutStub() {
        val readout = CompletionSwagat.generateSwagatVoiceReadout(
            artisanName = "राधा देवी",
            clusterName = "Varanasi Handloom Cluster",
            craftCategory = "handloom",
            isVerified = false,
            queuedOffline = true
        )
        assertTrue("Readout must greet the artisan by name", readout.contains("राधा देवी"))
        assertTrue("Readout must mention Artify Bharat", readout.contains("आर्टिफ़ाई भारत"))
        assertTrue("Readout must mention Ask Dadi stub", readout.contains("दादी") || readout.contains("Dadi"))

        val stubContentDesc = CompletionSwagat.ASK_DADI_CONTENT_DESCRIPTION
        assertNotNull(stubContentDesc)
        assertTrue("Must have descriptive TalkBack label", stubContentDesc.isNotBlank())
    }

    @Test
    fun testEndToEndTapBudget_underTenTapsForHindiTester() {
        // Simulate step transitions from Mode Select to Completion
        var step = OnboardingStep.MODE_SELECT
        var taps = 0

        // Tap 1: Mode selected (Solo) -> advance
        taps++ // Select Solo mode
        taps++ // Tap 'आगे बढ़ें'
        step = step.next()
        assertEquals(OnboardingStep.WELCOME_LANGUAGE, step)

        // Language step: Tap dialect + Tap Continue
        taps++ // Select Bhojpuri
        taps++ // Tap 'आगे बढ़ें'
        step = step.next()
        assertEquals(OnboardingStep.IDENTITY_VERIFICATION, step)

        // Identity step: Primary phone entered -> Tap 'ऐप में प्रवेश करें'
        taps++ // Enter app
        step = step.next()
        assertEquals(OnboardingStep.CLUSTER_CONFIRMATION, step)

        // Cluster step: JIT cluster auto-suggest -> Tap 'हाँ'
        taps++ // Tap Haan
        step = step.next()
        assertEquals(OnboardingStep.COMPLETION, step)

        // Completion step: Single CTA 'आर्टिफ़ाई भारत में प्रवेश करें'
        taps++ // Tap Pravesh Karein
        val finalState = OnboardingUiState(
            currentStep = step,
            isOnboardingComplete = true
        )
        assertTrue(finalState.isOnboardingComplete)

        // Verify total taps <= 10
        assertTrue(
            "Total taps from start to app entrance must be < 10 (actual: $taps)",
            taps < 10
        )
    }

    @Test
    fun testSemanticsTagsConstants() {
        assertEquals("completion_mosje_seal", CompletionSwagat.SEAL_TAG)
        assertEquals("completion_artisan_card", CompletionSwagat.ARTISAN_CARD_TAG)
        assertEquals("completion_pending_badge", CompletionSwagat.PENDING_BADGE_TAG)
        assertEquals("completion_enter_app_cta", CompletionSwagat.CTA_BUTTON_TAG)
        assertEquals("completion_ask_dadi_readout", CompletionSwagat.ASK_DADI_READOUT_TAG)
    }
}
