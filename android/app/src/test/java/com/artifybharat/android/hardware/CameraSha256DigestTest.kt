package com.artifybharat.android.hardware

import com.artifybharat.android.hardware.camera.CameraManager
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class CameraSha256DigestTest {

    @Test
    fun testSha256EmptyInput() {
        val hash = CameraManager.computeSha256(ByteArray(0))
        assertEquals("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", hash)
    }

    @Test
    fun testSha256SampleCraftBytes() {
        val testBytes = "ArtifyBharat-WIP-Photo-Craft-Bytes".toByteArray(Charsets.UTF_8)
        val hash = CameraManager.computeSha256(testBytes)
        assertEquals(64, hash.length)
        assertTrue(hash.all { it in "0123456789abcdef" })
    }

    @Test
    fun testNaturalLightThresholds() {
        val lowLight = 30.0
        val goodLight = 120.0
        val harshGlare = 240.0

        assertFalse(lowLight in CameraManager.NATURAL_LIGHT_MIN_LUMA..CameraManager.NATURAL_LIGHT_MAX_LUMA)
        assertTrue(goodLight in CameraManager.NATURAL_LIGHT_MIN_LUMA..CameraManager.NATURAL_LIGHT_MAX_LUMA)
        assertFalse(harshGlare in CameraManager.NATURAL_LIGHT_MIN_LUMA..CameraManager.NATURAL_LIGHT_MAX_LUMA)
    }
}
