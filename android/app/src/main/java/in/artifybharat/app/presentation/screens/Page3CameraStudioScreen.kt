package `in`.artifybharat.app.presentation.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Camera
import androidx.compose.material.icons.filled.Image
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
fun Page3CameraStudioScreen(
    onNavigateToVoiceCataloger: () -> Unit
) {
    var photoCaptured by remember { mutableStateOf(false) }
    var showEnhanced by remember { mutableStateOf(true) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("फोटो स्टूडियो (Camera Studio)", color = Color.White) },
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
            if (!photoCaptured) {
                Text(
                    text = "हस्तकला की साफ फोटो लें\n(Place craft on flat surface & capture)",
                    style = MaterialTheme.typography.titleLarge,
                    textAlign = TextAlign.Center
                )
                Spacer(modifier = Modifier.height(20.dp))

                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f)
                        .background(Color.Black, RoundedCornerShape(20.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(Icons.Default.Camera, contentDescription = null, tint = Color.White70, modifier = Modifier.size(72.dp))
                        Spacer(modifier = Modifier.height(12.dp))
                        Text("1:1 Square Viewfinder (CameraX)", color = Color.White70)
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))

                Button(
                    onClick = { photoCaptured = true },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(56.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = TerracottaPrimary)
                ) {
                    Icon(Icons.Default.Camera, contentDescription = null)
                    Spacer(modifier = Modifier.width(12.dp))
                    Text("फोटो खींचें (Capture Photo)", fontSize = 18.sp, fontWeight = FontWeight.Bold)
                }
            } else {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.Center
                ) {
                    FilterChip(
                        selected = !showEnhanced,
                        onClick = { showEnhanced = false },
                        label = { Text("कच्ची फोटो (Before Raw)") }
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    FilterChip(
                        selected = showEnhanced,
                        onClick = { showEnhanced = true },
                        label = { Text("स्टूडियो फोटो (After AI Enhanced)") }
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    shape = RoundedCornerShape(20.dp),
                    color = if (showEnhanced) Color.White else Color(0xFFE2E8F0),
                    shadowElevation = 4.dp
                ) {
                    Column(
                        modifier = Modifier.fillMaxSize(),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Icon(
                            imageVector = if (showEnhanced) Icons.Default.AutoAwesome else Icons.Default.Image,
                            contentDescription = null,
                            tint = if (showEnhanced) TerracottaPrimary else Color.Gray,
                            modifier = Modifier.size(80.dp)
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            text = if (showEnhanced)
                                "Studio Enhancement: Pure White Background\nCentered 1:1 Auto-Crop | Lighting Normalized"
                            else
                                "Raw Photo: Cluttered Room Background",
                            textAlign = TextAlign.Center,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                Button(
                    onClick = onNavigateToVoiceCataloger,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(56.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = TerracottaPrimary)
                ) {
                    Text("आगे बढ़ें: आवाज में बताएं (Next: Voice Description)", fontSize = 16.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}
