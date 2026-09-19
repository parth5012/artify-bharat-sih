package com.artifybharat.android.hardware.location

object ClusterAutoSuggest {

    enum class SuggestionSource {
        GPS,
        REGISTRY,
        LAST_KNOWN
    }

    data class Suggestion(
        val clusterName: String,
        val craftCategory: String,
        val stateCode: String,
        val source: SuggestionSource,
        val isLocationPending: Boolean,
        val canComplete: Boolean = true,
        val locationNote: String,
        val hindiReadout: String,
        val isGiCertified: Boolean,
        val giTagName: String?
    )

    data class OverrideResult(
        val clusterName: String,
        val stateCode: String,
        val isGiCertified: Boolean,
        val giTagName: String?
    )

    fun hindiReadout(clusterName: String, craftLabel: String): String {
        return "Kya aap $clusterName $craftLabel hain? Haan dabayein"
    }

    fun resolveStateCode(clusterName: String): String {
        return when {
            clusterName.contains("Varanasi", ignoreCase = true) -> "UP"
            clusterName.contains("Barmer", ignoreCase = true) -> "RJ"
            clusterName.contains("Chanderi", ignoreCase = true) -> "MP"
            clusterName.contains("Maheshwar", ignoreCase = true) -> "MP"
            clusterName.contains("Kutch", ignoreCase = true) -> "GJ"
            else -> "UP"
        }
    }

    fun applyManualOverride(
        currentCraftCategory: String,
        currentGiCertified: Boolean,
        currentGiTagName: String?,
        newClusterName: String
    ): OverrideResult {
        return OverrideResult(
            clusterName = newClusterName,
            stateCode = resolveStateCode(newClusterName),
            isGiCertified = currentGiCertified,
            giTagName = currentGiTagName
        )
    }

    fun suggest(
        gpsClusterName: String?,
        gpsWithinBounds: Boolean,
        registryClusterName: String?,
        registryCraftCategory: String?,
        registryGiCertified: Boolean,
        registryGiTagName: String?,
        registryStateCode: String?,
        lastKnownClusterName: String?,
        isOffline: Boolean
    ): Suggestion {
        val defaultCraft = "handloom"
        return when {
            !isOffline && gpsWithinBounds && gpsClusterName != null -> {
                val craft = registryCraftCategory ?: defaultCraft
                val state = resolveStateCode(gpsClusterName)
                val matchesRegistry = registryClusterName != null &&
                    gpsClusterName.equals(registryClusterName, ignoreCase = true)
                val giCertified = if (matchesRegistry) registryGiCertified else false
                val giTag = if (giCertified) registryGiTagName else null
                Suggestion(
                    clusterName = gpsClusterName,
                    craftCategory = craft,
                    stateCode = state,
                    source = SuggestionSource.GPS,
                    isLocationPending = false,
                    canComplete = true,
                    locationNote = "GPS verified",
                    hindiReadout = hindiReadout(gpsClusterName, craft),
                    isGiCertified = giCertified,
                    giTagName = giTag
                )
            }
            registryClusterName != null -> {
                val craft = registryCraftCategory ?: defaultCraft
                val state = registryStateCode ?: resolveStateCode(registryClusterName)
                Suggestion(
                    clusterName = registryClusterName,
                    craftCategory = craft,
                    stateCode = state,
                    source = SuggestionSource.REGISTRY,
                    isLocationPending = isOffline,
                    canComplete = true,
                    locationNote = if (isOffline) {
                        "Location pending — offline, using registry value"
                    } else {
                        "Registry suggestion"
                    },
                    hindiReadout = hindiReadout(registryClusterName, craft),
                    isGiCertified = registryGiCertified,
                    giTagName = if (registryGiCertified) registryGiTagName else null
                )
            }
            lastKnownClusterName != null -> {
                val craft = registryCraftCategory ?: defaultCraft
                val state = registryStateCode ?: resolveStateCode(lastKnownClusterName)
                Suggestion(
                    clusterName = lastKnownClusterName,
                    craftCategory = craft,
                    stateCode = state,
                    source = SuggestionSource.LAST_KNOWN,
                    isLocationPending = true,
                    canComplete = true,
                    locationNote = "Location pending — using last known cluster",
                    hindiReadout = hindiReadout(lastKnownClusterName, craft),
                    isGiCertified = registryGiCertified,
                    giTagName = if (registryGiCertified) registryGiTagName else null
                )
            }
            else -> {
                val fallbackCluster = "Varanasi Handloom Cluster"
                val craft = registryCraftCategory ?: defaultCraft
                val state = "UP"
                Suggestion(
                    clusterName = fallbackCluster,
                    craftCategory = craft,
                    stateCode = state,
                    source = SuggestionSource.REGISTRY,
                    isLocationPending = isOffline,
                    canComplete = true,
                    locationNote = if (isOffline) {
                        "Location pending — offline default"
                    } else {
                        "Default cluster suggestion"
                    },
                    hindiReadout = hindiReadout(fallbackCluster, craft),
                    isGiCertified = false,
                    giTagName = null
                )
            }
        }
    }
}
