package com.artifybharat.android.features.profile

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.artifybharat.android.data.network.NetworkClient
import com.artifybharat.android.data.preferences.UserPreferencesDataStore
import com.artifybharat.android.data.preferences.UserSession
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.launch

/**
 * [Artisan App T3] Artisan Profile & Verification state.
 *
 * DPDP: only masked identifiers are exposed (maskedPehchan like PEH-***-88320,
 * payoutUpiMasked like ***@okhdfc). Never raw Aadhaar / phone / UPI.
 */
data class ProfileUiState(
    val artisanName: String = "अनाम कारीगर (Artisan)",
    val maskedPehchan: String? = null,
    val clusterName: String = "",
    val craftCategory: String = "handloom",
    val isVerified: Boolean = false,
    val onboardingMode: String = "solo",
    val isSolo: Boolean = true,
    val preferredDialect: String = UserPreferencesDataStore.DEFAULT_PREFERRED_DIALECT,
    val payoutUpiMasked: String? = null,
    val customBaseUrl: String? = null,
    val effectiveBaseUrl: String = NetworkClient.DEFAULT_BASE_URL,
    val isOfflineDemo: Boolean = false
)

data class ProfileDialect(
    val code: String,
    val hindi: String,
    val english: String
)

/** T3: six supported profile dialects (Bhashini voice + 'Ask Dadi' read-out). */
val PROFILE_DIALECTS = listOf(
    ProfileDialect("bhojpuri", "भोजपुरी", "Bhojpuri"),
    ProfileDialect("maithili", "मैथिली", "Maithili"),
    ProfileDialect("awadhi", "अवधी", "Awadhi"),
    ProfileDialect("khari_boli", "खड़ी बोली", "Khari Boli"),
    ProfileDialect("bundeli", "बुंदेली", "Bundeli"),
    ProfileDialect("standard_hindi", "मानक हिंदी", "Standard Hindi")
)

/**
 * Pure mapper — keeps profile math JVM-testable without Android framework.
 * Defensive DPDP: any non-masked payout value is re-masked via [UserPreferencesDataStore.maskPayoutUpi]
 * before exposure, so a raw leak can never reach the UI state.
 */
fun toProfileUiState(
    session: UserSession,
    dialect: String,
    payoutMasked: String?,
    customBaseUrl: String?
): ProfileUiState {
    val safePayout = when {
        payoutMasked.isNullOrBlank() -> null
        payoutMasked.startsWith("***") -> payoutMasked
        else -> UserPreferencesDataStore.maskPayoutUpi(payoutMasked)
    }
    val effectiveBase = if (customBaseUrl.isNullOrBlank()) NetworkClient.DEFAULT_BASE_URL else customBaseUrl
    return ProfileUiState(
        artisanName = session.artisanName,
        maskedPehchan = session.maskedPehchan,
        clusterName = session.clusterName,
        craftCategory = session.craftCategory,
        isVerified = session.isVerified,
        onboardingMode = session.onboardingMode,
        isSolo = session.onboardingMode != "shg",
        preferredDialect = dialect.ifBlank { UserPreferencesDataStore.DEFAULT_PREFERRED_DIALECT },
        payoutUpiMasked = safePayout,
        customBaseUrl = customBaseUrl,
        effectiveBaseUrl = effectiveBase,
        isOfflineDemo = session.isOfflineDemo
    )
}

class ArtisanProfileViewModel(
    userSessionFlow: Flow<UserSession>,
    preferredDialectFlow: Flow<String>,
    payoutUpiMaskedFlow: Flow<String?>,
    customBaseUrlFlow: Flow<String?>,
    private val onUpdateDialect: suspend (String) -> Unit = {},
    private val onToggleMode: suspend (String) -> Unit = {},
    private val onUpdatePayoutUpi: suspend (String) -> Unit = {},
    private val onUpdateBaseUrl: suspend (String) -> Unit = {},
    private val onLogout: suspend () -> Unit = {},
    externalScope: CoroutineScope? = null
) : ViewModel() {

    private val scope = externalScope ?: viewModelScope

    private val _uiState = MutableStateFlow(ProfileUiState())
    val uiState: StateFlow<ProfileUiState> = _uiState.asStateFlow()

    init {
        scope.launch {
            combine(
                userSessionFlow,
                preferredDialectFlow,
                payoutUpiMaskedFlow,
                customBaseUrlFlow
            ) { session, dialect, payoutMasked, baseUrl ->
                toProfileUiState(session, dialect, payoutMasked, baseUrl)
            }.collect { _uiState.value = it }
        }
    }

    fun updateDialect(dialect: String) {
        scope.launch { onUpdateDialect(dialect) }
    }

    fun toggleOnboardingMode() {
        val next = if (_uiState.value.onboardingMode == "shg") "solo" else "shg"
        scope.launch { onToggleMode(next) }
    }

    fun updateOnboardingMode(mode: String) {
        val normalized = if (mode == "shg") "shg" else "solo"
        scope.launch { onToggleMode(normalized) }
    }

    /**
     * DPDP: [rawUpi] is forwarded to the DataStore (which persists only the
     * masked form) and is never logged or stored in UI state.
     */
    fun updatePayoutUpi(rawUpi: String) {
        scope.launch { onUpdatePayoutUpi(rawUpi) }
    }

    fun updateBaseUrl(url: String) {
        scope.launch { onUpdateBaseUrl(url) }
    }

    fun logout() {
        scope.launch { onLogout() }
    }
}

/** Production wiring: DataStore session/dialect/payout/base-url + masked persistence. DPDP-safe. */
class ArtisanProfileViewModelFactory(
    private val appContext: Context
) : ViewModelProvider.Factory {

    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        require(modelClass.isAssignableFrom(ArtisanProfileViewModel::class.java)) {
            "Unknown ViewModel class: ${modelClass.name}"
        }
        val prefs = UserPreferencesDataStore(appContext)
        return ArtisanProfileViewModel(
            userSessionFlow = prefs.userSessionFlow,
            preferredDialectFlow = prefs.preferredDialectFlow,
            payoutUpiMaskedFlow = prefs.payoutUpiMaskedFlow,
            customBaseUrlFlow = prefs.customBaseUrlFlow,
            onUpdateDialect = { prefs.setPreferredDialect(it) },
            onToggleMode = { prefs.setOnboardingMode(it) },
            onUpdatePayoutUpi = { prefs.setPayoutUpi(it) },
            onUpdateBaseUrl = { prefs.setCustomBaseUrl(it) },
            onLogout = { prefs.clearSession() }
        ) as T
    }
}
