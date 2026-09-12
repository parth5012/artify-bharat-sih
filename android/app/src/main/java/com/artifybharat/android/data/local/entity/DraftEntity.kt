package com.artifybharat.android.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "drafts")
data class DraftEntity(
    @PrimaryKey
    val localDraftId: String,
    val productTitle: String = "हस्तशिल्प उत्पाद (Handcrafted Craft)",
    val craftCategory: String = "handloom",
    val rawCost: Double = 0.0,
    val laborDays: Double = 1.0,
    val laborHours: Double = 8.0,
    val dialect: String = "bhojpuri",
    val status: String = STATUS_DRAFT,
    val wipPhotoPath: String? = null,
    val finalPhotoPath: String? = null,
    val wipSha256: String? = null,
    val finalSha256: String? = null,
    val passportHash: String? = null,
    val shortcode: String? = null,
    val regionalTranscript: String? = null,
    val englishTranscript: String? = null,
    val fairRetailPrice: Double = 0.0,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis()
) {
    companion object {
        const val STATUS_DRAFT = "DRAFT"
        const val STATUS_QUEUED = "QUEUED"
        const val STATUS_SYNCING = "SYNCING"
        const val STATUS_SYNCED = "SYNCED"
        const val STATUS_CONFLICT = "CONFLICT"
        const val STATUS_FAILED = "FAILED"
    }
}
