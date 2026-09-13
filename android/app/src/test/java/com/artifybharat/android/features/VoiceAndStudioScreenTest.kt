package com.artifybharat.android.features

import com.artifybharat.android.features.studio.AuthenticityStudioUiState
import com.artifybharat.android.features.studio.CaptureStage
import com.artifybharat.android.features.voice.SUPPORTED_DIALECTS
import com.artifybharat.android.features.voice.VoiceCatalogUiState
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class VoiceAndStudioScreenTest {

    @Test
    fun testSupportedDialectsInventory() {
        assertEquals(8, SUPPORTED_DIALECTS.size)
        val dialectCodes = SUPPORTED_DIALECTS.map { it.first }
        assertTrue(dialectCodes.contains("bhojpuri"))
        assertTrue(dialectCodes.contains("maithili"))
        assertTrue(dialectCodes.contains("hindi"))
        assertTrue(dialectCodes.contains("marwari"))
        assertTrue(dialectCodes.contains("odia"))
        assertTrue(dialectCodes.contains("bengali"))
        assertTrue(dialectCodes.contains("tamil"))
        assertTrue(dialectCodes.contains("telugu"))
    }

    @Test
    fun testVoiceCatalogUiStateTransitions() {
        val initial = VoiceCatalogUiState()
        assertEquals("bhojpuri", initial.selectedDialect)
        assertFalse(initial.isRecording)
        assertFalse(initial.isCataloged)

        // Simulate cataloged state with parsed Whisper/IndicTrans2 metadata
        val cataloged = initial.copy(
            isCataloged = true,
            productTitle = "Banarasi Brocade Saree",
            craftCategory = "handloom",
            regionalTranscript = "ई बनारसी साड़ी ह",
            englishTranscript = "This is a Banarasi saree",
            estimatedDays = 5.0,
            estimatedLaborHours = 40.0
        )

        assertTrue(cataloged.isCataloged)
        assertEquals("Banarasi Brocade Saree", cataloged.productTitle)
        assertEquals(40.0, cataloged.estimatedLaborHours, 0.01)
    }

    @Test
    fun testStudioCaptureStageTransitions() {
        val studioState = AuthenticityStudioUiState()
        assertEquals(CaptureStage.WIP, studioState.currentStage)
        assertTrue(studioState.isGyroAligned)

        // Switch to Final stage
        val finalStage = studioState.copy(currentStage = CaptureStage.FINAL)
        assertEquals(CaptureStage.FINAL, finalStage.currentStage)
    }
}
