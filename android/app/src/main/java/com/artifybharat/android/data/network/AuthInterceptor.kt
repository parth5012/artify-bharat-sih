package com.artifybharat.android.data.network

import com.artifybharat.android.data.preferences.UserPreferencesDataStore
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.Response

class AuthInterceptor(
    private val preferencesDataStore: UserPreferencesDataStore
) : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()
        val requestBuilder = originalRequest.newBuilder()

        // Attach standard headers
        requestBuilder.header("Accept", "application/json")
        requestBuilder.header("User-Agent", "ArtifyBharat-Android/1.0.0 (MoSJE-SIH26090)")

        // Retrieve current JWT token securely from Keystore-backed storage (if not already specified)
        if (originalRequest.header("Authorization") == null) {
            val token = preferencesDataStore.getAuthToken()
            if (!token.isNullOrBlank()) {
                requestBuilder.header("Authorization", "Bearer $token")
            }
        }

        val response = chain.proceed(requestBuilder.build())
        if (response.code == 401) {
            // Token expired or invalid: clear session to redirect to onboarding wall
            runBlocking {
                preferencesDataStore.clearSession()
            }
        }
        return response
    }
}
