package com.artifybharat.android.data.repository

import com.artifybharat.android.data.local.dao.DraftDao
import com.artifybharat.android.data.network.ApiService
import com.artifybharat.android.data.network.dto.FairWagePricingRequestDto
import com.artifybharat.android.data.network.dto.FairWagePricingResponseDto

interface PricingRepository {
    suspend fun calculateFairWagePrice(
        rawMaterialCost: Double,
        laborHours: Double,
        stateCode: String = "HR",
        hourlyWageOverride: Double? = null,
        isGiTagged: Boolean = false,
        craftCategory: String = "handloom",
        complexityScore: Double = 0.5
    ): Result<FairWagePricingResponseDto>

    suspend fun lockPriceToDraft(
        draftId: String,
        fairRetailPrice: Double
    )
}

class PricingRepositoryImpl(
    private val draftDao: DraftDao,
    private val apiService: ApiService
) : PricingRepository {

    override suspend fun calculateFairWagePrice(
        rawMaterialCost: Double,
        laborHours: Double,
        stateCode: String,
        hourlyWageOverride: Double?,
        isGiTagged: Boolean,
        craftCategory: String,
        complexityScore: Double
    ): Result<FairWagePricingResponseDto> {
        return try {
            val payload = FairWagePricingRequestDto(
                rawMaterialCost = rawMaterialCost,
                laborHours = laborHours,
                stateCode = stateCode,
                hourlyWageOverride = hourlyWageOverride,
                isGiTagged = isGiTagged,
                craftCategory = craftCategory,
                complexityScore = complexityScore
            )
            val response = apiService.calculateFairWagePrice(payload)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Pricing calculation error: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun lockPriceToDraft(draftId: String, fairRetailPrice: Double) {
        val draft = draftDao.getDraftById(draftId)
        if (draft != null) {
            draftDao.updateDraft(
                draft.copy(
                    fairRetailPrice = fairRetailPrice,
                    updatedAt = System.currentTimeMillis()
                )
            )
        }
    }
}
