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
