package com.artifybharat.android.hardware.permissions

import com.artifybharat.android.ui.dialogs.PermissionType

/**
 * T4 (#112) — Just-in-time permissions (pure JVM-safe, no Android framework).
 * Blocker PERMISSIONS_OVERVIEW removed; OS dialogs fire inline in context:
 * - Mic on Bhasha voice screen (Bhashini why-line + voice readout)
 * - Camera on first Naya Product / Studio tap
 * - GPS on cluster auto-suggest
 * Each: 1-line Hindi why + Learn-more rationale dialog, graceful Deny path
 * (text fallback, manual cluster, skip photo) — never blocks onboarding.
 * Permanent-deny routes to Settings via [PermissionType] rationale dialog.
 */
object JitPermissions {

    enum class JitPermission {
        MIC,
        CAMERA,
        LOCATION
    }

    const val MIC_WHY_HINDI = "🎙️ बोलकर भरने के लिए माइक चाहिए • न हो तो टेक्स्ट से भी भरें"
    const val CAMERA_WHY_HINDI = "📷 उत्पाद फोटो के लिए कैमरा चाहिए • चाहें तो फोटो छोड़ें"
    const val LOCATION_WHY_HINDI = "📍 क्लस्टर सुझाव के लिए स्थान चाहिए • हाथ से भी चुन सकते हैं"

    const val MIC_DENY_FALLBACK_HINDI = "टेक्स्ट से भरें — माइक के बिना भी आगे बढ़ सकते हैं"
    const val CAMERA_DENY_FALLBACK_HINDI = "फोटो छोड़ें — बिना फोटो भी आगे बढ़ सकते हैं"
    const val LOCATION_DENY_FALLBACK_HINDI = "सूची से क्लस्टर चुनें — GPS के बिना भी आगे बढ़ सकते हैं"

    fun whyLine(permission: JitPermission): String = when (permission) {
        JitPermission.MIC -> MIC_WHY_HINDI
        JitPermission.CAMERA -> CAMERA_WHY_HINDI
        JitPermission.LOCATION -> LOCATION_WHY_HINDI
    }

    fun denyFallback(permission: JitPermission): String = when (permission) {
        JitPermission.MIC -> MIC_DENY_FALLBACK_HINDI
        JitPermission.CAMERA -> CAMERA_DENY_FALLBACK_HINDI
        JitPermission.LOCATION -> LOCATION_DENY_FALLBACK_HINDI
    }

    fun toPermissionType(permission: JitPermission): PermissionType = when (permission) {
        JitPermission.MIC -> PermissionType.AUDIO
        JitPermission.CAMERA -> PermissionType.CAMERA
        JitPermission.LOCATION -> PermissionType.LOCATION
    }

    /** Each grant asked at most once per context — pure set-membership check. */
    fun shouldAsk(asked: Set<JitPermission>, permission: JitPermission): Boolean =
        permission !in asked

    fun markAsked(asked: Set<JitPermission>, permission: JitPermission): Set<JitPermission> =
        asked + permission

    /** Deny (even deny-all) never blocks onboarding completion. */
    fun canCompleteWithDenies(@Suppress("UNUSED_PARAMETER") denied: Set<JitPermission>): Boolean = true
}
