package com.artifybharat.android.features.queue

import android.app.Application
import android.content.Context
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.artifybharat.android.data.local.AppDatabase
import com.artifybharat.android.data.local.entity.DraftEntity
import com.artifybharat.android.data.sync.SyncScheduler
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class OfflineSyncQueueUiState(
    val drafts: List<DraftEntity> = emptyList(),
    val pendingCount: Int = 0,
    val isSyncing: Boolean = false,
    val statusMessage: String? = null
)

class OfflineSyncQueueViewModel(application: Application) : AndroidViewModel(application) {

    private val database = AppDatabase.getInstance(application)
    private val draftDao = database.draftDao()

    private val _uiState = MutableStateFlow(OfflineSyncQueueUiState())
    val uiState: StateFlow<OfflineSyncQueueUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            draftDao.getAllDrafts().collect { list ->
                val pending = list.count { it.status in listOf("QUEUED", "DRAFT", "FAILED") }
                _uiState.value = _uiState.value.copy(
                    drafts = list,
                    pendingCount = pending
                )
            }
        }
    }

    fun triggerSyncNow(context: Context) {
        _uiState.value = _uiState.value.copy(isSyncing = true, statusMessage = "ऑफ़लाइन ड्राफ्ट सिंक प्रारंभ किया जा रहा है...")
        SyncScheduler.triggerImmediateSync(context)
        viewModelScope.launch {
            kotlinx.coroutines.delay(2000)
            _uiState.value = _uiState.value.copy(isSyncing = false, statusMessage = "सिंक कार्य पृष्ठभूमि में निष्पादित हो रहा है।")
        }
    }

    fun deleteDraft(draftId: String) {
        viewModelScope.launch {
            draftDao.deleteDraftById(draftId)
        }
    }
}
