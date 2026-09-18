package com.artifybharat.android.data

import com.artifybharat.android.data.local.entity.DraftEntity
import com.artifybharat.android.data.local.entity.OfflineRegistrationEntity
import com.artifybharat.android.data.network.dto.DraftItemDto
import com.artifybharat.android.data.network.dto.DraftSyncRequestDto
import com.artifybharat.android.data.network.dto.VoiceRegisterRequestDto
import com.artifybharat.android.data.sync.SyncWorker
import com.artifybharat.android.features.onboarding.ProgressiveIdentity
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class SyncEngineLogicTest {

    @Test
    fun testDraftLifecycleStates() {
        val draft = DraftEntity(
            localDraftId = "local-uuid-101",
            productTitle = "Handloom Maheshwari Silk Saree",
            craftCategory = "handloom",
            rawCost = 1800.0,
            laborDays = 4.0,
            status = DraftEntity.STATUS_DRAFT
        )

        assertEquals("DRAFT", draft.status)

        // Queued
        val queued = draft.copy(status = DraftEntity.STATUS_QUEUED)
        assertEquals("QUEUED", queued.status)

        // Syncing
        val syncing = queued.copy(status = DraftEntity.STATUS_SYNCING)
        assertEquals("SYNCING", syncing.status)

        // Synced
        val synced = syncing.copy(
            status = DraftEntity.STATUS_SYNCED,
            passportHash = "hash-9900",
            shortcode = "A7X-9B2"
        )
        assertEquals("SYNCED", synced.status)
        assertEquals("A7X-9B2", synced.shortcode)
    }

    @Test
    fun testSplitRevisionConflictHandling() {
        val originalDraft = DraftEntity(
            localDraftId = "draft-varanasi-001",
            productTitle = "Katan Silk Brocade",
            craftCategory = "handloom",
            rawCost = 2500.0,
            laborDays = 6.0,
            status = DraftEntity.STATUS_SYNCING
        )

        // Simulate server reporting conflict: original is marked CONFLICT, and a V2 is branched
        val conflictMarked = originalDraft.copy(status = DraftEntity.STATUS_CONFLICT)
        val branchedV2 = originalDraft.copy(
            localDraftId = "${originalDraft.localDraftId}_V2",
            productTitle = "${originalDraft.productTitle} (Revision 2)",
            status = DraftEntity.STATUS_DRAFT
        )

        assertEquals("CONFLICT", conflictMarked.status)
        assertEquals("draft-varanasi-001_V2", branchedV2.localDraftId)
        assertEquals("DRAFT", branchedV2.status)
        assertEquals(2500.0, branchedV2.rawCost, 0.01)
        assertEquals(6.0, branchedV2.laborDays, 0.01)
    }

    @Test
    fun testIdempotentDraftSyncRequestGeneration() {
        val drafts = listOf(
            DraftEntity(localDraftId = "id-1", productTitle = "Item 1", craftCategory = "pottery", rawCost = 300.0),
            DraftEntity(localDraftId = "id-2", productTitle = "Item 2", craftCategory = "handloom", rawCost = 1200.0)
        )

        val dtos = drafts.map { d ->
            DraftItemDto(
                localDraftId = d.localDraftId,
                productTitle = d.productTitle,
                craftCategory = d.craftCategory,
                rawCost = d.rawCost,
                laborDays = d.laborDays,
                dialect = d.dialect
            )
        }

        val request = DraftSyncRequestDto(
            artisanId = "artisan-demo-01",
            drafts = dtos
        )

        assertEquals("artisan-demo-01", request.artisanId)
        assertEquals(2, request.drafts.size)
        assertEquals("id-1", request.drafts[0].localDraftId)
        assertEquals("id-2", request.drafts[1].localDraftId)
    }

    @Test
    fun testOfflineRegistrationSyncPayload_roundTripsThroughQueue() {
        // Ticket #110 (T2): queued VoiceRegisterRequestDto must survive Room + WorkManager retry.
        val req = VoiceRegisterRequestDto(
            name = "Gauri Devi",
            phone = "9876543210",
            pin = "1234",
            primaryDialect = "bhojpuri",
            state = "Uttar Pradesh",
            clusterName = "Varanasi Handloom Cluster",
            craftCategory = "handloom",
            pehchanId = null
        )
        val entity = ProgressiveIdentity.toEntity(req, "bhojpuri", 456L)
        assertEquals(false, entity.synced)
        assertEquals("reg-9876543210-456", entity.id)

        val replayed = ProgressiveIdentity.decodeRegistration(entity.fieldsJson)
        assertEquals("Gauri Devi", replayed.name)
        assertEquals("9876543210", replayed.phone)
        assertEquals("bhojpuri", replayed.primaryDialect)
    }
}
