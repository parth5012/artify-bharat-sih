package com.artifybharat.android.hardware

import com.artifybharat.android.hardware.permissions.JitPermissions
import com.artifybharat.android.hardware.permissions.JitPermissions.JitPermission
import com.artifybharat.android.ui.dialogs.PermissionType
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * T4 (#112) — Just-in-time permissions unit test (TDD red first).
 * Mic on Bhasha voice, Camera on Studio tap, GPS on cluster auto-suggest.
 * Each asked at most once, deny never blocks, permanent-deny routes to Settings.
 */
class JitPermissionsTest {

    @Test
    fun testHindiWhyLinesAreNonBlank() {
        assertTrue(JitPermissions.MIC_WHY_HINDI.isNotBlank())
        assertTrue(JitPermissions.CAMERA_WHY_HINDI.isNotBlank())
        assertTrue(JitPermissions.LOCATION_WHY_HINDI.isNotBlank())
    }

    @Test
    fun testEachPermissionAskedAtMostOnce() {
        var asked = emptySet<JitPermission>()
        assertTrue(JitPermissions.shouldAsk(asked, JitPermission.MIC))
        asked = JitPermissions.markAsked(asked, JitPermission.MIC)
        assertFalse(JitPermissions.shouldAsk(asked, JitPermission.MIC))
        // Other permissions unaffected
        assertTrue(JitPermissions.shouldAsk(asked, JitPermission.CAMERA))
        assertTrue(JitPermissions.shouldAsk(asked, JitPermission.LOCATION))
    }

    @Test
    fun testDenyNeverBlocksCompletion() {
        assertTrue(JitPermissions.canCompleteWithDenies(setOf()))
        assertTrue(
            JitPermissions.canCompleteWithDenies(
                setOf(JitPermission.MIC, JitPermission.CAMERA, JitPermission.LOCATION)
            )
        )
    }

    @Test
    fun testDenyFallbacksAreNonBlank() {
        for (p in JitPermission.values()) {
            assertTrue("Fallback blank for $p", JitPermissions.denyFallback(p).isNotBlank())
        }
    }

    @Test
    fun testMapsToExistingPermissionType() {
        assertEquals(PermissionType.AUDIO, JitPermissions.toPermissionType(JitPermission.MIC))
        assertEquals(PermissionType.CAMERA, JitPermissions.toPermissionType(JitPermission.CAMERA))
        assertEquals(PermissionType.LOCATION, JitPermissions.toPermissionType(JitPermission.LOCATION))
    }
}
