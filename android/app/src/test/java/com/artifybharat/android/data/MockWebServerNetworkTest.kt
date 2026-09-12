package com.artifybharat.android.data

import com.artifybharat.android.data.network.ApiService
import com.artifybharat.android.data.network.NetworkClient
import com.artifybharat.android.data.network.dto.DadiQueryRequestDto
import com.artifybharat.android.data.network.dto.DraftItemDto
import com.artifybharat.android.data.network.dto.DraftSyncRequestDto
import com.artifybharat.android.data.network.dto.FairWagePricingRequestDto
import com.artifybharat.android.data.network.dto.PassportIssueRequestDto
import kotlinx.coroutines.runBlocking
import okhttp3.OkHttpClient
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import java.util.concurrent.TimeUnit

class MockWebServerNetworkTest {

    private lateinit var mockWebServer: MockWebServer
    private lateinit var apiService: ApiService

    @Before
    fun setUp() {
        mockWebServer = MockWebServer()
        mockWebServer.start()

        val okHttpClient = OkHttpClient.Builder()
            .connectTimeout(5, TimeUnit.SECONDS)
            .readTimeout(5, TimeUnit.SECONDS)
            .addInterceptor { chain ->
                val req = chain.request().newBuilder()
                    .header("Authorization", "Bearer test_jwt_token_sample")
                    .header("Accept", "application/json")
                    .build()
                chain.proceed(req)
            }
            .build()

        apiService = NetworkClient.createApiService(
            baseUrl = mockWebServer.url("/").toString(),
            okHttpClient = okHttpClient
        )
    }

    @After
    fun tearDown() {
        mockWebServer.shutdown()
    }

    @Test
    fun testAskDadiNetworkCall() = runBlocking {
        val mockResponseJson = """
            {
                "answer_text": "हाथ से बनी वस्तु का मूल्य स्वाभिमान है",
                "answer_english": "The price of handcraft is self-respect",
                "dialect": "hindi",
                "audio_response_url": null,
                "suggested_actions": ["Price Lock"],
                "dadi_tip": "Check minimum wages"
            }
        """.trimIndent()

        mockWebServer.enqueue(
            MockResponse()
                .setResponseCode(200)
                .setHeader("Content-Type", "application/json")
                .setBody(mockResponseJson)
        )

        val response = apiService.askDadi(
            DadiQueryRequestDto(queryText = "लागत कितनी रखे?", dialect = "hindi")
        )

        assertTrue(response.isSuccessful)
        val body = response.body()
        assertNotNull(body)
        assertEquals("hindi", body?.dialect)

        val recordedRequest = mockWebServer.takeRequest()
        assertEquals("/assistant/dadi", recordedRequest.path)
        assertEquals("Bearer test_jwt_token_sample", recordedRequest.getHeader("Authorization"))
    }

    @Test
    fun testCalculateFairWagePriceNetworkCall() = runBlocking {
        val mockResponseJson = """
            {
                "state_code": "HR",
                "state_name": "Haryana",
                "hourly_wage_rate": 85.0,
                "statutory_floor_enforced": true,
                "is_gi_tagged": false,
                "gi_heritage_multiplier": 1.0,
                "statutory_floor_price": 2500.0,
                "fair_retail_price": 3100.0,
                "bulk_wholesale_price": 2800.0,
                "artisan_net_profit": 600.0,
                "direct_realization_percent": 90.0,
                "cost_breakdown": {
                    "raw_materials": 1000.0,
                    "fair_wages": 1500.0,
                    "packaging_and_logistics": 200.0,
                    "artisan_profit": 400.0,
                    "platform_fee": 0.0
                },
                "pricing_formula_summary": "Formula statutory floor verified"
            }
        """.trimIndent()

        mockWebServer.enqueue(
            MockResponse()
                .setResponseCode(200)
                .setHeader("Content-Type", "application/json")
                .setBody(mockResponseJson)
        )

        val response = apiService.calculateFairWagePrice(
            FairWagePricingRequestDto(
                rawMaterialCost = 1000.0,
                laborHours = 16.0,
                stateCode = "HR"
            )
        )

        assertTrue(response.isSuccessful)
        assertEquals(3100.0, response.body()?.fairRetailPrice ?: 0.0, 0.01)

        val request = mockWebServer.takeRequest()
        assertEquals("/pricing/calculate-price", request.path)
        assertTrue(request.body.readUtf8().contains("raw_material_cost"))
    }

    @Test
    fun testPassportIssueAndVerificationNetworkCall() = runBlocking {
        val issueJson = """
            {
                "product_id": "prod-vns-123",
                "passport_hash": "a1b2c3d4e5f6",
                "qr_code_data_uri": "data:image/png;base64,sample",
                "verification_url": "https://artifybharat.gov.in/verify/A7X-9B2",
                "issued_at": "2026-09-13T12:00:00Z"
            }
        """.trimIndent()

        mockWebServer.enqueue(
            MockResponse()
                .setResponseCode(200)
                .setHeader("Content-Type", "application/json")
                .setBody(issueJson)
        )

        val response = apiService.issueHeritagePassport(
            PassportIssueRequestDto(productId = "prod-vns-123")
        )

        assertTrue(response.isSuccessful)
        assertEquals("a1b2c3d4e5f6", response.body()?.passportHash)

        val recorded = mockWebServer.takeRequest()
        assertEquals("/passport/issue", recorded.path)
    }

    @Test
    fun testDraftsSyncNetworkCall() = runBlocking {
        val syncResponseJson = """
            {
                "synced_count": 1,
                "synced_draft_ids": ["draft-uuid-01"],
                "status": "success",
                "message": "1 drafts synced"
            }
        """.trimIndent()

        mockWebServer.enqueue(
            MockResponse()
                .setResponseCode(200)
                .setHeader("Content-Type", "application/json")
                .setBody(syncResponseJson)
        )

        val response = apiService.syncOfflineDrafts(
            DraftSyncRequestDto(
                artisanId = "artisan-demo-01",
                drafts = listOf(DraftItemDto(localDraftId = "draft-uuid-01", productTitle = "Test Craft"))
            )
        )

        assertTrue(response.isSuccessful)
        assertEquals(1, response.body()?.syncedCount)
        assertEquals(listOf("draft-uuid-01"), response.body()?.syncedDraftIds)
    }
}
