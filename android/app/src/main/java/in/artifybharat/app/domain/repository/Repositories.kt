package `in`.artifybharat.app.domain.repository

import `in`.artifybharat.app.core.Result
import `in`.artifybharat.app.domain.model.Artisan
import `in`.artifybharat.app.domain.model.PricingBreakdown
import `in`.artifybharat.app.domain.model.HeritagePassport
import java.io.File

interface ArtisanRepository {
    suspend fun registerArtisan(name: String, phone: String, pin: String, dialect: String, trifedId: String?): Result<Artisan>
    suspend fun loginArtisan(phone: String, pin: String): Result<String>
}

interface StudioRepository {
    suspend fun enhanceProductPhoto(artisanId: String, imageFile: File): Result<String>
}

interface CatalogRepository {
    suspend fun processVoiceCatalog(productId: String, audioFile: File, dialect: String): Result<Map<String, Any>>
    suspend fun getMyInventory(artisanId: String? = null): Result<Map<String, Any>>
    suspend fun askDadi(query: String, dialect: String): Result<Map<String, Any>>
}

interface PricingRepository {
    suspend fun calculateDynamicPricing(productId: String, rawMaterialCost: Double, laborDays: Double): Result<PricingBreakdown>
}

interface PassportRepository {
    suspend fun issueHeritagePassport(productId: String): Result<HeritagePassport>
}

interface ExportRepository {
    suspend fun exportToChannels(productId: String, channels: List<String>, b2bQuantity: Int): Result<Boolean>
}
