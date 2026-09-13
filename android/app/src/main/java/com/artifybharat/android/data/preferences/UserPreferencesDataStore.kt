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
    val artisanName: String = "अनाम कारीगर (Artisan)",
    val clusterName: String = "",
    val craftCategory: String = "handloom",
    val stateCode: String = "UP",
    val isVerified: Boolean = false,
    val isOnboarded: Boolean = false,
    val isOfflineDemo: Boolean = false
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
        val KEY_IS_ONBOARDED = booleanPreferencesKey("is_onboarded")
        val KEY_OFFLINE_DEMO = booleanPreferencesKey("offline_demo")
        val KEY_CUSTOM_BASE_URL = stringPreferencesKey("custom_base_url")
    }

    val userSessionFlow: Flow<UserSession> = context.userDataStore.data.map { prefs ->
        val isOnboarded = prefs[KEY_IS_ONBOARDED] ?: false
        val token = secureTokenStorage.getToken()
        val isDemo = prefs[KEY_OFFLINE_DEMO] ?: false
        UserSession(
            authToken = token,
            artisanId = prefs[KEY_ARTISAN_ID],
            // Strictly store masked identifier (e.g. PEH-***-88320) per DPDP compliance; never raw Aadhaar
            maskedPehchan = prefs[KEY_MASKED_PEHCHAN],
            artisanName = prefs[KEY_ARTISAN_NAME] ?: if (isOnboarded) "गौरी देवी (Gauri Devi)" else "अनाम कारीगर (Artisan)",
            clusterName = prefs[KEY_CLUSTER_NAME] ?: if (isOnboarded) "Varanasi Handloom Cluster" else "",
            craftCategory = prefs[KEY_CRAFT_CATEGORY] ?: "handloom",
            stateCode = prefs[KEY_STATE_CODE] ?: "UP",
            isVerified = prefs[KEY_IS_VERIFIED] ?: false,
            isOnboarded = isOnboarded,
            isOfflineDemo = isDemo
        )
    }

    val isOnboardedFlow: Flow<Boolean> = context.userDataStore.data.map { prefs ->
        prefs[KEY_IS_ONBOARDED] ?: false
    }

    val customBaseUrlFlow: Flow<String?> = context.userDataStore.data.map { prefs ->
        prefs[KEY_CUSTOM_BASE_URL]
    }

    val authTokenFlow: Flow<String?> = flowOf(secureTokenStorage.getToken())

    fun getAuthToken(): String? = secureTokenStorage.getToken()

    suspend fun setOnboarded(onboarded: Boolean) {
        context.userDataStore.edit { prefs ->
            prefs[KEY_IS_ONBOARDED] = onboarded
        }
    }

    suspend fun setOfflineDemo(enabled: Boolean) {
        context.userDataStore.edit { prefs ->
            prefs[KEY_OFFLINE_DEMO] = enabled
            if (enabled) {
                prefs[KEY_IS_ONBOARDED] = true
                prefs[KEY_IS_VERIFIED] = false
                prefs[KEY_ARTISAN_NAME] = "डेमो कारीगर (Demo Artisan)"
                prefs[KEY_CLUSTER_NAME] = "Varanasi Handloom Cluster"
            }
        }
    }

    suspend fun setCustomBaseUrl(url: String) {
        context.userDataStore.edit { prefs ->
            prefs[KEY_CUSTOM_BASE_URL] = url
        }
    }

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
            prefs[KEY_IS_ONBOARDED] = true
            prefs[KEY_OFFLINE_DEMO] = false
        }
    }

    suspend fun clearSession() {
        secureTokenStorage.clearToken()
        context.userDataStore.edit { prefs ->
            val customUrl = prefs[KEY_CUSTOM_BASE_URL]
            prefs.clear()
            if (!customUrl.isNullOrBlank()) {
                prefs[KEY_CUSTOM_BASE_URL] = customUrl
            }
        }
    }
}
