package com.artifybharat.android.data.repository

import com.artifybharat.android.data.local.dao.JuryDao
import com.artifybharat.android.data.local.entity.JuryEntity
import com.artifybharat.android.data.network.ApiService
import com.artifybharat.android.data.network.dto.PeerJuryAssignRequestDto
import com.artifybharat.android.data.network.dto.PeerJuryAssignResponseDto
import com.artifybharat.android.data.network.dto.PeerJuryVoteRequestDto
import com.artifybharat.android.data.network.dto.PeerJuryVoteResponseDto
import com.artifybharat.android.data.network.dto.ReportFakeRequestDto
import com.artifybharat.android.data.network.dto.ReportFakeResponseDto
import kotlinx.coroutines.flow.Flow

interface JuryRepository {
    fun getAllJuryTickets(): Flow<List<JuryEntity>>
    suspend fun assignPeerJury(
        productId: String,
        clusterId: String,
        craftType: String
    ): Result<PeerJuryAssignResponseDto>

    suspend fun submitVote(
        juryTicketId: String,
        jurorId: String,
        verdict: String,
        craftAuthenticityScore: Double,
        comments: String? = null
    ): Result<PeerJuryVoteResponseDto>

    suspend fun reportCounterfeit(
        shortcodeOrHash: String,
        reason: String,
        reporterPhone: String? = null,
        evidenceBase64: String? = null
    ): Result<ReportFakeResponseDto>
}

class JuryRepositoryImpl(
    private val juryDao: JuryDao,
    private val apiService: ApiService
) : JuryRepository {

    override fun getAllJuryTickets(): Flow<List<JuryEntity>> = juryDao.getAllJuryTickets()

    override suspend fun assignPeerJury(
        productId: String,
        clusterId: String,
        craftType: String
    ): Result<PeerJuryAssignResponseDto> {
        return try {
            val response = apiService.assignPeerJury(
                PeerJuryAssignRequestDto(productId, clusterId, craftType)
            )
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                val entity = JuryEntity(
                    juryTicketId = body.juryTicketId,
                    productId = body.productId,
                    clusterId = body.clusterId,
                    craftType = craftType,
                    status = body.status,
                    assignedJurorsCsv = body.assignedJurors.joinToString(","),
                    quorumRequired = body.quorumRequired,
                    votesReceived = 0,
                    finalVerdict = null,
                    consensusScore = 0.0
                )
                juryDao.insertOrUpdateJuryTicket(entity)
                Result.success(body)
            } else {
                Result.failure(Exception("Jury assign error: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun submitVote(
        juryTicketId: String,
        jurorId: String,
        verdict: String,
        craftAuthenticityScore: Double,
        comments: String?
    ): Result<PeerJuryVoteResponseDto> {
        return try {
            val payload = PeerJuryVoteRequestDto(
                juryTicketId = juryTicketId,
                jurorId = jurorId,
                verdict = verdict,
                craftAuthenticityScore = craftAuthenticityScore,
                comments = comments
            )
            val response = apiService.submitJuryVote(payload)
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                val status = if (body.quorumReached) JuryEntity.STATUS_QUORUM_REACHED else JuryEntity.STATUS_IN_REVIEW
                juryDao.recordVote(
                    ticketId = juryTicketId,
                    votes = body.votesReceived,
                    score = body.averageAuthenticityScore,
                    status = status,
                    verdict = body.finalVerdict
                )
                Result.success(body)
            } else {
                Result.failure(Exception("Jury vote error: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun reportCounterfeit(
        shortcodeOrHash: String,
        reason: String,
        reporterPhone: String?,
        evidenceBase64: String?
    ): Result<ReportFakeResponseDto> {
        return try {
            val payload = ReportFakeRequestDto(
                shortcodeOrHash = shortcodeOrHash,
                reason = reason,
                reporterPhone = reporterPhone,
                evidenceImageBase64 = evidenceBase64
            )
            val response = apiService.reportCounterfeit(payload)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Report fake error: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
