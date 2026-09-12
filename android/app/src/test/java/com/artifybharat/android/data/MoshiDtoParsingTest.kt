package com.artifybharat.android.data

import com.artifybharat.android.data.network.NetworkClient
import com.artifybharat.android.data.network.dto.CatalogMetadataDto
import com.artifybharat.android.data.network.dto.CostBreakdownDto
import com.artifybharat.android.data.network.dto.DadiQueryResponseDto
import com.artifybharat.android.data.network.dto.DraftSyncResponseDto
import com.artifybharat.android.data.network.dto.FairWagePricingResponseDto
import com.artifybharat.android.data.network.dto.HeritagePassportResponseDto
import com.artifybharat.android.data.network.dto.PeerJuryAssignResponseDto
import com.artifybharat.android.data.network.dto.PublicPassportVerificationDto
import com.artifybharat.android.data.network.dto.StudioEnhanceResponseDto
import com.artifybharat.android.data.network.dto.VoiceCatalogResponseDto
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class MoshiDtoParsingTest {

    private val moshi = NetworkClient.createMoshi()

    @Test
    fun testVoiceCatalogResponseParsing() {
        val json = """
            {
                "product_id": "prod-101",
                "transcript_regional": "ई हमार हाथ से बुनल बनारसी साड़ी ह",
                "transcript_english": "This is our handwoven Banarasi saree",
                "metadata": {
                    "title": "Banarasi Katan Silk Saree",
                    "description": "Authentic handwoven saree from Varanasi",
                    "craft_category": "handloom",
                    "gi_tag_status": "certified",
                    "weave_technique": "Kadhwa",
                    "estimated_days": 14.5,
                    "seo_tags": ["banarasi", "silk", "handloom"]
                },
                "status": "cataloged"
            }
        """.trimIndent()

        val adapter = moshi.adapter(VoiceCatalogResponseDto::class.java)
        val result = adapter.fromJson(json)

        assertNotNull(result)
        assertEquals("prod-101", result?.productId)
        assertEquals("Banarasi Katan Silk Saree", result?.metadata?.title)
        assertEquals(14.5, result?.metadata?.estimatedDays ?: 0.0, 0.01)
        assertEquals(3, result?.metadata?.seoTags?.size)
    }

    @Test
    fun testDadiQueryResponseParsing() {
        val json = """
            {
                "answer_text": "बिटिया, ई साड़ी बहुत सुंदर बा! एकर दाम कम से कम 3500 रखे के चाहीं।",
                "answer_english": "Daughter, this saree is very beautiful! You should price it at least 3500.",
                "dialect": "bhojpuri",
                "audio_response_url": "/media/dadi_voice_sample.mp3",
                "suggested_actions": ["Calculate Fair Wage", "View GI Details"],
                "dadi_tip": "Always weave authentic motifs to preserve GI heritage."
            }
        """.trimIndent()

        val adapter = moshi.adapter(DadiQueryResponseDto::class.java)
        val result = adapter.fromJson(json)

        assertNotNull(result)
        assertEquals("bhojpuri", result?.dialect)
        assertEquals(2, result?.suggestedActions?.size)
        assertTrue(result?.answerEnglish?.contains("3500") == true)
    }

    @Test
    fun testFairWagePricingResponseParsing() {
        val json = """
            {
                "state_code": "HR",
                "state_name": "Haryana",
                "hourly_wage_rate": 85.0,
                "statutory_floor_enforced": true,
                "is_gi_tagged": true,
                "gi_heritage_multiplier": 1.15,
                "statutory_floor_price": 3530.0,
                "fair_retail_price": 4200.0,
                "bulk_wholesale_price": 3800.0,
                "artisan_net_profit": 850.0,
                "direct_realization_percent": 88.5,
                "cost_breakdown": {
                    "raw_materials": 1200.0,
                    "fair_wages": 1800.0,
                    "packaging_and_logistics": 350.0,
                    "artisan_profit": 850.0,
                    "platform_fee": 0.0
                },
                "pricing_formula_summary": "Statutory Floor (Rs. 3530) enforced + 1.15x GI multiplier"
            }
        """.trimIndent()

        val adapter = moshi.adapter(FairWagePricingResponseDto::class.java)
        val result = adapter.fromJson(json)

        assertNotNull(result)
        assertEquals(3530.0, result?.statutoryFloorPrice ?: 0.0, 0.01)
        assertEquals(4200.0, result?.fairRetailPrice ?: 0.0, 0.01)
        assertEquals(1800.0, result?.costBreakdown?.fairWages ?: 0.0, 0.01)
        assertTrue(result?.isGiTagged == true)
    }

    @Test
    fun testHeritagePassportResponseParsing() {
        val json = """
            {
                "product_id": "prod-demo-01",
                "passport_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
                "qr_code_data_uri": "data:image/svg+xml;base64,PHN2Zy...",
                "verification_url": "https://artifybharat.gov.in/verify/A7X-9B2",
                "issued_at": "2026-09-13T10:00:00Z"
            }
        """.trimIndent()

        val adapter = moshi.adapter(HeritagePassportResponseDto::class.java)
        val result = adapter.fromJson(json)

        assertNotNull(result)
        assertEquals("prod-demo-01", result?.productId)
        assertTrue(result?.verificationUrl?.endsWith("A7X-9B2") == true)
    }

    @Test
    fun testPeerJuryAssignResponseParsing() {
        val json = """
            {
                "jury_ticket_id": "jury-vns-991",
                "product_id": "prod-demo-01",
                "cluster_id": "vns-cluster-01",
                "assigned_jurors": ["juror-1", "juror-2", "juror-3"],
                "quorum_required": 3,
                "status": "in_review",
                "created_at": "2026-09-13T10:30:00Z"
            }
        """.trimIndent()

        val adapter = moshi.adapter(PeerJuryAssignResponseDto::class.java)
        val result = adapter.fromJson(json)

        assertNotNull(result)
        assertEquals("jury-vns-991", result?.juryTicketId)
        assertEquals(3, result?.assignedJurors?.size)
    }

    @Test
    fun testDraftSyncResponseParsing() {
        val json = """
            {
                "synced_count": 2,
                "synced_draft_ids": ["draft-01", "draft-02"],
                "status": "success",
                "message": "Successfully synced 2 offline drafts to backend."
            }
        """.trimIndent()

        val adapter = moshi.adapter(DraftSyncResponseDto::class.java)
        val result = adapter.fromJson(json)

        assertNotNull(result)
        assertEquals(2, result?.syncedCount)
        assertEquals(listOf("draft-01", "draft-02"), result?.syncedDraftIds)
    }
}
