package com.artifybharat.android.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.artifybharat.android.data.local.entity.JuryEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface JuryDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertOrUpdateJuryTicket(juryTicket: JuryEntity)

    @Update
    suspend fun updateJuryTicket(juryTicket: JuryEntity)

    @Query("SELECT * FROM jury_tickets WHERE juryTicketId = :ticketId")
    suspend fun getJuryTicketById(ticketId: String): JuryEntity?

    @Query("SELECT * FROM jury_tickets WHERE juryTicketId = :ticketId")
    fun observeJuryTicketById(ticketId: String): Flow<JuryEntity?>

    @Query("SELECT * FROM jury_tickets ORDER BY updatedAt DESC")
    fun getAllJuryTickets(): Flow<List<JuryEntity>>

    @Query("UPDATE jury_tickets SET votesReceived = :votes, consensusScore = :score, status = :status, finalVerdict = :verdict, updatedAt = :timestamp WHERE juryTicketId = :ticketId")
    suspend fun recordVote(ticketId: String, votes: Int, score: Double, status: String, verdict: String?, timestamp: Long)

    suspend fun recordVote(ticketId: String, votes: Int, score: Double, status: String, verdict: String?) {
        recordVote(ticketId, votes, score, status, verdict, System.currentTimeMillis())
    }
}
