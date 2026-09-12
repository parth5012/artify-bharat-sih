package com.artifybharat.android

import android.app.Application
import android.util.Log

class ArtifyBharatApplication : Application() {

    override fun onCreate() {
        super.onCreate()
        Log.i(TAG, "ArtifyBharat Application initialized. Offline-first DPDP compliant.")
    }

    companion object {
        const val TAG = "ArtifyBharatApp"
    }
}
