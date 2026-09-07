package `in`.artifybharat.app.domain.usecase

import `in`.artifybharat.app.core.Result
import `in`.artifybharat.app.domain.model.Artisan
import `in`.artifybharat.app.domain.model.PricingBreakdown
import `in`.artifybharat.app.domain.model.HeritagePassport
import `in`.artifybharat.app.domain.repository.ArtisanRepository
import `in`.artifybharat.app.domain.repository.PricingRepository
import `in`.artifybharat.app.domain.repository.PassportRepository
import `in`.artifybharat.app.domain.repository.ExportRepository

class RegisterArtisanUseCase(private val repository: ArtisanRepository) {
    suspend operator fun invoke(
        name: String,
        phone: String,
        pin: String,
        dialect: String = "bhojpuri",
        trifedId: String? = null
    ): Result<Artisan> {
        if (phone.length < 10) return Result.Error("Invalid phone number")
        if (pin.length < 4) return Result.Error("Security PIN must be 4 digits")
        return repository.registerArtisan(name, phone, pin, dialect, trifedId)
    }
}

class CalculatePricingUseCase(private val repository: PricingRepository) {
    suspend operator fun invoke(
        productId: String,
        rawMaterialCost: Double,
        laborDays: Double
    ): Result<PricingBreakdown> {
        if (rawMaterialCost < 0) return Result.Error("Raw material cost cannot be negative")
        if (laborDays < 0.5) return Result.Error("Labor days must be at least 0.5 days")
        return repository.calculateDynamicPricing(productId, rawMaterialCost, laborDays)
    }
}

class IssuePassportUseCase(private val repository: PassportRepository) {
    suspend operator fun invoke(productId: String): Result<HeritagePassport> {
        return repository.issueHeritagePassport(productId)
    }
}

class ExportChannelsUseCase(private val repository: ExportRepository) {
    suspend operator fun invoke(productId: String, channels: List<String>, b2bQuantity: Int = 10): Result<Boolean> {
        if (channels.isEmpty()) return Result.Error("Select at least one export channel")
        return repository.exportToChannels(productId, channels, b2bQuantity)
    }
}
