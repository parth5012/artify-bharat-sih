package com.artifybharat.android.data.network

import com.artifybharat.android.data.preferences.UserPreferencesDataStore
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import java.util.concurrent.TimeUnit

object NetworkClient {

    const val DEFAULT_BASE_URL = "http://10.0.2.2:8000/api/v1/"

    fun createMoshi(): Moshi {
        return Moshi.Builder()
            .add(KotlinJsonAdapterFactory())
            .build()
    }

    fun createOkHttpClient(
        preferencesDataStore: UserPreferencesDataStore? = null,
        loggingEnabled: Boolean = false
    ): OkHttpClient {
        val builder = OkHttpClient.Builder()
            // 2G resilience timeouts as specified in Issue #50 & #53
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(60, TimeUnit.SECONDS)
            .writeTimeout(60, TimeUnit.SECONDS)
            .retryOnConnectionFailure(true)

        if (preferencesDataStore != null) {
            builder.addInterceptor(AuthInterceptor(preferencesDataStore))
        }

        if (loggingEnabled) {
            val logger = HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BODY
            }
            builder.addInterceptor(logger)
        }

        return builder.build()
    }

    fun createApiService(
        baseUrl: String = DEFAULT_BASE_URL,
        okHttpClient: OkHttpClient? = null,
        moshi: Moshi = createMoshi()
    ): ApiService {
        val client = okHttpClient ?: OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(60, TimeUnit.SECONDS)
            .build()

        return Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(client)
            .addConverterFactory(MoshiConverterFactory.create(moshi))
            .build()
            .create(ApiService::class.java)
    }
}
