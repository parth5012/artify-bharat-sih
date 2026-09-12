package com.artifybharat.android.hardware

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
}
