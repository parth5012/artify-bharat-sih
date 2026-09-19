package com.artifybharat.android.hardware

import com.artifybharat.android.hardware.location.ClusterAutoSuggest
import com.artifybharat.android.hardware.location.LocationProvider
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class LocationClusterVerificationTest {

    @Test
    fun testHaversineCalculationIdenticalCoordinates() {
        val dist = LocationProvider.calculateHaversineDistanceKm(25.3176, 82.9739, 25.3176, 82.9739)
        assertEquals(0.0, dist, 0.001)
    }

    @Test
    fun testClusterProximityInsideVaranasi() {
        // Coordinate 5km away from Varanasi cluster centroid
        val artisanLat = 25.3300
        val artisanLng = 82.9900
        val (cluster, dist) = LocationProvider.verifyClusterProximity(artisanLat, artisanLng)

        assertEquals("Varanasi Handloom Cluster", cluster.name)
        assertTrue(dist < 5.0)
        assertTrue(dist <= cluster.maxRadiusKm) // Within 45km limit
    }

    @Test
    fun testClusterProximityOutOfBounds() {
        // Coordinate in Delhi (28.6139 N, 77.2090 E), far away from all clusters
        val delhiLat = 28.6139
        val delhiLng = 77.2090
        val (cluster, dist) = LocationProvider.verifyClusterProximity(delhiLat, delhiLng)

        assertTrue(dist > 300.0)
        assertFalse(dist <= cluster.maxRadiusKm)
    }

    // #111 auto-suggest: GPS + registry prefill -> 1-tap Yes card.

    @Test
    fun testAutoSuggest_prefersGpsWhenWithinBounds() {
        val suggestion = ClusterAutoSuggest.suggest(
            gpsClusterName = "Varanasi Handloom Cluster",
            gpsWithinBounds = true,
            registryClusterName = "Chanderi Saree Cluster",
            registryCraftCategory = "handloom",
            registryGiCertified = false,
            registryGiTagName = null,
            registryStateCode = "MP",
            lastKnownClusterName = "Chanderi Saree Cluster",
            isOffline = false
        )

        assertEquals("Varanasi Handloom Cluster", suggestion.clusterName)
        assertEquals(ClusterAutoSuggest.SuggestionSource.GPS, suggestion.source)
        assertFalse(suggestion.isLocationPending)
        assertTrue(suggestion.canComplete)
    }

    @Test
    fun testAutoSuggest_fallsBackToRegistryWhenGpsOutOfBounds() {
        val suggestion = ClusterAutoSuggest.suggest(
            gpsClusterName = "Varanasi Handloom Cluster",
            gpsWithinBounds = false,
            registryClusterName = "Chanderi Saree Cluster",
            registryCraftCategory = "handloom",
            registryGiCertified = false,
            registryGiTagName = null,
            registryStateCode = "MP",
            lastKnownClusterName = null,
            isOffline = false
        )

        assertEquals("Chanderi Saree Cluster", suggestion.clusterName)
        assertEquals(ClusterAutoSuggest.SuggestionSource.REGISTRY, suggestion.source)
        assertEquals("handloom", suggestion.craftCategory)
    }

    @Test
    fun testAutoSuggest_offlineUsesLastKnownWithPendingNoteNeverBlocks() {
        val suggestion = ClusterAutoSuggest.suggest(
            gpsClusterName = null,
            gpsWithinBounds = false,
            registryClusterName = "Varanasi Handloom Cluster",
            registryCraftCategory = "Handloom Textile",
            registryGiCertified = true,
            registryGiTagName = "Banarasi Brocade Saree (GI Reg #39)",
            registryStateCode = "UP",
            lastKnownClusterName = "Varanasi Handloom Cluster",
            isOffline = true
        )

        assertEquals("Varanasi Handloom Cluster", suggestion.clusterName)
        assertTrue(suggestion.isLocationPending)
        assertTrue(suggestion.canComplete)
        assertTrue(suggestion.locationNote.contains("pending", ignoreCase = true))
        assertTrue(suggestion.hindiReadout.contains("Varanasi Handloom Cluster"))
    }

    @Test
    fun testAutoSuggest_offlineUsesLastKnownWhenRegistryNull() {
        val suggestion = ClusterAutoSuggest.suggest(
            gpsClusterName = null,
            gpsWithinBounds = false,
            registryClusterName = null,
            registryCraftCategory = "handloom",
            registryGiCertified = true,
            registryGiTagName = "Maheshwar Saree (GI #45)",
            registryStateCode = "MP",
            lastKnownClusterName = "Maheshwar Handloom Cluster",
            isOffline = true
        )

        assertEquals("Maheshwar Handloom Cluster", suggestion.clusterName)
        assertEquals(ClusterAutoSuggest.SuggestionSource.LAST_KNOWN, suggestion.source)
        assertTrue(suggestion.isLocationPending)
        assertTrue(suggestion.canComplete)
        assertTrue(suggestion.locationNote.contains("last known", ignoreCase = true))
    }

    @Test
    fun testAutoSuggest_hindiReadoutMentionsClusterAndCraft() {
        val readout = ClusterAutoSuggest.hindiReadout(
            clusterName = "Varanasi Handloom Cluster",
            craftLabel = "Banarasi Brocade"
        )

        assertTrue(readout.contains("Kya aap"))
        assertTrue(readout.contains("Varanasi Handloom Cluster"))
        assertTrue(readout.contains("Banarasi Brocade"))
    }

    @Test
    fun testAutoSuggest_resolveStateCodeMapsFamousClusters() {
        assertEquals("UP", ClusterAutoSuggest.resolveStateCode("Varanasi Handloom Cluster"))
        assertEquals("RJ", ClusterAutoSuggest.resolveStateCode("Barmer Applique & Embroidery Cluster"))
        assertEquals("MP", ClusterAutoSuggest.resolveStateCode("Chanderi Saree Cluster"))
        assertEquals("MP", ClusterAutoSuggest.resolveStateCode("Maheshwar Handloom Cluster"))
        assertEquals("GJ", ClusterAutoSuggest.resolveStateCode("Kutch Rogan & Ajrakh Cluster"))
    }

    @Test
    fun testAutoSuggest_manualOverridePreservesGiBadge() {
        val overridden = ClusterAutoSuggest.applyManualOverride(
            currentCraftCategory = "Handloom Textile",
            currentGiCertified = true,
            currentGiTagName = "Banarasi Brocade Saree (GI Reg #39)",
            newClusterName = "Kutch Rogan & Ajrakh Cluster"
        )

        assertEquals("Kutch Rogan & Ajrakh Cluster", overridden.clusterName)
        assertEquals("GJ", overridden.stateCode)
        // GI badge preview preserved across manual change (anti mis-tap).
        assertTrue(overridden.isGiCertified)
        assertEquals("Banarasi Brocade Saree (GI Reg #39)", overridden.giTagName)
    }
}
