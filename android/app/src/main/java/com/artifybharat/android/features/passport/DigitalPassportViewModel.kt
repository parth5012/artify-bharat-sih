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
    val isOffline: Boolean = false,
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
            // Check if input is a shortcode (e.g. A7X-9B2) from a deep link or qr scan
            val isShortcode = productId.contains("-") || (productId.length in 6..7 && !productId.startsWith("draft"))
            if (isShortcode) {
                val verifyResult = passportRepository.resolvePassportByShortcode(productId)
                if (verifyResult.isSuccess) {
                    val verification = verifyResult.getOrNull()!!
                    val url = "https://artifybharat.gov.in/verify/$productId"
                    val qr = withContext(Dispatchers.Default) {
                        generateQrBitmap(url)
                    }
                    _uiState.value = _uiState.value.copy(
                        isIssued = true,
                        isAuthentic = verification.isAuthentic,
                        productTitle = verification.productTitle,
                        craftCategory = verification.craftCategory,
                        artisanName = verification.artisanName,
                        clusterName = verification.clusterName,
                        passportHash = verification.passportHash,
                        shortcode = productId,
                        verificationUrl = url,
                        qrBitmap = qr
                    )
                    return@launch
                }
            }

            // Otherwise issue/mint passport for draft ID
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
                isOffline = false,
                passportHash = resp.passportHash,
                shortcode = shortcode,
                verificationUrl = resp.verificationUrl,
                qrBitmap = qr,
                errorMessage = null
            )
        } else {
            // Honest offline fallback with disclaimer: do not generate valid public verification credentials
            val err = result.exceptionOrNull()?.localizedMessage ?: "Backend unreachable"
            _uiState.value = _uiState.value.copy(
                isIssued = false,
                isOffline = true,
                shortcode = "",
                verificationUrl = "",
                qrBitmap = null,
                errorMessage = "सर्वर उपलब्ध नहीं है ($err) • पासपोर्ट अभी जारी नहीं हुआ है।"
            )
        }
        }
    }
}
