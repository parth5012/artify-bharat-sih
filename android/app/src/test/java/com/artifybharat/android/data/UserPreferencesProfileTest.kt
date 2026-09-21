package com.artifybharat.android.data

import com.artifybharat.android.data.preferences.UserPreferencesDataStore
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * T1: Artisan profile management — DPDP-masked UPI storage, dialect default,
 * and profile setter/flow surface. Pure-JVM: exercises companion masking +
 * key/method surface without Android Context (DataStore needs a device).
 */
class UserPreferencesProfileTest {

    @Test
    fun testDefaultPreferredDialectIsBhojpuri() {
        assertEquals("bhojpuri", UserPreferencesDataStore.DEFAULT_PREFERRED_DIALECT)
    }

    @Test
    fun testMaskPayoutUpiKeepsDomainOnly() {
        val masked = UserPreferencesDataStore.maskPayoutUpi("gauri.devi@okhdfc")
        assertEquals("***@okhdfc", masked)
        assertFalse(masked.contains("gauri.devi"))
    }

    @Test
    fun testMaskPayoutUpiTrimsWhitespace() {
        assertEquals("***@paytm", UserPreferencesDataStore.maskPayoutUpi("  ram@paytm  "))
    }

    @Test
    fun testMaskPayoutUpiBlankYieldsEmpty() {
        assertEquals("", UserPreferencesDataStore.maskPayoutUpi("   "))
    }

    @Test
    fun testMaskPayoutUpiWithoutDomainFullyMasked() {
        val masked = UserPreferencesDataStore.maskPayoutUpi("9876543210")
        assertEquals("***", masked)
        assertFalse(masked.contains("9876543210"))
    }

    @Test
    fun testProfilePreferenceKeys() {
        assertEquals("preferred_dialect", UserPreferencesDataStore.KEY_PREFERRED_DIALECT.name)
        assertEquals("payout_upi_masked", UserPreferencesDataStore.KEY_PAYOUT_UPI_MASKED.name)
        assertEquals("cluster_name", UserPreferencesDataStore.KEY_CLUSTER_NAME.name)
        assertEquals("craft_category", UserPreferencesDataStore.KEY_CRAFT_CATEGORY.name)
    }

    @Test
    fun testProfileSettersAndDialectFlowExist() {
        val methods = UserPreferencesDataStore::class.java.methods
        fun hasMethod(name: String): Boolean =
            methods.any { it.name == name && it.parameterTypes.any { p -> p == String::class.java } }
        assertTrue(hasMethod("setClusterName"))
        assertTrue(hasMethod("setCraftCategory"))
        assertTrue(hasMethod("setPreferredDialect"))
        assertTrue(hasMethod("setPayoutUpi"))
        assertTrue(methods.any { it.name == "getPreferredDialectFlow" })
    }
}
