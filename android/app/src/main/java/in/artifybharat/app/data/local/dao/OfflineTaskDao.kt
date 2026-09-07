package `in`.artifybharat.app.data.local.dao

import androidx.room.*
import `in`.artifybharat.app.data.local.entity.OfflineTaskEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface OfflineTaskDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertTask(task: OfflineTaskEntity): Long

    @Query("SELECT * FROM offline_tasks WHERE status = 'PENDING' ORDER BY createdAt ASC")
    suspend fun getPendingTasks(): List<OfflineTaskEntity>

    @Query("SELECT * FROM offline_tasks ORDER BY createdAt DESC")
    fun getAllTasksFlow(): Flow<List<OfflineTaskEntity>>

    @Update
    suspend fun updateTask(task: OfflineTaskEntity)

    @Query("DELETE FROM offline_tasks WHERE status = 'COMPLETED'")
    suspend fun clearCompletedTasks()
}
