package com.artifybharat.android.features.products

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.artifybharat.android.data.local.AppDatabase
import com.artifybharat.android.data.local.entity.DraftEntity
import com.artifybharat.android.data.network.NetworkClient
import com.artifybharat.android.data.network.dto.InventoryItemResponseDto
import com.artifybharat.android.data.preferences.UserPreferencesDataStore
import com.artifybharat.android.data.repository.CatalogRepository
import com.artifybharat.android.data.repository.CatalogRepositoryImpl
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch

/**
 * [Artisan App T4] Unified Product Management — Room drafts + remote inventory.
 *
 * Digital Heritage Passport + Fair Wage Floor: every card surfaces price ₹
 * (Fair Wage) and shortcode pill (A7X-9B2) with passport/print/edit actions.
 * Hindi-first, MVVM Clean, StateFlow. No nav-graph restructure (T5 owns that).
 */
enum class ProductFilterTab(
    val hindiTitle: String,
    val englishTitle: String
) {
    ALL("सभी उत्पाद", "All Products"),
    DRAFTS_ONLY("ड्राफ्ट", "Drafts"),
    PUBLISHED("सक्रिय", "Active"),
    IN_REVIEW("समीक्षा में", "In Review")
}

/** Unified row: Room draft (isDraft=true) or remote inventory item. */
data class ManagedProduct(
    val id: String,
    val title: String,
    val craftCategory: String,
    /** Normalized uppercase status: DRAFT / SYNCED / ACTIVE / IN_REVIEW / FAILED ... */
    val status: String,
    /** Fair Wage retail price ₹ (0.0 when not yet priced). */
    val price: Double,
    val shortcode: String?,
    val passportHash: String?,
    val isDraft: Boolean,
    val imageUrl: String? = null
)

data class ProductManagementUiState(
    val allProducts: List<ManagedProduct> = emptyList(),
    val selectedTab: ProductFilterTab = ProductFilterTab.ALL,
    val filteredProducts: List<ManagedProduct> = emptyList(),
    val isLoading: Boolean = false,
    val errorMessage: String? = null,
    val draftsCount: Int = 0,
    val inventoryCount: Int = 0
)

/** Normalized statuses for the four filter tabs (uppercase, '-' -> '_'). */
private val DRAFT_STATUSES = setOf("DRAFT", "QUEUED", "FAILED", "SYNCING")
private val PUBLISHED_STATUSES = setOf("ACTIVE", "PUBLISHED", "SYNCED", "LIVE")
private val IN_REVIEW_STATUSES =
    setOf("IN_REVIEW", "IN_JURY", "REVIEW", "JURY", "PENDING", "CONFLICT")

/** Normalizes backend/Room status to uppercase underscore form. */
fun normalizeProductStatus(raw: String): String =
    raw.trim().lowercase().replace('-', '_').uppercase()

fun toManagedProduct(draft: DraftEntity): ManagedProduct = ManagedProduct(
    id = draft.localDraftId,
    title = draft.productTitle,
    craftCategory = draft.craftCategory,
    status = normalizeProductStatus(draft.status),
    price = draft.fairRetailPrice,
    shortcode = draft.shortcode,
    passportHash = draft.passportHash,
    isDraft = true,
    imageUrl = draft.finalPhotoPath ?: draft.wipPhotoPath
)

fun toManagedProduct(dto: InventoryItemResponseDto): ManagedProduct = ManagedProduct(
    id = dto.productId,
    title = dto.title,
    craftCategory = dto.craftCategory,
    status = normalizeProductStatus(dto.status),
    price = dto.finalPrice ?: 0.0,
    shortcode = null,
    passportHash = dto.passportHash,
    isDraft = normalizeProductStatus(dto.status) == "DRAFT",
    imageUrl = dto.enhancedImageUrl
)

/**
 * Merges Room drafts + remote inventory. Remote wins on id collision
 * (offline fallback in CatalogRepository maps drafts to inventory rows
 * with the same local id — the minted remote row is fresher).
 */
fun mergeManagedProducts(
    drafts: List<DraftEntity>,
    inventory: List<InventoryItemResponseDto>
): List<ManagedProduct> {
    val merged = LinkedHashMap<String, ManagedProduct>()
    drafts.forEach { merged[it.localDraftId] = toManagedProduct(it) }
    inventory.forEach { merged[it.productId] = toManagedProduct(it) }
    return merged.values.toList()
}

fun filterManagedProducts(
    products: List<ManagedProduct>,
    tab: ProductFilterTab
): List<ManagedProduct> = when (tab) {
    ProductFilterTab.ALL -> products
    ProductFilterTab.DRAFTS_ONLY -> products.filter { it.status in DRAFT_STATUSES }
    ProductFilterTab.PUBLISHED -> products.filter { it.status in PUBLISHED_STATUSES }
    ProductFilterTab.IN_REVIEW -> products.filter { it.status in IN_REVIEW_STATUSES }
}

class ProductManagementViewModel(
    draftsFlow: Flow<List<DraftEntity>>,
    artisanIdFlow: Flow<String?> = MutableStateFlow(null),
    private val fetchInventory: suspend (String?) -> Result<List<InventoryItemResponseDto>>,
    private val onDeleteDraft: suspend (String) -> Unit = {},
    externalScope: CoroutineScope? = null
) : ViewModel() {

    private val scope = externalScope ?: viewModelScope

    private val draftsCache = MutableStateFlow<List<DraftEntity>>(emptyList())
    private val inventoryCache = MutableStateFlow<List<InventoryItemResponseDto>>(emptyList())
    private val selectedTab = MutableStateFlow(ProductFilterTab.ALL)
    private val isLoading = MutableStateFlow(false)
    private val errorMessage = MutableStateFlow<String?>(null)
    private val currentArtisanId = MutableStateFlow<String?>(null)

    private val _uiState = MutableStateFlow(ProductManagementUiState())
    val uiState: StateFlow<ProductManagementUiState> = _uiState.asStateFlow()

    init {
        scope.launch {
            combine(
                draftsCache,
                inventoryCache,
                selectedTab,
                isLoading,
                errorMessage
            ) { drafts, inventory, tab, loading, error ->
                val merged = mergeManagedProducts(drafts, inventory)
                ProductManagementUiState(
                    allProducts = merged,
                    selectedTab = tab,
                    filteredProducts = filterManagedProducts(merged, tab),
                    isLoading = loading,
                    errorMessage = error,
                    draftsCount = drafts.size,
                    inventoryCount = inventory.size
                )
            }.collect { _uiState.value = it }
        }
        scope.launch {
            draftsFlow.collect {
                draftsCache.value = it
            }
        }
        scope.launch {
            artisanIdFlow.collect {
                currentArtisanId.value = it
            }
        }
        refreshInventory()
    }

    /** Secondary wiring: Room getAllDrafts + API getMyInventory via [CatalogRepository]. */
    constructor(
        repository: CatalogRepository,
        artisanIdFlow: Flow<String?> = MutableStateFlow(null),
        externalScope: CoroutineScope? = null
    ) : this(
        draftsFlow = repository.getAllDrafts(),
        artisanIdFlow = artisanIdFlow,
        fetchInventory = { artisanId -> repository.getMyInventory(artisanId) },
        onDeleteDraft = { draftId -> repository.deleteDraft(draftId) },
        externalScope = externalScope
    )

    fun selectTab(tab: ProductFilterTab) {
        selectedTab.value = tab
    }

    fun refreshInventory() {
        scope.launch {
            isLoading.value = true
            val result = try {
                fetchInventory(currentArtisanId.value)
            } catch (e: Exception) {
                Result.failure(e)
            }
            if (result.isSuccess) {
                inventoryCache.value = result.getOrNull().orEmpty()
                errorMessage.value = null
            } else {
                // 2G-safe: keep Room drafts visible, surface Hindi-first error.
                val detail = result.exceptionOrNull()?.message ?: "सर्वर उपलब्ध नहीं"
                errorMessage.value = "इन्वेंटरी लोड नहीं हुई ($detail) • ड्राफ्ट नीचे देखें"
            }
            isLoading.value = false
        }
    }

    fun deleteDraft(draftId: String) {
        scope.launch { onDeleteDraft(draftId) }
    }

    fun clearError() {
        errorMessage.value = null
    }
}

/** Production wiring: Room drafts + DataStore artisanId + API inventory. DPDP-safe. */
class ProductManagementViewModelFactory(
    private val appContext: Context
) : ViewModelProvider.Factory {

    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        require(modelClass.isAssignableFrom(ProductManagementViewModel::class.java)) {
            "Unknown ViewModel class: ${modelClass.name}"
        }
        val database = AppDatabase.getInstance(appContext)
        val prefs = UserPreferencesDataStore(appContext)
        val apiService = NetworkClient.createApiService(
            okHttpClient = NetworkClient.createOkHttpClient(prefs)
        )
        val repository: CatalogRepository = CatalogRepositoryImpl(
            draftDao = database.draftDao(),
            apiService = apiService
        )
        return ProductManagementViewModel(
            repository = repository,
            artisanIdFlow = prefs.userSessionFlow.map { it.artisanId }
        ) as T
    }
}
