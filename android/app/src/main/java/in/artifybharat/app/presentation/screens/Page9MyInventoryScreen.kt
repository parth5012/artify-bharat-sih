package `in`.artifybharat.app.presentation.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
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

data class InventoryItemUi(
    val id: String,
    val title: String,
    val category: String,
    val price: Double,
    val status: String,
    val channels: List<String>,
    val passportHash: String
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun Page9MyInventoryScreen(
    onNavigateBack: () -> Unit,
    onNavigateToNewProduct: () -> Unit,
    viewModel: MyInventoryViewModel = remember { MyInventoryViewModel() }
) {
    val state by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("मेरी सूची (My Inventory)", color = Color.White, fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = Color.White)
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.loadInventory() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh", tint = Color.White)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = TerracottaPrimary)
            )
        },
        floatingActionButton = {
            ExtendedFloatingActionButton(
                onClick = onNavigateToNewProduct,
                icon = { Icon(Icons.Default.Add, contentDescription = null) },
                text = { Text("नया प्रोडक्ट (Add Product)") },
                containerColor = TerracottaPrimary,
                contentColor = Color.White
            )
        }
    ) { padding ->
        when (val uiState = state) {
            is InventoryUiState.Loading -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        CircularProgressIndicator(color = TerracottaPrimary)
                        Spacer(modifier = Modifier.height(12.dp))
                        Text("सूची लोड हो रही है... (Loading Inventory)", color = Color.Gray, fontSize = 14.sp)
                    }
                }
            }

            is InventoryUiState.Error -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                        .padding(24.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(Icons.Default.Warning, contentDescription = null, tint = Color(0xFFD32F2F), modifier = Modifier.size(48.dp))
                        Spacer(modifier = Modifier.height(12.dp))
                        Text("त्रुटि: ${uiState.message}", color = Color(0xFFD32F2F), textAlign = TextAlign.Center, fontSize = 14.sp)
                        Spacer(modifier = Modifier.height(16.dp))
                        Button(
                            onClick = { viewModel.loadInventory() },
                            colors = ButtonDefaults.buttonColors(containerColor = TerracottaPrimary)
                        ) {
                            Text("पुनः प्रयास करें (Retry)")
                        }
                    }
                }
            }

            is InventoryUiState.Success -> {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                        .background(Color(0xFFF9F7F2))
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    item {
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = Color.White,
                            shadowElevation = 2.dp,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier.padding(16.dp),
                                horizontalArrangement = Arrangement.SpaceAround
                            ) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text("कुल उत्पाद", fontSize = 12.sp, color = Color.Gray)
                                    Text("${uiState.totalItems}", fontSize = 22.sp, fontWeight = FontWeight.Bold, color = TerracottaPrimary)
                                }
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text("सक्रिय GeM/ONDC", fontSize = 12.sp, color = Color.Gray)
                                    Text("${uiState.activeListingsCount}", fontSize = 22.sp, fontWeight = FontWeight.Bold, color = TrustGreen)
                                }
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text("ऑफ़लाइन ड्राफ़्ट", fontSize = 12.sp, color = Color.Gray)
                                    Text("${uiState.draftsCount}", fontSize = 22.sp, fontWeight = FontWeight.Bold, color = Color(0xFFE65100))
                                }
                            }
                        }
                    }

                    if (uiState.items.isEmpty()) {
                        item {
                            Surface(
                                shape = RoundedCornerShape(16.dp),
                                color = Color.White,
                                shadowElevation = 1.dp,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 24.dp)
                            ) {
                                Column(
                                    modifier = Modifier.padding(24.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally
                                ) {
                                    Icon(Icons.Default.Inventory2, contentDescription = null, tint = Color.LightGray, modifier = Modifier.size(56.dp))
                                    Spacer(modifier = Modifier.height(12.dp))
                                    Text("अभी कोई उत्पाद नहीं है", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color.DarkGray)
                                    Spacer(modifier = Modifier.height(6.dp))
                                    Text("अपना पहला उत्पाद कैमरे से जोड़ें और GeM/ONDC पर बेचें।", fontSize = 13.sp, color = Color.Gray, textAlign = TextAlign.Center)
                                    Spacer(modifier = Modifier.height(16.dp))
                                    Button(
                                        onClick = onNavigateToNewProduct,
                                        colors = ButtonDefaults.buttonColors(containerColor = TerracottaPrimary)
                                    ) {
                                        Text("पहला उत्पाद जोड़ें (Add First Product)")
                                    }
                                }
                            }
                        }
                    } else {
                        items(uiState.items) { item ->
                            Surface(
                                shape = RoundedCornerShape(16.dp),
                                color = Color.White,
                                shadowElevation = 3.dp,
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(modifier = Modifier.padding(16.dp)) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(item.title, fontWeight = FontWeight.Bold, fontSize = 16.sp, modifier = Modifier.weight(1f))
                                        Surface(
                                            shape = RoundedCornerShape(6.dp),
                                            color = if (item.status == "PUBLISHED" || item.status == "VERIFIED") Color(0xFFE8F5E9) else Color(0xFFFFF3E0)
                                        ) {
                                            Text(
                                                text = item.status,
                                                fontSize = 11.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = if (item.status == "PUBLISHED" || item.status == "VERIFIED") TrustGreen else Color(0xFFE65100),
                                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                            )
                                        }
                                    }

                                    Spacer(modifier = Modifier.height(6.dp))
                                    Text(item.category, fontSize = 13.sp, color = Color.Gray)

                                    Spacer(modifier = Modifier.height(10.dp))
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text("₹${"%,.2f".format(item.price)}", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = TerracottaPrimary)
                                        Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                            item.channels.forEach { ch ->
                                                Surface(
                                                    shape = RoundedCornerShape(4.dp),
                                                    color = Color(0xFFECEFF1)
                                                ) {
                                                    Text(ch, fontSize = 11.sp, color = Color(0xFF37474F), modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                                                }
                                            }
                                        }
                                    }

                                    Spacer(modifier = Modifier.height(10.dp))
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(Icons.Default.QrCode, contentDescription = null, tint = Color.Gray, modifier = Modifier.size(16.dp))
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Text("Passport: ${item.passportHash}", fontSize = 11.sp, color = Color.Gray)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
