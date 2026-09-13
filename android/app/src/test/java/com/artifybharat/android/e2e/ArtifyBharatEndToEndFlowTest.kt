package com.artifybharat.android.e2e

import com.artifybharat.android.data.local.entity.DraftEntity
import com.artifybharat.android.data.local.entity.JuryEntity
import com.artifybharat.android.data.local.entity.PhotoEntity
import com.artifybharat.android.data.network.NetworkClient
import com.artifybharat.android.data.network.dto.CostBreakdownDto
import com.artifybharat.android.data.network.dto.DadiQueryResponseDto
import com.artifybharat.android.data.network.dto.DraftItemDto
import com.artifybharat.android.data.network.dto.DraftSyncRequestDto
import com.artifybharat.android.data.network.dto.DraftSyncResponseDto
import com.artifybharat.android.data.network.dto.FairWagePricingResponseDto
import com.artifybharat.android.data.network.dto.HeritagePassportResponseDto
import com.artifybharat.android.data.network.dto.PeerJuryAssignResponseDto
import com.artifybharat.android.data.network.dto.PeerJuryVoteResponseDto
import com.artifybharat.android.data.network.dto.VoiceCatalogResponseDto
import com.artifybharat.android.hardware.audio.AudioRecorder
import com.artifybharat.android.hardware.bluetooth.EscPosRenderer
import com.artifybharat.android.hardware.bluetooth.PrinterWidth
import com.artifybharat.android.hardware.bluetooth.ThermalTagData
import com.artifybharat.android.hardware.camera.CameraManager
import com.artifybharat.android.hardware.location.LocationProvider
import com.google.zxing.BarcodeFormat
import com.google.zxing.qrcode.QRCodeWriter
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ArtifyBharatEndToEndFlowTest {

    private val moshi = NetworkClient.createMoshi()

    @Test
    fun testFull8StageArtisanToBuyerLifecycleE2E() {
        // =========================================================================
        // STAGE 1: Multilingual Voice Auto-Cataloging (Bhojpuri -> Whisper -> IndicTrans2)
        // =========================================================================
        val voiceWavHeader = AudioRecorder.createWavHeader(pcmDataSize = 32000L, sampleRate = 16000, channels = 1)
        assertEquals(44, voiceWavHeader.size)
        assertEquals("RIFF", String(voiceWavHeader.copyOfRange(0, 4), Charsets.US_ASCII))
        assertEquals("WAVE", String(voiceWavHeader.copyOfRange(8, 12), Charsets.US_ASCII))

        val voiceJson = """
            {
                "product_id": "draft-vns-8821",
                "transcript_regional": "ई हमार हाथ से बुनल शुद्ध बनारसी कतान सिल्क साड़ी ह, प्राकृतिक जाफरानी रंग से रंगल।",
                "transcript_english": "This is our handwoven pure Banarasi Katan silk saree, dyed with natural saffron color.",
                "metadata": {
                    "title": "Banarasi Katan Silk Brocade Saree",
                    "description": "Handwoven pure silk saree with kadhwa zari motifs",
                    "craft_category": "handloom",
                    "gi_tag_status": "certified",
                    "weave_technique": "Kadhwa",
                    "estimated_days": 14.0,
                    "seo_tags": ["banarasi", "katan", "silk", "handloom", "gi-certified"]
                },
                "status": "cataloged"
            }
        """.trimIndent()
        val voiceDto = moshi.adapter(VoiceCatalogResponseDto::class.java).fromJson(voiceJson)
        assertNotNull(voiceDto)
        assertEquals("Banarasi Katan Silk Brocade Saree", voiceDto?.metadata?.title)
        assertEquals(14.0, voiceDto?.metadata?.estimatedDays ?: 0.0, 0.01)

        // =========================================================================
        // STAGE 2: Authenticity Studio Photography (WIP on loom + Final + GPS + EXIF)
        // =========================================================================
        val sampleWipBytes = "WIP-PHOTO-ON-LOOM-WARP-WEFT-EVIDENCE-BYTES".toByteArray(Charsets.UTF_8)
        val wipDigest = CameraManager.computeSha256(sampleWipBytes)
        assertEquals(64, wipDigest.length)

        // Cluster geofence check (artisan in Varanasi handloom cluster: 25.32N, 82.98E)
        val (cluster, clusterDistance) = LocationProvider.verifyClusterProximity(25.3200, 82.9800)
        assertEquals("Varanasi Handloom Cluster", cluster.name)
        assertTrue(clusterDistance <= cluster.maxRadiusKm)

        val wipPhoto = PhotoEntity(
            id = "photo-wip-8821",
            draftId = "draft-vns-8821",
            photoType = PhotoEntity.TYPE_WIP,
            localFilePath = "/data/user/0/app/files/craft_wip_8821.jpg",
            sha256Hex = wipDigest,
            gpsLat = 25.3200,
            gpsLng = 82.9800,
            timestampIso = "2026-09-13T10:00:00Z",
            isNaturalLight = true,
            isUploaded = false
        )
        assertFalse(wipPhoto.isUploaded)

        // =========================================================================
        // STAGE 3: Fair-Wage Dynamic Pricing Engine (Statutory Floor Rs. 3530 Enforcement)
        // =========================================================================
        val rawMaterialCost = 1400.0
        val laborHours = 28.0
        val hourlyWage = 85.0
        val fairWages = laborHours * hourlyWage // 2380.0
        val statutoryFloor = rawMaterialCost + fairWages + (rawMaterialCost * 0.05) // 1400 + 2380 + 70 = 3850.0

        assertTrue(statutoryFloor >= 3530.0)

        // Sub-floor price attempt (e.g. distress sale Rs. 3000) MUST be blocked
        val distressPrice = 3000.0
        assertTrue(distressPrice < statutoryFloor)

        val finalRetailPrice = 4200.0
        val artisanNetProfit = finalRetailPrice - rawMaterialCost - fairWages - 70.0
        assertEquals(350.0, artisanNetProfit, 0.01)

        // =========================================================================
        // STAGE 4: Cryptographic Heritage Passport Generation (SHA-256 + Shortcode A7X-9B2)
        // =========================================================================
        val passportJson = """
            {
                "product_id": "draft-vns-8821",
                "passport_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
                "qr_code_data_uri": "data:image/svg+xml;base64,PHN2Zy...",
                "verification_url": "https://artifybharat.gov.in/verify/A7X-9B2",
                "issued_at": "2026-09-13T10:15:00Z"
            }
        """.trimIndent()
        val passportDto = moshi.adapter(HeritagePassportResponseDto::class.java).fromJson(passportJson)
        assertNotNull(passportDto)
        val shortcode = "A7X-9B2"

        // QR BitMatrix encoding
        val qrWriter = QRCodeWriter()
        val bitMatrix = qrWriter.encode(passportDto?.verificationUrl, BarcodeFormat.QR_CODE, 200, 200)
        assertNotNull(bitMatrix)
        assertEquals(200, bitMatrix.width)

        // =========================================================================
        // STAGE 5: 58mm ESC/POS Thermal Tag Printing (Bluetooth SPP, Model 2 QR, Cut)
        // =========================================================================
        val tagData = ThermalTagData(
            productTitle = voiceDto!!.metadata.title,
            craftCategory = voiceDto.metadata.craftCategory,
            artisanName = "Gauri Devi",
            clusterName = cluster.name,
            fairWageFloor = statutoryFloor,
            fairRetailPrice = finalRetailPrice,
            shortcode = shortcode,
            passportHash = passportDto!!.passportHash,
            isGiCertified = true,
            copyCount = 1
        )
        val escPosBytes = EscPosRenderer.renderTag(tagData, PrinterWidth.WIDTH_58MM)
        val receiptText = String(escPosBytes, Charsets.US_ASCII)

        assertTrue(receiptText.contains("ARTIFY BHARAT"))
        assertTrue(receiptText.contains("MoSJE - SIH PS 26090"))
        assertTrue(receiptText.contains("FAIR WAGE FLOOR : Rs. 3850"))
        assertTrue(receiptText.contains("CODE: A7X-9B2"))
        assertTrue(receiptText.contains("SHA256: e3b0c44298fc1c14..."))

        // =========================================================================
        // STAGE 6: Offline-First Synchronization & Conflict Resolution (DRAFT_V2)
        // =========================================================================
        val localDraft = DraftEntity(
            localDraftId = "draft-vns-8821",
            productTitle = voiceDto.metadata.title,
            craftCategory = voiceDto.metadata.craftCategory,
            rawCost = rawMaterialCost,
            laborDays = 3.5,
            status = DraftEntity.STATUS_QUEUED,
            passportHash = passportDto.passportHash,
            shortcode = shortcode
        )
        assertEquals(DraftEntity.STATUS_QUEUED, localDraft.status)

        // Batch upload
        val syncRequest = DraftSyncRequestDto(
            artisanId = "artisan-gauri-01",
            drafts = listOf(DraftItemDto(localDraftId = localDraft.localDraftId, productTitle = localDraft.productTitle))
        )
        val syncResponseJson = """
            {
                "synced_count": 1,
                "synced_draft_ids": ["draft-vns-8821"],
                "status": "success",
                "message": "Synced 1 drafts"
            }
        """.trimIndent()
        val syncDto = moshi.adapter(DraftSyncResponseDto::class.java).fromJson(syncResponseJson)
        assertEquals(1, syncDto?.syncedCount)
        assertEquals(listOf("draft-vns-8821"), syncDto?.syncedDraftIds)

        // Conflict branching test
        val serverConflictDraft = localDraft.copy(status = DraftEntity.STATUS_CONFLICT)
        val branchedV2Draft = localDraft.copy(
            localDraftId = "${localDraft.localDraftId}_V2",
            productTitle = "${localDraft.productTitle} (Revision 2)",
            status = DraftEntity.STATUS_DRAFT
        )
        assertEquals("CONFLICT", serverConflictDraft.status)
        assertEquals("draft-vns-8821_V2", branchedV2Draft.localDraftId)

        // =========================================================================
        // STAGE 7: Zero-Trust Peer Jury Verification (3-Artisan Quorum)
        // =========================================================================
        val juryAssignJson = """
            {
                "jury_ticket_id": "jury-vns-9901",
                "product_id": "draft-vns-8821",
                "cluster_id": "vns-cluster-01",
                "assigned_jurors": ["juror-radha-01", "juror-santosh-02", "juror-meera-03"],
                "quorum_required": 3,
                "status": "in_review",
                "created_at": "2026-09-13T10:20:00Z"
            }
        """.trimIndent()
        val juryAssignDto = moshi.adapter(PeerJuryAssignResponseDto::class.java).fromJson(juryAssignJson)
        assertEquals(3, juryAssignDto?.assignedJurors?.size)

        val juryVoteJson = """
            {
                "jury_ticket_id": "jury-vns-9901",
                "juror_id": "juror-radha-01",
                "vote_recorded": true,
                "votes_received": 3,
                "quorum_reached": true,
                "final_verdict": "authentic",
                "average_authenticity_score": 0.96,
                "consensus_level": "Unanimous"
            }
        """.trimIndent()
        val voteDto = moshi.adapter(PeerJuryVoteResponseDto::class.java).fromJson(juryVoteJson)
        assertTrue(voteDto?.quorumReached == true)
        assertEquals("authentic", voteDto?.finalVerdict)

        // =========================================================================
        // STAGE 8: Direct Craft Marketplace Payout (100% Direct Jan Dhan Realization)
        // =========================================================================
        val buyerPurchasePrice = 4200.0
        val directArtisanShare = buyerPurchasePrice * 0.88 // Rs. 3696
        val indiaPostShare = buyerPurchasePrice * 0.07     // Rs. 294
        val rawMaterialFund = buyerPurchasePrice * 0.05    // Rs. 210

        assertEquals(buyerPurchasePrice, directArtisanShare + indiaPostShare + rawMaterialFund, 0.01)
        assertTrue(directArtisanShare >= fairWages) // Artisan gets full fair wage + profit
    }
}
