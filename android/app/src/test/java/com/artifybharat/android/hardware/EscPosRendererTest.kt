package com.artifybharat.android.hardware

import com.artifybharat.android.hardware.bluetooth.EscPosRenderer
import com.artifybharat.android.hardware.bluetooth.PrinterWidth
import com.artifybharat.android.hardware.bluetooth.ThermalTagData
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class EscPosRendererTest {

    private val sampleTag = ThermalTagData(
        productTitle = "Maheshwari Handloom Dupatta",
        craftCategory = "handloom",
        artisanName = "Gauri Devi",
        clusterName = "Varanasi Handloom Cluster",
        fairWageFloor = 3530.0,
        fairRetailPrice = 4200.0,
        shortcode = "A7X-9B2",
        passportHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        isGiCertified = true,
        copyCount = 1
    )

    @Test
    fun testNativeQrByteSequence() {
        val testUrl = "https://artifybharat.gov.in/verify/A7X-9B2"
        val qrBytes = EscPosRenderer.buildNativeQrBytes(testUrl, moduleSize = 6)

        assertNotNull(qrBytes)
        assertTrue(qrBytes.isNotEmpty())

        // Verify Model 2 selection bytes
        val model2Pattern = byteArrayOf(0x1D, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00)
        assertTrue(indexOfSubarray(qrBytes, model2Pattern) != -1)

        // Verify Error Correction Level M bytes
        val eccPattern = byteArrayOf(0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x31)
        assertTrue(indexOfSubarray(qrBytes, eccPattern) != -1)

        // Verify Print symbol bytes
        val printPattern = byteArrayOf(0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30)
        assertTrue(indexOfSubarray(qrBytes, printPattern) != -1)

        // Verify URL string is present in byte stream
        val content = String(qrBytes, Charsets.US_ASCII)
        assertTrue(content.contains("https://artifybharat.gov.in/verify/A7X-9B2"))
    }

    @Test
    fun testThermalTagByteStreamGeneration58mm() {
        val bytes = EscPosRenderer.renderTag(sampleTag, PrinterWidth.WIDTH_58MM)
        val text = String(bytes, Charsets.US_ASCII)

        // Starts with ESC @ (0x1B, 0x40)
        assertEquals(0x1B.toByte(), bytes[0])
        assertEquals(0x40.toByte(), bytes[1])

        // Contains MoSJE SIH branding
        assertTrue(text.contains("ARTIFY BHARAT"))
        assertTrue(text.contains("MoSJE - SIH PS 26090"))
        assertTrue(text.contains("Digital Heritage Passport"))

        // Contains artisan & craft details (truncated to line width)
        assertTrue(text.contains("PRODUCT: Maheshwari Handloom"))
        assertTrue(text.contains("CRAFT  : HANDLOOM"))
        assertTrue(text.contains("ARTISAN: Gauri Devi"))
        assertTrue(text.contains("CLUSTER: Varanasi Handloom Cluster"))

        // Contains Fair Wage Floor and Retail Price
        assertTrue(text.contains("FAIR WAGE FLOOR : Rs. 3530"))
        assertTrue(text.contains("RETAIL PRICE    : Rs. 4200"))

        // Contains large shortcode banner
        assertTrue(text.contains("CODE: A7X-9B2"))

        // Contains truncated SHA-256 hash slice
        assertTrue(text.contains("SHA256: e3b0c44298fc1c14..."))

        // Ends with partial cut (0x1D, 0x56, 0x01)
        val cutCommand = byteArrayOf(0x1D, 0x56, 0x01)
        assertTrue(indexOfSubarray(bytes, cutCommand) != -1)
    }

    @Test
    fun testMultiCopyCount() {
        val multiTag = sampleTag.copy(copyCount = 2)
        val bytes = EscPosRenderer.renderTag(multiTag, PrinterWidth.WIDTH_58MM)
        val text = String(bytes, Charsets.US_ASCII)

        assertTrue(text.contains("Tag 1 of 2"))
        assertTrue(text.contains("Tag 2 of 2"))

        // Should have 2 cut commands
        val cutCommand = byteArrayOf(0x1D, 0x56, 0x01)
        var count = 0
        var idx = 0
        while (idx < bytes.size) {
            val next = indexOfSubarray(bytes, cutCommand, idx)
            if (next != -1) {
                count++
                idx = next + cutCommand.size
            } else {
                break
            }
        }
        assertEquals(2, count)
    }

    @Test
    fun test80mmWidthDividerFormatting() {
        val divider58 = EscPosRenderer.buildDivider(PrinterWidth.WIDTH_58MM)
        val divider80 = EscPosRenderer.buildDivider(PrinterWidth.WIDTH_80MM)

        assertEquals(33, divider58.length) // 32 dashes + \n
        assertEquals(49, divider80.length) // 48 dashes + \n
    }

    private fun indexOfSubarray(array: ByteArray, target: ByteArray, start: Int = 0): Int {
        if (target.isEmpty()) return 0
        outer@ for (i in start..array.size - target.size) {
            for (j in target.indices) {
                if (array[i + j] != target[j]) {
                    continue@outer
                }
            }
            return i
        }
        return -1
    }
}
