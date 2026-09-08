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
import androidx.compose.runtime.*
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
fun Page8AskDadiScreen(
    onNavigateBack: () -> Unit,
    onNavigateToCamera: () -> Unit,
    onNavigateToPricing: () -> Unit
) {
    var isListening by remember { mutableStateOf(false) }
    var selectedDialect by remember { mutableStateOf("Bhojpuri (भोजपुरी)") }
    var activeAdviceIndex by remember { mutableStateOf(0) }

    val adviceCards = listOf(
        DadiAdviceItem(
            query = "साड़ी के फोटो कैसन खींची जेकरा से GeM पर बढ़िया बिके?",
            answer = "बबुआ, साड़ी के हमेशा दिन के प्राकृतिक रोशनी में, साफ समतल जगह पर फैला के फोटो खींचा। कैमरा के 1:1 चौकोर फ्रेम में बीच में राखीं। AI बैकग्राउंड हटा के बढ़िया उज्जर बैकग्राउंड बना दी।",
            english = "Dear child, photograph your craft under natural daylight centered inside the 1:1 square frame. AI will auto-remove background.",
            tip = "जरी या नक्काशी के बारीक काम का क्लोज-अप फोटो जरूर लीजियेगा!",
            actionLabel = "AI कैमरा खोलें (Open Camera)",
            actionType = "camera"
        ),
        DadiAdviceItem(
            query = "दाम कैसन तय करीं जेकरा से नुकसान ना होखे?",
            answer = "कच्चा माल के खरचा आ जेतना दिन मेहनत लागल ओकर कम से कम ₹450 प्रति दिन के हिसाब जोड़ के राखा। बिचौलिया के कम दाम पर मत दीहा!",
            english = "Calculate material cost plus minimum ₹450/day fair wage floor. Never undersell to middlemen!",
            tip = "स्मार्ट प्राइसिंग कैलकुलेटर से आपको सही मार्केट विंडो मिल जाएगी।",
            actionLabel = "प्राइसिंग कैलकुलेटर (Pricing Calculator)",
            actionType = "pricing"
        ),
        DadiAdviceItem(
            query = "GeM आ ONDC पर माल कैसन बिक जाई?",
            answer = "वन-टैप पब्लिश से तोहार सामान सीधे सरकारी GeM पोर्टल आ ONDC के ग्राहकन तक पहुँच जाई। पार्सल पर QR कोड जरूर लगा दीहा।",
            english = "One-tap publish directly exports your verified craft to GeM and ONDC with digital passport QR.",
            tip = "सरकारी खरीद में असली GI टैग वाले उत्पाद को प्राथमिकता मिलती है।",
            actionLabel = "नया प्रोडक्ट शुरू करें (Start Product)",
            actionType = "camera"
        )
    )

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("दादी से पूछो (Ask Dadi)", color = Color.White, fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = Color.White)
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
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Dadi Avatar & Greeting Card
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(20.dp),
                color = Color(0xFFFFF3E0),
                shadowElevation = 2.dp
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(64.dp)
                            .background(TerracottaPrimary, CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Default.Face, contentDescription = "Dadi", tint = Color.White, modifier = Modifier.size(38.dp))
                    }
                    Spacer(modifier = Modifier.width(16.dp))
                    Column {
                        Text(
                            text = "प्रणाम! हम तोहार दादी",
                            fontSize = 20.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF5D2417)
                        )
                        Text(
                            text = "बुनाई, फोटो, दाम या सरकारी GeM पोर्टल से जुड़ल कुछ भी पूछ ला।",
                            fontSize = 13.sp,
                            color = Color(0xFF7A4839),
                            lineHeight = 18.sp
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Dialect Selector Chip Row
            Text("अपनी बोली चुनें (Select Dialect):", fontSize = 13.sp, fontWeight = FontWeight.Medium, color = Color.Gray)
            Spacer(modifier = Modifier.height(8.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                listOf("Bhojpuri (भोजपुरी)", "Hindi (हिन्दी)", "Maithili (मैथिली)").forEach { dialect ->
                    FilterChip(
                        selected = selectedDialect == dialect,
                        onClick = { selectedDialect = dialect },
                        label = { Text(dialect, fontSize = 12.sp) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = TerracottaPrimary,
                            selectedLabelColor = Color.White
                        )
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Massive Voice Ask Button
            Box(
                modifier = Modifier
                    .size(110.dp)
                    .background(
                        brush = Brush.radialGradient(
                            listOf(
                                if (isListening) Color(0xFFE53935) else TerracottaPrimary,
                                if (isListening) Color(0xFFB71C1C) else Color(0xFFC84218)
                            )
                        ),
                        shape = CircleShape
                    )
                    .clickable { isListening = !isListening },
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = if (isListening) Icons.Default.GraphicEq else Icons.Default.Mic,
                    contentDescription = "Mic",
                    tint = Color.White,
                    modifier = Modifier.size(52.dp)
                )
            }

            Spacer(modifier = Modifier.height(10.dp))
            Text(
                text = if (isListening) "दादी सुन रही हैं... (Dadi is listening)" else "माइक दबा के बोलें (Tap & Speak)",
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold,
                color = if (isListening) Color(0xFFE53935) else TerracottaPrimary
            )

            Spacer(modifier = Modifier.height(24.dp))

            // Advice Selector Tabs
            Text("अक्सर पूछे जाने वाले सवाल (Frequent Guidance):", fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
            Spacer(modifier = Modifier.height(10.dp))

            adviceCards.forEachIndexed { index, item ->
                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 6.dp)
                        .clickable { activeAdviceIndex = index },
                    shape = RoundedCornerShape(16.dp),
                    color = if (activeAdviceIndex == index) Color.White else Color(0xFFF7F5F0),
                    border = if (activeAdviceIndex == index) ButtonDefaults.outlinedButtonBorder else null,
                    shadowElevation = if (activeAdviceIndex == index) 4.dp else 0.dp
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                Icons.Default.QuestionAnswer,
                                contentDescription = null,
                                tint = TerracottaPrimary,
                                modifier = Modifier.size(20.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(item.query, fontWeight = FontWeight.Bold, fontSize = 15.sp, color = Color(0xFF2C2C2C))
                        }
                        
                        if (activeAdviceIndex == index) {
                            Spacer(modifier = Modifier.height(12.dp))
                            Text(item.answer, fontSize = 14.sp, color = Color(0xFF4A4A4A), lineHeight = 20.sp)
                            Spacer(modifier = Modifier.height(8.dp))
                            Text("En: ${item.english}", fontSize = 12.sp, color = Color.Gray, fontStyle = androidx.compose.ui.text.font.FontStyle.Italic)
                            
                            Spacer(modifier = Modifier.height(12.dp))
                            Surface(
                                shape = RoundedCornerShape(8.dp),
                                color = Color(0xFFE8F5E9),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Row(
                                    modifier = Modifier.padding(10.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(Icons.Default.Lightbulb, contentDescription = null, tint = TrustGreen, modifier = Modifier.size(18.dp))
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text("दादी का टिप: ${item.tip}", fontSize = 12.sp, color = TrustGreen, fontWeight = FontWeight.Medium)
                                }
                            }

                            Spacer(modifier = Modifier.height(12.dp))
                            Button(
                                onClick = {
                                    if (item.actionType == "camera") onNavigateToCamera()
                                    else if (item.actionType == "pricing") onNavigateToPricing()
                                },
                                modifier = Modifier.fillMaxWidth(),
                                colors = ButtonDefaults.buttonColors(containerColor = TerracottaPrimary),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Text(item.actionLabel, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }
        }
    }
}

data class DadiAdviceItem(
    val query: String,
    val answer: String,
    val english: String,
    val tip: String,
    val actionLabel: String,
    val actionType: String
)
