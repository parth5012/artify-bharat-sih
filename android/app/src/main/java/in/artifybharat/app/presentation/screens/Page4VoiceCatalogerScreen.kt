package `in`.artifybharat.app.presentation.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import `in`.artifybharat.app.presentation.theme.TerracottaPrimary
import `in`.artifybharat.app.presentation.theme.TrustGreen

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun Page4VoiceCatalogerScreen(
    onNavigateToDynamicPricing: () -> Unit
) {
    var isRecording by remember { mutableStateOf(false) }
    var isProcessed by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("आवाज से कैटलॉग (Voice Cataloger)", color = Color.White) },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = TerracottaPrimary)
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(20.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = "अपना सामान अपनी बोली में समझाइये\n(Explain your craft verbally in your dialect)",
                style = MaterialTheme.typography.titleLarge,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(24.dp))

            Box(
                modifier = Modifier
                    .size(110.dp)
                    .background(if (isRecording) Color.Red else TerracottaPrimary, CircleShape)
                    .clickable {
                        isRecording = !isRecording
                        if (!isRecording) isProcessed = true
                    },
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = if (isRecording) Icons.Default.Stop else Icons.Default.Mic,
                    contentDescription = null,
                    tint = Color.White,
                    modifier = Modifier.size(54.dp)
                )
            }

            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = if (isRecording) "रिकॉर्डिंग चालू है... (00:15)" else "माइक दबाकर 30-60 सेकंड बोलें",
                fontWeight = FontWeight.SemiBold
            )

            Spacer(modifier = Modifier.height(24.dp))

            if (isProcessed) {
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    color = Color.White,
                    border = androidx.compose.foundation.BorderStroke(1.5.dp, TrustGreen),
                    shadowElevation = 3.dp
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.AutoAwesome, contentDescription = null, tint = TrustGreen)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                "AI Auto-Generated Catalog (Mistral-7B)",
                                color = TrustGreen,
                                fontWeight = FontWeight.Bold,
                                fontSize = 16.sp
                            )
                        }
                        Divider(modifier = Modifier.padding(vertical = 8.dp))
                        Text(
                            "Handwoven Banarasi Silk Saree with Pure Zari Work",
                            fontWeight = FontWeight.Bold,
                            fontSize = 17.sp
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            "Traditional Kadhwa pit loom handloom saree crafted from pure Mulberry silk in Varanasi. GI Tagged.",
                            color = Color.DarkGray,
                            fontSize = 14.sp
                        )
                        Spacer(modifier = Modifier.height(10.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            SuggestionChip(onClick = {}, label = { Text("Banarasi Silk") })
                            SuggestionChip(onClick = {}, label = { Text("GI Certified") })
                            SuggestionChip(onClick = {}, label = { Text("15 Days Effort") })
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.weight(1f))

            if (isProcessed) {
                Button(
                    onClick = onNavigateToDynamicPricing,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(56.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = TerracottaPrimary)
                ) {
                    Text("कीमत तय करें (Next: Calculate Fair Price)", fontSize = 16.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}
