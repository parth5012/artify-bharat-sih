package `in`.artifybharat.app.data.repository

import `in`.artifybharat.app.core.Result
import `in`.artifybharat.app.data.remote.ArtifyApiService
import `in`.artifybharat.app.data.remote.dto.*
import `in`.artifybharat.app.domain.model.*
import `in`.artifybharat.app.domain.repository.*
import java.io.File

class ArtisanRepositoryImpl(private val api: ArtifyApiService) : ArtisanRepository {
    override suspend fun registerArtisan(
        name: String,
        phone: String,
        pin: String,
        dialect: String,
        trifedId: String?
    ): Result<Artisan> {
        return try {
            val response = api.registerArtisan(
                RegisterRequestDto(name, phone, pin, dialect, trifedId)
            )
            if (response.isSuccessful && response.body() != null) {
                val b = response.body()!!
                Result.Success(
                    Artisan(
                        id = b.artisanId,
                        name = b.name,
                        phone = b.phone,
                        primaryDialect = dialect,
                        trifedId = trifedId
                    )
                )
            } else {
                Result.Error("Registration failed: ${response.message()}")
            }
        } catch (e: Exception) {
            Result.Error("Network error: ${e.localizedMessage ?: "Unknown error"}", e)
        }
    }

    override suspend fun loginArtisan(phone: String, pin: String): Result<String> {
        return Result.Success("mock_token")
    }
}

class PricingRepositoryImpl(private val api: ArtifyApiService) : PricingRepository {
    override suspend fun calculateDynamicPricing(
        productId: String,
        rawMaterialCost: Double,
        laborDays: Double
    ): Result<PricingBreakdown> {
        return try {
            val response = api.calculatePricing(
                PricingRequestDto(productId, rawMaterialCost, laborDays)
            )
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                Result.Success(
                    PricingBreakdown(
                        productId = body.productId,
                        rawMaterialCost = body.costBreakdown.rawMaterialCost,
                        laborDays = body.costBreakdown.laborDays,
                        dailyWageRate = body.costBreakdown.dailyWageRate,
                        calculatedFairWage = body.costBreakdown.calculatedFairWage,
                        artisanNetProfit = body.costBreakdown.artisanNetProfit,
                        recommendedPrice = body.recommendedPrice,
                        benchmarkMinPrice = body.benchmarkMinPrice,
                        benchmarkMaxPrice = body.benchmarkMaxPrice
                    )
                )
            } else {
                Result.Error("Pricing calculation failed")
            }
        } catch (e: Exception) {
            Result.Error("Network error: ${e.localizedMessage}", e)
        }
    }
}

class PassportRepositoryImpl(private val api: ArtifyApiService) : PassportRepository {
    override suspend fun issueHeritagePassport(productId: String): Result<HeritagePassport> {
        return try {
            val response = api.issuePassport(PassportIssueRequestDto(productId))
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                Result.Success(
                    HeritagePassport(
                        productId = body.productId,
                        passportHash = body.passportHash,
                        qrCodeDataUri = body.qrCodeDataUri,
                        verificationUrl = body.verificationUrl,
                        issuedAt = body.issuedAt
                    )
                )
            } else {
                Result.Error("Failed to issue passport")
            }
        } catch (e: Exception) {
            Result.Error("Network error: ${e.localizedMessage}", e)
        }
    }
}

class ExportRepositoryImpl(private val api: ArtifyApiService) : ExportRepository {
    override suspend fun exportToChannels(
        productId: String,
        channels: List<String>,
        b2bQuantity: Int
    ): Result<Boolean> {
        return try {
            val response = api.exportChannels(
                ExportRequestDto(productId, channels, b2bQuantity)
            )
            if (response.isSuccessful) {
                Result.Success(true)
            } else {
                Result.Error("Export sync failed")
            }
        } catch (e: Exception) {
            Result.Error("Network error: ${e.localizedMessage}", e)
        }
    }
}

class CatalogRepositoryImpl(private val api: ArtifyApiService) : CatalogRepository {
    override suspend fun processVoiceCatalog(
        productId: String,
        audioFile: File,
        dialect: String
    ): Result<Map<String, Any>> {
        return Result.Success(mapOf("status" to "cataloged"))
    }

    override suspend fun getMyInventory(artisanId: String?): Result<Map<String, Any>> {
        return try {
            val response = api.getMyInventory(artisanId = artisanId)
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                Result.Success(mapOf(
                    "total_items" to body.totalItems,
                    "active_listings_count" to body.activeListingsCount,
                    "drafts_count" to body.draftsCount,
                    "inventory" to body.inventory
                ))
            } else {
                Result.Error("Failed to fetch inventory: ${response.message()}")
            }
        } catch (e: Exception) {
            Result.Error("Network error: ${e.localizedMessage ?: "Unknown error"}", e)
        }
    }

    override suspend fun askDadi(query: String, dialect: String): Result<Map<String, Any>> {
        return try {
            val response = api.askDadi(DadiQueryRequestDto(queryText = query, dialect = dialect))
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                Result.Success(mapOf(
                    "answer_text" to body.answerText,
                    "answer_english" to body.answerEnglish,
                    "dialect" to body.dialect,
                    "audio_response_url" to (body.audioResponseUrl ?: ""),
                    "suggested_actions" to body.suggestedActions,
                    "dadi_tip" to body.dadiTip
                ))
            } else {
                Result.Error("Ask Dadi service error: ${response.message()}")
            }
        } catch (e: Exception) {
            Result.Error("Network error: ${e.localizedMessage ?: "Unknown error"}", e)
        }
    }
}

