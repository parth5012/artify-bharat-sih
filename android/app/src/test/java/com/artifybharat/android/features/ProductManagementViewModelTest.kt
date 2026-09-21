package com.artifybharat.android.features

import com.artifybharat.android.data.local.entity.DraftEntity
import com.artifybharat.android.data.network.dto.InventoryItemResponseDto
import com.artifybharat.android.features.products.ProductFilterTab
import com.artifybharat.android.features.products.ProductManagementViewModel
import com.artifybharat.android.features.products.filterManagedProducts
import com.artifybharat.android.features.products.mergeManagedProducts
import com.artifybharat.android.features.products.toManagedProduct
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * [Artisan App T4] Unified Product Management — Room drafts + remote inventory.
 * Pure-JVM: injected flows + Unconfined scope (no Android framework).
 */
class ProductManagementViewModelTest {

    private fun draft(
        id: String,
        title: String = "बनारसी साड़ी $id",
        craft: String = "handloom",
        status: String = DraftEntity.STATUS_DRAFT,
        price: Double = 0.0,
        shortcode: String? = null,
        hash: String? = null
    ) = DraftEntity(
        localDraftId = id,
        productTitle = title,
        craftCategory = craft,
        status = status,
        fairRetailPrice = price,
        shortcode = shortcode,
        passportHash = hash
    )

    private fun inventoryItem(
        id: String,
        title: String = "Item $id",
        craft: String = "handloom",
        status: String = "active",
        price: Double? = 4200.0,
        hash: String? = "hash-$id"
    ) = InventoryItemResponseDto(
        productId = id,
        title = title,
        craftCategory = craft,
        status = status,
        finalPrice = price,
        passportHash = hash,
        enhancedImageUrl = null,
        publishedChannels = emptyList()
    )

    private fun viewModel(
        drafts: List<DraftEntity> = emptyList(),
        inventory: List<InventoryItemResponseDto> = emptyList(),
        onDelete: (MutableList<String>) -> suspend (String) -> Unit = { deleted ->
            { id: String -> deleted.add(id) }
        },
        deleted: MutableList<String> = mutableListOf(),
        inventoryError: Throwable? = null
    ): ProductManagementViewModel {
        val draftsFlow = MutableStateFlow(drafts)
        val artisanFlow = MutableStateFlow<String?>(null)
        return ProductManagementViewModel(
            draftsFlow = draftsFlow,
            artisanIdFlow = artisanFlow,
            fetchInventory = {
                if (inventoryError != null) Result.failure(inventoryError)
                else Result.success(inventory)
            },
            onDeleteDraft = onDelete(deleted),
            externalScope = CoroutineScope(Dispatchers.Unconfined)
        )
    }

    @Test
    fun testDraftMapsToManagedProduct() {
        val p = toManagedProduct(draft("d1", status = DraftEntity.STATUS_DRAFT, price = 1500.0))
        assertEquals("d1", p.id)
        assertTrue(p.isDraft)
        assertEquals("DRAFT", p.status)
        assertEquals(1500.0, p.price, 0.01)
    }

    @Test
    fun testInventoryMapsToManagedProduct() {
        val p = toManagedProduct(inventoryItem("prod-101", status = "active", price = 4200.0))
        assertEquals("prod-101", p.id)
        assertEquals("ACTIVE", p.status)
        assertEquals(4200.0, p.price, 0.01)
    }

    @Test
    fun testMergeCombinesDraftsAndInventory() {
        val merged = mergeManagedProducts(
            drafts = listOf(draft("d1")),
            inventory = listOf(inventoryItem("prod-101"))
        )
        assertEquals(2, merged.size)
        assertTrue(merged.any { it.id == "d1" })
        assertTrue(merged.any { it.id == "prod-101" })
    }

    @Test
    fun testMergeDedupesInventoryWinsOnSameId() {
        val merged = mergeManagedProducts(
            drafts = listOf(draft("same-id", title = "Local", status = DraftEntity.STATUS_DRAFT)),
            inventory = listOf(inventoryItem("same-id", title = "Remote", status = "active"))
        )
        assertEquals(1, merged.size)
        assertEquals("Remote", merged[0].title)
    }

    @Test
    fun testFilterAllShowsEverything() {
        val products = mergeManagedProducts(
            drafts = listOf(draft("d1")),
            inventory = listOf(
                inventoryItem("p1", status = "active"),
                inventoryItem("p2", status = "in_review")
            )
        )
        assertEquals(3, filterManagedProducts(products, ProductFilterTab.ALL).size)
    }

    @Test
    fun testFilterDraftsOnly() {
        val products = mergeManagedProducts(
            drafts = listOf(draft("d1", status = DraftEntity.STATUS_DRAFT)),
            inventory = listOf(
                inventoryItem("p1", status = "active"),
                inventoryItem("p2", status = "draft")
            )
        )
        val filtered = filterManagedProducts(products, ProductFilterTab.DRAFTS_ONLY)
        assertEquals(2, filtered.size)
        assertTrue(filtered.any { it.id == "d1" })
        assertTrue(filtered.any { it.id == "p2" })
    }

    @Test
    fun testFilterPublishedShowsActiveAndSynced() {
        val products = mergeManagedProducts(
            drafts = listOf(
                draft("d1", status = DraftEntity.STATUS_DRAFT),
                draft("d2", status = DraftEntity.STATUS_SYNCED)
            ),
            inventory = listOf(inventoryItem("p1", status = "active"))
        )
        val filtered = filterManagedProducts(products, ProductFilterTab.PUBLISHED)
        assertEquals(2, filtered.size)
        assertTrue(filtered.any { it.id == "d2" })
        assertTrue(filtered.any { it.id == "p1" })
    }

    @Test
    fun testFilterInReviewShowsJuryStatuses() {
        val products = mergeManagedProducts(
            drafts = listOf(draft("d1", status = DraftEntity.STATUS_DRAFT)),
            inventory = listOf(
                inventoryItem("p1", status = "in_review"),
                inventoryItem("p2", status = "in-jury"),
                inventoryItem("p3", status = "active")
            )
        )
        val filtered = filterManagedProducts(products, ProductFilterTab.IN_REVIEW)
        assertEquals(2, filtered.size)
        assertTrue(filtered.any { it.id == "p1" })
        assertTrue(filtered.any { it.id == "p2" })
    }

    @Test
    fun testViewModelExposesMergedStateAndTabFiltering() = runBlocking {
        val vm = viewModel(
            drafts = listOf(draft("d1", status = DraftEntity.STATUS_DRAFT)),
            inventory = listOf(
                inventoryItem("p1", status = "active", price = 4200.0),
                inventoryItem("p2", status = "in_review")
            )
        )
        // Initial auto-refresh merges Room + remote under ALL.
        assertEquals(3, vm.uiState.value.allProducts.size)
        assertEquals(3, vm.uiState.value.filteredProducts.size)

        vm.selectTab(ProductFilterTab.PUBLISHED)
        assertEquals(1, vm.uiState.value.filteredProducts.size)
        assertEquals("p1", vm.uiState.value.filteredProducts[0].id)

        vm.selectTab(ProductFilterTab.DRAFTS_ONLY)
        assertEquals(1, vm.uiState.value.filteredProducts.size)
        assertEquals("d1", vm.uiState.value.filteredProducts[0].id)

        vm.selectTab(ProductFilterTab.IN_REVIEW)
        assertEquals(1, vm.uiState.value.filteredProducts.size)
        assertEquals("p2", vm.uiState.value.filteredProducts[0].id)
    }

    @Test
    fun testDeleteDraftDelegates() = runBlocking {
        val deleted = mutableListOf<String>()
        val vm = viewModel(drafts = listOf(draft("d1")), deleted = deleted)
        vm.deleteDraft("d1")
        assertEquals(listOf("d1"), deleted)
    }

    @Test
    fun testRefreshInventoryFailureSetsError() = runBlocking {
        val vm = viewModel(
            drafts = listOf(draft("d1")),
            inventory = emptyList(),
            inventoryError = Exception("2G offline")
        )
        vm.refreshInventory()
        // Drafts remain visible; error is surfaced Hindi-first.
        assertEquals(1, vm.uiState.value.allProducts.size)
        assertTrue(vm.uiState.value.errorMessage?.isNotBlank() == true)
    }

    @Test
    fun testEmptyDraftsAndInventoryYieldsEmpty() = runBlocking {
        val vm = viewModel()
        assertTrue(vm.uiState.value.allProducts.isEmpty())
        assertTrue(vm.uiState.value.filteredProducts.isEmpty())
        assertNull(vm.uiState.value.errorMessage)
    }
}
