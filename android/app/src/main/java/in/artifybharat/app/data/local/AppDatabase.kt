package `in`.artifybharat.app.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import `in`.artifybharat.app.data.local.dao.OfflineTaskDao
import `in`.artifybharat.app.data.local.entity.OfflineTaskEntity

@Database(entities = [OfflineTaskEntity::class], version = 1, exportSchema = false)
abstract class AppDatabase : RoomDatabase() {

    abstract fun offlineTaskDao(): OfflineTaskDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getDatabase(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "artify_bharat_offline.db"
                ).build()
                INSTANCE = instance
                instance
            }
        }
    }
}
