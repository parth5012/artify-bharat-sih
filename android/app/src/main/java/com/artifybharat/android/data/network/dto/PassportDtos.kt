package com.artifybharat.android.data.network.dto

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class PassportIssueRequestDto(
    @Json(name = "product_id") val productId: String
)

@JsonClass(generateAdapter = true)
data class HeritagePassportResponseDto(
    @Json(name = "product_id") val productId: String,
    @Json(name = "passport_hash") val passportHash: String,
    @Json(name = "qr_code_data_uri") val qrCodeDataUri: String,
    @Json(name = "verification_url") val verificationUrl: String,
    @Json(name = "issued_at") val issuedAt: String
)

@JsonClass(generateAdapter = true)
data class GeoCoordinatesDto(
    @Json(name = "lat") val lat: Double? = null,
    @Json(name = "lng") val lng: Double? = null
)

@JsonClass(generateAdapter = true)
data class PublicPassportVerificationDto(
    @Json(name = "passport_hash") val passportHash: String,
    @Json(name = "is_authentic") val isAuthentic: Boolean,
    @Json(name = "product_title") val productTitle: String,
    @Json(name = "craft_category") val craftCategory: String,
    @Json(name = "gi_tag_status") val giTagStatus: String,
    @Json(name = "artisan_name") val artisanName: String,
    @Json(name = "cluster_name") val clusterName: String,
    @Json(name = "state") val state: String,
    @Json(name = "district") val district: String,
    @Json(name = "geo_coordinates") val geoCoordinates: Map<String, Double?> = emptyMap(),
    @Json(name = "enhanced_image_url") val enhancedImageUrl: String? = null,
    @Json(name = "voice_story_url") val voiceStoryUrl: String? = null,
    @Json(name = "cost_breakdown") val costBreakdown: CostBreakdownDto,
    @Json(name = "issued_at") val issuedAt: String
)
