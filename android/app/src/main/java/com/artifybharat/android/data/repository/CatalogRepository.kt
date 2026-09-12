package com.artifybharat.android.data.repository

import com.artifybharat.android.data.local.dao.DraftDao
import com.artifybharat.android.data.local.entity.DraftEntity
import com.artifybharat.android.data.network.ApiService
import com.artifybharat.android.data.network.dto.DadiQueryRequestDto
import com.artifybharat.android.data.network.dto.DadiQueryResponseDto
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
}
