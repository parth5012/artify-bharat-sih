package com.artifybharat.android.data.network.dto

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class ExportChannelRequestDto(
    @Json(name = "product_id") val productId: String,
    @Json(name = "target_channels") val targetChannels: List<String> = listOf("GeM", "ONDC", "Amazon_Karigar", "Direct_B2B"),
    @Json(name = "b2b_bulk_min_quantity") val b2bBulkMinQuantity: Int? = 10,
    @Json(name = "b2b_bulk_discount_percentage") val b2bBulkDiscountPercentage: Double? = 15.0
)

@JsonClass(generateAdapter = true)
data class ChannelExportResultDto(
    @Json(name = "channel") val channel: String,
    @Json(name = "status") val status: String,
    @Json(name = "external_reference_id") val externalReferenceId: String,
    @Json(name = "format") val format: String,
    @Json(name = "details") val details: Map<String, Any?> = emptyMap()
)

@JsonClass(generateAdapter = true)
data class ExportChannelResponseDto(
    @Json(name = "product_id") val productId: String,
    @Json(name = "passport_hash") val passportHash: String,
    @Json(name = "results") val results: List<ChannelExportResultDto> = emptyList(),
    @Json(name = "message") val message: String
)
