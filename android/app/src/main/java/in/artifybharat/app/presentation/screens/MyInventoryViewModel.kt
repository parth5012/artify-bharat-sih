package `in`.artifybharat.app.presentation.screens

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import `in`.artifybharat.app.core.Result
import `in`.artifybharat.app.data.remote.dto.InventoryItemDto
import `in`.artifybharat.app.domain.repository.CatalogRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed class InventoryUiState {
    object Loading : InventoryUiState()
    data class Success(
        val totalItems: Int,
        val activeListingsCount: Int,
        val draftsCount: Int,
        val items: List<InventoryItemUi>
    ) : InventoryUiState()
    data class Error(val message: String) : InventoryUiState()
}

class MyInventoryViewModel(
    private val catalogRepository: CatalogRepository? = null
) : ViewModel() {

    private val _uiState = MutableStateFlow<InventoryUiState>(InventoryUiState.Loading)
    val uiState: StateFlow<InventoryUiState> = _uiState.asStateFlow()

    init {
        loadInventory()
    }

    fun loadInventory(artisanId: String? = null) {
        viewModelScope.launch {
            _uiState.value = InventoryUiState.Loading
            if (catalogRepository == null) {
                // When repository is not injected, provide clean empty state rather than fabricated data
                _uiState.value = InventoryUiState.Success(
                    totalItems = 0,
                    activeListingsCount = 0,
                    draftsCount = 0,
                    items = emptyList()
                )
                return@launch
            }

            when (val res = catalogRepository.getMyInventory(artisanId)) {
                is Result.Success -> {
                    val data = res.data
                    val total = (data["total_items"] as? Int) ?: 0
                    val active = (data["active_listings_count"] as? Int) ?: 0
                    val drafts = (data["drafts_count"] as? Int) ?: 0
                    @Suppress("UNCHECKED_CAST")
                    val rawItems = (data["inventory"] as? List<InventoryItemDto>) ?: emptyList()
                    val uiItems = rawItems.map { dto ->
                        InventoryItemUi(
                            id = dto.productId,
                            title = dto.title,
                            category = dto.craftCategory,
                            price = dto.finalPrice ?: 0.0,
                            status = dto.status.uppercase(),
                            channels = if (dto.publishedChannels.isNotEmpty()) dto.publishedChannels else listOf("Draft"),
                            passportHash = dto.passportHash ?: "Pending Verification"
                        )
                    }
                    _uiState.value = InventoryUiState.Success(
                        totalItems = total,
                        activeListingsCount = active,
                        draftsCount = drafts,
                        items = uiItems
                    )
                }
                is Result.Error -> {
                    _uiState.value = InventoryUiState.Error(res.message)
                }
                is Result.Loading -> {
                    _uiState.value = InventoryUiState.Loading
                }
            }
        }
    }
}
