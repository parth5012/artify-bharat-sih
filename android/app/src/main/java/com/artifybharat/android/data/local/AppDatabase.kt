package com.artifybharat.android.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import com.artifybharat.android.data.local.dao.DraftDao
import com.artifybharat.android.data.local.dao.JuryDao
import com.artifybharat.android.data.local.dao.PhotoDao
import com.artifybharat.android.data.local.entity.DraftEntity
import com.artifybharat.android.data.local.entity.JuryEntity
import com.artifybharat.android.data.local.entity.PhotoEntity
import net.sqlcipher.database.SupportFactory

@Database(
    entities = [
        DraftEntity::class,
        PhotoEntity::class,
        JuryEntity::class
    ],
    version = 1,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {

    abstract fun draftDao(): DraftDao
    abstract fun photoDao(): PhotoDao
    abstract fun juryDao(): JuryDao

    companion object {
        private const val DB_NAME = "artify_bharat_secure.db"

        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getInstance(context: Context, passphrase: ByteArray? = null): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                // Automatically fetch the hardware KeyStore MasterKey-backed passphrase if none is passed explicitly
                val key = passphrase ?: DatabasePassphraseProvider.getOrCreatePassphrase(context.applicationContext)
                val instance = buildDatabase(context.applicationContext, key)
                INSTANCE = instance
                instance
            }
        }

        private fun buildDatabase(context: Context, passphrase: ByteArray?): AppDatabase {
            val builder = Room.databaseBuilder(
                context,
                AppDatabase::class.java,
                DB_NAME
            )

            // If a passphrase is provided, initialize SQLCipher SupportFactory for AES-256-CBC at-rest encryption
            if (passphrase != null && passphrase.isNotEmpty()) {
                val factory = SupportFactory(passphrase)
                builder.openHelperFactory(factory)
            }

            return builder
                .fallbackToDestructiveMigration()
                .build()
        }

        fun createInMemoryDatabase(context: Context): AppDatabase {
            return Room.inMemoryDatabaseBuilder(
                context,
                AppDatabase::class.java
            )
                .allowMainThreadQueries()
                .build()
        }
    }
}
