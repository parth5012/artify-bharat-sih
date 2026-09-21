package com.artifybharat.android.features.home

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.artifybharat.android.data.local.AppDatabase
import com.artifybharat.android.data.local.entity.DraftEntity
import com.artifybharat.android.data.preferences.UserPreferencesDataStore
import com.artifybharat.android.data.preferences.UserSession
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.launch

/**
 * [Artisan App T2] Artisan Home Dashboard state.
 *
 * - activeListingsCount: drafts minted to Digital Heritage Passport (SYNCED).
 * - pendingDraftsCount: drafts awaiting 2G/4G sync (DRAFT / QUEUED / FAILED).
 * - estimatedEarnings: sum of fairRetailPrice across drafts.
 * - recentDrafts: latest 5 drafts by updatedAt.
 * - isOffline: true in offline-demo mode (drives HeaderBar badge + OfflineBanner).
 */
data class HomeUiState(
    val artisanName: String = "अनाम कारीगर (Artisan)",
    val clusterName: String = "",
    val isVerified: Boolean = false,
    val onboardingMode: String = "solo",
    val activeListingsCount: Int = 0,
    val pendingDraftsCount: Int = 0,
    val estimatedEarnings: Double = 0.0,
    val recentDrafts: List<DraftEntity> = emptyList(),
    val isOffline: Boolean = false
)

/** Statuses that keep a draft in the offline sync queue (matches DraftDao pending query). */
private val PENDING_STATUSES = setOf(
    DraftEntity.STATUS_DRAFT,
    DraftEntity.STATUS_QUEUED,
    DraftEntity.STATUS_FAILED
)

/** Pure mapper — keeps dashboard math JVM-testable without Android framework. */
fun toHomeUiState(session: UserSession, drafts: List<DraftEntity>): HomeUiState {
    val sorted = drafts.sortedByDescending { it.updatedAt }
    return HomeUiState(
        artisanName = session.artisanName,
        clusterName = session.clusterName,
        isVerified = session.isVerified,
        onboardingMode = session.onboardingMode,
        activeListingsCount = drafts.count { it.status == DraftEntity.STATUS_SYNCED },
        pendingDraftsCount = drafts.count { it.status in PENDING_STATUSES },
        estimatedEarnings = drafts.sumOf { it.fairRetailPrice },
        recentDrafts = sorted.take(5),
        isOffline = session.isOfflineDemo
    )
}

class ArtisanHomeViewModel(
    userSessionFlow: Flow<UserSession>,
    draftsFlow: Flow<List<DraftEntity>>,
    externalScope: CoroutineScope? = null
) : ViewModel() {

    private val scope = externalScope ?: viewModelScope

    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    init {
        scope.launch {
            combine(userSessionFlow, draftsFlow) { session, drafts ->
                toHomeUiState(session, drafts)
            }.collect { _uiState.value = it }
        }
    }
}

/** Production wiring: DataStore session + Room drafts. DPDP-safe (masked identifiers only). */
class ArtisanHomeViewModelFactory(
    private val appContext: Context
) : ViewModelProvider.Factory {

    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        require(modelClass.isAssignableFrom(ArtisanHomeViewModel::class.java)) {
            "Unknown ViewModel class: ${modelClass.name}"
        }
        val prefs = UserPreferencesDataStore(appContext)
        val draftDao = AppDatabase.getInstance(appContext).draftDao()
        return ArtisanHomeViewModel(
            userSessionFlow = prefs.userSessionFlow,
            draftsFlow = draftDao.getAllDrafts()
        ) as T
    }
}
