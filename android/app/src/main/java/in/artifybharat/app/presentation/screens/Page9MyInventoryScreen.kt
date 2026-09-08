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
    onNavigateToNewProduct: () -> Unit
) {
    val sampleItems = remember {
        listOf(
            InventoryItemUi(
                id = "prod-01",
                title = "Handwoven Banarasi Silk Saree",
                category = "Handloom Textile",
                price = 10421.88,
                status = "PUBLISHED",
                channels = listOf("GeM", "ONDC", "B2B"),
                passportHash = "e3b0c44298fc1c14...855"
            ),
            InventoryItemUi(
                id = "prod-02",
                title = "Madhubani Hand-Painted Dupatta",
                category = "Folk Art & Textile",
                price = 4850.00,
                status = "PUBLISHED",
                channels = listOf("GeM", "ONDC"),
                passportHash = "f4c8996fb92427ae...afb"
            ),
            InventoryItemUi(
                id = "prod-03",
                title = "Pashmina Hand-Spun Woolen Shawl",
                category = "Pashmina Wool",
                price = 18500.00,
                status = "OFFLINE DRAFT",
                channels = listOf("Draft"),
                passportHash = "Pending Verification"
            )
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("मेरी सूची (My Inventory)", color = Color.White, fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = Color.White)
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
                            Text("3", fontSize = 22.sp, fontWeight = FontWeight.Bold, color = TerracottaPrimary)
                        }
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("सक्रिय GeM/ONDC", fontSize = 12.sp, color = Color.Gray)
                            Text("2", fontSize = 22.sp, fontWeight = FontWeight.Bold, color = TrustGreen)
                        }
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("ऑफ़लाइन ड्राफ़्ट", fontSize = 12.sp, color = Color.Gray)
                            Text("1", fontSize = 22.sp, fontWeight = FontWeight.Bold, color = Color(0xFFE65100))
                        }
                    }
                }
            }

            items(sampleItems) { item ->
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
                                color = if (item.status == "PUBLISHED") Color(0xFFE8F5E9) else Color(0xFFFFF3E0)
                            ) {
                                Text(
                                    text = item.status,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (item.status == "PUBLISHED") TrustGreen else Color(0xFFE65100),
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
