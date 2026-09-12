package com.artifybharat.android.data.repository

import com.artifybharat.android.data.local.dao.DraftDao
import com.artifybharat.android.data.local.dao.PhotoDao
import com.artifybharat.android.data.local.entity.DraftEntity
import com.artifybharat.android.data.network.ApiService
import com.artifybharat.android.data.network.dto.DraftItemDto
import com.artifybharat.android.data.network.dto.DraftSyncRequestDto
import com.artifybharat.android.data.network.dto.DraftSyncResponseDto
import kotlinx.coroutines.flow.Flow

interface SyncRepository {
    fun countPendingDrafts(): Flow<Int>
    suspend fun getPendingDrafts(): List<DraftEntity>
    suspend fun syncPendingDrafts(artisanId: String): Result<DraftSyncResponseDto>
}

class SyncRepositoryImpl(
    private val draftDao: DraftDao,
    private val photoDao: PhotoDao,
    private val apiService: ApiService
) : SyncRepository {

    override fun countPendingDrafts(): Flow<Int> = draftDao.countPendingSyncDrafts()

    override suspend fun getPendingDrafts(): List<DraftEntity> = draftDao.getPendingSyncDrafts()

    override suspend fun syncPendingDrafts(artisanId: String): Result<DraftSyncResponseDto> {
        val pendingDrafts = draftDao.getPendingSyncDrafts()
        if (pendingDrafts.isEmpty()) {
            return Result.success(
                DraftSyncResponseDto(
                    syncedCount = 0,
                    syncedDraftIds = emptyList(),
                    status = "success",
                    message = "No pending drafts to sync."
                )
            )
        }

        val dtoList = pendingDrafts.map { d ->
            DraftItemDto(
                localDraftId = d.localDraftId,
                productTitle = d.productTitle,
                craftCategory = d.craftCategory,
                rawCost = d.rawCost,
                laborDays = d.laborDays,
                dialect = d.dialect
            )
        }

        return try {
            val response = apiService.syncOfflineDrafts(
                DraftSyncRequestDto(
                    artisanId = artisanId,
                    drafts = dtoList
                )
            )

            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                // Mark synced in local Room database
                body.syncedDraftIds.forEach { syncedId ->
                    draftDao.updateDraftStatus(syncedId, DraftEntity.STATUS_SYNCED)
                }
                Result.success(body)
            } else {
                Result.failure(Exception("Sync API failed with code ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
