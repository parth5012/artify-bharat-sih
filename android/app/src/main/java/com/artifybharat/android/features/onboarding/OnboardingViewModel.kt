package com.artifybharat.android.features.onboarding

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.artifybharat.android.data.local.AppDatabase
import com.artifybharat.android.data.network.NetworkClient
import com.artifybharat.android.data.network.dto.VoiceRegisterRequestDto
import com.artifybharat.android.data.preferences.UserPreferencesDataStore
import com.artifybharat.android.data.repository.AuthRepository
import com.artifybharat.android.data.repository.AuthRepositoryImpl
import com.artifybharat.android.data.sync.SyncScheduler
import com.artifybharat.android.hardware.location.LocationProvider
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

enum class OnboardingMode(val storageValue: String) {
    SOLO("solo"),
    SHG("shg");

    companion object {
        fun fromStorage(value: String?): OnboardingMode =
            if (value == "shg") SHG else SOLO
    }
}

data class OnboardingDialect(
    val code: String,
    val hindiLabel: String,
    val englishDesc: String
)

val SUPPORTED_DIALECTS = listOf(
    OnboardingDialect("bhojpuri", "भोजपुरी", "Bhojpuri (पूर्वांचल / बनारस)"),
    OnboardingDialect("maithili", "मैथिली", "Maithili (मिथिला / मधुबनी)"),
    OnboardingDialect("awadhi", "अवधी", "Awadhi (अवध / लखनऊ)"),
    OnboardingDialect("marwari", "मारवाड़ी", "Marwari (राजस्थान / बाड़मेर)"),
    OnboardingDialect("hindi", "हिंदी", "Hindi (मानक खड़ी बोली)"),
    OnboardingDialect("english", "English", "English (Official)")
)

enum class OnboardingStep {
    MODE_SELECT,
    WELCOME_LANGUAGE,
    IDENTITY_VERIFICATION,
    CLUSTER_CONFIRMATION,
    // T4 (#112): legacy blocker — kept for back-compat, never used as gate.
    PERMISSIONS_OVERVIEW,
    COMPLETION
}

fun OnboardingStep.next(): OnboardingStep = when (this) {
    OnboardingStep.MODE_SELECT -> OnboardingStep.WELCOME_LANGUAGE
    OnboardingStep.WELCOME_LANGUAGE -> OnboardingStep.IDENTITY_VERIFICATION
    OnboardingStep.IDENTITY_VERIFICATION -> OnboardingStep.CLUSTER_CONFIRMATION
    // T4 (#112) JIT: no permissions gate — cluster confirms straight to completion.
    OnboardingStep.CLUSTER_CONFIRMATION -> OnboardingStep.COMPLETION
    // Legacy persisted state: old blocker step always passes through to completion.
    OnboardingStep.PERMISSIONS_OVERVIEW -> OnboardingStep.COMPLETION
    OnboardingStep.COMPLETION -> OnboardingStep.COMPLETION
}

fun OnboardingStep.previous(): OnboardingStep = when (this) {
    OnboardingStep.MODE_SELECT -> OnboardingStep.MODE_SELECT
    OnboardingStep.WELCOME_LANGUAGE -> OnboardingStep.MODE_SELECT
    OnboardingStep.IDENTITY_VERIFICATION -> OnboardingStep.WELCOME_LANGUAGE
    OnboardingStep.CLUSTER_CONFIRMATION -> OnboardingStep.IDENTITY_VERIFICATION
    // T4 (#112) JIT: legacy blocker steps back to cluster, completion backs to cluster.
    OnboardingStep.PERMISSIONS_OVERVIEW -> OnboardingStep.CLUSTER_CONFIRMATION
    OnboardingStep.COMPLETION -> OnboardingStep.CLUSTER_CONFIRMATION
}

data class OnboardingUiState(
    val currentStep: OnboardingStep = OnboardingStep.MODE_SELECT,
    val onboardingMode: OnboardingMode = OnboardingMode.SOLO,
    val selectedDialect: String = "bhojpuri",
    val spokenName: String = "",
    val showVoiceConfirm: Boolean = false,
    val phone: String = "",
    val pin: String = "",
    val pehchanId: String = "",
    val artisanName: String = "",
    val craftCategory: String = "handloom",
    val clusterName: String = "Varanasi Handloom Cluster",
    val stateCode: String = "UP",
    val isGiCertified: Boolean = false,
    val giTagName: String? = null,
    val isLoading: Boolean = false,
    val isVerified: Boolean = false,
    val isOfflineMode: Boolean = false,
    val isServerUnreachable: Boolean = false,
    val showSecondaryVerify: Boolean = false,
    val queuedOffline: Boolean = false,
    val pendingQueueCount: Int = 0,
    val errorMessage: String? = null,
    val isOnboardingComplete: Boolean = false
)

class OnboardingViewModel(application: Application) : AndroidViewModel(application) {

    private val preferences = UserPreferencesDataStore(application)
    private val apiService = NetworkClient.createApiService(
        okHttpClient = NetworkClient.createOkHttpClient(preferences)
    )
    private val authRepository: AuthRepository = AuthRepositoryImpl(apiService, preferences)

    private val _uiState = MutableStateFlow(OnboardingUiState())
    val uiState: StateFlow<OnboardingUiState> = _uiState.asStateFlow()

    init {
        refreshQueueCount()
    }

    private fun offlineRegDao() = try {
        AppDatabase.getInstance(getApplication()).offlineRegistrationDao()
    } catch (e: Exception) {
        null
    }

    fun selectOnboardingMode(mode: OnboardingMode) {
        _uiState.value = _uiState.value.copy(onboardingMode = mode)
        viewModelScope.launch {
            preferences.setOnboardingMode(mode.storageValue)
        }
    }

    fun selectDialect(dialect: String) {
        _uiState.value = _uiState.value.copy(selectedDialect = dialect)
    }

    fun setSpokenName(name: String) {
        _uiState.value = _uiState.value.copy(spokenName = name, showVoiceConfirm = name.isNotBlank())
    }

    fun confirmSpokenName(accepted: Boolean) {
        if (accepted) {
            val name = _uiState.value.spokenName.trim()
            _uiState.value = _uiState.value.copy(
                artisanName = name.ifBlank { _uiState.value.artisanName },
                showVoiceConfirm = false
            )
        } else {
            _uiState.value = _uiState.value.copy(spokenName = "", showVoiceConfirm = false)
        }
    }

    fun updatePhone(phone: String) {
        // T2: phone-digits-only (10-digit numeric keyboard).
        _uiState.value = _uiState.value.copy(phone = ProgressiveIdentity.filterPhoneDigits(phone))
    }

    fun updatePin(pin: String) {
        _uiState.value = _uiState.value.copy(pin = pin)
    }

    fun updatePehchanId(pehchanId: String) {
        _uiState.value = _uiState.value.copy(pehchanId = pehchanId)
    }

    fun updateArtisanName(name: String) {
        _uiState.value = _uiState.value.copy(artisanName = name)
    }

    fun updateCluster(clusterName: String) {
        _uiState.value = _uiState.value.copy(clusterName = clusterName)
    }

    fun applyClusterSuggestion(clusterName: String, stateCode: String) {
        _uiState.value = _uiState.value.copy(clusterName = clusterName, stateCode = stateCode)
    }

    /** #111: GPS+registry auto-suggest entry point (GPS caller wires live fix; defaults keep offline safe). */
    fun resolveClusterSuggestion(gpsCluster: String?, withinBounds: Boolean, isOffline: Boolean) {
        val s = _uiState.value
        val suggestion = com.artifybharat.android.hardware.location.ClusterAutoSuggest.suggest(
            gpsClusterName = gpsCluster,
            gpsWithinBounds = withinBounds,
            registryClusterName = s.clusterName.takeIf { s.isVerified },
            registryCraftCategory = s.craftCategory,
            registryGiCertified = s.isGiCertified,
            registryGiTagName = s.giTagName,
            registryStateCode = s.stateCode,
            lastKnownClusterName = s.clusterName,
            isOffline = isOffline
        )
        _uiState.value = s.copy(
            clusterName = suggestion.clusterName,
            stateCode = suggestion.stateCode,
            isGiCertified = suggestion.isGiCertified,
            giTagName = suggestion.giTagName
        )
    }

    fun goToNextStep() {
        val next = _uiState.value.currentStep.next()
        _uiState.value = _uiState.value.copy(currentStep = next, errorMessage = null)
    }

    fun goToPreviousStep() {
        val prev = _uiState.value.currentStep.previous()
        _uiState.value = _uiState.value.copy(currentStep = prev, errorMessage = null)
    }

    /** T2: secondary Pehchan/e-Shram/TRIFED upgrade stays collapsed; verify only on demand. */
    fun toggleSecondaryVerify() {
        _uiState.value = _uiState.value.copy(showSecondaryVerify = !_uiState.value.showSecondaryVerify)
    }

    /** Build the Room-queued request from primary identity (phone + spoken name). Null if incomplete. */
    fun buildCurrentRegisterRequest(): VoiceRegisterRequestDto? {
        val s = _uiState.value
        val phone = s.phone.trim()
        val pin = s.pin.trim()
        val name = s.artisanName.trim().ifBlank { s.spokenName.trim() }
        if (!ProgressiveIdentity.isValidPhone(phone) || pin.length < 4 || name.isBlank()) return null
        return VoiceRegisterRequestDto(
            name = name,
            phone = phone,
            pin = pin,
            primaryDialect = s.selectedDialect,
            state = s.stateCode,
            clusterName = s.clusterName,
            craftCategory = s.craftCategory,
            pehchanId = s.pehchanId.ifBlank { null }
        )
    }

    /** Restore airplane-mode queue count on relaunch (Room is the source of truth). */
    fun refreshQueueCount() {
        viewModelScope.launch {
            val dao = offlineRegDao() ?: return@launch
            try {
                val pending = dao.getPendingRegistrations()
                _uiState.value = _uiState.value.copy(
                    pendingQueueCount = pending.size,
                    queuedOffline = pending.isNotEmpty() || _uiState.value.queuedOffline
                )
            } catch (e: Exception) {
                // Old installs without the table: stay unqueued, never crash onboarding.
            }
        }
    }

    /**
     * T2: real offline queue — persist VoiceRegisterRequestDto to Room on
     * IOException, schedule WorkManager auto-retry, and let the artisan enter
     * the app now (Pehchan verify stays optional, never blocking).
     */
    fun queueCurrentRegistrationOffline() {
        val req = buildCurrentRegisterRequest()
        if (req == null) {
            _uiState.value = _uiState.value.copy(
                errorMessage = "पहले 10-अंकीय मोबाइल, नाम व 4-अंकीय पिन भरें (Enter phone, name & PIN first)"
            )
            return
        }
        viewModelScope.launch {
            val dao = offlineRegDao()
            var count = _uiState.value.pendingQueueCount
            try {
                if (dao != null) {
                    dao.insert(ProgressiveIdentity.toEntity(req, _uiState.value.selectedDialect))
                    count = dao.getPendingRegistrations().size
                }
            } catch (e: Exception) {
                // Room unavailable: still let the artisan proceed offline.
            }
            try {
                SyncScheduler.triggerImmediateSync(getApplication())
            } catch (e: Exception) { /* WorkManager unavailable in tests */ }
            _uiState.value = _uiState.value.copy(
                isLoading = false,
                isServerUnreachable = true,
                queuedOffline = true,
                pendingQueueCount = count.coerceAtLeast(1),
                errorMessage = "${ProgressiveIdentity.SAVED_SAFELY_HINDI} • कतार $count (${ProgressiveIdentity.SAVED_SAFELY_ENGLISH})",
                // T4 (#112) JIT: offline queue lands straight on completion, never a permissions gate.
                currentStep = OnboardingStep.COMPLETION
            )
        }
    }

    fun verifyPehchanAndProceed() {
        val pehchan = _uiState.value.pehchanId.trim()
        if (pehchan.isBlank()) {
            _uiState.value = _uiState.value.copy(errorMessage = "कृपया पहचान संख्या दर्ज करें (Enter Pehchan ID)")
            return
        }

        _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null, isServerUnreachable = false)

        viewModelScope.launch {
            val result = authRepository.verifyArtisanId("pehchan", pehchan)
            if (result.isSuccess) {
                val data = result.getOrNull()!!
                if (data.isValid) {
                    val name = data.artisanName ?: _uiState.value.artisanName
                    val cluster = data.clusterName ?: _uiState.value.clusterName
                    val category = data.craftCategory ?: _uiState.value.craftCategory
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        isVerified = true,
                        artisanName = name,
                        clusterName = cluster,
                        craftCategory = category,
                        isGiCertified = data.giCertified,
                        giTagName = data.giTagName,
                        stateCode = data.state ?: "UP",
                        currentStep = OnboardingStep.CLUSTER_CONFIRMATION
                    )
                } else {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        errorMessage = "पहचान संख्या अमान्य है (Pehchan ID not found in registry)"
                    )
                }
            } else {
                val err = result.exceptionOrNull()?.message ?: "Server connection failed"
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    isServerUnreachable = true,
                    errorMessage = "सर्वर से संपर्क नहीं हो पाया: $err"
                )
            }
        }
    }

    fun authenticateAndProceed() {
        val phone = _uiState.value.phone.trim()
        val pin = _uiState.value.pin.trim()

        if (!ProgressiveIdentity.isValidPhone(phone) || pin.length < 4) {
            _uiState.value = _uiState.value.copy(errorMessage = "अमान्य फोन या पिन (Enter 10-digit phone & 4-digit PIN)")
            return
        }

        _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null, isServerUnreachable = false)

        viewModelScope.launch {
            // First attempt login
            val loginResult = authRepository.login(phone, pin)
            if (loginResult.isSuccess) {
                val tokenResp = loginResult.getOrNull()!!
                authRepository.saveSession(
                    token = tokenResp.accessToken,
                    artisanId = tokenResp.artisanId,
                    maskedPehchan = ProgressiveIdentity.maskPhone(phone),
                    artisanName = tokenResp.name,
                    clusterName = _uiState.value.clusterName,
                    craftCategory = _uiState.value.craftCategory,
                    stateCode = _uiState.value.stateCode
                )
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    isVerified = true,
                    artisanName = tokenResp.name,
                    // T4 (#112) JIT: login lands straight on completion.
                    currentStep = OnboardingStep.COMPLETION
                )
            } else {
                val loginErr = loginResult.exceptionOrNull()?.message ?: ""
                val isNetworkError = ProgressiveIdentity.isNetworkError(loginResult.exceptionOrNull())

                // T2: airplane-mode with a known name -> queue real registration, enter app now.
                val queuedReq = buildCurrentRegisterRequest()
                if (isNetworkError && queuedReq != null) {
                    queueRegistrationAndEnter(queuedReq)
                    return@launch
                }

                if (isNetworkError) {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        isServerUnreachable = true,
                        errorMessage = "सर्वर से संपर्क नहीं हो पाया: $loginErr"
                    )
                } else if (_uiState.value.artisanName.isNotBlank() || _uiState.value.spokenName.isNotBlank()) {
                    // User provided a name, attempt registration (Pehchan stays optional).
                    val registerReq = queuedReq ?: VoiceRegisterRequestDto(
                        name = _uiState.value.artisanName.ifBlank { _uiState.value.spokenName.trim() },
                        phone = phone,
                        pin = pin,
                        primaryDialect = _uiState.value.selectedDialect,
                        state = _uiState.value.stateCode,
                        clusterName = _uiState.value.clusterName,
                        craftCategory = _uiState.value.craftCategory,
                        pehchanId = _uiState.value.pehchanId.ifBlank { null }
                    )
                    val regResult = authRepository.register(registerReq)
                    if (regResult.isSuccess) {
                        val tokenResp = regResult.getOrNull()!!
                        authRepository.saveSession(
                            token = tokenResp.accessToken,
                            artisanId = tokenResp.artisanId,
                            maskedPehchan = ProgressiveIdentity.maskPhone(phone),
                            artisanName = tokenResp.name,
                            clusterName = _uiState.value.clusterName,
                            craftCategory = _uiState.value.craftCategory,
                            stateCode = _uiState.value.stateCode
                        )
                        _uiState.value = _uiState.value.copy(
                            isLoading = false,
                            isVerified = true,
                            artisanName = tokenResp.name,
                            // T4 (#112) JIT: register lands straight on completion.
                            currentStep = OnboardingStep.COMPLETION
                        )
                    } else if (ProgressiveIdentity.isNetworkError(regResult.exceptionOrNull())) {
                        // T2: register hit airplane-mode -> real Room queue, never fake demo.
                        queueRegistrationAndEnter(registerReq)
                    } else {
                        val regErr = regResult.exceptionOrNull()?.message ?: "Registration failed"
                        _uiState.value = _uiState.value.copy(
                            isLoading = false,
                            isServerUnreachable = false,
                            errorMessage = "पंजीकरण विफल: $regErr"
                        )
                    }
                } else {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        isServerUnreachable = false,
                        errorMessage = "गलत फ़ोन नंबर या पिन। नए खाते हेतु नाम दर्ज करें। (Incorrect phone/PIN. Enter name to register.)"
                    )
                }
            }
        }
    }

    /** Persist to Room + schedule WorkManager retry, then enter app (Pehchan optional). */
    private suspend fun queueRegistrationAndEnter(request: VoiceRegisterRequestDto) {
        var count = _uiState.value.pendingQueueCount
        try {
            offlineRegDao()?.let { dao ->
                dao.insert(ProgressiveIdentity.toEntity(request, _uiState.value.selectedDialect))
                count = dao.getPendingRegistrations().size
            }
        } catch (e: Exception) {
            // Room unavailable: still proceed offline.
        }
        try {
            SyncScheduler.triggerImmediateSync(getApplication())
        } catch (e: Exception) { /* WorkManager unavailable in tests */ }
        _uiState.value = _uiState.value.copy(
            isLoading = false,
            isServerUnreachable = true,
            queuedOffline = true,
            pendingQueueCount = count.coerceAtLeast(1),
            artisanName = request.name,
            errorMessage = "${ProgressiveIdentity.SAVED_SAFELY_HINDI} • कतार $count (${ProgressiveIdentity.SAVED_SAFELY_ENGLISH})",
            // T4 (#112) JIT: airplane-mode queue lands straight on completion.
            currentStep = OnboardingStep.COMPLETION
        )
    }

    fun completeOnboardingAndEnterApp() {
        viewModelScope.launch {
            preferences.setOnboarded(true)
            _uiState.value = _uiState.value.copy(isOnboardingComplete = true)
        }
    }
}
