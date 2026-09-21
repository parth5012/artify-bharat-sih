package com.artifybharat.android.navigation

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * [Artisan App T5] Navigation routes + BottomNav restructure.
 * Pure-JVM: Screen route constants, 5-tab BottomNav, startDestination fallback.
 */
class NavGraphRoutesTest {

    @Test
    fun testArtisanHomeRoute() {
        assertEquals("artisan_home", Screen.ArtisanHome.route)
        assertEquals("होम", Screen.ArtisanHome.hindiTitle)
        assertEquals("Home", Screen.ArtisanHome.englishTitle)
    }

    @Test
    fun testArtisanProfileRoute() {
        assertEquals("artisan_profile", Screen.ArtisanProfile.route)
        assertEquals("प्रोफ़ाइल", Screen.ArtisanProfile.hindiTitle)
        assertEquals("Profile", Screen.ArtisanProfile.englishTitle)
    }

    @Test
    fun testProductManagementRoute() {
        assertEquals("product_management", Screen.ProductManagement.route)
        assertEquals("उत्पाद", Screen.ProductManagement.hindiTitle)
        assertEquals("Products", Screen.ProductManagement.englishTitle)
    }

    @Test
    fun testBottomNavHasFiveTabs() {
        assertEquals(5, BottomNavItems.size)
    }

    @Test
    fun testBottomNavRoutesInOrder() {
        val routes = BottomNavItems.map { it.route }
        assertEquals(
            listOf(
                Screen.ArtisanHome.route,
                Screen.ProductManagement.route,
                Screen.VoiceCatalog.route,
                Screen.FairWagePricing.route,
                Screen.ArtisanProfile.route
            ),
            routes
        )
    }

    @Test
    fun testBottomNavBilingualLabels() {
        val byRoute = BottomNavItems.associateBy { it.route }
        assertEquals("होम", byRoute[Screen.ArtisanHome.route]?.hindi)
        assertEquals("Home", byRoute[Screen.ArtisanHome.route]?.english)
        assertEquals("उत्पाद", byRoute[Screen.ProductManagement.route]?.hindi)
        assertEquals("Products", byRoute[Screen.ProductManagement.route]?.english)
        assertEquals("नया", byRoute[Screen.VoiceCatalog.route]?.hindi)
        assertEquals("Catalog", byRoute[Screen.VoiceCatalog.route]?.english)
        assertEquals("मूल्य", byRoute[Screen.FairWagePricing.route]?.hindi)
        assertEquals("Price", byRoute[Screen.FairWagePricing.route]?.english)
        assertEquals("प्रोफ़ाइल", byRoute[Screen.ArtisanProfile.route]?.hindi)
        assertEquals("Profile", byRoute[Screen.ArtisanProfile.route]?.english)
    }

    @Test
    fun testBottomNavRoutesDistinct() {
        val routes = BottomNavItems.map { it.route }
        assertEquals(routes.size, routes.toSet().size)
    }

    @Test
    fun testStartDestinationOnboarded() {
        assertEquals(Screen.ArtisanHome.route, resolveStartDestination(isOnboarded = true))
    }

    @Test
    fun testStartDestinationFallbackOnboarding() {
        assertEquals(Screen.Onboarding.route, resolveStartDestination(isOnboarded = false))
    }

    @Test
    fun testBottomNavCoversNewScreens() {
        val routes = BottomNavItems.map { it.route }.toSet()
        assertTrue(routes.contains(Screen.ArtisanHome.route))
        assertTrue(routes.contains(Screen.ArtisanProfile.route))
        assertTrue(routes.contains(Screen.ProductManagement.route))
    }
}
