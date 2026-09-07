package `in`.artifybharat.app.presentation.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.QrCode
import androidx.compose.material.icons.filled.Verified
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import `in`.artifybharat.app.presentation.theme.TerracottaPrimary
import `in`.artifybharat.app.presentation.theme.TrustGreen

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun Page6HeritagePassportScreen(
    onNavigateToChannelExport: () -> Unit
) {
    val dummyHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("शिल्पी डिजिटल पासपोर्ट", color = Color.White) },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = TerracottaPrimary)
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(20.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(20.dp),
                color = Color.White,
                border = androidx.compose.foundation.BorderStroke(2.dp, TrustGreen),
                shadowElevation = 4.dp
            ) {
                Column(
                    modifier = Modifier.padding(20.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("ARTISAN HERITAGE PASSPORT", fontWeight = FontWeight.Bold)
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = TrustGreen.copy(alpha = 0.15f)
                        ) {
                            Text(
                                "GI CERTIFIED",
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                color = TrustGreen,
                                fontWeight = FontWeight.Bold,
                                fontSize = 12.sp
                            )
                        }
                    }

                    Divider(modifier = Modifier.padding(vertical = 12.dp))

                    // QR Code icon simulation
                    Box(
                        modifier = Modifier
                            .size(140.dp)
                            .background(Color(0xFFF1F5F9), RoundedCornerShape(12.dp)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.QrCode,
                            contentDescription = "QR Code",
                            modifier = Modifier.size(100.dp),
                            tint = Color.Black
                        )
                    }

                    Spacer(modifier = Modifier.height(10.dp))
                    Text("Cryptographic SHA-256 Provenance Hash", fontSize = 12.sp, color = Color.Gray)
                    Text(
                        dummyHash.take(28) + "...",
                        fontWeight = FontWeight.Bold,
                        fontSize = 13.sp,
                        color = TerracottaPrimary
                    )

                    Divider(modifier = Modifier.padding(vertical = 12.dp))

                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("कारीगर (Artisan):")
                            Text("Gauri Devi (TRIFED-UP-VNS-1049)", fontWeight = FontWeight.Bold)
                        }
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("क्लस्टर (Cluster):")
                            Text("Varanasi Handloom (GI Tagged)", fontWeight = FontWeight.Bold)
                        }
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("मेहनत (Labor Investment):")
                            Text("15 Days (Pure Zari Kadhwa)", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.weight(1f))

            Button(
                onClick = onNavigateToChannelExport,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = TerracottaPrimary)
            ) {
                Text("मार्केट में भेजें (Next: One-Tap Multi-Channel Export)", fontSize = 16.sp, fontWeight = FontWeight.Bold)
            }
        }
    }
}
