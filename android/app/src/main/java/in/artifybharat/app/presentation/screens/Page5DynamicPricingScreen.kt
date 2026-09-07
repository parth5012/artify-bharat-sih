package `in`.artifybharat.app.presentation.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import `in`.artifybharat.app.presentation.theme.TerracottaPrimary
import `in`.artifybharat.app.presentation.theme.WarmAmber

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun Page5DynamicPricingScreen(
    onNavigateToHeritagePassport: () -> Unit
) {
    var rawMaterialCost by remember { mutableStateOf(500.0) }
    var laborDays by remember { mutableStateOf(15.0) }
    val dailyWageBenchmark = 450.0

    val fairWageTotal = laborDays * dailyWageBenchmark
    val minSuggested = (rawMaterialCost + fairWageTotal) * 0.95
    val maxSuggested = (rawMaterialCost + fairWageTotal) * 1.35
    var selectedPrice by remember { mutableStateOf((minSuggested + maxSuggested) / 2) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("सही कीमत कैलकुलेटर (Fair Pricing)", color = Color.White) },
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
                text = "लागत और मेहनत दर्ज करें\n(Enter Raw Material Cost & Labor Days)",
                style = MaterialTheme.typography.titleLarge
            )

            // Raw Material Cost Card
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                color = Color.White,
                shadowElevation = 2.dp
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text("कच्चा माल खर्च (Raw Material)")
                        Text("₹${rawMaterialCost.toInt()}", fontSize = 24.sp, fontWeight = FontWeight.Bold)
                    }
                    Row {
                        IconButton(onClick = { rawMaterialCost = (rawMaterialCost - 100).coerceAtLeast(100.0) }) {
                            Icon(Icons.Default.Remove, contentDescription = null)
                        }
                        IconButton(onClick = { rawMaterialCost += 100 }) {
                            Icon(Icons.Default.Add, contentDescription = null)
                        }
                    }
                }
            }

            // Labor Days Card
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                color = Color.White,
                shadowElevation = 2.dp
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text("बनाने में लगे दिन (Labor Days)")
                        Text("${laborDays.toInt()} दिन (Days)", fontSize = 24.sp, fontWeight = FontWeight.Bold)
                    }
                    Row {
                        IconButton(onClick = { laborDays = (laborDays - 1).coerceAtLeast(1.0) }) {
                            Icon(Icons.Default.Remove, contentDescription = null)
                        }
                        IconButton(onClick = { laborDays += 1 }) {
                            Icon(Icons.Default.Add, contentDescription = null)
                        }
                    }
                }
            }

            // Market Range & Fair Wage Protection Card
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                color = WarmAmber,
                shadowElevation = 3.dp
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("AI और GeM/ONDC सुझाव: अनुशंसित मूल्य", fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        "₹${minSuggested.toInt()} – ₹${maxSuggested.toInt()}",
                        fontSize = 26.sp,
                        fontWeight = FontWeight.Bold,
                        color = TerracottaPrimary
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Slider(
                        value = selectedPrice.toFloat(),
                        onValueChange = { selectedPrice = it.toDouble() },
                        valueRange = minSuggested.toFloat()..maxSuggested.toFloat()
                    )
                    Divider(modifier = Modifier.padding(vertical = 8.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("आपकी पक्की मजदूरी (Fair Wage Floor):")
                        Text("₹${fairWageTotal.toInt()}", fontWeight = FontWeight.Bold)
                    }
                }
            }

            Spacer(modifier = Modifier.weight(1f))

            Button(
                onClick = onNavigateToHeritagePassport,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = TerracottaPrimary)
            ) {
                Text("पासपोर्ट बनाएं (Next: Issue Heritage Passport)", fontSize = 16.sp, fontWeight = FontWeight.Bold)
            }
        }
    }
}
