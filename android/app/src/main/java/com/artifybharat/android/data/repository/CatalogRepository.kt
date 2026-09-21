package com.artifybharat.android.data.repository

import com.artifybharat.android.data.local.dao.DraftDao
import com.artifybharat.android.data.local.entity.DraftEntity
import com.artifybharat.android.data.network.ApiService
import com.artifybharat.android.data.network.dto.DadiQueryRequestDto
import com.artifybharat.android.data.network.dto.DadiQueryResponseDto
import com.artifybharat.android.data.network.dto.InventoryItemResponseDto
import com.artifybharat.android.data.network.dto.VoiceCatalogResponseDto
import kotlinx.coroutines.flow.Flow
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.File

interface CatalogRepository {
    fun getAllDrafts(): Flow<List<DraftEntity>>
    fun observeDraft(draftId: String): Flow<DraftEntity?>
    suspend fun getDraft(draftId: String): DraftEntity?
    suspend fun saveDraft(draft: DraftEntity)
    suspend fun deleteDraft(draftId: String)
    suspend fun autoCatalogVoice(
        draftId: String,
        audioFile: File,
        dialect: String
    ): Result<VoiceCatalogResponseDto>
    suspend fun consultAskDadi(
        query: String,
        dialect: String,
        craftCategory: String
    ): Result<DadiQueryResponseDto>
    suspend fun getMyInventory(artisanId: String?): Result<List<InventoryItemResponseDto>>
}

class CatalogRepositoryImpl(
    private val draftDao: DraftDao,
    private val apiService: ApiService
) : CatalogRepository {

    override fun getAllDrafts(): Flow<List<DraftEntity>> = draftDao.getAllDrafts()

    override fun observeDraft(draftId: String): Flow<DraftEntity?> = draftDao.observeDraftById(draftId)

    override suspend fun getDraft(draftId: String): DraftEntity? = draftDao.getDraftById(draftId)

    override suspend fun saveDraft(draft: DraftEntity) = draftDao.insertOrUpdateDraft(draft)

    override suspend fun deleteDraft(draftId: String) = draftDao.deleteDraftById(draftId)

    override suspend fun autoCatalogVoice(
        draftId: String,
        audioFile: File,
        dialect: String
    ): Result<VoiceCatalogResponseDto> {
        return try {
            val productIdPart = draftId.toRequestBody("text/plain".toMediaTypeOrNull())
            val dialectPart = dialect.toRequestBody("text/plain".toMediaTypeOrNull())
            val audioRequestBody = audioFile.asRequestBody("audio/wav".toMediaTypeOrNull())
            val audioPart = MultipartBody.Part.createFormData("audio", audioFile.name, audioRequestBody)

            val response = apiService.autoCatalogVoice(productIdPart, dialectPart, audioPart)
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                // Update local draft with the extracted metadata
                val existing = draftDao.getDraftById(draftId)
                if (existing != null) {
                    draftDao.updateDraft(
                        existing.copy(
                            productTitle = body.metadata.title,
                            craftCategory = body.metadata.craftCategory,
                            regionalTranscript = body.transcriptRegional,
                            englishTranscript = body.transcriptEnglish,
                            laborDays = body.metadata.estimatedDays,
                            laborHours = body.metadata.estimatedDays * 8.0,
                            updatedAt = System.currentTimeMillis()
                        )
                    )
                }
                Result.success(body)
            } else {
                Result.failure(Exception("Catalog voice API error: ${response.code()} ${response.message()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun consultAskDadi(
        query: String,
        dialect: String,
        craftCategory: String
    ): Result<DadiQueryResponseDto> {
        return try {
            val request = DadiQueryRequestDto(
                queryText = query,
                dialect = dialect,
                productCategory = craftCategory
            )
            val response = apiService.askDadi(request)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Ask Dadi API error: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun getMyInventory(artisanId: String?): Result<List<InventoryItemResponseDto>> {
        return try {
            val response = apiService.getMyInventory(artisanId)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!.inventory)
            } else {
                fallbackToLocalDrafts("Inventory API error: ${response.code()}")
            }
        } catch (e: Exception) {
            fallbackToLocalDrafts(cause = e)
        }
    }

    /**
     * Offline-safe fallback: map pending Room drafts to inventory rows so the
     * Home Dashboard filter tabs (All/Drafts/Active/In-Jury) still render on 2G
     * failure. Returns failure only when no local drafts exist.
     */
    private suspend fun fallbackToLocalDrafts(
        errorMessage: String? = null,
        cause: Throwable? = null
    ): Result<List<InventoryItemResponseDto>> {
        return try {
            val local = draftDao.getPendingSyncDrafts()
            if (local.isNotEmpty()) {
                Result.success(local.map { it.toInventoryItemDto() })
            } else {
                Result.failure(cause ?: Exception(errorMessage ?: "Inventory unavailable offline"))
            }
        } catch (e: Exception) {
            Result.failure(cause ?: e)
        }
    }
}

/**
 * Maps a local Room draft to an inventory row for offline Home Dashboard
 * rendering. Status is lowercased to match backend filter tabs
 * (draft/active/in-jury); local-only rows carry no channels or image URL.
 */
internal fun DraftEntity.toInventoryItemDto(): InventoryItemResponseDto =
    InventoryItemResponseDto(
        productId = localDraftId,
        title = productTitle,
        craftCategory = craftCategory,
        status = status.lowercase(),
        finalPrice = fairRetailPrice.takeIf { it > 0.0 },
        passportHash = passportHash,
        enhancedImageUrl = null,
        publishedChannels = emptyList()
    )
