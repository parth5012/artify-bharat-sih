package com.artifybharat.android.features

import com.artifybharat.android.data.local.entity.OfflineRegistrationEntity
import com.artifybharat.android.data.network.dto.VoiceRegisterRequestDto
import com.artifybharat.android.features.onboarding.ProgressiveIdentity
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.IOException

/**
 * Ticket #110 (T2) — Progressive identity + real offline queued registration.
 * Pure-JVM: phone-digits-only, DPDP mask, offline-queue encode/decode, network-error routing.
 */
class ProgressiveIdentityTest {

    @Test
    fun testPhoneDigitsOnly_acceptsExactlyTenDigits() {
        assertTrue(ProgressiveIdentity.isValidPhone("9876543210"))
        assertFalse(ProgressiveIdentity.isValidPhone("987654321"))
        assertFalse(ProgressiveIdentity.isValidPhone("98765432101"))
        assertFalse(ProgressiveIdentity.isValidPhone("98a6543210"))
        assertFalse(ProgressiveIdentity.isValidPhone(""))
        assertFalse(ProgressiveIdentity.isValidPhone(" 9876543210 "))
    }

    @Test
    fun testFilterPhoneDigits_stripsNonDigitsAndCapsAtTen() {
        assertEquals("9876543210", ProgressiveIdentity.filterPhoneDigits("98a76-54321099"))
        assertEquals("", ProgressiveIdentity.filterPhoneDigits("abcd"))
        assertEquals("9876543210", ProgressiveIdentity.filterPhoneDigits("9876543210"))
    }

    @Test
    fun testMaskPehchan_dpdpLastFourOnly() {
        assertEquals("PEH-***-8320", ProgressiveIdentity.maskPehchan("PEH-IND-88320"))
        assertEquals("PEH-***-3211", ProgressiveIdentity.maskPehchan("9876543211"))
        assertEquals("", ProgressiveIdentity.maskPehchan(""))
        // Masked output must never contain the raw value beyond last-4
        val masked = ProgressiveIdentity.maskPehchan("PEH-IND-88320")
        assertFalse(masked.contains("PEH-IND-"))
        assertTrue(masked.startsWith("PEH-***-"))
    }

    @Test
    fun testIsNetworkError_routesIOExceptionToOfflineQueue() {
        assertTrue(ProgressiveIdentity.isNetworkError(IOException("Failed to connect")))
        assertTrue(ProgressiveIdentity.isNetworkError(RuntimeException("Unable to resolve host")))
        assertTrue(ProgressiveIdentity.isNetworkError(RuntimeException("ConnectException: refused")))
        assertFalse(ProgressiveIdentity.isNetworkError(RuntimeException("HTTP 401 Unauthorized")))
        assertFalse(ProgressiveIdentity.isNetworkError(null))
    }

    @Test
    fun testQueueRoundTrip_preservesRegisterRequest() {
        val req = VoiceRegisterRequestDto(
            name = "Gauri Devi",
            phone = "9876543210",
            pin = "1234",
            primaryDialect = "bhojpuri",
            state = "Uttar Pradesh",
            clusterName = "Varanasi Handloom Cluster",
            craftCategory = "handloom",
            pehchanId = null
        )
        val json = ProgressiveIdentity.encodeRegistration(req)
        // DPDP: queue payload carries phone; pehchan stays optional/null
        assertTrue(json.contains("9876543210"))
        val decoded = ProgressiveIdentity.decodeRegistration(json)
        assertEquals(req.name, decoded.name)
        assertEquals(req.phone, decoded.phone)
        assertEquals(req.pin, decoded.pin)
        assertEquals(req.primaryDialect, decoded.primaryDialect)
        assertEquals(req.clusterName, decoded.clusterName)
    }

    @Test
    fun testQueueEntity_defaultsToPendingWithZeroRetries() {
        val entity = ProgressiveIdentity.toEntity(
            request = VoiceRegisterRequestDto(name = "N", phone = "9876543210", pin = "1234"),
            languageCode = "bhojpuri",
            timestamp = 123L
        )
        assertFalse(entity.synced)
        assertEquals(0, entity.retryCount)
        assertEquals("bhojpuri", entity.languageCode)
        assertEquals(123L, entity.timestamp)
        assertTrue(entity.id.startsWith("reg-9876543210-"))
    }

    @Test
    fun testOfflineQueueEntity_maxRetriesIsFive() {
        assertEquals(5, OfflineRegistrationEntity.MAX_RETRY_ATTEMPTS)
    }
}
