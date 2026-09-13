package com.artifybharat.android.features

import com.artifybharat.android.data.network.ApiService
import com.artifybharat.android.data.network.NetworkClient
import com.artifybharat.android.data.network.dto.ArtisanIdVerificationRequestDto
import com.artifybharat.android.data.network.dto.ArtisanIdVerificationResponseDto
import com.artifybharat.android.data.network.dto.PinLoginRequestDto
import com.artifybharat.android.data.network.dto.TokenResponseDto
import com.artifybharat.android.data.network.dto.VoiceRegisterRequestDto
import com.artifybharat.android.data.preferences.UserSession
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
            errorMessage = "सर्वर उपलब्ध नहीं है - ऑफ़लाइन पूर्वावलोकन कोड"
        )
        assertFalse("Unsynced passport must not claim to be issued", offlineState.isIssued)
        assertTrue("Offline flag must be true", offlineState.isOffline)
        assertNotNull(offlineState.errorMessage)
    }
}
