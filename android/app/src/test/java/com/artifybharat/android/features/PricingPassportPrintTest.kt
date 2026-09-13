package com.artifybharat.android.features

import com.artifybharat.android.features.passport.DigitalPassportUiState
import com.artifybharat.android.features.passport.DigitalPassportViewModel
import com.artifybharat.android.features.pricing.FairWagePricingUiState
import com.artifybharat.android.features.print.ThermalPrintUiState
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class PricingPassportPrintTest {

    @Test
    fun testFairWageSubFloorWarningLogic() {
        val state = FairWagePricingUiState(statutoryFloorPrice = 3530.0, selectedPrice = 4200.0)
        assertFalse(state.isSubFloorWarning)

        // Lower price below floor
        val subFloor = state.copy(
            selectedPrice = 3200.0,
            isSubFloorWarning = true
        )
        assertTrue(subFloor.isSubFloorWarning)
        assertTrue(subFloor.selectedPrice < subFloor.statutoryFloorPrice)
    }

    @Test
    fun testQrBitMatrixGeneration() {
        val testUrl = "https://artifybharat.gov.in/verify/A7X-9B2"
        val writer = com.google.zxing.qrcode.QRCodeWriter()
        val bitMatrix = writer.encode(testUrl, com.google.zxing.BarcodeFormat.QR_CODE, 128, 128)
        assertNotNull(bitMatrix)
        assertEquals(128, bitMatrix.width)
        assertEquals(128, bitMatrix.height)
    }

    @Test
    fun testPrintCopyCountClamping() {
        val printState = ThermalPrintUiState()
        assertEquals(1, printState.copyCount)

        val clampedHigh = printState.copy(copyCount = 10.coerceIn(1, 5))
        assertEquals(5, clampedHigh.copyCount)

        val clampedLow = printState.copy(copyCount = (-2).coerceIn(1, 5))
        assertEquals(1, clampedLow.copyCount)
    }
}
