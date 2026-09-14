package com.artifybharat.android.hardware.bluetooth

import java.io.ByteArrayOutputStream
import java.nio.charset.Charset

enum class PrinterWidth(val dotsPerLine: Int, val charsPerLine: Int) {
    WIDTH_58MM(dotsPerLine = 384, charsPerLine = 32),
    WIDTH_80MM(dotsPerLine = 576, charsPerLine = 48)
}

data class ThermalTagData(
    val productTitle: String,
    val craftCategory: String,
    val artisanName: String,
    val clusterName: String,
    val fairWageFloor: Double,
    val fairRetailPrice: Double,
    val shortcode: String,
    val passportHash: String,
    val isGiCertified: Boolean = true,
    val copyCount: Int = 1
)

object EscPosRenderer {

    // Standard ESC/POS Command Constants
    val CMD_INIT = byteArrayOf(0x1B, 0x40) // ESC @
    val CMD_ALIGN_LEFT = byteArrayOf(0x1B, 0x61, 0x00) // ESC a 0
    val CMD_ALIGN_CENTER = byteArrayOf(0x1B, 0x61, 0x01) // ESC a 1
    val CMD_ALIGN_RIGHT = byteArrayOf(0x1B, 0x61, 0x02) // ESC a 2

    val CMD_BOLD_ON = byteArrayOf(0x1B, 0x45, 0x01) // ESC E 1
    val CMD_BOLD_OFF = byteArrayOf(0x1B, 0x45, 0x00) // ESC E 0

    val CMD_DOUBLE_HEIGHT_ON = byteArrayOf(0x1D, 0x21, 0x01) // GS ! 1
    val CMD_DOUBLE_WIDTH_ON = byteArrayOf(0x1D, 0x21, 0x10) // GS ! 16
    val CMD_DOUBLE_SIZE_ON = byteArrayOf(0x1D, 0x21, 0x11) // GS ! 17 (2x width & height)
    val CMD_NORMAL_SIZE = byteArrayOf(0x1D, 0x21, 0x00) // GS ! 0

    val CMD_FEED_AND_PARTIAL_CUT = byteArrayOf(0x1D, 0x56, 0x01) // GS V 1
    val CMD_FEED_3_LINES = byteArrayOf(0x1B, 0x64, 0x03) // ESC d 3

    fun buildDivider(width: PrinterWidth): String {
        return "-".repeat(width.charsPerLine) + "\n"
    }

    fun buildCenteredText(text: String, width: PrinterWidth): String {
        val pad = ((width.charsPerLine - text.length) / 2).coerceAtLeast(0)
        return " ".repeat(pad) + text + "\n"
    }

    /**
     * Builds ESC/POS commands to print a 2D QR Code using standard ESC/POS Model 2 commands.
     * Function 165: Select Model (Model 2)
     * Function 167: Module size (default: 6 for 203 DPI)
     * Function 169: Error correction (Level M = 49)
     * Function 180: Store data
     * Function 181: Print symbol
     */
    fun buildNativeQrBytes(qrUrl: String, moduleSize: Byte = 6): ByteArray {
        val out = ByteArrayOutputStream()
        val urlBytes = qrUrl.toByteArray(Charsets.US_ASCII)
        val dataLen = urlBytes.size + 3
        val pL = (dataLen and 0xFF).toByte()
        val pH = ((dataLen shr 8) and 0xFF).toByte()

        // 1. Set Model 2 (Function 165)
        out.write(byteArrayOf(0x1D, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00))

        // 2. Set module size (Function 167)
        out.write(byteArrayOf(0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, moduleSize))

        // 3. Set error correction level M (Function 169)
        out.write(byteArrayOf(0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x31))

        // 4. Store symbol data (Function 180)
        out.write(byteArrayOf(0x1D, 0x28, 0x6B, pL, pH, 0x31, 0x50, 0x30))
        out.write(urlBytes)

        // 5. Print QR symbol (Function 181)
        out.write(byteArrayOf(0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30))

        return out.toByteArray()
    }

    /**
     * Renders a complete 58mm/80mm thermal authenticity tag with:
     * - Government Emblem & MoSJE SIH Header
     * - Product Title & Craft Taxonomy
     * - Artisan Name & Cluster Centroid
     * - Transparent Fair Wage Floor Callout
     * - Scannable Provenance QR Code (https://artifybharat.gov.in/verify/{shortcode})
     * - Large human-readable 6-char shortcode banner (e.g. A7X-9B2)
     * - Truncated SHA-256 cryptographic seal
     */
    fun renderTag(
        data: ThermalTagData,
        width: PrinterWidth = PrinterWidth.WIDTH_58MM
    ): ByteArray {
        val out = ByteArrayOutputStream()
        val ascii = Charset.forName("US-ASCII")

        val effectiveCopies = data.copyCount.coerceIn(1, 5)

        for (copy in 1..effectiveCopies) {
            // 1. Initialize printer
            out.write(CMD_INIT)

            // 2. Header
            out.write(CMD_ALIGN_CENTER)
            out.write(CMD_BOLD_ON)
            out.write(CMD_DOUBLE_HEIGHT_ON)
            out.write("ARTIFY BHARAT\n".toByteArray(ascii))
            out.write(CMD_NORMAL_SIZE)
            out.write("MoSJE - SIH PS 26090\n".toByteArray(ascii))
            out.write("Digital Heritage Passport\n".toByteArray(ascii))
            out.write(CMD_BOLD_OFF)
            out.write(buildDivider(width).toByteArray(ascii))

            // 3. Product & Artisan Information
            out.write(CMD_ALIGN_LEFT)
            out.write("PRODUCT: ${data.productTitle.take(width.charsPerLine - 9)}\n".toByteArray(ascii))
            out.write("CRAFT  : ${data.craftCategory.uppercase()}\n".toByteArray(ascii))
            out.write("ARTISAN: ${data.artisanName}\n".toByteArray(ascii))
            out.write("CLUSTER: ${data.clusterName}\n".toByteArray(ascii))
            if (data.isGiCertified) {
                out.write("GI CERT: VERIFIED AUTHENTIC\n".toByteArray(ascii))
            }
            out.write(buildDivider(width).toByteArray(ascii))

            // 4. Financial Transparency & Fair Wage Floor
            out.write(CMD_BOLD_ON)
            val floorStr = "FAIR WAGE FLOOR : Rs. ${String.format("%.0f", data.fairWageFloor)}"
            out.write("$floorStr\n".toByteArray(ascii))
            val priceStr = "RETAIL PRICE    : Rs. ${String.format("%.0f", data.fairRetailPrice)}"
            out.write("$priceStr\n".toByteArray(ascii))
            out.write(CMD_BOLD_OFF)
            out.write(buildDivider(width).toByteArray(ascii))

            // 5. Native QR Code
            out.write(CMD_ALIGN_CENTER)
            val qrUrl = "https://artifybharat.gov.in/verify/${data.shortcode}"
            out.write(buildNativeQrBytes(qrUrl, moduleSize = if (width == PrinterWidth.WIDTH_58MM) 6 else 8))
            out.write("\n".toByteArray(ascii))

            // 6. Large Shortcode Banner
            out.write(CMD_BOLD_ON)
            out.write(CMD_DOUBLE_SIZE_ON)
            out.write("CODE: ${data.shortcode}\n".toByteArray(ascii))
            out.write(CMD_NORMAL_SIZE)
            out.write(CMD_BOLD_OFF)

            // 7. Cryptographic Provenance Hash Slice
            val hashSlice = data.passportHash.take(16).lowercase()
            out.write("SHA256: ${hashSlice}...\n".toByteArray(ascii))
            out.write("Scan to verify artisan authenticity\n".toByteArray(ascii))

            if (effectiveCopies > 1) {
                out.write("Tag $copy of $effectiveCopies\n".toByteArray(ascii))
            }

            // 8. Feed and Cut
            out.write(CMD_FEED_3_LINES)
            out.write(CMD_FEED_AND_PARTIAL_CUT)
        }

        return out.toByteArray()
    }
}
