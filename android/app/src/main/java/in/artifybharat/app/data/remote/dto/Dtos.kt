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

data class InventoryItemDto(
    @SerializedName("product_id") val productId: String,
    val title: String,
    @SerializedName("craft_category") val craftCategory: String,
    val status: String,
    @SerializedName("final_price") val finalPrice: Double? = null,
    @SerializedName("passport_hash") val passportHash: String? = null,
    @SerializedName("enhanced_image_url") val enhancedImageUrl: String? = null,
    @SerializedName("published_channels") val publishedChannels: List<String> = emptyList(),
    @SerializedName("created_at") val createdAt: String? = null
)

data class InventoryListResponseDto(
    @SerializedName("total_items") val totalItems: Int,
    @SerializedName("active_listings_count") val activeListingsCount: Int,
    @SerializedName("drafts_count") val draftsCount: Int,
    val inventory: List<InventoryItemDto>
)

data class DadiQueryRequestDto(
    @SerializedName("query_text") val queryText: String,
    val dialect: String? = "bhojpuri",
    @SerializedName("product_category") val productCategory: String? = "handloom"
)

data class DadiQueryResponseDto(
    @SerializedName("answer_text") val answerText: String,
    @SerializedName("answer_english") val answerEnglish: String,
    val dialect: String,
    @SerializedName("audio_response_url") val audioResponseUrl: String? = null,
    @SerializedName("suggested_actions") val suggestedActions: List<String> = emptyList(),
    @SerializedName("dadi_tip") val dadiTip: String
)

