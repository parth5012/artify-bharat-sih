package `in`.artifybharat.app.domain.model

data class Product(
    val id: String,
    val artisanId: String,
    val title: String,
    val description: String?,
    val craftCategory: String = "handloom",
    val giTagStatus: String = "Banarasi Brocade & Saree (GI Tagged)",
    val rawImagePath: String? = null,
    val enhancedImagePath: String? = null,
    val voiceAudioPath: String? = null,
    val visualComplexityScore: Float = 0.75f,
    val status: String = "draft"
)
