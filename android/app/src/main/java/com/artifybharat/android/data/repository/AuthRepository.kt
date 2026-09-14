package com.artifybharat.android.data.repository

import com.artifybharat.android.data.network.ApiService
import com.artifybharat.android.data.network.dto.ArtisanIdVerificationRequestDto
import com.artifybharat.android.data.network.dto.ArtisanIdVerificationResponseDto
import com.artifybharat.android.data.network.dto.PinLoginRequestDto
import com.artifybharat.android.data.network.dto.TokenResponseDto
import com.artifybharat.android.data.network.dto.VoiceRegisterRequestDto
import com.artifybharat.android.data.preferences.UserPreferencesDataStore

interface AuthRepository {
    suspend fun verifyArtisanId(identifierType: String, identifierValue: String): Result<ArtisanIdVerificationResponseDto>
    suspend fun login(phone: String, pin: String): Result<TokenResponseDto>
    suspend fun register(request: VoiceRegisterRequestDto): Result<TokenResponseDto>
    suspend fun saveSession(
        token: String,
        artisanId: String,
        maskedPehchan: String,
        artisanName: String,
        clusterName: String,
        craftCategory: String,
        stateCode: String
    )
    suspend fun enableOfflineDemo()
    suspend fun clearSession()
}

class AuthRepositoryImpl(
    private val apiService: ApiService,
    private val preferencesDataStore: UserPreferencesDataStore
) : AuthRepository {

    override suspend fun verifyArtisanId(
        identifierType: String,
        identifierValue: String
    ): Result<ArtisanIdVerificationResponseDto> {
        return try {
            val response = apiService.verifyArtisanId(
                ArtisanIdVerificationRequestDto(
                    identifierType = identifierType,
                    identifierValue = identifierValue
                )
            )
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                val errorMsg = response.errorBody()?.string() ?: "Verification failed: HTTP ${response.code()}"
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun login(phone: String, pin: String): Result<TokenResponseDto> {
        return try {
            val response = apiService.loginArtisan(
                PinLoginRequestDto(phone = phone, pin = pin)
            )
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                val errorMsg = response.errorBody()?.string() ?: "Login failed: HTTP ${response.code()}"
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun register(request: VoiceRegisterRequestDto): Result<TokenResponseDto> {
        return try {
            val response = apiService.registerArtisan(request)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                val errorMsg = response.errorBody()?.string() ?: "Registration failed: HTTP ${response.code()}"
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun saveSession(
        token: String,
        artisanId: String,
        maskedPehchan: String,
        artisanName: String,
        clusterName: String,
        craftCategory: String,
        stateCode: String
    ) {
        preferencesDataStore.saveAuthSession(
            token = token,
            artisanId = artisanId,
            maskedPehchan = maskedPehchan,
            artisanName = artisanName,
            clusterName = clusterName,
            craftCategory = craftCategory,
            stateCode = stateCode
        )
    }

    override suspend fun enableOfflineDemo() {
        preferencesDataStore.setOfflineDemo(true)
    }

    override suspend fun clearSession() {
        preferencesDataStore.clearSession()
    }
}
