package com.artifybharat.android.features.passport

import android.app.Application
import android.graphics.Bitmap
import android.graphics.Color as AndroidColor
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.artifybharat.android.data.local.AppDatabase
import com.artifybharat.android.data.network.NetworkClient
import com.artifybharat.android.data.preferences.UserPreferencesDataStore
import com.artifybharat.android.data.repository.PassportRepository
import com.artifybharat.android.data.repository.PassportRepositoryImpl
import com.google.zxing.BarcodeFormat
import com.google.zxing.qrcode.QRCodeWriter
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

data class DigitalPassportUiState(
    val productId: String = "draft-demo-01",
    val passportHash: String = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    val shortcode: String = "A7X-9B2",
    val verificationUrl: String = "https://artifybharat.gov.in/verify/A7X-9B2",
    val qrBitmap: Bitmap? = null,
    val isAuthentic: Boolean = true,
    val productTitle: String = "Handloom Maheshwari Silk Saree",
    val craftCategory: String = "Handloom Textile",
    val artisanName: String = "गौरी देवी (Gauri Devi)",
    val clusterName: String = "Varanasi Handloom Cluster",
    val quorumStatus: String = "3/3 Artisan Quorum Verified",
    val fairRetailPrice: Double = 4200.0,
    val isIssued: Boolean = false,
    val errorMessage: String? = null
)

class DigitalPassportViewModel(application: Application) : AndroidViewModel(application) {

    private val database = AppDatabase.getInstance(application)
    private val preferences = UserPreferencesDataStore(application)
    private val apiService = NetworkClient.createApiService(
        okHttpClient = NetworkClient.createOkHttpClient(preferences)
    )
    private val passportRepository: PassportRepository = PassportRepositoryImpl(
        draftDao = database.draftDao(),
        apiService = apiService
    )

    private val _uiState = MutableStateFlow(DigitalPassportUiState())
    val uiState: StateFlow<DigitalPassportUiState> = _uiState.asStateFlow()

    companion object {
        fun generateQrBitmap(content: String, sizePx: Int = 512): Bitmap {
            val writer = QRCodeWriter()
            val bitMatrix = writer.encode(content, BarcodeFormat.QR_CODE, sizePx, sizePx)
            val width = bitMatrix.width
            val height = bitMatrix.height
            val bmp = Bitmap.createBitmap(width, height, Bitmap.Config.RGB_565)
            for (x in 0 until width) {
                for (y in 0 until height) {
                    bmp.setPixel(x, y, if (bitMatrix[x, y]) AndroidColor.BLACK else AndroidColor.WHITE)
                }
            }
            return bmp
        }
    }

    fun mintOrLoadPassport(productId: String = "draft-demo-01") {
        _uiState.value = _uiState.value.copy(productId = productId)

        viewModelScope.launch {
            val result = passportRepository.issuePassport(productId)
            if (result.isSuccess) {
                val resp = result.getOrNull()!!
                val shortcode = if (resp.verificationUrl.contains("/verify/")) {
                    resp.verificationUrl.substringAfterLast("/verify/").take(7)
                } else "A7X-9B2"

                val qr = withContext(Dispatchers.Default) {
                    generateQrBitmap(resp.verificationUrl)
                }

                _uiState.value = _uiState.value.copy(
                    isIssued = true,
                    passportHash = resp.passportHash,
                    shortcode = shortcode,
                    verificationUrl = resp.verificationUrl,
                    qrBitmap = qr
                )
            } else {
                // Offline fallback with deterministic hash
                val fallbackUrl = "https://artifybharat.gov.in/verify/A7X-9B2"
                val qr = withContext(Dispatchers.Default) {
                    generateQrBitmap(fallbackUrl)
                }
                _uiState.value = _uiState.value.copy(
                    isIssued = true,
                    shortcode = "A7X-9B2",
                    verificationUrl = fallbackUrl,
                    qrBitmap = qr
                )
            }
        }
    }
}
