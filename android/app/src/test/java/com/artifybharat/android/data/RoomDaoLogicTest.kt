package com.artifybharat.android.data

import com.artifybharat.android.data.local.entity.DraftEntity
import com.artifybharat.android.data.local.entity.JuryEntity
import com.artifybharat.android.data.local.entity.OfflineRegistrationEntity
import com.artifybharat.android.data.local.entity.PhotoEntity
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class RoomDaoLogicTest {

    @Test
    fun testDraftEntityStateTransitions() {
        val initialDraft = DraftEntity(
            localDraftId = "draft-101",
            productTitle = "Handloom Maheshwari Saree",
            craftCategory = "handloom",
            rawCost = 1500.0,
            laborDays = 3.0,
            laborHours = 24.0,
            dialect = "hindi",
            status = DraftEntity.STATUS_DRAFT
        )

        assertEquals("DRAFT", initialDraft.status)
        assertEquals(24.0, initialDraft.laborHours, 0.01)

        // State transition: draft queued for background sync
        val queuedDraft = initialDraft.copy(status = DraftEntity.STATUS_QUEUED)
        assertEquals("QUEUED", queuedDraft.status)

        // State transition: successfully synced and passport minted
        val syncedDraft = queuedDraft.copy(
            status = DraftEntity.STATUS_SYNCED,
            passportHash = "sha256-sample-hash-1234",
            shortcode = "A7X-9B2"
        )
        assertEquals("SYNCED", syncedDraft.status)
        assertEquals("A7X-9B2", syncedDraft.shortcode)
    }

    @Test
    fun testPhotoEntityProperties() {
        val wipPhoto = PhotoEntity(
            id = "photo-wip-1",
            draftId = "draft-101",
            photoType = PhotoEntity.TYPE_WIP,
            localFilePath = "/data/user/0/app/files/wip.jpg",
            sha256Hex = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            gpsLat = 25.3176,
            gpsLng = 82.9739,
            timestampIso = "2026-09-13T10:00:00Z",
            isNaturalLight = true,
            isUploaded = false
        )

        assertEquals(PhotoEntity.TYPE_WIP, wipPhoto.photoType)
        assertEquals(25.3176, wipPhoto.gpsLat ?: 0.0, 0.0001)
        assertFalse(wipPhoto.isUploaded)

        val uploaded = wipPhoto.copy(isUploaded = true, remoteUrl = "https://artifybharat.gov.in/media/wip.jpg")
        assertTrue(uploaded.isUploaded)
        assertNotNull(uploaded.remoteUrl)
    }

    @Test
    fun testJuryEntityQuorumCalculation() {
        val juryTicket = JuryEntity(
            juryTicketId = "jury-001",
            productId = "prod-101",
            clusterId = "vns-cluster",
            craftType = "Handloom Weaving",
            status = JuryEntity.STATUS_IN_REVIEW,
            assignedJurorsCsv = "artisan-1,artisan-2,artisan-3",
            quorumRequired = 3,
            votesReceived = 2,
            finalVerdict = null,
            consensusScore = 0.85
        )

        assertEquals(3, juryTicket.quorumRequired)
        assertEquals(2, juryTicket.votesReceived)
        assertEquals(JuryEntity.STATUS_IN_REVIEW, juryTicket.status)

        // 3rd juror votes -> quorum reached
        val completed = juryTicket.copy(
            votesReceived = 3,
            status = JuryEntity.STATUS_QUORUM_REACHED,
            finalVerdict = "authentic",
            consensusScore = 0.92
        )

        assertEquals(3, completed.votesReceived)
        assertEquals(JuryEntity.STATUS_QUORUM_REACHED, completed.status)
        assertEquals("authentic", completed.finalVerdict)
    }

    @Test
    fun testOfflineRegistrationEntity_pendingDefaultsAndRetryCap() {
        // Ticket #110 (T2): airplane-mode register queues a pending Room row.
        val queued = OfflineRegistrationEntity(
            id = "reg-9876543210-123",
            fieldsJson = """{"name":"Gauri Devi","phone":"9876543210","pin":"1234"}""",
            languageCode = "bhojpuri",
            timestamp = 123L
        )
        assertEquals("reg-9876543210-123", queued.id)
        assertEquals("bhojpuri", queued.languageCode)
        assertFalse(queued.synced)
        assertEquals(0, queued.retryCount)
        assertEquals(5, OfflineRegistrationEntity.MAX_RETRY_ATTEMPTS)

        // Synced + retry-bump transitions used by SyncWorker
        val retrying = queued.copy(retryCount = 1, lastSyncError = "Failed to connect")
        assertEquals(1, retrying.retryCount)
        val synced = retrying.copy(synced = true)
        assertTrue(synced.synced)
    }
}
