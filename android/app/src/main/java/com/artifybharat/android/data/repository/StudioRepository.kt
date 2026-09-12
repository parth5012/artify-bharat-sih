package com.artifybharat.android.data.repository

import com.artifybharat.android.data.local.dao.PhotoDao
import com.artifybharat.android.data.local.entity.PhotoEntity
import com.artifybharat.android.data.network.ApiService
import com.artifybharat.android.data.network.dto.AIStudioEnhanceResponseDto
import com.artifybharat.android.data.network.dto.StudioEnhanceResponseDto
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.File

interface StudioRepository {
    suspend fun saveCapturedPhoto(photo: PhotoEntity)
    suspend fun getPhotosForDraft(draftId: String): List<PhotoEntity>
    suspend fun enhancePhoto(
        artisanId: String,
        productTitle: String,
        craftCategory: String,
        imageFile: File
    ): Result<StudioEnhanceResponseDto>
    suspend fun enhanceStudioStateless(
        imageFile: File,
        productId: String? = null,
        removeBg: Boolean = true
    ): Result<AIStudioEnhanceResponseDto>
}

class StudioRepositoryImpl(
    private val photoDao: PhotoDao,
    private val apiService: ApiService
) : StudioRepository {

    override suspend fun saveCapturedPhoto(photo: PhotoEntity) {
        photoDao.insertPhoto(photo)
    }

    override suspend fun getPhotosForDraft(draftId: String): List<PhotoEntity> {
        return photoDao.getPhotosForDraft(draftId)
    }

    override suspend fun enhancePhoto(
        artisanId: String,
        productTitle: String,
        craftCategory: String,
        imageFile: File
    ): Result<StudioEnhanceResponseDto> {
        return try {
            val artisanPart = artisanId.toRequestBody("text/plain".toMediaTypeOrNull())
            val titlePart = productTitle.toRequestBody("text/plain".toMediaTypeOrNull())
            val categoryPart = craftCategory.toRequestBody("text/plain".toMediaTypeOrNull())
            val fileBody = imageFile.asRequestBody("image/jpeg".toMediaTypeOrNull())
            val imagePart = MultipartBody.Part.createFormData("image", imageFile.name, fileBody)

            val response = apiService.enhanceProductPhoto(artisanPart, titlePart, categoryPart, imagePart)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Studio enhance error: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun enhanceStudioStateless(
        imageFile: File,
        productId: String?,
        removeBg: Boolean
    ): Result<AIStudioEnhanceResponseDto> {
        return try {
            val fileBody = imageFile.asRequestBody("image/jpeg".toMediaTypeOrNull())
            val imagePart = MultipartBody.Part.createFormData("image", imageFile.name, fileBody)
            val productPart = productId?.toRequestBody("text/plain".toMediaTypeOrNull())
            val removeBgPart = removeBg.toString().toRequestBody("text/plain".toMediaTypeOrNull())

            val response = apiService.enhanceStudioStateless(imagePart, productPart, removeBgPart)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Studio stateless enhance error: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
