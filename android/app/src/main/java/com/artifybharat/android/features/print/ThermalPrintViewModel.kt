package com.artifybharat.android.features.print

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.artifybharat.android.hardware.bluetooth.BluetoothPrinterManager
import com.artifybharat.android.hardware.bluetooth.DiscoveredPrinter
import com.artifybharat.android.hardware.bluetooth.PrinterConnectionStatus
import com.artifybharat.android.hardware.bluetooth.PrinterStatusState
import com.artifybharat.android.hardware.bluetooth.PrinterWidth
import com.artifybharat.android.hardware.bluetooth.ThermalTagData
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class ThermalPrintUiState(
    val shortcode: String = "A7X-9B2",
    val productTitle: String = "Maheshwari Handloom Dupatta",
    val craftCategory: String = "handloom",
    val artisanName: String = "गौरी देवी (Gauri Devi)",
    val clusterName: String = "Varanasi Handloom Cluster",
    val fairWageFloor: Double = 3530.0,
    val fairRetailPrice: Double = 4200.0,
    val passportHash: String = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    val copyCount: Int = 1,
    val pairedPrinters: List<DiscoveredPrinter> = emptyList(),
    val selectedPrinterAddress: String? = null,
    val printerState: PrinterStatusState = PrinterStatusState(),
    val isPrintingSuccess: Boolean = false,
    val statusFeedback: String? = null
)

class ThermalPrintViewModel(application: Application) : AndroidViewModel(application) {

    val printerManager = BluetoothPrinterManager(application)

    private val _uiState = MutableStateFlow(ThermalPrintUiState())
    val uiState: StateFlow<ThermalPrintUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            printerManager.printerState.collect { pState ->
                _uiState.value = _uiState.value.copy(printerState = pState)
            }
        }
        refreshPairedPrinters()
    }

    fun setShortcode(code: String) {
        _uiState.value = _uiState.value.copy(shortcode = code)
    }

    fun refreshPairedPrinters() {
        val printers = printerManager.getPairedThermalPrinters()
        val defaultAddress = printers.firstOrNull()?.address
        _uiState.value = _uiState.value.copy(
            pairedPrinters = printers,
            selectedPrinterAddress = defaultAddress ?: _uiState.value.selectedPrinterAddress
        )
    }

    fun selectPrinter(address: String) {
        _uiState.value = _uiState.value.copy(selectedPrinterAddress = address)
        viewModelScope.launch {
            printerManager.connectPrinter(address)
        }
    }

    fun setCopyCount(count: Int) {
        _uiState.value = _uiState.value.copy(copyCount = count.coerceIn(1, 5))
    }

    fun printThermalTag() {
        val state = _uiState.value
        val tagData = ThermalTagData(
            productTitle = state.productTitle,
            craftCategory = state.craftCategory,
            artisanName = state.artisanName,
            clusterName = state.clusterName,
            fairWageFloor = state.fairWageFloor,
            fairRetailPrice = state.fairRetailPrice,
            shortcode = state.shortcode,
            passportHash = state.passportHash,
            isGiCertified = true,
            copyCount = state.copyCount
        )

        viewModelScope.launch {
            val result = printerManager.printThermalTag(tagData, PrinterWidth.WIDTH_58MM)
            if (result.isSuccess) {
                _uiState.value = _uiState.value.copy(
                    isPrintingSuccess = true,
                    statusFeedback = "प्रिंट सफल: ${state.copyCount} टैग प्रिंट किए गए (Printed successfully)."
                )
            } else {
                _uiState.value = _uiState.value.copy(
                    isPrintingSuccess = false,
                    statusFeedback = "प्रिंट त्रुटि: ${result.exceptionOrNull()?.localizedMessage}. टैग पुनः प्रिंट करने के लिए टैप करें।"
                )
            }
        }
    }
}
