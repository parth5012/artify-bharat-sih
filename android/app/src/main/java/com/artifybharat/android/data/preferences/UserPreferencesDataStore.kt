package com.artifybharat.android.data.preferences

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.map

private val Context.userDataStore: DataStore<Preferences> by preferencesDataStore(name = "user_preferences")

data class UserSession(
    val authToken: String? = null,
    val artisanId: String? = null,
    val maskedPehchan: String? = null,
    val artisanName: String = "गौरी देवी (Gauri Devi)",
    val clusterName: String = "Varanasi Handloom Cluster",
    val craftCategory: String = "handloom",
    val stateCode: String = "UP",
    val isVerified: Boolean = true
)

class UserPreferencesDataStore(private val context: Context) {

    private val secureTokenStorage = SecureTokenStorage(context)

    companion object {
        val KEY_ARTISAN_ID = stringPreferencesKey("artisan_id")
        val KEY_MASKED_PEHCHAN = stringPreferencesKey("masked_pehchan")
        val KEY_ARTISAN_NAME = stringPreferencesKey("artisan_name")
        val KEY_CLUSTER_NAME = stringPreferencesKey("cluster_name")
        val KEY_CRAFT_CATEGORY = stringPreferencesKey("craft_category")
        val KEY_STATE_CODE = stringPreferencesKey("state_code")
        val KEY_IS_VERIFIED = booleanPreferencesKey("is_verified")
    }

    val userSessionFlow: Flow<UserSession> = context.userDataStore.data.map { prefs ->
        UserSession(
            authToken = secureTokenStorage.getToken(),
            artisanId = prefs[KEY_ARTISAN_ID] ?: "artisan-demo-01",
            // Strictly store masked identifier (e.g. PEH-***-88320) per DPDP compliance; NO raw Aadhaar
            maskedPehchan = prefs[KEY_MASKED_PEHCHAN] ?: "PEH-***-88320",
            artisanName = prefs[KEY_ARTISAN_NAME] ?: "गौरी देवी (Gauri Devi)",
            clusterName = prefs[KEY_CLUSTER_NAME] ?: "Varanasi Handloom Cluster",
            craftCategory = prefs[KEY_CRAFT_CATEGORY] ?: "handloom",
            stateCode = prefs[KEY_STATE_CODE] ?: "UP",
            isVerified = prefs[KEY_IS_VERIFIED] ?: true
        )
    }

    val authTokenFlow: Flow<String?> = flowOf(secureTokenStorage.getToken())

    fun getAuthToken(): String? = secureTokenStorage.getToken()

    suspend fun saveAuthSession(
        token: String,
        artisanId: String,
        maskedPehchan: String,
        artisanName: String,
        clusterName: String,
        craftCategory: String,
        stateCode: String
    ) {
        // Save sensitive JWT into EncryptedSharedPreferences (Hardware KeyStore backed)
        secureTokenStorage.saveToken(token)

        context.userDataStore.edit { prefs ->
            prefs[KEY_ARTISAN_ID] = artisanId
            prefs[KEY_MASKED_PEHCHAN] = maskedPehchan
            prefs[KEY_ARTISAN_NAME] = artisanName
            prefs[KEY_CLUSTER_NAME] = clusterName
            prefs[KEY_CRAFT_CATEGORY] = craftCategory
            prefs[KEY_STATE_CODE] = stateCode
            prefs[KEY_IS_VERIFIED] = true
        }
    }

    suspend fun clearSession() {
        secureTokenStorage.clearToken()
        context.userDataStore.edit { prefs ->
            prefs.remove(KEY_ARTISAN_ID)
            prefs.remove(KEY_MASKED_PEHCHAN)
        }
    }
}
