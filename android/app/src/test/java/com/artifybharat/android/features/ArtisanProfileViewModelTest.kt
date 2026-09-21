package com.artifybharat.android.features

import com.artifybharat.android.data.preferences.UserSession
import com.artifybharat.android.features.profile.ArtisanProfileViewModel
import com.artifybharat.android.features.profile.PROFILE_DIALECTS
import com.artifybharat.android.features.profile.toProfileUiState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * [Artisan App T3] Artisan Profile & Verification — ViewModel + state mapping.
 * Pure-JVM: injected flows + Unconfined scope (no Android framework, no Main dispatcher).
 * DPDP: PII strictly masked — never raw Aadhaar/phone/UPI in exposed state.
 */
class ArtisanProfileViewModelTest {

    private fun session(
        name: String = "गौरी देवी (Gauri Devi)",
        maskedPehchan: String? = "PEH-***-88320",
        cluster: String = "Varanasi Handloom Cluster",
        craft: String = "handloom",
        verified: Boolean = true,
        mode: String = "solo"
    ) = UserSession(
        artisanName = name,
        maskedPehchan = maskedPehchan,
        artisanId = "artisan-demo-01",
        clusterName = cluster,
        craftCategory = craft,
        isVerified = verified,
        onboardingMode = mode,
        isOnboarded = true
    )

    @Test
    fun testMapsMaskedIdentityFields() {
        val state = toProfileUiState(session(), "bhojpuri", "***@okhdfc", null)
        assertEquals("गौरी देवी (Gauri Devi)", state.artisanName)
        assertEquals("PEH-***-88320", state.maskedPehchan)
        assertEquals("Varanasi Handloom Cluster", state.clusterName)
        assertEquals("handloom", state.craftCategory)
        assertTrue(state.isVerified)
        assertEquals("solo", state.onboardingMode)
        assertTrue(state.isSolo)
    }

    @Test
    fun testSupportedDialectsAreSix() {
        val codes = PROFILE_DIALECTS.map { it.code }
        assertEquals(6, codes.size)
        assertTrue(codes.containsAll(listOf("bhojpuri", "maithili", "awadhi", "khari_boli", "bundeli", "standard_hindi")))
    }

    @Test
    fun testDialectUpdateDelegates() = runBlocking {
        var saved: String? = null
        val vm = ArtisanProfileViewModel(
            userSessionFlow = MutableStateFlow(session()),
            preferredDialectFlow = MutableStateFlow("bhojpuri"),
            payoutUpiMaskedFlow = MutableStateFlow(null),
            customBaseUrlFlow = MutableStateFlow(null),
            onUpdateDialect = { saved = it },
            externalScope = CoroutineScope(Dispatchers.Unconfined)
        )
        vm.updateDialect("maithili")
        assertEquals("maithili", saved)
    }

    @Test
    fun testToggleOnboardingModeSwitchesSoloShg() = runBlocking {
        val sessionFlow = MutableStateFlow(session(mode = "solo"))
        var saved: String? = null
        val vm = ArtisanProfileViewModel(
            userSessionFlow = sessionFlow,
            preferredDialectFlow = MutableStateFlow("bhojpuri"),
            payoutUpiMaskedFlow = MutableStateFlow(null),
            customBaseUrlFlow = MutableStateFlow(null),
            onToggleMode = { saved = it },
            externalScope = CoroutineScope(Dispatchers.Unconfined)
        )
        assertTrue(vm.uiState.value.isSolo)
        vm.toggleOnboardingMode()
        assertEquals("shg", saved)

        sessionFlow.value = session(mode = "shg")
        assertFalse(vm.uiState.value.isSolo)
        vm.toggleOnboardingMode()
        assertEquals("solo", saved)
    }

    @Test
    fun testPayoutUpiMaskedNeverExposesRaw() = runBlocking {
        var savedRaw = ""
        val vm = ArtisanProfileViewModel(
            userSessionFlow = MutableStateFlow(session()),
            preferredDialectFlow = MutableStateFlow("bhojpuri"),
            payoutUpiMaskedFlow = MutableStateFlow("***@okhdfc"),
            customBaseUrlFlow = MutableStateFlow(null),
            onUpdatePayoutUpi = { savedRaw = it },
            externalScope = CoroutineScope(Dispatchers.Unconfined)
        )
        vm.updatePayoutUpi("gauri.devi@okhdfc")
        assertEquals("gauri.devi@okhdfc", savedRaw)
        val masked = vm.uiState.value.payoutUpiMasked ?: ""
        assertFalse(masked.contains("gauri.devi"))

        // Defensive mapper: raw leak is re-masked before exposure.
        val defensive = toProfileUiState(session(), "bhojpuri", "gauri.devi@okhdfc", null)
        assertEquals("***@okhdfc", defensive.payoutUpiMasked)
        assertFalse(defensive.payoutUpiMasked!!.contains("gauri.devi"))
    }

    @Test
    fun testLogoutDelegates() = runBlocking {
        var loggedOut = false
        val vm = ArtisanProfileViewModel(
            userSessionFlow = MutableStateFlow(session()),
            preferredDialectFlow = MutableStateFlow("bhojpuri"),
            payoutUpiMaskedFlow = MutableStateFlow(null),
            customBaseUrlFlow = MutableStateFlow(null),
            onLogout = { loggedOut = true },
            externalScope = CoroutineScope(Dispatchers.Unconfined)
        )
        vm.logout()
        assertTrue(loggedOut)
    }

    @Test
    fun testViewModelCollectsDialectAndBaseUrl() = runBlocking {
        val dialectFlow = MutableStateFlow("bhojpuri")
        val baseUrlFlow = MutableStateFlow<String?>(null)
        val vm = ArtisanProfileViewModel(
            userSessionFlow = MutableStateFlow(session()),
            preferredDialectFlow = dialectFlow,
            payoutUpiMaskedFlow = MutableStateFlow(null),
            customBaseUrlFlow = baseUrlFlow,
            externalScope = CoroutineScope(Dispatchers.Unconfined)
        )
        assertEquals("bhojpuri", vm.uiState.value.preferredDialect)

        dialectFlow.value = "awadhi"
        assertEquals("awadhi", vm.uiState.value.preferredDialect)

        baseUrlFlow.value = "http://192.168.1.10:8000/api/v1/"
        assertEquals("http://192.168.1.10:8000/api/v1/", vm.uiState.value.effectiveBaseUrl)
    }
}
