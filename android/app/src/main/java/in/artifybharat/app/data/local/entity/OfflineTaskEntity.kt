package `in`.artifybharat.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "offline_tasks")
data class OfflineTaskEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val taskType: String, // "PHOTO_UPLOAD", "VOICE_CATALOG", "PRICE_SYNC", "EXPORT_SYNC"
    val payloadJson: String,
    val filePath: String? = null,
    val status: String = "PENDING", // "PENDING", "SYNCING", "COMPLETED", "FAILED"
    val createdAt: Long = System.currentTimeMillis()
)
