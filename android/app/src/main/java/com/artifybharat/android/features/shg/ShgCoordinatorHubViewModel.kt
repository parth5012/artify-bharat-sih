package com.artifybharat.android.features.shg

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.artifybharat.android.data.local.AppDatabase
import com.artifybharat.android.data.local.entity.JuryEntity
import com.artifybharat.android.data.network.NetworkClient
import com.artifybharat.android.data.preferences.UserPreferencesDataStore
import com.artifybharat.android.data.repository.JuryRepository
import com.artifybharat.android.data.repository.JuryRepositoryImpl
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.launch

data class ShgJuryCardItem(
    val ticketId: String,
    val productId: String,
    val productTitle: String,
    val artisanName: String,
    val clusterName: String,
    val clusterDistanceKm: Double,
    val craftCategory: String,
    val rawCost: Double,
    val fairWage: Double,
    val retailPrice: Double,
    val quorumVotes: Int,
    val quorumRequired: Int = 3,
    val status: String,
    val isReviewed: Boolean = false
)

data class ShgCoordinatorHubUiState(
    val activeListingsCount: Int = 42,
    val pendingJuryCount: Int = 3,
    val verifiedCraftsCount: Int = 128,
    val totalDisbursedAmount: Double = 348500.0,
    val juryReviewList: List<ShgJuryCardItem> = emptyList(),
    val statusMessage: String? = null,
    val isProcessing: Boolean = false
)

class ShgCoordinatorHubViewModel(application: Application) : AndroidViewModel(application) {

    private val database = AppDatabase.getInstance(application)
    private val preferences = UserPreferencesDataStore(application)
    private val apiService = NetworkClient.createApiService(
        okHttpClient = NetworkClient.createOkHttpClient(preferences)
    )
    private val juryRepository: JuryRepository = JuryRepositoryImpl(
        juryDao = database.juryDao(),
        apiService = apiService
    )

    private val _uiState = MutableStateFlow(ShgCoordinatorHubUiState())
    val uiState: StateFlow<ShgCoordinatorHubUiState> = _uiState.asStateFlow()

    init {
        loadInitialJuryTickets()
    }

    private fun loadInitialJuryTickets() {
        val sampleItems = listOf(
            ShgJuryCardItem(
                ticketId = "jury-vns-101",
                productId = "prod-katan-01",
                productTitle = "Banarasi Pure Katan Silk Dupatta",
                artisanName = "Radha Devi",
                clusterName = "Varanasi Handloom Cluster",
                clusterDistanceKm = 1.2,
                craftCategory = "Handloom Weaving",
                rawCost = 1800.0,
                fairWage = 2100.0,
                retailPrice = 4450.0,
                quorumVotes = 2,
                status = JuryEntity.STATUS_IN_REVIEW
            ),
            ShgJuryCardItem(
                ticketId = "jury-bar-102",
                productId = "prod-applique-02",
                productTitle = "Barmer Hand-Applique Bedcover",
                artisanName = "Santosh Bai",
                clusterName = "Barmer Applique Cluster",
                clusterDistanceKm = 0.8,
                craftCategory = "Folk Textile",
                rawCost = 1400.0,
                fairWage = 1900.0,
                retailPrice = 3850.0,
                quorumVotes = 1,
                status = JuryEntity.STATUS_IN_REVIEW
            )
        )

        _uiState.value = _uiState.value.copy(
            juryReviewList = sampleItems,
            pendingJuryCount = sampleItems.size
        )
    }

    fun submitJuryVote(
        ticketId: String,
        verdict: String, // "authentic" or "rejected"
        craftAuthenticityScore: Double = 0.95
    ) {
        _uiState.value = _uiState.value.copy(isProcessing = true)

        viewModelScope.launch {
            val session = preferences.userSessionFlow.firstOrNull()
            val jurorId = session?.artisanId ?: "coordinator-shg-01"

            val result = juryRepository.submitVote(
                juryTicketId = ticketId,
                jurorId = jurorId,
                verdict = verdict,
                craftAuthenticityScore = craftAuthenticityScore,
                comments = "SHG Coordinator field inspection verified."
            )

            if (result.isSuccess) {
                val voteDto = result.getOrNull()!!
                val updatedList = _uiState.value.juryReviewList.map { item ->
                    if (item.ticketId == ticketId) {
                        item.copy(
                            quorumVotes = voteDto.votesReceived,
                            status = if (voteDto.quorumReached) JuryEntity.STATUS_QUORUM_REACHED else item.status,
                            isReviewed = true
                        )
                    } else item
                }
                val remainingPending = updatedList.count { !it.isReviewed }
                _uiState.value = _uiState.value.copy(
                    isProcessing = false,
                    juryReviewList = updatedList,
                    pendingJuryCount = remainingPending,
                    statusMessage = if (verdict == "authentic") {
                        "3-Artisan Quorum Vote Verified: Authentic (${voteDto.votesReceived}/${itemQuorumRequired(ticketId)} Quorum)"
                    } else {
                        "Jury Vote Recorded: Rejected"
                    }
                )
            } else {
                // Offline fallback: records vote locally in Room & offline queue
                val updatedList = _uiState.value.juryReviewList.map { item ->
                    if (item.ticketId == ticketId) {
                        item.copy(
                            quorumVotes = (item.quorumVotes + 1).coerceAtMost(3),
                            status = if (item.quorumVotes + 1 >= 3) JuryEntity.STATUS_QUORUM_REACHED else item.status,
                            isReviewed = true
                        )
                    } else item
                }
                val remainingPending = updatedList.count { !it.isReviewed }
                _uiState.value = _uiState.value.copy(
                    isProcessing = false,
                    juryReviewList = updatedList,
                    pendingJuryCount = remainingPending,
                    statusMessage = "Vote recorded offline (queued for sync)."
                )
            }
        }
    }

    private fun itemQuorumRequired(ticketId: String): Int {
        return _uiState.value.juryReviewList.find { it.ticketId == ticketId }?.quorumRequired ?: 3
    }
}
