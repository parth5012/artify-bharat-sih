package com.artifybharat.android.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.artifybharat.android.data.local.entity.DraftEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface DraftDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertOrUpdateDraft(draft: DraftEntity)

    @Update
    suspend fun updateDraft(draft: DraftEntity)

    @Query("SELECT * FROM drafts WHERE localDraftId = :draftId")
    suspend fun getDraftById(draftId: String): DraftEntity?

    @Query("SELECT * FROM drafts WHERE localDraftId = :draftId")
    fun observeDraftById(draftId: String): Flow<DraftEntity?>

    @Query("SELECT * FROM drafts ORDER BY updatedAt DESC")
    fun getAllDrafts(): Flow<List<DraftEntity>>

    @Query("SELECT * FROM drafts WHERE status IN ('QUEUED', 'DRAFT', 'FAILED') ORDER BY createdAt ASC")
    suspend fun getPendingSyncDrafts(): List<DraftEntity>

    @Query("SELECT COUNT(*) FROM drafts WHERE status IN ('QUEUED', 'DRAFT', 'FAILED')")
    fun countPendingSyncDrafts(): Flow<Int>

    @Query("UPDATE drafts SET status = :newStatus, updatedAt = :timestamp WHERE localDraftId = :draftId")
    suspend fun updateDraftStatus(draftId: String, newStatus: String, timestamp: Long)

    @Query("UPDATE drafts SET passportHash = :hash, shortcode = :code, status = 'SYNCED', updatedAt = :timestamp WHERE localDraftId = :draftId")
    suspend fun markDraftMinted(draftId: String, hash: String, code: String, timestamp: Long)

    suspend fun updateDraftStatus(draftId: String, newStatus: String) {
        updateDraftStatus(draftId, newStatus, System.currentTimeMillis())
    }

    suspend fun markDraftMinted(draftId: String, hash: String, code: String) {
        markDraftMinted(draftId, hash, code, System.currentTimeMillis())
    }

    @Query("DELETE FROM drafts WHERE localDraftId = :draftId")
    suspend fun deleteDraftById(draftId: String)
}
