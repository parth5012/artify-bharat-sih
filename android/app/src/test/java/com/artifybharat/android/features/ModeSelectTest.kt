package com.artifybharat.android.features

import com.artifybharat.android.data.preferences.UserPreferencesDataStore
import com.artifybharat.android.features.onboarding.OnboardingMode
import com.artifybharat.android.features.onboarding.OnboardingStep
import com.artifybharat.android.features.onboarding.OnboardingUiState
import com.artifybharat.android.features.onboarding.SUPPORTED_DIALECTS
import com.artifybharat.android.features.onboarding.next
import com.artifybharat.android.features.onboarding.previous
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Ticket #109 — Mode Select + Voice Bhasha entry.
 * Pure-JVM checks: mode persists (UiState + DataStore key), dialect persists,
 * MODE_SELECT is Step 0 and goToNext/Previous chain has no regression.
 */
class ModeSelectTest {

    @Test
    fun testModeSelectIsFirstStep() {
        assertEquals(OnboardingStep.MODE_SELECT, OnboardingStep.values()[0])
    }

    @Test
    fun testNextFromModeSelectGoesToWelcomeLanguage() {
        assertEquals(OnboardingStep.WELCOME_LANGUAGE, OnboardingStep.MODE_SELECT.next())
    }

    @Test
    fun testPreviousFromWelcomeLanguageGoesToModeSelect() {
        assertEquals(OnboardingStep.MODE_SELECT, OnboardingStep.WELCOME_LANGUAGE.previous())
    }

    @Test
    fun testFullStepChainHasNoRegression() {
        assertEquals(OnboardingStep.IDENTITY_VERIFICATION, OnboardingStep.WELCOME_LANGUAGE.next())
        assertEquals(OnboardingStep.CLUSTER_CONFIRMATION, OnboardingStep.IDENTITY_VERIFICATION.next())
        assertEquals(OnboardingStep.PERMISSIONS_OVERVIEW, OnboardingStep.CLUSTER_CONFIRMATION.next())
        assertEquals(OnboardingStep.COMPLETION, OnboardingStep.PERMISSIONS_OVERVIEW.next())
        assertEquals(OnboardingStep.COMPLETION, OnboardingStep.COMPLETION.next())

        assertEquals(OnboardingStep.WELCOME_LANGUAGE, OnboardingStep.IDENTITY_VERIFICATION.previous())
        assertEquals(OnboardingStep.IDENTITY_VERIFICATION, OnboardingStep.CLUSTER_CONFIRMATION.previous())
        assertEquals(OnboardingStep.CLUSTER_CONFIRMATION, OnboardingStep.PERMISSIONS_OVERVIEW.previous())
        assertEquals(OnboardingStep.PERMISSIONS_OVERVIEW, OnboardingStep.COMPLETION.previous())
        assertEquals(OnboardingStep.MODE_SELECT, OnboardingStep.MODE_SELECT.previous())
    }

    @Test
    fun testDefaultUiStateStartsAtModeSelectWithSoloMode() {
        val state = OnboardingUiState()
        assertEquals(OnboardingStep.MODE_SELECT, state.currentStep)
        assertEquals(OnboardingMode.SOLO, state.onboardingMode)
    }

    @Test
    fun testOnboardingModeValuesAreSoloAndShg() {
        assertEquals("solo", OnboardingMode.SOLO.storageValue)
        assertEquals("shg", OnboardingMode.SHG.storageValue)
    }

    @Test
    fun testModePersistsThroughStateCopy() {
        val state = OnboardingUiState().copy(onboardingMode = OnboardingMode.SHG)
        assertEquals(OnboardingMode.SHG, state.onboardingMode)
        // Switching dialect must not drop the stored mode
        val withDialect = state.copy(selectedDialect = "maithili")
        assertEquals(OnboardingMode.SHG, withDialect.onboardingMode)
        assertEquals("maithili", withDialect.selectedDialect)
    }

    @Test
    fun testDialectPersistsThroughStateCopy() {
        val state = OnboardingUiState().copy(selectedDialect = "awadhi")
        assertEquals("awadhi", state.copy(phone = "9876543210").selectedDialect)
    }

    @Test
    fun testSupportedDialectsHasSixEntries() {
        assertEquals(6, SUPPORTED_DIALECTS.size)
        val codes = SUPPORTED_DIALECTS.map { it.code }
        assertEquals(6, codes.toSet().size)
        assertTrue(codes.containsAll(listOf("bhojpuri", "maithili", "awadhi", "marwari", "hindi", "english")))
    }

    @Test
    fun testDataStoreOnboardingModeKeyName() {
        assertEquals("onboarding_mode", UserPreferencesDataStore.KEY_ONBOARDING_MODE.name)
    }
}
