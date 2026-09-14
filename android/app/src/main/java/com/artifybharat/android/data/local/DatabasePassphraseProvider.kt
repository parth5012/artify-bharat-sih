package com.artifybharat.android.data.local

import android.content.Context
import android.util.Base64
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import com.artifybharat.android.BuildConfig
import java.security.SecureRandom

object DatabasePassphraseProvider {

    private const val PREFS_FILE_NAME = "artify_secure_vault_prefs"
    private const val KEY_DB_PASSPHRASE = "db_sqlcipher_passphrase_b64"

    fun getOrCreatePassphrase(context: Context): ByteArray {
        return try {
            val masterKey = MasterKey.Builder(context)
                .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                .build()

            val securePrefs = EncryptedSharedPreferences.create(
                context,
                PREFS_FILE_NAME,
                masterKey,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
            )

            val existingBase64 = securePrefs.getString(KEY_DB_PASSPHRASE, null)
            if (existingBase64 != null) {
                Base64.decode(existingBase64, Base64.NO_WRAP)
            } else {
                val newKey = ByteArray(32)
                SecureRandom().nextBytes(newKey)
                val newBase64 = Base64.encodeToString(newKey, Base64.NO_WRAP)
                securePrefs.edit().putString(KEY_DB_PASSPHRASE, newBase64).apply()
                newKey
            }
        } catch (e: Exception) {
            if (BuildConfig.DEBUG) {
                // Scoped strictly to debug and test builds
                "ArtifyBharatMoSJE26090DebugSeedKey".toByteArray(Charsets.UTF_8)
            } else {
                throw SecurityException("Failed to securely initialize KeyStore-backed database passphrase.", e)
            }
        }
    }
}
