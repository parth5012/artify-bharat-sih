package com.artifybharat.android.features

import com.artifybharat.android.data.local.entity.DraftEntity
import com.artifybharat.android.data.local.entity.JuryEntity
import com.artifybharat.android.features.market.DirectMarketplaceUiState
import com.artifybharat.android.features.market.MarketProductItem
import com.artifybharat.android.features.queue.OfflineSyncQueueUiState
import com.artifybharat.android.features.shg.ShgCoordinatorHubUiState
import com.artifybharat.android.features.shg.ShgJuryCardItem
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ShgMarketQueueTest {

    @Test
    fun testShgJuryQuorumVotingState() {
        val juryItem = ShgJuryCardItem(
            ticketId = "ticket-01",
            productId = "prod-01",
            productTitle = "Katan Silk Dupatta",
            artisanName = "Gauri Devi",
            clusterName = "Varanasi",
            clusterDistanceKm = 1.2,
            craftCategory = "handloom",
            rawCost = 1500.0,
            fairWage = 2000.0,
            retailPrice = 4200.0,
            quorumVotes = 2,
            status = JuryEntity.STATUS_IN_REVIEW
        )

        assertEquals(2, juryItem.quorumVotes)
        assertEquals(3, juryItem.quorumRequired)
        assertEquals("in_review", juryItem.status)

        // 3rd vote reaches quorum
        val voted = juryItem.copy(
            quorumVotes = 3,
            status = JuryEntity.STATUS_QUORUM_REACHED,
            isReviewed = true
        )
        assertEquals(3, voted.quorumVotes)
        assertEquals(JuryEntity.STATUS_QUORUM_REACHED, voted.status)
        assertTrue(voted.isReviewed)
    }

    @Test
    fun testMarketplacePayoutMath() {
        val item = MarketProductItem(
            productId = "prod-01",
            title = "Maheshwari Saree",
            craftCategory = "handloom",
            artisanName = "Radha Devi",
            clusterName = "Maheshwar",
            maskedPehchan = "PEH-***-88320",
            price = 4000.0,
            shortcode = "A7X-9B2"
        )

        // 88% Direct Artisan Realization
        val artisanPayout = item.price * 0.88
        val logisticsOverhead = item.price * 0.07
        val rawMaterialsFund = item.price * 0.05

        assertEquals(3520.0, artisanPayout, 0.01)
        assertEquals(280.0, logisticsOverhead, 0.01)
        assertEquals(200.0, rawMaterialsFund, 0.01)
        assertEquals(item.price, artisanPayout + logisticsOverhead + rawMaterialsFund, 0.01)
    }

    @Test
    fun testOfflineSyncQueuePendingCount() {
        val drafts = listOf(
            DraftEntity(localDraftId = "1", status = DraftEntity.STATUS_QUEUED),
            DraftEntity(localDraftId = "2", status = DraftEntity.STATUS_DRAFT),
            DraftEntity(localDraftId = "3", status = DraftEntity.STATUS_SYNCED),
            DraftEntity(localDraftId = "4", status = DraftEntity.STATUS_FAILED)
        )

        val pending = drafts.count { it.status in listOf("QUEUED", "DRAFT", "FAILED") }
        val queueState = OfflineSyncQueueUiState(drafts = drafts, pendingCount = pending)

        assertEquals(3, queueState.pendingCount)
        assertEquals(4, queueState.drafts.size)
    }
}
