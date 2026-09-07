package `in`.artifybharat.app.presentation.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.RocketLaunch
import androidx.compose.material3.*
import androidx.compose.runtime.*
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
fun Page7ChannelExportScreen(
    onNavigateToHome: () -> Unit
) {
    var syncGem by remember { mutableStateOf(true) }
    var syncOndc by remember { mutableStateOf(true) }
    var syncB2B by remember { mutableStateOf(true) }
    var syncAmazonKarigar by remember { mutableStateOf(true) }
    var isExported by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("मल्टी-चैनल एक्सपोर्ट", color = Color.White) },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = TerracottaPrimary)
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Text(
                text = "किन पोर्टल्स पर लिस्ट करना चाहते हैं?\n(Select Procurement & E-Commerce Channels)",
                style = MaterialTheme.typography.titleLarge
            )

            Row(verticalAlignment = Alignment.CenterVertically) {
                Checkbox(checked = syncGem, onCheckedChange = { syncGem = it })
                Column {
                    Text("GeM (Government e-Marketplace)", fontWeight = FontWeight.Bold)
                    Text("सरकारी विभागों के लिए डायरेक्ट बल्क खरीद (Govt Procurement)", fontSize = 13.sp, color = Color.Gray)
                }
            }

            Row(verticalAlignment = Alignment.CenterVertically) {
                Checkbox(checked = syncOndc, onCheckedChange = { syncOndc = it })
                Column {
                    Text("ONDC (Open Network for Digital Commerce)", fontWeight = FontWeight.Bold)
                    Text("Paytm, Mystore, Pincode आदि सभी ऐप्स पर एक साथ लिस्टिंग", fontSize = 13.sp, color = Color.Gray)
                }
            }

            Row(verticalAlignment = Alignment.CenterVertically) {
                Checkbox(checked = syncB2B, onCheckedChange = { syncB2B = it })
                Column {
                    Text("Direct B2B Institutional Orders", fontWeight = FontWeight.Bold)
                    Text("होटल्स, कॉर्पोरेट गिफ्टिंग और एक्सपोर्टर्स (Min 10 Pieces)", fontSize = 13.sp, color = Color.Gray)
                }
            }

            Row(verticalAlignment = Alignment.CenterVertically) {
                Checkbox(checked = syncAmazonKarigar, onCheckedChange = { syncAmazonKarigar = it })
                Column {
                    Text("Amazon Karigar / Direct Retail", fontWeight = FontWeight.Bold)
                    Text("कस्टमर को सीधे सिंगल पीस डिलीवरी", fontSize = 13.sp, color = Color.Gray)
                }
            }

            Spacer(modifier = Modifier.weight(1f))

            if (isExported) {
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    color = TrustGreen.copy(alpha = 0.15f),
                    border = androidx.compose.foundation.BorderStroke(1.5.dp, TrustGreen)
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.CheckCircle, contentDescription = null, tint = TrustGreen, modifier = Modifier.size(36.dp))
                        Spacer(modifier = Modifier.width(12.dp))
                        Text(
                            "बधाई हो! आपका सामान GeM और ONDC पर सफलतापूर्वक लाइव हो गया है।",
                            fontWeight = FontWeight.Bold,
                            color = TrustGreen
                        )
                    }
                }
                Spacer(modifier = Modifier.height(12.dp))
                Button(
                    onClick = onNavigateToHome,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(56.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = TerracottaPrimary)
                ) {
                    Text("होम पेज पर वापस जाएं (Back to Dashboard)", fontSize = 16.sp, fontWeight = FontWeight.Bold)
                }
            } else {
                Button(
                    onClick = { isExported = true },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(56.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = TerracottaPrimary)
                ) {
                    Icon(Icons.Default.RocketLaunch, contentDescription = null)
                    Spacer(modifier = Modifier.width(12.dp))
                    Text("एक क्लिक में लिस्ट करें (One-Tap Export)", fontSize = 18.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}
