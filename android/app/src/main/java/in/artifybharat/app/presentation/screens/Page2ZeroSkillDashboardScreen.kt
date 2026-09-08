package `in`.artifybharat.app.presentation.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import `in`.artifybharat.app.presentation.theme.TerracottaPrimary
import `in`.artifybharat.app.presentation.theme.TrustGreen

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun Page2ZeroSkillDashboardScreen(
    onNavigateToCameraStudio: () -> Unit,
    onNavigateToInventory: () -> Unit = {},
    onNavigateToAskDadi: () -> Unit = {}
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Artify Bharat Dashboard", color = Color.White, fontWeight = FontWeight.Bold) },
                actions = {
                    IconButton(onClick = onNavigateToAskDadi) {
                        Icon(Icons.Default.HelpOutline, contentDescription = "Help", tint = Color.White)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = TerracottaPrimary)
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(Color(0xFFFFFDF9))
                .verticalScroll(rememberScrollState())
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Artisan Greeting Card
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                color = Color.White,
                shadowElevation = 3.dp
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(56.dp)
                            .background(TerracottaPrimary, CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Default.Person, contentDescription = null, tint = Color.White, modifier = Modifier.size(32.dp))
                    }
                    Spacer(modifier = Modifier.width(16.dp))
                    Column {
                        Text("नमस्ते, गौरी देवी जी", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                        Spacer(modifier = Modifier.height(4.dp))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Verified, contentDescription = null, tint = TrustGreen, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Verified Artisan (TRIFED-UP / Pehchan)", color = TrustGreen, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        }
                    }
                }
            }

            // 'Ask Dadi' Voice Help Quick Card (UI_Help)
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onNavigateToAskDadi() },
                shape = RoundedCornerShape(16.dp),
                color = Color(0xFFFFF3E0),
                border = ButtonDefaults.outlinedButtonBorder,
                shadowElevation = 2.dp
            ) {
                Row(
                    modifier = Modifier.padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(46.dp)
                            .background(Color(0xFFE65100), CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Default.Face, contentDescription = "Dadi", tint = Color.White, modifier = Modifier.size(28.dp))
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text("दादी से पूछो (Ask Dadi)", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color(0xFF5D2417))
                        Text("बुनाई, फोटो या दाम की सलाह अपनी बोली में लें", fontSize = 12.sp, color = Color(0xFF7A4839))
                    }
                    Icon(Icons.Default.Mic, contentDescription = "Voice", tint = Color(0xFFE65100), modifier = Modifier.size(24.dp))
                }
            }

            // Zero-Skill Massive Primary CTA: "Naya Product" (UI_Dash -> UI_Capture)
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(200.dp)
                    .background(
                        brush = Brush.verticalGradient(
                            listOf(TerracottaPrimary, Color(0xFFE0562D))
                        ),
                        shape = RoundedCornerShape(24.dp)
                    )
                    .clickable { onNavigateToCameraStudio() },
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(
                        imageVector = Icons.Default.CameraAlt,
                        contentDescription = "Camera",
                        tint = Color.White,
                        modifier = Modifier.size(68.dp)
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        text = "नया प्रोडक्ट बेचें\n(Sell New Product)",
                        color = Color.White,
                        fontSize = 24.sp,
                        fontWeight = FontWeight.Bold,
                        textAlign = TextAlign.Center,
                        lineHeight = 30.sp
                    )
                }
            }

            // Secondary Link for Active Listings / My Inventory (UI_Dash -> My Inventory)
            OutlinedButton(
                onClick = onNavigateToInventory,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                shape = RoundedCornerShape(16.dp)
            ) {
                Icon(Icons.Default.Storefront, contentDescription = null, tint = TerracottaPrimary)
                Spacer(modifier = Modifier.width(12.dp))
                Text("मेरी सूची (My Inventory: 3 Items)", color = TerracottaPrimary, fontSize = 16.sp, fontWeight = FontWeight.Bold)
            }
        }
    }
}
