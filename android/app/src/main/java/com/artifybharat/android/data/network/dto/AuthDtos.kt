package com.artifybharat.android.data.network.dto

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class VoiceRegisterRequestDto(
    @Json(name = "name") val name: String,
    @Json(name = "phone") val phone: String,
    @Json(name = "pin") val pin: String,
    @Json(name = "primary_dialect") val primaryDialect: String = "bhojpuri",
    @Json(name = "state") val state: String = "Uttar Pradesh",
    @Json(name = "district") val district: String? = null,
    @Json(name = "cluster_name") val clusterName: String = "Varanasi Handloom Cluster",
    @Json(name = "craft_category") val craftCategory: String = "handloom",
    @Json(name = "trifed_id") val trifedId: String? = null,
    @Json(name = "pehchan_id") val pehchanId: String? = null,
    @Json(name = "geo_lat") val geoLat: Double? = null,
    @Json(name = "geo_lng") val geoLng: Double? = null
)

@JsonClass(generateAdapter = true)
data class PinLoginRequestDto(
    @Json(name = "phone") val phone: String,
    @Json(name = "pin") val pin: String
)

@JsonClass(generateAdapter = true)
data class TokenResponseDto(
    @Json(name = "access_token") val accessToken: String,
    @Json(name = "token_type") val tokenType: String = "bearer",
    @Json(name = "artisan_id") val artisanId: String,
    @Json(name = "name") val name: String,
    @Json(name = "phone") val phone: String
)

@JsonClass(generateAdapter = true)
data class ArtisanIdVerificationRequestDto(
    @Json(name = "identifier_type") val identifierType: String = "pehchan",
    @Json(name = "identifier_value") val identifierValue: String
)

@JsonClass(generateAdapter = true)
data class ArtisanIdVerificationResponseDto(
    @Json(name = "is_valid") val isValid: Boolean,
    @Json(name = "identifier_type") val identifierType: String,
    @Json(name = "identifier_value") val identifierValue: String,
    @Json(name = "artisan_name") val artisanName: String? = null,
    @Json(name = "craft_category") val craftCategory: String? = null,
    @Json(name = "cluster_name") val clusterName: String? = null,
    @Json(name = "gi_certified") val giCertified: Boolean = false,
    @Json(name = "gi_tag_name") val giTagName: String? = null,
    @Json(name = "state") val state: String? = null,
    @Json(name = "district") val district: String? = null,
    @Json(name = "verification_source") val verificationSource: String = "MoSJE National Artisan Registry"
)
