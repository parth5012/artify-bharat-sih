package `in`.artifybharat.app.data.remote.dto

import com.google.gson.annotations.SerializedName

data class RegisterRequestDto(
    val name: String,
    val phone: String,
    val pin: String,
    @SerializedName("primary_dialect") val primaryDialect: String,
    @SerializedName("trifed_id") val trifedId: String? = null
)

data class AuthResponseDto(
    @SerializedName("access_token") val accessToken: String,
    @SerializedName("artisan_id") val artisanId: String,
    val name: String,
    val phone: String
)

data class PricingRequestDto(
    @SerializedName("product_id") val productId: String,
    @SerializedName("raw_material_cost") val rawMaterialCost: Double,
    @SerializedName("labor_days") val laborDays: Double
)

data class CostBreakdownDto(
    @SerializedName("raw_material_cost") val rawMaterialCost: Double,
    @SerializedName("labor_days") val laborDays: Double,
    @SerializedName("daily_wage_rate") val dailyWageRate: Double,
    @SerializedName("calculated_fair_wage") val calculatedFairWage: Double,
    @SerializedName("artisan_net_profit") val artisanNetProfit: Double,
    @SerializedName("total_suggested_price") val totalSuggestedPrice: Double
)

data class PricingResponseDto(
    @SerializedName("product_id") val productId: String,
    @SerializedName("benchmark_min_price") val benchmarkMinPrice: Double,
    @SerializedName("benchmark_max_price") val benchmarkMaxPrice: Double,
    @SerializedName("recommended_price") val recommendedPrice: Double,
    @SerializedName("cost_breakdown") val costBreakdown: CostBreakdownDto
)

data class PassportIssueRequestDto(
    @SerializedName("product_id") val productId: String
)

data class PassportResponseDto(
    @SerializedName("product_id") val productId: String,
    @SerializedName("passport_hash") val passportHash: String,
    @SerializedName("qr_code_data_uri") val qrCodeDataUri: String,
    @SerializedName("verification_url") val verificationUrl: String,
    @SerializedName("issued_at") val issuedAt: String
)

data class ExportRequestDto(
    @SerializedName("product_id") val productId: String,
    @SerializedName("target_channels") val targetChannels: List<String>,
    @SerializedName("b2b_bulk_min_quantity") val b2bBulkMinQuantity: Int
)

data class ExportResponseDto(
    @SerializedName("product_id") val productId: String,
    val message: String
)
