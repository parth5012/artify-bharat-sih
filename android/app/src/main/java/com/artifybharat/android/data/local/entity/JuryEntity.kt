package com.artifybharat.android.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "jury_tickets")
data class JuryEntity(
    @PrimaryKey
    val juryTicketId: String,
    val productId: String,
    val clusterId: String,
    val craftType: String = "Handloom Weaving",
    val status: String = STATUS_IN_REVIEW,
    val assignedJurorsCsv: String = "",
    val quorumRequired: Int = 3,
    val votesReceived: Int = 0,
    val finalVerdict: String? = null,
    val consensusScore: Double = 0.0,
    val updatedAt: Long = System.currentTimeMillis()
) {
    companion object {
        const val STATUS_IN_REVIEW = "in_review"
        const val STATUS_QUORUM_REACHED = "quorum_reached"
        const val STATUS_REJECTED = "rejected"
    }
}
