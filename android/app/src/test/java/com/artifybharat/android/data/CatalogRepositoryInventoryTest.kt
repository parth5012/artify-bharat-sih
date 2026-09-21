package com.artifybharat.android.data

import com.artifybharat.android.data.local.dao.DraftDao
import com.artifybharat.android.data.local.entity.DraftEntity
import com.artifybharat.android.data.network.ApiService
import com.artifybharat.android.data.network.NetworkClient
import com.artifybharat.android.data.repository.CatalogRepositoryImpl
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.runBlocking
import okhttp3.OkHttpClient
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import java.util.concurrent.TimeUnit

/**
 * T1: Artisan inventory fetching — remote getMyInventory with offline-safe
 * Room fallback. Uses a fake DraftDao (no Android framework) + MockWebServer
 * backed ApiService.
 */
class CatalogRepositoryInventoryTest {

    private lateinit var mockWebServer: MockWebServer
    private lateinit var apiService: ApiService
    private lateinit var fakeDraftDao: FakeDraftDao

    private class FakeDraftDao : DraftDao {
        private val store = mutableMapOf<String, DraftEntity>()
        private val state = MutableStateFlow<List<DraftEntity>>(emptyList())

        fun seed(vararg drafts: DraftEntity) {
            drafts.forEach { store[it.localDraftId] = it }
            state.value = store.values.toList()
        }

        override suspend fun insertOrUpdateDraft(draft: DraftEntity) {
            store[draft.localDraftId] = draft
            state.value = store.values.toList()
        }

        override suspend fun updateDraft(draft: DraftEntity) {
            store[draft.localDraftId] = draft
            state.value = store.values.toList()
        }

        override suspend fun getDraftById(draftId: String): DraftEntity? = store[draftId]

        override fun observeDraftById(draftId: String): Flow<DraftEntity?> =
            state.map { list -> list.firstOrNull { it.localDraftId == draftId } }

        override fun getAllDrafts(): Flow<List<DraftEntity>> = state

        override suspend fun getPendingSyncDrafts(): List<DraftEntity> =
            store.values.filter { it.status in setOf("QUEUED", "DRAFT", "FAILED") }

        override fun countPendingSyncDrafts(): Flow<Int> = state.map { list ->
            list.count { it.status in setOf("QUEUED", "DRAFT", "FAILED") }
        }

        override suspend fun updateDraftStatus(draftId: String, newStatus: String, timestamp: Long) {
            store[draftId]?.let { store[draftId] = it.copy(status = newStatus, updatedAt = timestamp) }
            state.value = store.values.toList()
        }

        override suspend fun markDraftMinted(draftId: String, hash: String, code: String, timestamp: Long) {
            store[draftId]?.let {
                store[draftId] = it.copy(passportHash = hash, shortcode = code, status = "SYNCED", updatedAt = timestamp)
            }
            state.value = store.values.toList()
        }

        override suspend fun deleteDraftById(draftId: String) {
            store.remove(draftId)
            state.value = store.values.toList()
        }
    }

    @Before
    fun setUp() {
        mockWebServer = MockWebServer()
        mockWebServer.start()
        val okHttpClient = OkHttpClient.Builder()
            .connectTimeout(5, TimeUnit.SECONDS)
            .readTimeout(5, TimeUnit.SECONDS)
            .build()
        apiService = NetworkClient.createApiService(
            baseUrl = mockWebServer.url("/").toString(),
            okHttpClient = okHttpClient
        )
        fakeDraftDao = FakeDraftDao()
    }

    @After
    fun tearDown() {
        mockWebServer.shutdown()
    }

    private fun inventoryJson() = """
        {
            "total_items": 2,
            "active_listings_count": 1,
            "drafts_count": 1,
            "inventory": [
                {
                    "product_id": "prod-101",
                    "title": "Banarasi Katan Silk Saree",
                    "craft_category": "handloom",
                    "status": "active",
                    "final_price": 4200.0,
                    "passport_hash": "hash-101",
                    "enhanced_image_url": null,
                    "published_channels": ["GeM"]
                },
                {
                    "product_id": "prod-102",
                    "title": "Draft Pot",
                    "craft_category": "pottery",
                    "status": "draft",
                    "final_price": null,
                    "passport_hash": null,
                    "enhanced_image_url": null,
                    "published_channels": []
                }
            ]
        }
    """.trimIndent()

    @Test
    fun testGetMyInventoryReturnsRemoteItems() = runBlocking {
        mockWebServer.enqueue(
            MockResponse().setResponseCode(200)
                .setHeader("Content-Type", "application/json")
                .setBody(inventoryJson())
        )

        val repo = CatalogRepositoryImpl(fakeDraftDao, apiService)
        val result = repo.getMyInventory("artisan-demo-01")

        assertTrue(result.isSuccess)
        val items = result.getOrThrow()
        assertEquals(2, items.size)
        assertEquals("prod-101", items[0].productId)
        assertEquals("Banarasi Katan Silk Saree", items[0].title)
        assertEquals(4200.0, items[0].finalPrice ?: 0.0, 0.01)

        val recorded = mockWebServer.takeRequest()
        assertTrue(recorded.path?.startsWith("/catalog/my-inventory") == true)
        assertTrue(recorded.path?.contains("artisan_id=artisan-demo-01") == true)
    }

    @Test
    fun testGetMyInventoryAllowsNullArtisanId() = runBlocking {
        mockWebServer.enqueue(
            MockResponse().setResponseCode(200)
                .setHeader("Content-Type", "application/json")
                .setBody(inventoryJson())
        )

        val repo = CatalogRepositoryImpl(fakeDraftDao, apiService)
        val result = repo.getMyInventory(null)

        assertTrue(result.isSuccess)
        assertEquals(2, result.getOrThrow().size)
        val recorded = mockWebServer.takeRequest()
        assertEquals("/catalog/my-inventory", recorded.path)
    }

    @Test
    fun testGetMyInventoryFallsBackToLocalDraftsOnServerError() = runBlocking {
        mockWebServer.enqueue(MockResponse().setResponseCode(500).setBody("{}"))
        fakeDraftDao.seed(
            DraftEntity(localDraftId = "local-1", productTitle = "Offline Saree", craftCategory = "handloom", status = DraftEntity.STATUS_DRAFT),
            DraftEntity(localDraftId = "local-2", productTitle = "Queued Pot", craftCategory = "pottery", status = DraftEntity.STATUS_QUEUED)
        )

        val repo = CatalogRepositoryImpl(fakeDraftDao, apiService)
        val result = repo.getMyInventory("artisan-demo-01")

        assertTrue(result.isSuccess)
        val items = result.getOrThrow()
        assertEquals(2, items.size)
        assertEquals("local-1", items[0].productId)
        assertEquals("Offline Saree", items[0].title)
    }

    @Test
    fun testGetMyInventoryFailsWhenOfflineWithNoLocalDrafts() = runBlocking {
        mockWebServer.enqueue(MockResponse().setResponseCode(500).setBody("{}"))

        val repo = CatalogRepositoryImpl(fakeDraftDao, apiService)
        val result = repo.getMyInventory("artisan-demo-01")

        assertTrue(result.isFailure)
    }
}
