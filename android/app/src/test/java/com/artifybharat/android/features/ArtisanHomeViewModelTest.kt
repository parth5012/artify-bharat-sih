package com.artifybharat.android.features

import com.artifybharat.android.data.local.entity.DraftEntity
import com.artifybharat.android.data.preferences.UserSession
import com.artifybharat.android.features.home.ArtisanHomeViewModel
import com.artifybharat.android.features.home.toHomeUiState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * [Artisan App T2] Artisan Home Dashboard — ViewModel + state mapping.
 * Pure-JVM: injected flows + Unconfined scope (no Android framework, no Main dispatcher).
 */
class ArtisanHomeViewModelTest {

    private fun session(
        name: String = "गौरी देवी (Gauri Devi)",
        cluster: String = "Varanasi Handloom Cluster",
        verified: Boolean = true,
        mode: String = "solo",
        offlineDemo: Boolean = false
    ) = UserSession(
        artisanName = name,
        clusterName = cluster,
        isVerified = verified,
        onboardingMode = mode,
        isOnboarded = true,
        isOfflineDemo = offlineDemo
    )

    private fun draft(
        id: String,
        status: String = DraftEntity.STATUS_DRAFT,
        price: Double = 0.0,
        updatedAt: Long = 1L,
        title: String = "उत्पाद $id"
    ) = DraftEntity(
        localDraftId = id,
        productTitle = title,
        status = status,
        fairRetailPrice = price,
        updatedAt = updatedAt,
        createdAt = updatedAt
    )

    @Test
    fun testMapsSessionGreetingFields() {
        val state = toHomeUiState(session(), emptyList())
        assertEquals("गौरी देवी (Gauri Devi)", state.artisanName)
        assertEquals("Varanasi Handloom Cluster", state.clusterName)
        assertTrue(state.isVerified)
        assertEquals("solo", state.onboardingMode)
    }

    @Test
    fun testCountsActiveAndPendingDrafts() {
        val drafts = listOf(
            draft("d1", DraftEntity.STATUS_SYNCED),
            draft("d2", DraftEntity.STATUS_SYNCED),
            draft("d3", DraftEntity.STATUS_DRAFT),
            draft("d4", DraftEntity.STATUS_QUEUED),
            draft("d5", DraftEntity.STATUS_FAILED),
            draft("d6", DraftEntity.STATUS_SYNCING)
        )
        val state = toHomeUiState(session(), drafts)
        assertEquals(2, state.activeListingsCount)
        assertEquals(3, state.pendingDraftsCount)
    }

    @Test
    fun testSumsEstimatedEarnings() {
        val drafts = listOf(
            draft("d1", DraftEntity.STATUS_SYNCED, price = 4200.0),
            draft("d2", DraftEntity.STATUS_SYNCED, price = 1800.0),
            draft("d3", DraftEntity.STATUS_DRAFT, price = 0.0)
        )
        val state = toHomeUiState(session(), drafts)
        assertEquals(6000.0, state.estimatedEarnings, 0.01)
    }

    @Test
    fun testRecentDraftsSortedByUpdatedAtTakeFive() {
        val drafts = (1..7).map { i -> draft("d$i", updatedAt = i.toLong()) }
        val state = toHomeUiState(session(), drafts)
        assertEquals(5, state.recentDrafts.size)
        assertEquals("d7", state.recentDrafts[0].localDraftId)
        assertEquals("d3", state.recentDrafts[4].localDraftId)
    }

    @Test
    fun testOfflineFlagFollowsDemoMode() {
        assertFalse(toHomeUiState(session(offlineDemo = false), emptyList()).isOffline)
        assertTrue(toHomeUiState(session(offlineDemo = true), emptyList()).isOffline)
    }

    @Test
    fun testEmptyDraftsYieldsZeroMetrics() {
        val state = toHomeUiState(session(), emptyList())
        assertEquals(0, state.activeListingsCount)
        assertEquals(0, state.pendingDraftsCount)
        assertEquals(0.0, state.estimatedEarnings, 0.01)
        assertTrue(state.recentDrafts.isEmpty())
    }

    @Test
    fun testViewModelReactsToDraftEmissions() = runBlocking {
        val sessionFlow = MutableStateFlow(session())
        val draftsFlow = MutableStateFlow<List<DraftEntity>>(emptyList())
        val vm = ArtisanHomeViewModel(
            userSessionFlow = sessionFlow,
            draftsFlow = draftsFlow,
            externalScope = CoroutineScope(Dispatchers.Unconfined)
        )

        assertEquals(0, vm.uiState.value.pendingDraftsCount)

        draftsFlow.value = listOf(
            draft("d1", DraftEntity.STATUS_DRAFT),
            draft("d2", DraftEntity.STATUS_SYNCED, price = 2500.0)
        )

        assertEquals(1, vm.uiState.value.pendingDraftsCount)
        assertEquals(1, vm.uiState.value.activeListingsCount)
        assertEquals(2500.0, vm.uiState.value.estimatedEarnings, 0.01)
        assertEquals(2, vm.uiState.value.recentDrafts.size)
    }

    @Test
    fun testViewModelReactsToSessionChange() = runBlocking {
        val sessionFlow = MutableStateFlow(session(name = "अनाम कारीगर (Artisan)", verified = false))
        val draftsFlow = MutableStateFlow<List<DraftEntity>>(emptyList())
        val vm = ArtisanHomeViewModel(
            userSessionFlow = sessionFlow,
            draftsFlow = draftsFlow,
            externalScope = CoroutineScope(Dispatchers.Unconfined)
        )

        assertFalse(vm.uiState.value.isVerified)

        sessionFlow.value = session()
        assertEquals("गौरी देवी (Gauri Devi)", vm.uiState.value.artisanName)
        assertTrue(vm.uiState.value.isVerified)
    }
}
