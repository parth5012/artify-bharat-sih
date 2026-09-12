package com.artifybharat.android.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.artifybharat.android.data.local.entity.PhotoEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface PhotoDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertPhoto(photo: PhotoEntity)

    @Query("SELECT * FROM photos WHERE draftId = :draftId ORDER BY createdAt ASC")
    suspend fun getPhotosForDraft(draftId: String): List<PhotoEntity>

    @Query("SELECT * FROM photos WHERE isUploaded = 0")
    suspend fun getPendingUploadPhotos(): List<PhotoEntity>

    @Query("UPDATE photos SET isUploaded = 1, remoteUrl = :remoteUrl WHERE id = :photoId")
    suspend fun markPhotoUploaded(photoId: String, remoteUrl: String)

    @Query("DELETE FROM photos WHERE draftId = :draftId")
    suspend fun deletePhotosForDraft(draftId: String)
}
