package com.artifybharat.android.features.voice

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.artifybharat.android.data.local.AppDatabase
import com.artifybharat.android.data.local.entity.DraftEntity
import com.artifybharat.android.data.network.NetworkClient
import com.artifybharat.android.data.preferences.UserPreferencesDataStore
import com.artifybharat.android.data.repository.CatalogRepository
import com.artifybharat.android.data.repository.CatalogRepositoryImpl
import com.artifybharat.android.hardware.audio.AudioRecorder
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.io.File
import java.util.UUID

data class VoiceCatalogUiState(
    val selectedDialect: String = "bhojpuri",
    val isRecording: Boolean = false,
    val currentRms: Float = 0.0f,
    val ambientNoiseDb: Float = 0.0f,
    val isExcessiveNoise: Boolean = false,
    val isProcessing: Boolean = false,
    val currentDraftId: String = UUID.randomUUID().toString(),
    val regionalTranscript: String? = null,
    val englishTranscript: String? = null,
    val productTitle: String? = null,
    val craftCategory: String = "handloom",
    val giTagStatus: String = "certified",
    val estimatedDays: Double = 3.5,
    val estimatedLaborHours: Double = 28.0,
    val rawCostEstimate: Double = 1200.0,
    val dadiAdvice: String? = null,
    val isCataloged: Boolean = false,
    val errorMessage: String? = null
)

class VoiceCatalogViewModel(application: Application) : AndroidViewModel(application) {

    val audioRecorder = AudioRecorder(application)
    private val database = AppDatabase.getInstance(application)
    private val preferences = UserPreferencesDataStore(application)
    private val apiService = NetworkClient.createApiService(
        okHttpClient = NetworkClient.createOkHttpClient(preferences)
    )
    private val catalogRepository: CatalogRepository = CatalogRepositoryImpl(
        draftDao = database.draftDao(),
        apiService = apiService
    )

    private val _uiState = MutableStateFlow(VoiceCatalogUiState())
    val uiState: StateFlow<VoiceCatalogUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            audioRecorder.state.collect { recState ->
                _uiState.value = _uiState.value.copy(
                    isRecording = recState.isRecording,
                    currentRms = recState.currentRms,
                    ambientNoiseDb = recState.ambientDecibels,
                    isExcessiveNoise = recState.isExcessiveNoise
                )
            }
        }
    }

    fun selectDialect(dialect: String) {
        _uiState.value = _uiState.value.copy(selectedDialect = dialect)
    }

    fun startVoiceRecording() {
        _uiState.value = _uiState.value.copy(
            errorMessage = null,
            isProcessing = false
        )
        audioRecorder.startRecording()
    }

    fun stopRecordingAndCatalog() {
        val draftId = _uiState.value.currentDraftId
        _uiState.value = _uiState.value.copy(isProcessing = true)

        viewModelScope.launch {
            val wavFile = audioRecorder.stopRecording()
            if (wavFile == null || !wavFile.exists()) {
                _uiState.value = _uiState.value.copy(
                    isProcessing = false,
                    errorMessage = "Recording file not found."
                )
                return@launch
            }

            // First save initial draft record in Room
            val initialDraft = DraftEntity(
                localDraftId = draftId,
                dialect = _uiState.value.selectedDialect,
                status = DraftEntity.STATUS_DRAFT
            )
            catalogRepository.saveDraft(initialDraft)

            val result = catalogRepository.autoCatalogVoice(
                draftId = draftId,
                audioFile = wavFile,
                dialect = _uiState.value.selectedDialect
            )

            if (result.isSuccess) {
                val resp = result.getOrNull()!!
                _uiState.value = _uiState.value.copy(
                    isProcessing = false,
                    isCataloged = true,
                    regionalTranscript = resp.transcriptRegional,
                    englishTranscript = resp.transcriptEnglish,
                    productTitle = resp.metadata.title,
                    craftCategory = resp.metadata.craftCategory,
                    giTagStatus = resp.metadata.giTagStatus,
                    estimatedDays = resp.metadata.estimatedDays,
                    estimatedLaborHours = resp.metadata.estimatedDays * 8.0
                )

                // Consult Ask Dadi for contextual craft advice
                consultDadiAdvice(resp.metadata.title, resp.metadata.craftCategory)
            } else {
                // Offline fallback: keep local draft saved for offline sync queue
                _uiState.value = _uiState.value.copy(
                    isProcessing = false,
                    isCataloged = true,
                    productTitle = "हस्तशिल्प उत्पाद (Offline Draft)",
                    regionalTranscript = "ऑफ़लाइन आवाज़ रिकॉर्ड की गई (Saved for background sync)",
                    englishTranscript = "Offline recording saved to sync queue",
                    errorMessage = "Network unavailable. Saved draft locally to offline sync queue."
                )
            }
        }
    }

    fun consultDadiAdvice(craftTitle: String, category: String) {
        viewModelScope.launch {
            val query = "दादी, $craftTitle बनाने में क्या ध्यान रखें?"
            val dadiResult = catalogRepository.consultAskDadi(
                query = query,
                dialect = _uiState.value.selectedDialect,
                craftCategory = category
            )
            if (dadiResult.isSuccess) {
                _uiState.value = _uiState.value.copy(
                    dadiAdvice = dadiResult.getOrNull()?.answerText
                )
            }
        }
    }
}
