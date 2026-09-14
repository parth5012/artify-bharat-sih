package com.artifybharat.android

import android.app.Application
import android.util.Log
import com.artifybharat.android.data.network.NetworkClient
import com.artifybharat.android.data.preferences.UserPreferencesDataStore
import dagger.hilt.android.HiltAndroidApp
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

@HiltAndroidApp
class ArtifyBharatApplication : Application() {

    override fun onCreate() {
        super.onCreate()
        Log.i(TAG, "ArtifyBharat Application initialized. Offline-first DPDP compliant.")

        val preferences = UserPreferencesDataStore(this)
        CoroutineScope(Dispatchers.IO).launch {
            preferences.customBaseUrlFlow.collect { customUrl ->
                NetworkClient.setCustomBaseUrl(customUrl)
            }
        }
    }

    companion object {
        const val TAG = "ArtifyBharatApp"
    }
}
