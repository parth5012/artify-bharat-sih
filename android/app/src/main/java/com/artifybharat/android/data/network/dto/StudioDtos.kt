package com.artifybharat.android.data.network.dto

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class PipelineStepDto(
    @Json(name = "step_name") val stepName: String,
    @Json(name = "algorithm") val algorithm: String,
    @Json(name = "duration_ms") val durationMs: Double,
    @Json(name = "success") val success: Boolean,
    @Json(name = "details") val details: String
)

@JsonClass(generateAdapter = true)
data class StudioEnhanceResponseDto(
    @Json(name = "product_id") val productId: String,
    @Json(name = "original_image_url") val originalImageUrl: String,
    @Json(name = "enhanced_image_url") val enhancedImageUrl: String,
    @Json(name = "auto_cropped_ratio") val autoCroppedRatio: String,
    @Json(name = "clahe_applied") val claheApplied: Boolean,
    @Json(name = "background_removed") val backgroundRemoved: Boolean,
    @Json(name = "crop_applied") val cropApplied: Boolean,
    @Json(name = "rembg_used") val rembgUsed: Boolean,
    @Json(name = "visual_complexity_score") val visualComplexityScore: Double,
    @Json(name = "status") val status: String,
    @Json(name = "message") val message: String
)

@JsonClass(generateAdapter = true)
data class AIStudioEnhanceResponseDto(
    @Json(name = "product_id") val productId: String,
    @Json(name = "original_image_url") val originalImageUrl: String,
    @Json(name = "enhanced_image_url") val enhancedImageUrl: String,
    @Json(name = "auto_cropped_ratio") val autoCroppedRatio: String,
    @Json(name = "clahe_applied") val claheApplied: Boolean,
    @Json(name = "background_removed") val backgroundRemoved: Boolean,
    @Json(name = "crop_applied") val cropApplied: Boolean,
    @Json(name = "rembg_used") val rembgUsed: Boolean,
    @Json(name = "pipeline_steps") val pipelineSteps: List<PipelineStepDto> = emptyList(),
    @Json(name = "authenticity_guarantee") val authenticityGuarantee: String,
    @Json(name = "complexity_pricing_factor") val complexityPricingFactor: String,
    @Json(name = "status") val status: String,
    @Json(name = "message") val message: String
)
