package com.artifybharat.android.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Room entity for storing offline voice registration data.
 * Supports offline-first architecture by queuing registrations
 * for sync when network becomes available.
 *
 * Validates: Requirements 10.2, 10.4
 */
@Entity(tableName = "offline_registrations")
data class OfflineRegistrationEntity(
    @PrimaryKey
    val id: String,
    
    /**
     * JSON-serialized map of registration fields.
     * Contains name, phone, pin, craft_type, experience_years, location, pincode.
     */
    val fieldsJson: String,
    
    /**
     * Language code selected for registration (hi, bn, te, mr, etc.)
     */
    val languageCode: String,
    
    /**
     * Timestamp when registration was queued (milliseconds since epoch)
     */
    val timestamp: Long,
    
    /**
     * Sync status flag. true = successfully synced to backend, false = pending
     */
    val synced: Boolean = false,
    
    /**
     * Number of sync retry attempts
     */
    val retryCount: Int = 0,
    
    /**
     * Last sync attempt timestamp (null if never attempted)
     */
    val lastSyncAttempt: Long? = null,
    
    /**
     * Last sync error message (null if no error)
     */
    val lastSyncError: String? = null,
    
    /**
     * Created timestamp for tracking
     */
    val createdAt: Long = System.currentTimeMillis(),
    
    /**
     * Updated timestamp for tracking modifications
     */
    val updatedAt: Long = System.currentTimeMillis()
) {
    companion object {
        const val MAX_RETRY_ATTEMPTS = 5
    }
}
