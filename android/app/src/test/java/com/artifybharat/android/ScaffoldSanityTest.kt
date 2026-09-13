package com.artifybharat.android

import com.artifybharat.android.navigation.BottomNavItems
import com.artifybharat.android.navigation.Screen
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ScaffoldSanityTest {

    @Test
    fun verifyNavigationRoutesDefined() {
        assertEquals("voice_catalog", Screen.VoiceCatalog.route)
        assertTrue(Screen.AuthenticityStudio.route.startsWith("authenticity_studio"))
        assertEquals("fair_wage_pricing", Screen.FairWagePricing.route)
        assertTrue(Screen.DigitalPassport.route.startsWith("digital_passport"))
        assertTrue(Screen.ThermalPrint.route.startsWith("thermal_print"))
        assertEquals("offline_sync_queue", Screen.OfflineSyncQueue.route)
        assertEquals("shg_coordinator_hub", Screen.ShgCoordinatorHub.route)
        assertEquals("direct_marketplace", Screen.DirectMarketplace.route)
    }

    @Test
    fun verifyBottomNavItemsCount() {
        assertEquals(5, BottomNavItems.size)
        assertEquals("आवाज़", BottomNavItems[0].hindi)
        assertEquals("स्टूडियो", BottomNavItems[1].hindi)
        assertEquals("मूल्य", BottomNavItems[2].hindi)
        assertEquals("पासपोर्ट", BottomNavItems[3].hindi)
        assertEquals("सिंक", BottomNavItems[4].hindi)
    }

    @Test
    fun verifyDeepLinkFormat() {
        val route = Screen.DigitalPassport.createRoute("prod-demo-123")
        assertEquals("digital_passport?productId=prod-demo-123", route)

        val printRoute = Screen.ThermalPrint.createRoute("A7X-9B2")
        assertEquals("thermal_print?shortcode=A7X-9B2", printRoute)
    }
}
