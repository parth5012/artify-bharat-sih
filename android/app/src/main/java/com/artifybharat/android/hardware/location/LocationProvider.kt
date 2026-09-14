package com.artifybharat.android.hardware.location

import android.annotation.SuppressLint
import android.content.Context
import android.location.Location
import android.os.Build
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.android.gms.tasks.CancellationTokenSource
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.sqrt

data class CraftCluster(
    val name: String,
    val centerLat: Double,
    val centerLng: Double,
    val maxRadiusKm: Double
)

data class ClusterVerificationResult(
    val latitude: Double,
    val longitude: Double,
    val isMockLocation: Boolean,
    val matchedCluster: String,
    val distanceKm: Double,
    val isWithinCluster: Boolean,
    val verificationNotes: String
)

class LocationProvider(private val context: Context) {

    private val fusedClient: FusedLocationProviderClient =
        LocationServices.getFusedLocationProviderClient(context)

    companion object {
        val FAMOUS_CLUSTERS = listOf(
            CraftCluster("Varanasi Handloom Cluster", 25.3176, 82.9739, 45.0),
            CraftCluster("Barmer Applique & Embroidery Cluster", 25.7521, 71.3967, 45.0),
            CraftCluster("Chanderi Saree Cluster", 24.7118, 78.1360, 35.0),
            CraftCluster("Maheshwar Handloom Cluster", 22.1764, 75.5862, 35.0),
            CraftCluster("Kutch Rogan & Ajrakh Cluster", 23.2420, 69.6669, 50.0)
        )

        fun calculateHaversineDistanceKm(lat1: Double, lon1: Double, lat2: Double, lon2: Double): Double {
            val r = 6371.0 // Earth radius in km
            val dLat = Math.toRadians(lat2 - lat1)
            val dLon = Math.toRadians(lon2 - lon1)
            val a = sin(dLat / 2) * sin(dLat / 2) +
                    cos(Math.toRadians(lat1)) * cos(Math.toRadians(lat2)) *
                    sin(dLon / 2) * sin(dLon / 2)
            val c = 2 * atan2(sqrt(a), sqrt(1 - a))
            return r * c
        }

        fun verifyClusterProximity(
            lat: Double,
            lon: Double,
            clusters: List<CraftCluster> = FAMOUS_CLUSTERS
        ): Pair<CraftCluster, Double> {
            var closestCluster = clusters.first()
            var minDistance = Double.MAX_VALUE

            for (cluster in clusters) {
                val dist = calculateHaversineDistanceKm(lat, lon, cluster.centerLat, cluster.centerLng)
                if (dist < minDistance) {
                    minDistance = dist
                    closestCluster = cluster
                }
            }
            return Pair(closestCluster, minDistance)
        }

        fun isLocationMocked(location: Location): Boolean {
            return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                location.isMock
            } else {
                @Suppress("DEPRECATION")
                location.isFromMockProvider
            }
        }
    }

    @SuppressLint("MissingPermission")
    suspend fun getCurrentLocation(): Location? = suspendCancellableCoroutine { continuation ->
        val cts = CancellationTokenSource()
        fusedClient.getCurrentLocation(Priority.PRIORITY_HIGH_ACCURACY, cts.token)
            .addOnSuccessListener { loc ->
                continuation.resume(loc)
            }
            .addOnFailureListener {
                continuation.resume(null)
            }

        continuation.invokeOnCancellation {
            cts.cancel()
        }
    }

    suspend fun verifyArtisanClusterLocation(): ClusterVerificationResult? {
        val location = getCurrentLocation() ?: return null
        val isMock = isLocationMocked(location)
        val (cluster, distance) = verifyClusterProximity(location.latitude, location.longitude)
        val isWithin = distance <= cluster.maxRadiusKm

        val notes = if (isMock) {
            "REJECTED: Mock GPS provider detected."
        } else if (isWithin) {
            "VERIFIED: Within ${cluster.name} (${String.format("%.1f", distance)} km from centroid)."
        } else {
            "OUT_OF_BOUNDS: ${String.format("%.1f", distance)} km from ${cluster.name} (exceeds ${cluster.maxRadiusKm} km limit)."
        }

        return ClusterVerificationResult(
            latitude = location.latitude,
            longitude = location.longitude,
            isMockLocation = isMock,
            matchedCluster = cluster.name,
            distanceKm = distance,
            isWithinCluster = isWithin && !isMock,
            verificationNotes = notes
        )
    }
}
