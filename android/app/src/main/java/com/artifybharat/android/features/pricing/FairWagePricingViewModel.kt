package com.artifybharat.android.features.pricing

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.artifybharat.android.data.local.AppDatabase
import com.artifybharat.android.data.network.NetworkClient
import com.artifybharat.android.data.network.dto.CostBreakdownDto
import com.artifybharat.android.data.preferences.UserPreferencesDataStore
import com.artifybharat.android.data.repository.PricingRepository
import com.artifybharat.android.data.repository.PricingRepositoryImpl
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class FairWagePricingUiState(
    val draftId: String = "draft-demo-01",
    val rawMaterialCost: Double = 1200.0,
    val laborHours: Double = 28.0,
    val hourlyWageRate: Double = 85.0,
    val statutoryFloorPrice: Double = 3530.0,
    val recommendedMinPrice: Double = 3850.0,
    val recommendedMaxPrice: Double = 4400.0,
    val selectedPrice: Double = 4200.0,
    val artisanNetProfit: Double = 850.0,
    val isGiTagged: Boolean = true,
    val isSubFloorWarning: Boolean = false,
    val costBreakdown: CostBreakdownDto = CostBreakdownDto(
        rawMaterials = 1200.0,
        fairWages = 1800.0,
        packagingAndLogistics = 350.0,
        artisanProfit = 850.0,
        platformFee = 0.0
    ),
    val pricingSummary: String = "MoSJE Statutory Wage Floor + 1.15x GI Tagged Intricacy Premium",
    val isLocked: Boolean = false,
    val isOfflineEstimate: Boolean = false,
    val errorMessage: String? = null
)

class FairWagePricingViewModel(application: Application) : AndroidViewModel(application) {

    private val database = AppDatabase.getInstance(application)
    private val preferences = UserPreferencesDataStore(application)
    private val apiService = NetworkClient.createApiService(
        okHttpClient = NetworkClient.createOkHttpClient(preferences)
    )
    private val pricingRepository: PricingRepository = PricingRepositoryImpl(
        draftDao = database.draftDao(),
        apiService = apiService
    )

    private val _uiState = MutableStateFlow(FairWagePricingUiState())
    val uiState: StateFlow<FairWagePricingUiState> = _uiState.asStateFlow()

    init {
        loadPricingData()
    }

    fun loadPricingData(
        draftId: String = "draft-demo-01",
        rawMaterial: Double = 1200.0,
        hours: Double = 28.0
    ) {
        _uiState.value = _uiState.value.copy(
            draftId = draftId,
            rawMaterialCost = rawMaterial,
            laborHours = hours
        )

        viewModelScope.launch {
            val result = pricingRepository.calculateFairWagePrice(
                rawMaterialCost = rawMaterial,
                laborHours = hours,
                stateCode = "HR",
                isGiTagged = true,
                craftCategory = "handloom"
            )

        if (result.isSuccess) {
            val resp = result.getOrNull()!!
            _uiState.value = _uiState.value.copy(
                hourlyWageRate = resp.hourlyWageRate,
                statutoryFloorPrice = resp.statutoryFloorPrice,
                selectedPrice = resp.fairRetailPrice,
                artisanNetProfit = resp.artisanNetProfit,
                costBreakdown = resp.costBreakdown,
                pricingSummary = resp.pricingFormulaSummary,
                isOfflineEstimate = false,
                errorMessage = null
            )
        } else {
            // Honest offline calculation fallback with disclaimer
            val err = result.exceptionOrNull()?.localizedMessage ?: "Backend unreachable"
            val offlineHourlyWageRate = 580.0 / 8.0 // 72.5
            val offlineFairWage = hours * offlineHourlyWageRate
            val offlineFloor = rawMaterial + offlineFairWage + (rawMaterial * 0.05)
            _uiState.value = _uiState.value.copy(
                hourlyWageRate = offlineHourlyWageRate,
                statutoryFloorPrice = offlineFloor,
                selectedPrice = offlineFloor + 600.0,
                artisanNetProfit = 600.0,
                isOfflineEstimate = true,
                pricingSummary = "ऑफ़लाइन सांविधिक न्यूनतम अनुमान (Offline Statutory Estimate - Backend Disconnected)",
                errorMessage = "सर्वर उपलब्ध नहीं है ($err) • दरें स्थानीय सांविधिक आधार पर आंकी गई हैं।",
                costBreakdown = CostBreakdownDto(
                    rawMaterials = rawMaterial,
                    fairWages = offlineFairWage,
                    packagingAndLogistics = rawMaterial * 0.05,
                    artisanProfit = 600.0
                )
            )
        }
        }
    }

    fun onPriceSliderChange(newPrice: Double) {
        val isSubFloor = newPrice < _uiState.value.statutoryFloorPrice
        val profit = (newPrice - _uiState.value.costBreakdown.rawMaterials - _uiState.value.costBreakdown.fairWages - _uiState.value.costBreakdown.packagingAndLogistics).coerceAtLeast(0.0)

        _uiState.value = _uiState.value.copy(
            selectedPrice = newPrice,
            isSubFloorWarning = isSubFloor,
            artisanNetProfit = profit,
            costBreakdown = _uiState.value.costBreakdown.copy(artisanProfit = profit)
        )
    }

    fun lockPrice(onSuccess: (String) -> Unit) {
        val state = _uiState.value
        // Strict statutory invariant guard (ADR 0004): No distress sale below statutory floor
        if (state.selectedPrice < state.statutoryFloorPrice) {
            _uiState.value = state.copy(
                isSubFloorWarning = true,
                errorMessage = "मूल्य न्यूनतम वैधानिक पारिश्रमिक सीमा (₹${String.format("%.0f", state.statutoryFloorPrice)}) से कम नहीं हो सकता।"
            )
            return
        }

        val draftId = state.draftId
        val finalPrice = state.selectedPrice

        viewModelScope.launch {
            pricingRepository.lockPriceToDraft(draftId, finalPrice)
            _uiState.value = _uiState.value.copy(isLocked = true)
            onSuccess(draftId)
        }
    }
}
