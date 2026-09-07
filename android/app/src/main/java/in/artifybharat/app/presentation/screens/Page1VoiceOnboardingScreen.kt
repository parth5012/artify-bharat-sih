package `in`.artifybharat.app.presentation.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.Lock
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
import `in`.artifybharat.app.presentation.theme.DeepCharcoal

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun Page1VoiceOnboardingScreen(
    onNavigateToDashboard: () -> Unit
) {
    var isListening by remember { mutableStateOf(false) }
    var recognizedText by remember { mutableStateOf("") }
    var name by remember { mutableStateOf("गौरी देवी (Gauri Devi)") }
    var phone by remember { mutableStateOf("9876543210") }
    var pin by remember { mutableStateOf("1234") }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Artify Bharat | शिल्पी पंजीकरण", color = Color.White) },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = TerracottaPrimary)
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(20.dp)
        ) {
            Text(
                text = "बोलकर खाता बनाएं\n(Speak to Register)",
                style = MaterialTheme.typography.headlineMedium,
                textAlign = TextAlign.Center,
                color = DeepCharcoal
            )

            // Large Voice Mic CTA
            Box(
                modifier = Modifier
                    .size(130.dp)
                    .background(
                        color = if (isListening) Color.Red else TerracottaPrimary,
                        shape = CircleShape
                    )
                    .clickable {
                        isListening = !isListening
                        recognizedText = if (isListening) {
                            "सुन रहे हैं... (Listening in regional dialect)"
                        } else {
                            "\"मेरा नाम गौरी देवी है, वाराणसी हथकरघा से हूँ।\""
                        }
                    },
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Mic,
                    contentDescription = "Microphone",
                    tint = Color.White,
                    modifier = Modifier.size(64.dp)
                )
            }

            Text(
                text = if (isListening) "माइक चालू बा... (Listening)" else "माइक दबाकर बोलें (Tap to Speak)",
                fontWeight = FontWeight.SemiBold,
                fontSize = 16.sp
            )

            if (recognizedText.isNotEmpty()) {
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = Color.White,
                    shadowElevation = 2.dp,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = recognizedText,
                        modifier = Modifier.padding(16.dp),
                        style = MaterialTheme.typography.bodyLarge
                    )
                }
            }

            OutlinedTextField(
                value = name,
                onValueChange = { name = it },
                label = { Text("कारीगर का नाम (Artisan Name)") },
                leadingIcon = { Icon(Icons.Default.Person, contentDescription = null) },
                modifier = Modifier.fillMaxWidth()
            )

            OutlinedTextField(
                value = phone,
                onValueChange = { phone = it },
                label = { Text("मोबाइल नंबर (Phone Number)") },
                leadingIcon = { Icon(Icons.Default.Phone, contentDescription = null) },
                modifier = Modifier.fillMaxWidth()
            )

            OutlinedTextField(
                value = pin,
                onValueChange = { pin = it },
                label = { Text("4-अंकों का पिन (4-Digit Security PIN)") },
                leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null) },
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.weight(1f))

            Button(
                onClick = onNavigateToDashboard,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = TerracottaPrimary)
            ) {
                Text("पंजीकरण पूरा करें (Complete Setup)", fontSize = 18.sp, fontWeight = FontWeight.Bold)
            }
        }
    }
}
