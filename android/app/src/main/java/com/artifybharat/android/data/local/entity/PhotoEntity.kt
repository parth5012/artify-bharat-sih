package com.artifybharat.android.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "photos")
data class PhotoEntity(
    @PrimaryKey
    val id: String,
    val draftId: String,
    val photoType: String, // WIP or FINAL
    val localFilePath: String,
    val sha256Hex: String,
    val gpsLat: Double? = null,
    val gpsLng: Double? = null,
    val timestampIso: String,
    val isNaturalLight: Boolean = true,
    val isUploaded: Boolean = false,
    val remoteUrl: String? = null,
    val createdAt: Long = System.currentTimeMillis()
) {
    companion object {
        const val TYPE_WIP = "WIP"
        const val TYPE_FINAL = "FINAL"
    }
}
