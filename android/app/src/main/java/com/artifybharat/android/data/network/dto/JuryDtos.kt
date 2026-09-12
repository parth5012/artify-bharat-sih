package com.artifybharat.android.data.network.dto

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class PeerJuryAssignRequestDto(
    @Json(name = "product_id") val productId: String,
    @Json(name = "cluster_id") val clusterId: String,
    @Json(name = "craft_type") val craftType: String = "Handloom Weaving"
)

@JsonClass(generateAdapter = true)
data class PeerJuryAssignResponseDto(
    @Json(name = "jury_ticket_id") val juryTicketId: String,
    @Json(name = "product_id") val productId: String,
    @Json(name = "cluster_id") val clusterId: String,
    @Json(name = "assigned_jurors") val assignedJurors: List<String> = emptyList(),
    @Json(name = "quorum_required") val quorumRequired: Int = 3,
    @Json(name = "status") val status: String,
    @Json(name = "created_at") val createdAt: String
)

@JsonClass(generateAdapter = true)
data class PeerJuryVoteRequestDto(
    @Json(name = "jury_ticket_id") val juryTicketId: String,
    @Json(name = "juror_id") val jurorId: String,
    @Json(name = "verdict") val verdict: String, // "authentic" or "rejected"
    @Json(name = "craft_authenticity_score") val craftAuthenticityScore: Double,
    @Json(name = "comments") val comments: String? = null
)

@JsonClass(generateAdapter = true)
data class PeerJuryVoteResponseDto(
    @Json(name = "jury_ticket_id") val juryTicketId: String,
    @Json(name = "juror_id") val jurorId: String,
    @Json(name = "vote_recorded") val voteRecorded: Boolean,
    @Json(name = "votes_received") val votesReceived: Int,
    @Json(name = "quorum_reached") val quorumReached: Boolean,
    @Json(name = "final_verdict") val finalVerdict: String? = null,
    @Json(name = "average_authenticity_score") val averageAuthenticityScore: Double,
    @Json(name = "consensus_level") val consensusLevel: String
)

@JsonClass(generateAdapter = true)
data class ReportFakeRequestDto(
    @Json(name = "shortcode_or_hash") val shortcodeOrHash: String,
    @Json(name = "reporter_phone") val reporterPhone: String? = null,
    @Json(name = "reason") val reason: String,
    @Json(name = "evidence_image_base64") val evidenceImageBase64: String? = null
)

@JsonClass(generateAdapter = true)
data class ReportFakeResponseDto(
    @Json(name = "report_id") val reportId: String,
    @Json(name = "status") val status: String,
    @Json(name = "flagged_hash") val flaggedHash: String,
    @Json(name = "message") val message: String
)
