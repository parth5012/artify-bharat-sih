package com.artifybharat.android.e2e

import com.artifybharat.android.data.local.entity.DraftEntity
import com.artifybharat.android.data.network.ApiService
import com.artifybharat.android.data.network.NetworkClient
import com.artifybharat.android.data.network.dto.InventoryItemResponseDto
import com.artifybharat.android.data.preferences.UserSession
import com.artifybharat.android.features.home.ArtisanHomeViewModel
import com.artifybharat.android.features.home.toHomeUiState
import com.artifybharat.android.features.products.ProductFilterTab
import com.artifybharat.android.features.products.ProductManagementViewModel
import com.artifybharat.android.features.products.filterManagedProducts
import com.artifybharat.android.features.products.mergeManagedProducts
import com.artifybharat.android.features.profile.ArtisanProfileViewModel
import com.artifybharat.android.features.profile.PROFILE_DIALECTS
import com.artifybharat.android.features.profile.toProfileUiState
import com.artifybharat.android.navigation.BottomNavItems
import com.artifybharat.android.navigation.Screen
import com.artifybharat.android.navigation.resolveStartDestination
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
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
import java.io.IOException
import java.util.concurrent.TimeUnit

/**
 * [Artisan App T6] End-to-end verification across Home / Profile / Products.
 *
 * Pure-JVM integration: real ViewModels (T2/T3/T4) + real mappers + real
 * nav routes (T5), with the Room DAO seam modelled as an in-memory
 * [MutableStateFlow] (same `Flow<List<DraftEntity>>` the DAOs expose) and
 * Retrofit verified against [MockWebServer]. No Android framework, no
 * Main dispatcher — Unconfined scope throughout.
 */
class ArtisanCoreFlowE2ETest {

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

    private fun session(
        name: String = "गौरी देवी (Gauri Devi)",
        mode: String = "solo",
        offlineDemo: Boolean = false,
        onboarded: Boolean = true
    ) = UserSession(
        artisanId = "artisan-demo-01",
        maskedPehchan = "PEH-***-88320",
        artisanName = name,
        clusterName = "Varanasi Handloom Cluster",
        craftCategory = "handloom",
        isVerified = true,
        onboardingMode = mode,
        isOnboarded = onboarded,
        isOfflineDemo = offlineDemo
    )

    private fun draft(
        id: String,
        title: String = "बनारसी साड़ी $id",
        status: String = DraftEntity.STATUS_DRAFT,
        price: Double = 0.0,
        shortcode: String? = null,
        updatedAt: Long = 1L
    ) = DraftEntity(
        localDraftId = id,
        productTitle = title,
        status = status,
        fairRetailPrice = price,
        shortcode = shortcode,
        createdAt = updatedAt,
        updatedAt = updatedAt
    )

    private fun inventoryItem(
        id: String,
        title: String = "Item $id",
        status: String = "active",
        price: Double? = 4200.0
    ) = InventoryItemResponseDto(
        productId = id,
        title = title,
        craftCategory = "handloom",
        status = status,
        finalPrice = price,
        passportHash = "hash-$id",
        enhancedImageUrl = null,
        publishedChannels = emptyList()
    )

    // =====================================================================
    // Test1 — Home flow: session greeting + draft counts + quick actions.
    // =====================================================================
    @Test
    fun test1_homeFlow_sessionDraftCountsAndQuickActions() {
        val drafts = listOf(
            draft("d1", status = DraftEntity.STATUS_SYNCED, price = 4200.0, shortcode = "A7X-9B2", updatedAt = 3L),
            draft("d2", status = DraftEntity.STATUS_SYNCED, price = 1800.0, updatedAt = 2L),
            draft("d3", status = DraftEntity.STATUS_DRAFT, updatedAt = 4L),
            draft("d4", status = DraftEntity.STATUS_QUEUED, updatedAt = 1L)
        )

        // Pure mapper: greeting + counts + earnings + recency.
        val state = toHomeUiState(session(), drafts)
        assertEquals("गौरी देवी (Gauri Devi)", state.artisanName)
        assertEquals("Varanasi Handloom Cluster", state.clusterName)
        assertTrue(state.isVerified)
        assertEquals("solo", state.onboardingMode)
        assertEquals(2, state.activeListingsCount)
        assertEquals(2, state.pendingDraftsCount)
        assertEquals(6000.0, state.estimatedEarnings, 0.01)
        assertEquals(listOf("d3", "d1", "d2", "d4"), state.recentDrafts.map { it.localDraftId })
        assertFalse(state.isOffline)

        // ViewModel reacts to the same Room + session flows.
        val sessionFlow = MutableStateFlow(session())
        val draftsFlow = MutableStateFlow(drafts)
        val vm = ArtisanHomeViewModel(
            userSessionFlow = sessionFlow,
            draftsFlow = draftsFlow,
            externalScope = CoroutineScope(Dispatchers.Unconfined)
        )
        assertEquals(2, vm.uiState.value.activeListingsCount)
        assertEquals(2, vm.uiState.value.pendingDraftsCount)

        // Quick actions: 5-tab BottomNav covers Home + Products + Catalog + Price + Profile.
        assertEquals(5, BottomNavItems.size)
        val routes = BottomNavItems.map { it.route }
        assertEquals(routes.size, routes.toSet().size)
        assertEquals(
            listOf(
                Screen.ArtisanHome.route,
                Screen.ProductManagement.route,
                Screen.VoiceCatalog.route,
                Screen.FairWagePricing.route,
                Screen.ArtisanProfile.route
            ),
            routes
        )
        assertEquals(Screen.ArtisanHome.route, resolveStartDestination(isOnboarded = true))
    }

    // =====================================================================
    // Test2 — Profile flow: dialect update, Solo/SHG toggle, masked DPDP.
    // =====================================================================
    @Test
    fun test2_profileFlow_dialectToggleAndMaskedDpdp() {
        assertEquals(6, PROFILE_DIALECTS.size)
        assertTrue(
            PROFILE_DIALECTS.map { it.code }.containsAll(
                listOf("bhojpuri", "maithili", "awadhi", "khari_boli", "bundeli", "standard_hindi")
            )
        )

        val sessionFlow = MutableStateFlow(session(mode = "solo"))
        var savedDialect: String? = null
        var savedMode: String? = null
        val vm = ArtisanProfileViewModel(
            userSessionFlow = sessionFlow,
            preferredDialectFlow = MutableStateFlow("bhojpuri"),
            payoutUpiMaskedFlow = MutableStateFlow("***@okhdfc"),
            customBaseUrlFlow = MutableStateFlow(null),
            onUpdateDialect = { savedDialect = it },
            onToggleMode = { savedMode = it },
            externalScope = CoroutineScope(Dispatchers.Unconfined)
        )

        // Masked identity never exposes raw PII.
        assertEquals("गौरी देवी (Gauri Devi)", vm.uiState.value.artisanName)
        assertEquals("PEH-***-88320", vm.uiState.value.maskedPehchan)
        assertEquals("***@okhdfc", vm.uiState.value.payoutUpiMasked)
        assertFalse(vm.uiState.value.payoutUpiMasked!!.contains("gauri.devi"))
        assertEquals(NetworkClient.DEFAULT_BASE_URL, vm.uiState.value.effectiveBaseUrl)

        // Dialect update delegates to persistence.
        vm.updateDialect("maithili")
        assertEquals("maithili", savedDialect)

        // Solo -> SHG -> Solo toggle round-trip.
        assertTrue(vm.uiState.value.isSolo)
        vm.toggleOnboardingMode()
        assertEquals("shg", savedMode)
        sessionFlow.value = session(mode = "shg")
        assertFalse(vm.uiState.value.isSolo)
        vm.toggleOnboardingMode()
        assertEquals("solo", savedMode)

        // Defensive mapper: a raw UPI leak is re-masked before exposure.
        val defensive = toProfileUiState(session(), "bhojpuri", "gauri.devi@okhdfc", null)
        assertEquals("***@okhdfc", defensive.payoutUpiMasked)
        assertFalse(defensive.payoutUpiMasked!!.contains("gauri.devi"))
    }

    // =====================================================================
    // Test3 — Products flow: Room drafts + mock-Retrofit inventory,
    // filter tabs, delete, nav intents.
    // =====================================================================
    @Test
    fun test3_productsFlow_roomDraftsFilterDeleteAndNavIntent() = runBlocking {
        // Mock Retrofit: /catalog/my-inventory returns one active + one in-review row.
        val inventoryJson = """
            {
                "total_items": 2,
                "active_listings_count": 1,
                "drafts_count": 0,
                "inventory": [
                    {
                        "product_id": "prod-101",
                        "title": "Banarasi Katan Silk Saree",
                        "craft_category": "handloom",
                        "status": "active",
                        "final_price": 4200.0,
                        "passport_hash": "hash-prod-101",
                        "enhanced_image_url": null,
                        "published_channels": []
                    },
                    {
                        "product_id": "prod-102",
                        "title": "Maheshwari Stole",
                        "craft_category": "handloom",
                        "status": "in_review",
                        "final_price": 1800.0,
                        "passport_hash": null,
                        "enhanced_image_url": null,
                        "published_channels": []
                    }
                ]
            }
        """.trimIndent()
        mockWebServer.enqueue(
            MockResponse().setResponseCode(200)
                .setHeader("Content-Type", "application/json")
                .setBody(inventoryJson)
        )
        val inventoryResp = apiService.getMyInventory("artisan-demo-01")
        assertTrue(inventoryResp.isSuccessful)
        val remoteInventory = inventoryResp.body()!!.inventory
        assertEquals(2, remoteInventory.size)
        assertEquals("/api/v1/catalog/my-inventory?artisan_id=artisan-demo-01", mockWebServer.takeRequest().path)

        // Room drafts (in-memory flow seam) merge with remote inventory.
        val roomDrafts = listOf(
            draft("d1", status = DraftEntity.STATUS_DRAFT, price = 1500.0),
            draft("d2", status = DraftEntity.STATUS_SYNCED, price = 2500.0, shortcode = "A7X-9B2")
        )
        val merged = mergeManagedProducts(roomDrafts, remoteInventory)
        assertEquals(4, merged.size)

        val deleted = mutableListOf<String>()
        val vm = ProductManagementViewModel(
            draftsFlow = MutableStateFlow(roomDrafts),
            artisanIdFlow = MutableStateFlow("artisan-demo-01"),
            fetchInventory = { Result.success(remoteInventory) },
            onDeleteDraft = { deleted.add(it) },
            externalScope = CoroutineScope(Dispatchers.Unconfined)
        )
        assertEquals(4, vm.uiState.value.allProducts.size)
        assertEquals(2, vm.uiState.value.draftsCount)
        assertEquals(2, vm.uiState.value.inventoryCount)

        // Filter tabs slice the merged list.
        vm.selectTab(ProductFilterTab.DRAFTS_ONLY)
        assertEquals(1, vm.uiState.value.filteredProducts.size)
        assertEquals("d1", vm.uiState.value.filteredProducts[0].id)

        vm.selectTab(ProductFilterTab.PUBLISHED)
        val publishedIds = vm.uiState.value.filteredProducts.map { it.id }.toSet()
        assertEquals(setOf("d2", "prod-101"), publishedIds)

        vm.selectTab(ProductFilterTab.IN_REVIEW)
        assertEquals(listOf("prod-102"), vm.uiState.value.filteredProducts.map { it.id })
        assertEquals(4, filterManagedProducts(vm.uiState.value.allProducts, ProductFilterTab.ALL).size)

        // Delete delegates to the repository seam.
        vm.deleteDraft("d1")
        assertEquals(listOf("d1"), deleted)

        // Nav intents: Products tab + passport/print deep routes exist.
        assertEquals("product_management", Screen.ProductManagement.route)
        assertTrue(Screen.DigitalPassport.createRoute("prod-101").startsWith("digital_passport?productId="))
        assertTrue(Screen.ThermalPrint.createRoute("A7X-9B2").contains("A7X-9B2"))
        assertEquals("artisan_profile", Screen.ArtisanProfile.route)
    }

    // =====================================================================
    // Test4 — Offline resilience: Home + Products render cached Room
    // state with zero network.
    // =====================================================================
    @Test
    fun test4_offlineResilience_homeAndProductsRenderCachedWithoutNetwork() {
        val cachedDrafts = listOf(
            draft("d1", status = DraftEntity.STATUS_SYNCED, price = 4200.0, updatedAt = 2L),
            draft("d2", status = DraftEntity.STATUS_DRAFT, updatedAt = 3L),
            draft("d3", status = DraftEntity.STATUS_QUEUED, updatedAt = 1L)
        )

        // Home: offline-demo badge on, cached counts/earnings intact.
        val offlineHome = toHomeUiState(session(offlineDemo = true), cachedDrafts)
        assertTrue(offlineHome.isOffline)
        assertEquals(1, offlineHome.activeListingsCount)
        assertEquals(2, offlineHome.pendingDraftsCount)
        assertEquals(4200.0, offlineHome.estimatedEarnings, 0.01)
        assertEquals(3, offlineHome.recentDrafts.size)
        assertEquals("गौरी देवी (Gauri Devi)", offlineHome.artisanName)

        // Products: inventory fetch throws (no network) — drafts stay visible,
        // Hindi-first error surfaces, loading settles.
        val vm = ProductManagementViewModel(
            draftsFlow = MutableStateFlow(cachedDrafts),
            artisanIdFlow = MutableStateFlow("artisan-demo-01"),
            fetchInventory = { Result.failure(IOException("2G offline")) },
            externalScope = CoroutineScope(Dispatchers.Unconfined)
        )
        vm.refreshInventory()
        assertEquals(3, vm.uiState.value.allProducts.size)
        assertTrue(vm.uiState.value.allProducts.all { it.isDraft })
        assertNotNull(vm.uiState.value.errorMessage)
        assertTrue(vm.uiState.value.errorMessage!!.isNotBlank())
        assertFalse(vm.uiState.value.isLoading)
        vm.selectTab(ProductFilterTab.DRAFTS_ONLY)
        assertEquals(2, vm.uiState.value.filteredProducts.size)

        // Offline never blocks navigation: onboarded session still lands Home.
        assertEquals(Screen.ArtisanHome.route, resolveStartDestination(isOnboarded = true))
        assertNull(vm.uiState.value.allProducts.firstOrNull { !it.isDraft })
    }

    // =====================================================================
    // Test5 — Combined journey: shared session + drafts stay consistent
    // across Home, Products and Profile (incl. mode toggle + new draft).
    // =====================================================================
    @Test
    fun test5_combinedJourney_sharedStateAcrossHomeProductsProfile() {
        val sessionFlow = MutableStateFlow(session(mode = "solo"))
        val draftsFlow = MutableStateFlow(
            listOf(draft("d1", status = DraftEntity.STATUS_SYNCED, price = 4200.0, updatedAt = 1L))
        )

        val homeVm = ArtisanHomeViewModel(
            userSessionFlow = sessionFlow,
            draftsFlow = draftsFlow,
            externalScope = CoroutineScope(Dispatchers.Unconfined)
        )
        val productsVm = ProductManagementViewModel(
            draftsFlow = draftsFlow,
            artisanIdFlow = MutableStateFlow("artisan-demo-01"),
            fetchInventory = { Result.success(listOf(inventoryItem("prod-101"))) },
            externalScope = CoroutineScope(Dispatchers.Unconfined)
        )
        val profileVm = ArtisanProfileViewModel(
            userSessionFlow = sessionFlow,
            preferredDialectFlow = MutableStateFlow("bhojpuri"),
            payoutUpiMaskedFlow = MutableStateFlow(null),
            customBaseUrlFlow = MutableStateFlow(null),
            onToggleMode = { sessionFlow.value = sessionFlow.value.copy(onboardingMode = it) },
            externalScope = CoroutineScope(Dispatchers.Unconfined)
        )

        // Baseline: 1 active listing + 1 remote product across Home/Products.
        assertEquals(1, homeVm.uiState.value.activeListingsCount)
        assertEquals(2, productsVm.uiState.value.allProducts.size)
        assertTrue(profileVm.uiState.value.isSolo)

        // Artisan switches to SHG in Profile → Home + Profile reflect it.
        profileVm.toggleOnboardingMode()
        assertEquals("shg", sessionFlow.value.onboardingMode)
        assertEquals("shg", homeVm.uiState.value.onboardingMode)
        assertFalse(profileVm.uiState.value.isSolo)

        // New voice-cataloged draft lands in Room → Home pending + Products list.
        draftsFlow.value = draftsFlow.value + draft("d2", status = DraftEntity.STATUS_DRAFT, updatedAt = 2L)
        assertEquals(1, homeVm.uiState.value.pendingDraftsCount)
        assertEquals(3, productsVm.uiState.value.allProducts.size)
        assertTrue(productsVm.uiState.value.allProducts.any { it.id == "d2" })
        assertEquals("d2", homeVm.uiState.value.recentDrafts.first().localDraftId)

        // Profile identity stays DPDP-masked end to end.
        assertEquals("PEH-***-88320", profileVm.uiState.value.maskedPehchan)
        assertNull(profileVm.uiState.value.payoutUpiMasked)
    }
}
