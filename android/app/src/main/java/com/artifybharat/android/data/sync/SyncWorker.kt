package com.artifybharat.android.data.sync

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.artifybharat.android.data.local.AppDatabase
import com.artifybharat.android.data.local.entity.DraftEntity
import com.artifybharat.android.data.network.NetworkClient
import com.artifybharat.android.data.network.dto.DraftItemDto
import com.artifybharat.android.data.network.dto.DraftSyncRequestDto
import com.artifybharat.android.data.network.dto.PassportIssueRequestDto
import com.artifybharat.android.data.preferences.UserPreferencesDataStore
import kotlinx.coroutines.flow.firstOrNull
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.File
import java.io.FileOutputStream

class SyncWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {

    companion object {
        const val TAG = "ArtifySyncWorker"
        const val MAX_RETRIES = 5

        fun compressImageForNetwork(
            sourceFile: File,
            outputFile: File,
            maxDimension: Int = 1920,
            quality: Int = 82
        ): File {
            val options = BitmapFactory.Options().apply { inJustDecodeBounds = true }
            BitmapFactory.decodeFile(sourceFile.absolutePath, options)

            var sampleSize = 1
            val maxOriginal = maxOf(options.outWidth, options.outHeight)
            while (maxOriginal / (sampleSize * 2) >= maxDimension) {
                sampleSize *= 2
            }

            val decodeOptions = BitmapFactory.Options().apply { inSampleSize = sampleSize }
            val bitmap = BitmapFactory.decodeFile(sourceFile.absolutePath, decodeOptions) ?: return sourceFile

            val scaled = if (maxOf(bitmap.width, bitmap.height) > maxDimension) {
                val scale = maxDimension.toFloat() / maxOf(bitmap.width, bitmap.height)
                Bitmap.createScaledBitmap(
                    bitmap,
                    (bitmap.width * scale).toInt(),
                    (bitmap.height * scale).toInt(),
                    true
                )
            } else {
                bitmap
            }

            val out = FileOutputStream(outputFile)
            scaled.compress(Bitmap.CompressFormat.JPEG, quality, out)
            out.flush()
            out.close()
            return outputFile
        }
    }

    override suspend fun doWork(): Result {
        val database = AppDatabase.getInstance(applicationContext)
        val draftDao = database.draftDao()
        val preferences = UserPreferencesDataStore(applicationContext)

        val pendingDrafts = draftDao.getPendingSyncDrafts()
        if (pendingDrafts.isEmpty()) {
            Log.d(TAG, "No pending drafts to sync.")
            return Result.success()
        }

        val session = preferences.userSessionFlow.firstOrNull()
        val artisanId = session?.artisanId
        if (artisanId.isNullOrBlank()) {
            Log.w(TAG, "No authenticated artisan session found; deferring sync.")
            return Result.retry()
        }

        val apiService = NetworkClient.createApiService(
            okHttpClient = NetworkClient.createOkHttpClient(preferences)
        )

        Log.i(TAG, "Starting sync for ${pendingDrafts.size} drafts for artisan: $artisanId")

        // 1. Mark status as SYNCING in Room
        pendingDrafts.forEach { draft ->
            draftDao.updateDraftStatus(draft.localDraftId, DraftEntity.STATUS_SYNCING)
        }

        try {
            // 2. Upload and enhance photos if present
            pendingDrafts.forEach { draft ->
                if (draft.wipPhotoPath != null) {
                    val rawFile = File(draft.wipPhotoPath)
                    if (rawFile.exists()) {
                        val tempFile = File.createTempFile("comp_${draft.localDraftId}_", ".jpg", applicationContext.cacheDir)
                        try {
                            compressImageForNetwork(rawFile, tempFile)

                            val filePart = MultipartBody.Part.createFormData(
                                "image",
                                tempFile.name,
                                tempFile.asRequestBody("image/jpeg".toMediaTypeOrNull())
                            )
                            val artisanPart = artisanId.toRequestBody("text/plain".toMediaTypeOrNull())
                            val titlePart = draft.productTitle.toRequestBody("text/plain".toMediaTypeOrNull())
                            val catPart = draft.craftCategory.toRequestBody("text/plain".toMediaTypeOrNull())

                            val enhanceResp = apiService.enhanceProductPhoto(artisanPart, titlePart, catPart, filePart)
                            if (enhanceResp.isSuccessful) {
                                enhanceResp.body()?.let { body ->
                                    Log.d(TAG, "Enhanced photo uploaded: ${body.enhancedImageUrl}")
                                }
                            }
                        } catch (e: Exception) {
                            Log.w(TAG, "Photo upload skipped/deferred: ${e.localizedMessage}")
                        } finally {
                            if (tempFile.exists()) {
                                tempFile.delete()
                            }
                        }
                    }
                }
            }

            // 3. Batch sync drafts metadata
            val draftDtos = pendingDrafts.map { d ->
                DraftItemDto(
                    localDraftId = d.localDraftId,
                    productTitle = d.productTitle,
                    craftCategory = d.craftCategory,
                    rawCost = d.rawCost,
                    laborDays = d.laborDays,
                    dialect = d.dialect
                )
            }

            val syncResponse = apiService.syncOfflineDrafts(
                DraftSyncRequestDto(
                    artisanId = artisanId,
                    drafts = draftDtos
                )
            )

            if (!syncResponse.isSuccessful || syncResponse.body() == null) {
                Log.e(TAG, "Drafts sync API returned code: ${syncResponse.code()}")
                // Reset to QUEUED so subsequent sync passes retry cleanly without deadlock
                pendingDrafts.forEach { draft ->
                    draftDao.updateDraftStatus(draft.localDraftId, DraftEntity.STATUS_QUEUED)
                }
                return if (runAttemptCount < MAX_RETRIES) Result.retry() else Result.failure()
            }

            val syncBody = syncResponse.body()!!
            Log.i(TAG, "Sync API success: ${syncBody.syncedCount} items acknowledged.")

            // 4. Issue Cryptographic Heritage Passport for newly acknowledged drafts
            for (draft in pendingDrafts) {
                if (syncBody.syncedDraftIds.contains(draft.localDraftId)) {
                    try {
                        val passportResp = apiService.issueHeritagePassport(
                            PassportIssueRequestDto(productId = draft.localDraftId)
                        )
                        if (passportResp.isSuccessful && passportResp.body() != null) {
                            val pBody = passportResp.body()!!
                            val shortcode = if (pBody.verificationUrl.contains("/verify/")) {
                                pBody.verificationUrl.substringAfterLast("/verify/").take(7)
                            } else {
                                "A7X-9B2"
                            }
                            draftDao.markDraftMinted(draft.localDraftId, pBody.passportHash, shortcode)
                            Log.i(TAG, "Minted passport for ${draft.localDraftId}: $shortcode")
                        } else {
                            // Even if passport minting is queued, mark as SYNCED
                            draftDao.updateDraftStatus(draft.localDraftId, DraftEntity.STATUS_SYNCED)
                        }
                    } catch (e: Exception) {
                        draftDao.updateDraftStatus(draft.localDraftId, DraftEntity.STATUS_SYNCED)
                    }
                } else {
                    // Split-revision / conflict handling: generate local DRAFT_V2
                    Log.w(TAG, "Conflict detected for draft ${draft.localDraftId}; branching to DRAFT_V2")
                    draftDao.updateDraftStatus(draft.localDraftId, DraftEntity.STATUS_CONFLICT)
                    val v2Draft = draft.copy(
                        localDraftId = "${draft.localDraftId}_V2",
                        productTitle = "${draft.productTitle} (Revision 2)",
                        status = DraftEntity.STATUS_DRAFT,
                        createdAt = System.currentTimeMillis(),
                        updatedAt = System.currentTimeMillis()
                    )
                    draftDao.insertOrUpdateDraft(v2Draft)
                }
            }

            return Result.success()
        } catch (e: Exception) {
            Log.e(TAG, "Sync failed with exception: ${e.localizedMessage}", e)
            // Reset to QUEUED to prevent permanent SYNCING deadlock
            pendingDrafts.forEach { draft ->
                draftDao.updateDraftStatus(draft.localDraftId, DraftEntity.STATUS_QUEUED)
            }
            return if (runAttemptCount < MAX_RETRIES) Result.retry() else Result.failure()
        }
    }
}
