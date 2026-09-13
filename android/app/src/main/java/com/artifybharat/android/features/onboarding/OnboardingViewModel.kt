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

enum class OnboardingStep {
    WELCOME_LANGUAGE,
    IDENTITY_VERIFICATION,
    CLUSTER_CONFIRMATION,
    PERMISSIONS_OVERVIEW,
    COMPLETION
}

data class OnboardingUiState(
    val currentStep: OnboardingStep = OnboardingStep.WELCOME_LANGUAGE,
    val selectedDialect: String = "bhojpuri",
    val phone: String = "9876543210",
    val pin: String = "1234",
    val pehchanId: String = "PEH-IND-88320",
    val artisanName: String = "गौरी देवी (Gauri Devi)",
    val craftCategory: String = "handloom",
    val clusterName: String = "Varanasi Handloom Cluster",
    val stateCode: String = "UP",
    val isGiCertified: Boolean = true,
    val giTagName: String? = "Banarasi Brocade Saree (GI Reg #39)",
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

    fun selectDialect(dialect: String) {
        _uiState.value = _uiState.value.copy(selectedDialect = dialect)
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
        val next = when (_uiState.value.currentStep) {
            OnboardingStep.WELCOME_LANGUAGE -> OnboardingStep.IDENTITY_VERIFICATION
            OnboardingStep.IDENTITY_VERIFICATION -> OnboardingStep.CLUSTER_CONFIRMATION
            OnboardingStep.CLUSTER_CONFIRMATION -> OnboardingStep.PERMISSIONS_OVERVIEW
            OnboardingStep.PERMISSIONS_OVERVIEW -> OnboardingStep.COMPLETION
            OnboardingStep.COMPLETION -> OnboardingStep.COMPLETION
        }
        _uiState.value = _uiState.value.copy(currentStep = next, errorMessage = null)
    }

    fun goToPreviousStep() {
        val prev = when (_uiState.value.currentStep) {
            OnboardingStep.WELCOME_LANGUAGE -> OnboardingStep.WELCOME_LANGUAGE
            OnboardingStep.IDENTITY_VERIFICATION -> OnboardingStep.WELCOME_LANGUAGE
            OnboardingStep.CLUSTER_CONFIRMATION -> OnboardingStep.IDENTITY_VERIFICATION
            OnboardingStep.PERMISSIONS_OVERVIEW -> OnboardingStep.CLUSTER_CONFIRMATION
            OnboardingStep.COMPLETION -> OnboardingStep.PERMISSIONS_OVERVIEW
        }
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
                // If login fails (not registered), attempt register
                val registerReq = VoiceRegisterRequestDto(
                    name = _uiState.value.artisanName,
                    phone = phone,
                    pin = pin,
                    primaryDialect = _uiState.value.selectedDialect,
                    state = _uiState.value.stateCode,
                    clusterName = _uiState.value.clusterName,
                    craftCategory = _uiState.value.craftCategory,
                    pehchanId = _uiState.value.pehchanId
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
                    val err = regResult.exceptionOrNull()?.message ?: "Authentication failed"
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        isServerUnreachable = true,
                        errorMessage = "सर्वर कनेक्शन त्रुटि: $err"
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
