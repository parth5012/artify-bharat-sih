package com.artifybharat.android.features.onboarding

import com.artifybharat.android.data.local.entity.OfflineRegistrationEntity
import com.artifybharat.android.data.network.dto.VoiceRegisterRequestDto
import org.json.JSONObject
import java.io.IOException

/**
 * T2 (#110) — Progressive identity + real offline queued registration.
 * Pure-Kotlin/JVM-safe helpers: phone-digits-only, DPDP mask, offline-queue codec,
 * network-error routing. No Android framework dependency so unit tests stay green.
 *
 * DPDP: only masked Pehchan (PEH-***-last4) is ever displayed/stored; raw Aadhaar
 * values are never logged.
 */
object ProgressiveIdentity {

    const val PHONE_LENGTH = 10
    const val SAVED_SAFELY_HINDI = "✅ सुरक्षित सहेजा गया • ऑनलाइन होते ही सत्यापित होगा"
    const val SAVED_SAFELY_ENGLISH = "Saved safely • will verify when online"
    const val UNVERIFIED_NUDGE_HINDI = "सत्यापित बैज पाएं — Pehchan / e-Shram / TRIFED से वेरीफाई करें"
    const val UNVERIFIED_NUDGE_ENGLISH = "Get Verified Badge — verify later with Pehchan / e-Shram / TRIFED"

    private val PHONE_REGEX = Regex("^[0-9]{10}$")

    /** Accepts exactly 10 digits, nothing else (numeric keyboard only). */
    fun isValidPhone(phone: String): Boolean = PHONE_REGEX.matches(phone)

    /** Strips non-digits and caps at 10 — used by the phone text field. */
    fun filterPhoneDigits(input: String): String =
        input.filter { it.isDigit() }.take(PHONE_LENGTH)

    /**
     * DPDP-safe mask: "PEH-***-<last4>". Never returns or logs the raw value.
     * Blank input -> "".
     */
    fun maskPehchan(raw: String): String {
        val alnum = raw.filter { it.isLetterOrDigit() }
        if (alnum.isBlank()) return ""
        return "PEH-***-" + alnum.takeLast(4)
    }

    /** Mask a phone-derived identifier the same DPDP way. */
    fun maskPhone(phone: String): String = maskPehchan(phone)

    /**
     * Route transport failures to the Room offline queue.
     * True for IOException or classic unreachable-host message fragments.
     */
    fun isNetworkError(throwable: Throwable?): Boolean {
        if (throwable == null) return false
        if (throwable is IOException) return true
        val msg = throwable.message ?: return false
        return msg.contains("ConnectException") ||
            msg.contains("Failed to connect") ||
            msg.contains("Unable to resolve host")
    }

    fun queueId(phone: String, timestamp: Long): String = "reg-$phone-$timestamp"

    fun encodeRegistration(request: VoiceRegisterRequestDto): String {
        val o = JSONObject()
        o.put("name", request.name)
        o.put("phone", request.phone)
        o.put("pin", request.pin)
        o.put("primary_dialect", request.primaryDialect)
        o.put("state", request.state)
        if (request.district != null) o.put("district", request.district)
        o.put("cluster_name", request.clusterName)
        o.put("craft_category", request.craftCategory)
        if (request.trifedId != null) o.put("trifed_id", request.trifedId)
        if (request.pehchanId != null) o.put("pehchan_id", request.pehchanId)
        if (request.geoLat != null) o.put("geo_lat", request.geoLat)
        if (request.geoLng != null) o.put("geo_lng", request.geoLng)
        return o.toString()
    }

    fun decodeRegistration(json: String): VoiceRegisterRequestDto {
        val o = JSONObject(json)
        return VoiceRegisterRequestDto(
            name = o.optString("name", ""),
            phone = o.optString("phone", ""),
            pin = o.optString("pin", ""),
            primaryDialect = o.optString("primary_dialect", "bhojpuri"),
            state = o.optString("state", "Uttar Pradesh"),
            district = if (o.has("district")) o.optString("district").takeIf { it.isNotEmpty() } else null,
            clusterName = o.optString("cluster_name", "Varanasi Handloom Cluster"),
            craftCategory = o.optString("craft_category", "handloom"),
            trifedId = if (o.has("trifed_id")) o.optString("trifed_id").takeIf { it.isNotEmpty() } else null,
            pehchanId = if (o.has("pehchan_id")) o.optString("pehchan_id").takeIf { it.isNotEmpty() } else null,
            geoLat = o.optDouble("geo_lat", Double.NaN).takeIf { o.has("geo_lat") && !it.isNaN() },
            geoLng = o.optDouble("geo_lng", Double.NaN).takeIf { o.has("geo_lng") && !it.isNaN() }
        )
    }

    fun toEntity(
        request: VoiceRegisterRequestDto,
        languageCode: String,
        timestamp: Long = System.currentTimeMillis()
    ): OfflineRegistrationEntity = OfflineRegistrationEntity(
        id = queueId(request.phone, timestamp),
        fieldsJson = encodeRegistration(request),
        languageCode = languageCode,
        timestamp = timestamp,
        synced = false,
        retryCount = 0
    )
}
