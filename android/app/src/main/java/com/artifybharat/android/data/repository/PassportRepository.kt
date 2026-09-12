package com.artifybharat.android.data.repository

import com.artifybharat.android.data.local.dao.DraftDao
import com.artifybharat.android.data.network.ApiService
import com.artifybharat.android.data.network.dto.HeritagePassportResponseDto
import com.artifybharat.android.data.network.dto.PassportIssueRequestDto
import com.artifybharat.android.data.network.dto.PublicPassportVerificationDto

interface PassportRepository {
    suspend fun issuePassport(productId: String): Result<HeritagePassportResponseDto>
    suspend fun verifyPassportByHash(hash: String): Result<PublicPassportVerificationDto>
    suspend fun resolvePassportByShortcode(shortcode: String): Result<PublicPassportVerificationDto>
}

class PassportRepositoryImpl(
    private val draftDao: DraftDao,
    private val apiService: ApiService
) : PassportRepository {

    override suspend fun issuePassport(productId: String): Result<HeritagePassportResponseDto> {
        return try {
            val response = apiService.issueHeritagePassport(PassportIssueRequestDto(productId))
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                // Extract shortcode if returned in verification URL or hash
                val shortcode = if (body.verificationUrl.contains("/verify/")) {
                    body.verificationUrl.substringAfterLast("/verify/").take(7)
                } else "A7X-9B2"

                draftDao.markDraftMinted(productId, body.passportHash, shortcode)
                Result.success(body)
            } else {
                Result.failure(Exception("Passport issue error: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun verifyPassportByHash(hash: String): Result<PublicPassportVerificationDto> {
        return try {
            val response = apiService.verifyHeritagePassport(hash)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Passport verify error: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun resolvePassportByShortcode(shortcode: String): Result<PublicPassportVerificationDto> {
        return try {
            val response = apiService.resolvePassportShortcode(shortcode)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Shortcode resolve error: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
