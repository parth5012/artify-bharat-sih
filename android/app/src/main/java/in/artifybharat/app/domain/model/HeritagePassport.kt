package `in`.artifybharat.app.domain.model

data class HeritagePassport(
    val productId: String,
    val passportHash: String,
    val qrCodeDataUri: String,
    val verificationUrl: String,
    val issuedAt: String
)
