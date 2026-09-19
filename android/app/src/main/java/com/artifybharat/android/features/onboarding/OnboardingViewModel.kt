package com.artifybharat.android.features.onboarding

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.artifybharat.android.data.network.NetworkClient
import com.artifybharat.android.data.network.dto.VoiceRegisterRequestDto
import com.artifybharat.android.data.preferences.UserPreferencesDataStore
import com.artifybharat.android.data.repository.AuthRepository
import com.artifybharat.android.data.repository.AuthRepositoryImpl
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
    PERMISSIONS_OVERVIEW,
    COMPLETION
}

fun OnboardingStep.next(): OnboardingStep = when (this) {
    OnboardingStep.MODE_SELECT -> OnboardingStep.WELCOME_LANGUAGE
    OnboardingStep.WELCOME_LANGUAGE -> OnboardingStep.IDENTITY_VERIFICATION
    OnboardingStep.IDENTITY_VERIFICATION -> OnboardingStep.CLUSTER_CONFIRMATION
    OnboardingStep.CLUSTER_CONFIRMATION -> OnboardingStep.PERMISSIONS_OVERVIEW
    OnboardingStep.PERMISSIONS_OVERVIEW -> OnboardingStep.COMPLETION
    OnboardingStep.COMPLETION -> OnboardingStep.COMPLETION
}

fun OnboardingStep.previous(): OnboardingStep = when (this) {
    OnboardingStep.MODE_SELECT -> OnboardingStep.MODE_SELECT
    OnboardingStep.WELCOME_LANGUAGE -> OnboardingStep.MODE_SELECT
    OnboardingStep.IDENTITY_VERIFICATION -> OnboardingStep.WELCOME_LANGUAGE
    OnboardingStep.CLUSTER_CONFIRMATION -> OnboardingStep.IDENTITY_VERIFICATION
    OnboardingStep.PERMISSIONS_OVERVIEW -> OnboardingStep.CLUSTER_CONFIRMATION
    OnboardingStep.COMPLETION -> OnboardingStep.PERMISSIONS_OVERVIEW
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
        _uiState.value = _uiState.value.copy(phone = phone)
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

    fun goToNextStep() {
        val next = _uiState.value.currentStep.next()
        _uiState.value = _uiState.value.copy(currentStep = next, errorMessage = null)
    }

    fun goToPreviousStep() {
        val prev = _uiState.value.currentStep.previous()
        _uiState.value = _uiState.value.copy(currentStep = prev, errorMessage = null)
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

        if (phone.length < 10 || pin.length < 4) {
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
                    maskedPehchan = "PEH-***-" + phone.takeLast(4),
                    artisanName = tokenResp.name,
                    clusterName = _uiState.value.clusterName,
                    craftCategory = _uiState.value.craftCategory,
                    stateCode = _uiState.value.stateCode
                )
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    isVerified = true,
                    artisanName = tokenResp.name,
                    currentStep = OnboardingStep.PERMISSIONS_OVERVIEW
                )
            } else {
                val loginErr = loginResult.exceptionOrNull()?.message ?: ""
                val isNetworkError = loginResult.exceptionOrNull() is java.io.IOException ||
                        loginErr.contains("ConnectException") ||
                        loginErr.contains("Failed to connect") ||
                        loginErr.contains("Unable to resolve host")

                if (isNetworkError) {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        isServerUnreachable = true,
                        errorMessage = "सर्वर से संपर्क नहीं हो पाया: $loginErr"
                    )
                } else if (_uiState.value.artisanName.isNotBlank()) {
                    // User provided a name, attempt registration
                    val registerReq = VoiceRegisterRequestDto(
                        name = _uiState.value.artisanName,
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
                            maskedPehchan = "PEH-***-" + phone.takeLast(4),
                            artisanName = tokenResp.name,
                            clusterName = _uiState.value.clusterName,
                            craftCategory = _uiState.value.craftCategory,
                            stateCode = _uiState.value.stateCode
                        )
                        _uiState.value = _uiState.value.copy(
                            isLoading = false,
                            isVerified = true,
                            artisanName = tokenResp.name,
                            currentStep = OnboardingStep.PERMISSIONS_OVERVIEW
                        )
                    } else {
                        val regErr = regResult.exceptionOrNull()?.message ?: "Registration failed"
                        _uiState.value = _uiState.value.copy(
                            isLoading = false,
                            isServerUnreachable = regResult.exceptionOrNull() is java.io.IOException,
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

    fun completeOnboardingAndEnterApp() {
        viewModelScope.launch {
            preferences.setOnboarded(true)
            _uiState.value = _uiState.value.copy(isOnboardingComplete = true)
        }
    }

    fun activateOfflineDemoMode() {
        viewModelScope.launch {
            authRepository.enableOfflineDemo()
            _uiState.value = _uiState.value.copy(
                isOfflineMode = true,
                isVerified = false,
                artisanName = "डेमो कारीगर (Demo Artisan)",
                isOnboardingComplete = true
            )
        }
    }
}
