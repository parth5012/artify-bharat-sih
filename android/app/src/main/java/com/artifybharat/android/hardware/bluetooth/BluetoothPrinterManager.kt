package com.artifybharat.android.hardware.bluetooth

import android.Manifest
import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothSocket
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.content.ContextCompat
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.withContext
import java.io.IOException
import java.io.OutputStream
import java.util.UUID

enum class PrinterConnectionStatus {
    DISCONNECTED,
    CONNECTING,
    CONNECTED,
    PRINTING,
    ERROR
}

data class DiscoveredPrinter(
    val name: String,
    val address: String,
    val isBonded: Boolean
)

data class PrinterStatusState(
    val status: PrinterConnectionStatus = PrinterConnectionStatus.DISCONNECTED,
    val connectedDeviceName: String? = null,
    val connectedDeviceAddress: String? = null,
    val errorMessage: String? = null,
    val isPaperPresent: Boolean = true,
    val isReady: Boolean = false
)

class BluetoothPrinterManager(private val context: Context) {

    companion object {
        // Standard Bluetooth Serial Port Profile (SPP) UUID
        val SPP_UUID: UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")

        val KNOWN_PRINTER_PATTERNS = listOf(
            "MPT", "TVS", "RP3150", "POS", "PRINTER", "THERMAL", "BLUETOOTH", "RP", "BT"
        )
    }

    private val bluetoothAdapter: BluetoothAdapter? by lazy {
        val manager = context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            manager?.adapter
        } else {
            @Suppress("DEPRECATION")
            manager?.adapter ?: BluetoothAdapter.getDefaultAdapter()
        }
    }

    private val _printerState = MutableStateFlow(PrinterStatusState())
    val printerState: StateFlow<PrinterStatusState> = _printerState.asStateFlow()

    private var activeSocket: BluetoothSocket? = null
    private var activeOutputStream: OutputStream? = null
    private var lastConnectedAddress: String? = null

    fun hasBluetoothConnectPermission(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.BLUETOOTH_CONNECT
            ) == PackageManager.PERMISSION_GRANTED
        } else {
            true
        }
    }

    @SuppressLint("MissingPermission")
    fun getPairedThermalPrinters(): List<DiscoveredPrinter> {
        if (!hasBluetoothConnectPermission()) {
            _printerState.value = PrinterStatusState(
                status = PrinterConnectionStatus.ERROR,
                errorMessage = "BLUETOOTH_CONNECT permission not granted."
            )
            return emptyList()
        }

        val adapter = bluetoothAdapter ?: return emptyList()
        if (!adapter.isEnabled) return emptyList()

        return try {
            adapter.bondedDevices.map { device ->
                DiscoveredPrinter(
                    name = device.name ?: "Unknown Thermal Printer",
                    address = device.address,
                    isBonded = true
                )
            }.sortedByDescending { printer ->
                KNOWN_PRINTER_PATTERNS.any { printer.name.uppercase().contains(it) }
            }
        } catch (e: Exception) {
            emptyList()
        }
    }

    @SuppressLint("MissingPermission")
    suspend fun connectPrinter(deviceAddress: String): Result<Unit> = withContext(Dispatchers.IO) {
        if (!hasBluetoothConnectPermission()) {
            return@withContext Result.failure(SecurityException("BLUETOOTH_CONNECT permission required on Android 12+"))
        }

        disconnect()
        val adapter = bluetoothAdapter ?: return@withContext Result.failure(Exception("Bluetooth unavailable on device"))

        _printerState.value = PrinterStatusState(status = PrinterConnectionStatus.CONNECTING)

        try {
            val device: BluetoothDevice = adapter.getRemoteDevice(deviceAddress)
            adapter.cancelDiscovery()

            // First attempt standard secure SPP connection; fallback to insecure RFCOMM for generic thermal hardware
            var socket: BluetoothSocket? = null
            try {
                val s = device.createRfcommSocketToServiceRecord(SPP_UUID)
                s.connect()
                socket = s
            } catch (e: IOException) {
                // Insecure fallback for low-cost Indian village thermal printers (MPT-II, TVS RP3150)
                val fallback = device.createInsecureRfcommSocketToServiceRecord(SPP_UUID)
                fallback.connect()
                socket = fallback
            }

            activeSocket = socket
            activeOutputStream = socket?.outputStream
            lastConnectedAddress = deviceAddress

            _printerState.value = PrinterStatusState(
                status = PrinterConnectionStatus.CONNECTED,
                connectedDeviceName = device.name ?: deviceAddress,
                connectedDeviceAddress = deviceAddress,
                isReady = true
            )
            Result.success(Unit)
        } catch (e: Exception) {
            disconnect()
            _printerState.value = PrinterStatusState(
                status = PrinterConnectionStatus.ERROR,
                errorMessage = "Connection failed: ${e.localizedMessage}"
            )
            Result.failure(e)
        }
    }

    suspend fun autoReconnect(): Result<Unit> {
        val lastAddr = lastConnectedAddress ?: return Result.failure(IllegalStateException("No previous printer address to reconnect to."))
        return connectPrinter(lastAddr)
    }

    suspend fun printThermalTag(
        tagData: ThermalTagData,
        width: PrinterWidth = PrinterWidth.WIDTH_58MM,
        allowAutoReconnect: Boolean = true
    ): Result<Unit> = withContext(Dispatchers.IO) {
        var outputStream = activeOutputStream
        if (outputStream == null || activeSocket?.isConnected != true) {
            if (allowAutoReconnect && lastConnectedAddress != null) {
                val reconnectResult = autoReconnect()
                if (reconnectResult.isFailure) {
                    return@withContext Result.failure(reconnectResult.exceptionOrNull() ?: Exception("Reconnect failed"))
                }
                outputStream = activeOutputStream
            } else {
                return@withContext Result.failure(IllegalStateException("Printer not connected. Please connect printer first."))
            }
        }

        _printerState.value = _printerState.value.copy(status = PrinterConnectionStatus.PRINTING)

        try {
            val rawBytes = EscPosRenderer.renderTag(tagData, width)
            outputStream?.write(rawBytes)
            outputStream?.flush()

            _printerState.value = _printerState.value.copy(
                status = PrinterConnectionStatus.CONNECTED,
                isReady = true
            )
            Result.success(Unit)
        } catch (e: IOException) {
            disconnect()
            // Broken pipe / paper jam error handling: support reprint without re-minting shortcode
            _printerState.value = PrinterStatusState(
                status = PrinterConnectionStatus.ERROR,
                errorMessage = "Printing interrupted (paper jam or connection dropped). Tap 'Reprint Tag' to retry without re-minting."
            )
            Result.failure(e)
        }
    }

    fun disconnect() {
        try {
            activeOutputStream?.close()
            activeSocket?.close()
        } catch (e: Exception) {
            // Ignore socket closure errors
        } finally {
            activeOutputStream = null
            activeSocket = null
            _printerState.value = PrinterStatusState(status = PrinterConnectionStatus.DISCONNECTED)
        }
    }
}
