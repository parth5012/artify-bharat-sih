package com.artifybharat.android.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.artifybharat.android.data.local.entity.OfflineRegistrationEntity
import kotlinx.coroutines.flow.Flow

/**
 * DAO for offline voice registration data operations.
 * Provides insert, query, and sync status update methods.
 *
 * Validates: Requirements 10.2, 10.4
 */
@Dao
interface OfflineRegistrationDao {

    /**
     * Insert a new offline registration record.
     * Replaces if conflict (same ID).
     */
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(registration: OfflineRegistrationEntity)

    /**
     * Update an existing offline registration record.
     */
    @Update
    suspend fun update(registration: OfflineRegistrationEntity)

    /**
     * Get all pending (unsynced) registration records.
     * Ordered by timestamp (oldest first) for FIFO sync processing.
     */
    @Query("SELECT * FROM offline_registrations WHERE synced = 0 ORDER BY timestamp ASC")
    suspend fun getPendingRegistrations(): List<OfflineRegistrationEntity>

    /**
     * Observe all pending registrations as a Flow for reactive UI updates.
     */
    @Query("SELECT * FROM offline_registrations WHERE synced = 0 ORDER BY timestamp ASC")
    fun observePendingRegistrations(): Flow<List<OfflineRegistrationEntity>>

    /**
     * Get a specific registration by ID.
     */
    @Query("SELECT * FROM offline_registrations WHERE id = :id")
    suspend fun getRegistrationById(id: String): OfflineRegistrationEntity?

    /**
     * Mark a registration as successfully synced.
     */
    @Query("UPDATE offline_registrations SET synced = 1, updatedAt = :timestamp WHERE id = :id")
    suspend fun markAsSynced(id: String, timestamp: Long)

    /**
     * Mark a registration as successfully synced (convenience method).
     */
    suspend fun markAsSynced(id: String) {
        markAsSynced(id, System.currentTimeMillis())
    }

    /**
     * Update retry count and last sync attempt info after failed sync.
     */
    @Query("""
        UPDATE offline_registrations 
        SET retryCount = :retryCount, 
            lastSyncAttempt = :timestamp,
            lastSyncError = :errorMessage,
            updatedAt = :timestamp
        WHERE id = :id
    """)
    suspend fun updateSyncAttempt(
        id: String,
        retryCount: Int,
        errorMessage: String?,
        timestamp: Long
    )

    /**
     * Update retry count and last sync attempt info after failed sync (convenience method).
     */
    suspend fun updateSyncAttempt(id: String, retryCount: Int, errorMessage: String?) {
        updateSyncAttempt(id, retryCount, errorMessage, System.currentTimeMillis())
    }

    /**
     * Count pending (unsynced) registrations.
     */
    @Query("SELECT COUNT(*) FROM offline_registrations WHERE synced = 0")
    fun countPendingRegistrations(): Flow<Int>

    /**
     * Get all synced registrations (for audit/history).
     */
    @Query("SELECT * FROM offline_registrations WHERE synced = 1 ORDER BY timestamp DESC")
    suspend fun getSyncedRegistrations(): List<OfflineRegistrationEntity>

    /**
     * Delete a registration by ID.
     */
    @Query("DELETE FROM offline_registrations WHERE id = :id")
    suspend fun deleteById(id: String)

    /**
     * Delete all synced registrations older than the specified timestamp.
     * Useful for cleanup of old records.
     */
    @Query("DELETE FROM offline_registrations WHERE synced = 1 AND timestamp < :olderThanTimestamp")
    suspend fun deleteSyncedOlderThan(olderThanTimestamp: Long)

    /**
     * Delete all registrations (for testing or reset scenarios).
     */
    @Query("DELETE FROM offline_registrations")
    suspend fun deleteAll()
}
