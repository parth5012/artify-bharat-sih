package com.artifybharat.android.data.network.dto

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class CatalogMetadataDto(
    @Json(name = "title") val title: String,
    @Json(name = "description") val description: String,
    @Json(name = "craft_category") val craftCategory: String,
    @Json(name = "gi_tag_status") val giTagStatus: String,
    @Json(name = "weave_technique") val weaveTechnique: String,
    @Json(name = "estimated_days") val estimatedDays: Double,
    @Json(name = "seo_tags") val seoTags: List<String> = emptyList()
)

@JsonClass(generateAdapter = true)
data class VoiceCatalogResponseDto(
    @Json(name = "product_id") val productId: String,
    @Json(name = "transcript_regional") val transcriptRegional: String,
    @Json(name = "transcript_english") val transcriptEnglish: String,
    @Json(name = "metadata") val metadata: CatalogMetadataDto,
    @Json(name = "status") val status: String
)

@JsonClass(generateAdapter = true)
data class DraftItemDto(
    @Json(name = "local_draft_id") val localDraftId: String,
    @Json(name = "product_title") val productTitle: String? = null,
    @Json(name = "craft_category") val craftCategory: String? = "handloom",
    @Json(name = "raw_cost") val rawCost: Double? = 0.0,
    @Json(name = "labor_days") val laborDays: Double? = 1.0,
    @Json(name = "dialect") val dialect: String? = "bhojpuri"
)

@JsonClass(generateAdapter = true)
data class DraftSyncRequestDto(
    @Json(name = "artisan_id") val artisanId: String,
    @Json(name = "drafts") val drafts: List<DraftItemDto>
)

@JsonClass(generateAdapter = true)
data class DraftSyncResponseDto(
    @Json(name = "synced_count") val syncedCount: Int,
    @Json(name = "synced_draft_ids") val syncedDraftIds: List<String>,
    @Json(name = "status") val status: String,
    @Json(name = "message") val message: String
)

@JsonClass(generateAdapter = true)
data class InventoryItemResponseDto(
    @Json(name = "product_id") val productId: String,
    @Json(name = "title") val title: String,
    @Json(name = "craft_category") val craftCategory: String,
    @Json(name = "status") val status: String,
    @Json(name = "final_price") val finalPrice: Double? = null,
    @Json(name = "passport_hash") val passportHash: String? = null,
    @Json(name = "enhanced_image_url") val enhancedImageUrl: String? = null,
    @Json(name = "published_channels") val publishedChannels: List<String> = emptyList()
)

@JsonClass(generateAdapter = true)
data class InventoryListResponseDto(
    @Json(name = "total_items") val totalItems: Int,
    @Json(name = "active_listings_count") val activeListingsCount: Int,
    @Json(name = "drafts_count") val draftsCount: Int,
    @Json(name = "inventory") val inventory: List<InventoryItemResponseDto>
)
