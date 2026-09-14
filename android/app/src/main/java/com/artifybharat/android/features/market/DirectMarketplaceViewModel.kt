package com.artifybharat.android.features.market

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.artifybharat.android.data.local.AppDatabase
import com.artifybharat.android.data.network.NetworkClient
import com.artifybharat.android.data.preferences.UserPreferencesDataStore
import com.artifybharat.android.data.repository.JuryRepository
import com.artifybharat.android.data.repository.JuryRepositoryImpl
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class MarketProductItem(
    val productId: String,
    val title: String,
    val craftCategory: String,
    val artisanName: String,
    val clusterName: String,
    val maskedPehchan: String,
    val price: Double,
    val shortcode: String,
    val isGiCertified: Boolean = true
)

data class DirectMarketplaceUiState(
    val products: List<MarketProductItem> = emptyList(),
    val purchaseSuccessMessage: String? = null,
    val reportSuccessMessage: String? = null,
    val isReportingFake: Boolean = false
)

class DirectMarketplaceViewModel(application: Application) : AndroidViewModel(application) {

    private val database = AppDatabase.getInstance(application)
    private val preferences = UserPreferencesDataStore(application)
    private val apiService = NetworkClient.createApiService(
        okHttpClient = NetworkClient.createOkHttpClient(preferences)
    )
    private val juryRepository: JuryRepository = JuryRepositoryImpl(
        juryDao = database.juryDao(),
        apiService = apiService
    )

    private val _uiState = MutableStateFlow(DirectMarketplaceUiState())
    val uiState: StateFlow<DirectMarketplaceUiState> = _uiState.asStateFlow()

    init {
        loadCatalogFeed()
    }

    private fun loadCatalogFeed() {
        val sampleFeed = listOf(
            MarketProductItem(
                productId = "prod-var-01",
                title = "Handwoven Banarasi Katan Silk Brocade Saree",
                craftCategory = "Handloom Textile",
                artisanName = "Gauri Devi",
                clusterName = "Varanasi Handloom Cluster",
                maskedPehchan = "PEH-***-88320",
                price = 4200.0,
                shortcode = "A7X-9B2",
                isGiCertified = true
            ),
            MarketProductItem(
                productId = "prod-bar-02",
                title = "Traditional Barmer Mirror-Work Dupatta",
                craftCategory = "Handicraft Textile",
                artisanName = "Santosh Bai",
                clusterName = "Barmer Applique Cluster",
                maskedPehchan = "PEH-***-10294",
                price = 3850.0,
                shortcode = "B3K-8Y1",
                isGiCertified = true
            )
        )

        _uiState.value = _uiState.value.copy(products = sampleFeed)
    }

    fun initiateDirectBuy(productId: String) {
        val product = _uiState.value.products.find { it.productId == productId } ?: return
        _uiState.value = _uiState.value.copy(
            purchaseSuccessMessage = "UPI ऑर्डर तैयार: ₹${String.format("%.0f", product.price)} (100% राशि सीधे शिल्पकार जन-धन खाते में सुरक्षित एस्क्रो के तहत भेजी जाएगी)।"
        )
    }

    fun reportCounterfeit(shortcode: String, reason: String) {
        viewModelScope.launch {
            val result = juryRepository.reportCounterfeit(
                shortcodeOrHash = shortcode,
                reason = reason
            )
            if (result.isSuccess) {
                _uiState.value = _uiState.value.copy(
                    reportSuccessMessage = "शिकायत दर्ज की गई। MoSJE ऑडिट और 3-कारीगर समिति को जांच हेतु प्रेषित।"
                )
            }
        }
    }
}
