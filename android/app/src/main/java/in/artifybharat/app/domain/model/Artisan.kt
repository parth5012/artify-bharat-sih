package `in`.artifybharat.app.domain.model

data class Artisan(
    val id: String,
    val name: String,
    val phone: String,
    val primaryDialect: String = "bhojpuri",
    val state: String = "Uttar Pradesh",
    val district: String = "Varanasi",
    val clusterName: String = "Varanasi Handloom Cluster",
    val trifedId: String? = null,
    val pehchanId: String? = null,
    val isVerified: Boolean = true
)
