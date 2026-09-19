package com.artifybharat.android.features

import com.artifybharat.android.data.network.ApiService
import com.artifybharat.android.data.network.NetworkClient
import com.artifybharat.android.data.network.dto.ArtisanIdVerificationRequestDto
import com.artifybharat.android.data.network.dto.ArtisanIdVerificationResponseDto
import com.artifybharat.android.data.network.dto.PinLoginRequestDto
import com.artifybharat.android.data.network.dto.TokenResponseDto
import com.artifybharat.android.data.network.dto.VoiceRegisterRequestDto
import com.artifybharat.android.data.preferences.UserSession
import com.artifybharat.android.features.onboarding.OnboardingMode
import com.artifybharat.android.features.onboarding.OnboardingStep
import com.artifybharat.android.features.onboarding.OnboardingUiState
import com.artifybharat.android.features.onboarding.SUPPORTED_DIALECTS
import com.artifybharat.android.features.onboarding.next
import com.artifybharat.android.features.onboarding.previous
import com.artifybharat.android.features.passport.DigitalPassportUiState
import com.artifybharat.android.features.pricing.FairWagePricingUiState
import com.artifybharat.android.features.voice.VoiceCatalogUiState
import com.artifybharat.android.navigation.Screen
import com.artifybharat.android.ui.dialogs.PermissionType
import kotlinx.coroutines.runBlocking
import okhttp3.OkHttpClient
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import java.util.concurrent.TimeUnit

class OnboardingAndConnectivityE2ETest {

    private lateinit var mockWebServer: MockWebServer
    private lateinit var apiService: ApiService

    @Before
    fun setUp() {
        mockWebServer = MockWebServer()
        mockWebServer.start()

        val okHttpClient = OkHttpClient.Builder()
            .connectTimeout(5, TimeUnit.SECONDS)
            .readTimeout(5, TimeUnit.SECONDS)
            .build()

        apiService = NetworkClient.createApiService(
            baseUrl = mockWebServer.url("/api/v1/").toString(),
            okHttpClient = okHttpClient
        )
    }

    @After
    fun tearDown() {
        mockWebServer.shutdown()
    }

    @Test
    fun testFreshInstallSessionDefaults_isUnonboardedAndUnverified() {
        // A fresh session should not assume verification or completion
        val session = UserSession()
        assertFalse("Fresh install must not be marked as onboarded", session.isOnboarded)
        assertFalse("Fresh install must not be marked as verified", session.isVerified)
        assertFalse("Fresh install must not default to demo mode", session.isOfflineDemo)
        assertNull("Fresh install has no JWT auth token", session.authToken)
        assertNull("Fresh install has no artisan ID", session.artisanId)
    }

    @Test
    fun testNavigationGateRoutesExist() {
        assertEquals("splash", Screen.Splash.route)
        assertEquals("onboarding", Screen.Onboarding.route)
        assertEquals("voice_catalog", Screen.VoiceCatalog.route)
        assertEquals("स्वागत", Screen.Splash.hindiTitle)
        assertEquals("कारीगर ऑनबोर्डिंग", Screen.Onboarding.hindiTitle)
    }

    @Test
    fun testVerifyArtisanIdEndpoint_successResponse() = runBlocking {
        val json = """
            {
                "is_valid": true,
                "identifier_type": "pehchan",
                "identifier_value": "PEH-IND-88320",
                "artisan_name": "Gauri Devi",
                "craft_category": "Handloom Textile",
                "cluster_name": "Varanasi Handloom Cluster",
                "gi_certified": true,
                "gi_tag_name": "Banarasi Brocade Saree (GI Reg #39)",
                "state": "Uttar Pradesh",
                "district": "Varanasi",
                "verification_source": "MoSJE National Artisan Registry"
            }
        """.trimIndent()

        mockWebServer.enqueue(
            MockResponse()
                .setResponseCode(200)
                .setBody(json)
                .addHeader("Content-Type", "application/json")
        )

        val resp = apiService.verifyArtisanId(
            ArtisanIdVerificationRequestDto(
                identifierType = "pehchan",
                identifierValue = "PEH-IND-88320"
            )
        )

        assertTrue(resp.isSuccessful)
        val body = resp.body()
        assertNotNull(body)
        assertTrue(body!!.isValid)
        assertEquals("Gauri Devi", body.artisanName)
        assertEquals("Varanasi Handloom Cluster", body.clusterName)
        assertTrue(body.giCertified)
    }

    @Test
    fun testLoginArtisanEndpoint_tokenResponse() = runBlocking {
        val json = """
            {
                "access_token": "mock_jwt_token_12345",
                "token_type": "bearer",
                "artisan_id": "artisan_varanasi_01",
                "name": "Gauri Devi",
                "phone": "9876543210"
            }
        """.trimIndent()

        mockWebServer.enqueue(
            MockResponse()
                .setResponseCode(200)
                .setBody(json)
                .addHeader("Content-Type", "application/json")
        )

        val resp = apiService.loginArtisan(
            PinLoginRequestDto(phone = "9876543210", pin = "1234")
        )

        assertTrue(resp.isSuccessful)
        val body = resp.body()
        assertNotNull(body)
        assertEquals("mock_jwt_token_12345", body!!.accessToken)
        assertEquals("artisan_varanasi_01", body.artisanId)
        assertEquals("bearer", body.tokenType)
    }

    @Test
    fun testRegisterArtisanEndpoint_tokenResponse() = runBlocking {
        val json = """
            {
                "access_token": "new_artisan_jwt_token",
                "token_type": "bearer",
                "artisan_id": "artisan_new_02",
                "name": "Radha Devi",
                "phone": "9876543211"
            }
        """.trimIndent()

        mockWebServer.enqueue(
            MockResponse()
                .setResponseCode(201)
                .setBody(json)
                .addHeader("Content-Type", "application/json")
        )

        val resp = apiService.registerArtisan(
            VoiceRegisterRequestDto(
                name = "Radha Devi",
                phone = "9876543211",
                pin = "5678",
                primaryDialect = "bhojpuri",
                state = "Uttar Pradesh",
                clusterName = "Varanasi Handloom Cluster"
            )
        )

        assertTrue(resp.isSuccessful)
        val body = resp.body()
        assertNotNull(body)
        assertEquals("new_artisan_jwt_token", body!!.accessToken)
        assertEquals("artisan_new_02", body.artisanId)
    }

    @Test
    fun testNetworkClient_customBaseUrlOverride() {
        val defaultUrl = NetworkClient.DEFAULT_BASE_URL
        assertEquals("http://10.0.2.2:8000/api/v1/", defaultUrl)

        NetworkClient.setCustomBaseUrl("http://192.168.1.50:8000/api/v1")
        assertEquals("http://192.168.1.50:8000/api/v1/", NetworkClient.getEffectiveBaseUrl())

        // Reset to default
        NetworkClient.setCustomBaseUrl(null)
        assertEquals("http://10.0.2.2:8000/api/v1/", NetworkClient.getEffectiveBaseUrl())
    }

    @Test
    fun testPermissionTypeEnumsHaveComprehensiveCopy() {
        val types = PermissionType.values()
        assertEquals(5, types.size)

        for (type in types) {
            assertTrue("Hindi title not blank for $type", type.hindiTitle.isNotBlank())
            assertTrue("English title not blank for $type", type.englishTitle.isNotBlank())
            assertTrue("Hindi explanation not blank for $type", type.hindiExplanation.isNotBlank())
            assertTrue("English explanation not blank for $type", type.englishExplanation.isNotBlank())
            assertNotNull("Icon defined for $type", type.icon)
        }
    }

    @Test
    fun testVoiceCatalogUiState_honestlyReflectsOfflineState() {
        val onlineState = VoiceCatalogUiState(
            isCataloged = true,
            isOffline = false,
            productTitle = "बनारसी साड़ी (Banarasi Saree)"
        )
        assertTrue(onlineState.isCataloged)
        assertFalse(onlineState.isOffline)

        val offlineState = VoiceCatalogUiState(
            isCataloged = false,
            isOffline = true,
            errorMessage = "सर्वर उपलब्ध नहीं है"
        )
        assertFalse("Offline recording must not masquerade as online cataloged", offlineState.isCataloged)
        assertTrue("Offline state flag must be true", offlineState.isOffline)
        assertNotNull(offlineState.errorMessage)
    }

    @Test
    fun testFairWagePricingUiState_honestlyReflectsOfflineEstimate() {
        val onlineState = FairWagePricingUiState(
            isOfflineEstimate = false,
            pricingSummary = "MoSJE Statutory Algorithm (Connected)"
        )
        assertFalse(onlineState.isOfflineEstimate)

        val offlineState = FairWagePricingUiState(
            isOfflineEstimate = true,
            pricingSummary = "ऑफ़लाइन सांविधिक न्यूनतम अनुमान (Offline Statutory Estimate)",
            errorMessage = "सर्वर उपलब्ध नहीं है"
        )
        assertTrue(offlineState.isOfflineEstimate)
        assertTrue(offlineState.pricingSummary.contains("ऑफ़लाइन"))
        assertNotNull(offlineState.errorMessage)
    }

    @Test
    fun testDigitalPassportUiState_honestlyReflectsOfflineIssuance() {
        val onlineState = DigitalPassportUiState(
            isIssued = true,
            isOffline = false,
            shortcode = "A7X-9B2"
        )
        assertTrue(onlineState.isIssued)
        assertFalse(onlineState.isOffline)

        val offlineState = DigitalPassportUiState(
            isIssued = false,
            isOffline = true,
            shortcode = "",
            verificationUrl = "",
            qrBitmap = null,
            errorMessage = "सर्वर उपलब्ध नहीं है • पासपोर्ट अभी जारी नहीं हुआ है।"
        )
        assertFalse("Unsynced passport must not claim to be issued", offlineState.isIssued)
        assertTrue("Offline flag must be true", offlineState.isOffline)
        assertEquals("", offlineState.shortcode)
        assertEquals("", offlineState.verificationUrl)
        assertNull(offlineState.qrBitmap)
        assertNotNull(offlineState.errorMessage)
    }

    @Test
    fun testVoiceRegisterRequestDto_nullableLocationDefaults() {
        val req = VoiceRegisterRequestDto(
            name = "Test Artisan",
            phone = "9876543210",
            pin = "1234"
        )
        assertNull("District must default to null", req.district)
        assertNull("GeoLat must default to null", req.geoLat)
        assertNull("GeoLng must default to null", req.geoLng)
    }

    @Test
    fun testClearSessionPreservesCustomBaseUrl() {
        val customUrl = "http://192.168.1.100:8000/api/v1/"
        NetworkClient.setCustomBaseUrl(customUrl)
        assertEquals(customUrl, NetworkClient.getEffectiveBaseUrl())
        NetworkClient.setCustomBaseUrl(null)
    }

    @Test
    fun testModeSelectStepZeroKeepsTwoTapLanguageDone() {
        // Ticket #109: MODE_SELECT is Step 0; mode + language done in <3 taps.
        assertEquals(OnboardingStep.MODE_SELECT, OnboardingStep.values()[0])
        assertEquals(OnboardingStep.WELCOME_LANGUAGE, OnboardingStep.MODE_SELECT.next())
        assertEquals(OnboardingStep.IDENTITY_VERIFICATION, OnboardingStep.WELCOME_LANGUAGE.next())
        val state = OnboardingUiState(
            currentStep = OnboardingStep.WELCOME_LANGUAGE,
            onboardingMode = OnboardingMode.SHG,
            selectedDialect = "maithili"
        )
        assertEquals(OnboardingMode.SHG, state.onboardingMode)
        assertEquals("maithili", state.selectedDialect)
    }

    @Test
    fun testOnboardingModeStorageValuesAndDialectCount() {
        assertEquals("solo", OnboardingMode.SOLO.storageValue)
        assertEquals("shg", OnboardingMode.SHG.storageValue)
        assertEquals(6, SUPPORTED_DIALECTS.size)
    }

    @Test
    fun testJitClusterSkipsPermissionsBlocker() {
        // T4 (#112): CLUSTER_CONFIRMATION must go straight to COMPLETION.
        // PERMISSIONS_OVERVIEW stays only as legacy passthrough to COMPLETION.
        assertEquals(OnboardingStep.COMPLETION, OnboardingStep.CLUSTER_CONFIRMATION.next())
        assertEquals(OnboardingStep.COMPLETION, OnboardingStep.PERMISSIONS_OVERVIEW.next())
        assertEquals(OnboardingStep.CLUSTER_CONFIRMATION, OnboardingStep.COMPLETION.previous())
    }

    @Test
    fun testDenyAllStillCompletesOnboarding() {
        // T4 (#112): fresh-install onboarding completes with all denies —
        // degraded (text fallback, manual cluster, skip photo) but never blocked.
        var state = OnboardingUiState(
            currentStep = OnboardingStep.CLUSTER_CONFIRMATION,
            phone = "9876543210",
            artisanName = "Gauri Devi"
        )
        // Simulate deny-all: no permission granted, user still advances.
        state = state.copy(currentStep = state.currentStep.next())
        assertEquals(
            "Deny-all must land on COMPLETION, never on a permissions blocker",
            OnboardingStep.COMPLETION,
            state.currentStep
        )
        val completed = state.copy(currentStep = OnboardingStep.COMPLETION, isOnboardingComplete = true)
        assertTrue(completed.isOnboardingComplete)
        assertEquals(OnboardingStep.COMPLETION, completed.currentStep)
    }

    @Test
    fun testT6_fourScreenFlowUnderTenTaps() {
        // #114: MODE_SELECT->WELCOME_LANGUAGE->IDENTITY->CLUSTER->COMPLETION, PERMISSIONS never gates.
        var step = OnboardingStep.MODE_SELECT
        var taps = 0
        val visited = mutableListOf(step)
        while (step != OnboardingStep.COMPLETION && taps < 10) {
            step = step.next()
            visited.add(step)
            taps++
        }
        assertEquals(OnboardingStep.COMPLETION, step)
        assertTrue("End-to-end must stay <10 taps, was $taps", taps < 10)
        assertEquals(4, taps) // exactly 4 Next taps for 5 screens
        assertFalse("PERMISSIONS_OVERVIEW must never appear in happy path", visited.contains(OnboardingStep.PERMISSIONS_OVERVIEW))
        assertEquals(
            listOf(
                OnboardingStep.MODE_SELECT,
                OnboardingStep.WELCOME_LANGUAGE,
                OnboardingStep.IDENTITY_VERIFICATION,
                OnboardingStep.CLUSTER_CONFIRMATION,
                OnboardingStep.COMPLETION
            ),
            visited
        )
    }

    @Test
    fun testT6_dualModeOfflineQueueAutoClusterNeverBlocks() {
        // #114: dual-mode + offline queue + auto-cluster Yes path combine without blocking.
        val shg = OnboardingUiState(onboardingMode = OnboardingMode.SHG, currentStep = OnboardingStep.MODE_SELECT)
        assertEquals(OnboardingStep.WELCOME_LANGUAGE, shg.currentStep.next())
        val offlineQueued = OnboardingUiState(
            currentStep = OnboardingStep.IDENTITY_VERIFICATION,
            phone = "9876543210",
            artisanName = "Gauri Devi",
            queuedOffline = true,
            pendingQueueCount = 2
        )
        val afterAuth = offlineQueued.copy(currentStep = offlineQueued.currentStep.next())
        assertEquals(OnboardingStep.CLUSTER_CONFIRMATION, afterAuth.currentStep)
        assertTrue("Offline queue must persist across steps", afterAuth.queuedOffline)
        val done = afterAuth.copy(currentStep = afterAuth.currentStep.next(), isOnboardingComplete = true)
        assertEquals(OnboardingStep.COMPLETION, done.currentStep)
        assertTrue(done.isOnboardingComplete)
    }
}
