package com.artifybharat.android.features.market

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.QrCode
import androidx.compose.material.icons.filled.ReportProblem
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material.icons.filled.Verified
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavController
import com.artifybharat.android.navigation.Screen
import com.artifybharat.android.ui.components.DesiButton
import com.artifybharat.android.ui.components.DesiButtonVariant
import com.artifybharat.android.ui.components.GiTagBadge
import com.artifybharat.android.ui.components.HeaderBar
import com.artifybharat.android.ui.theme.CardSurface
import com.artifybharat.android.ui.theme.DeepIndigoSecondary
import com.artifybharat.android.ui.theme.KhadiBackground
import com.artifybharat.android.ui.theme.NeemForestGreen
import com.artifybharat.android.ui.theme.ShapeLarge
import com.artifybharat.android.ui.theme.ShapeMedium
import com.artifybharat.android.ui.theme.ShapePill
import com.artifybharat.android.ui.theme.TerracottaPrimary
import com.artifybharat.android.ui.theme.TextEnglishSecondary
import com.artifybharat.android.ui.theme.WarmSandBorder

@Composable
fun DirectMarketplaceScreen(
    navController: NavController,
    viewModel: DirectMarketplaceViewModel = viewModel(),
    modifier: Modifier = Modifier
) {
    val state by viewModel.uiState.collectAsState()
    var reportingShortcode by remember { mutableStateOf<String?>(null) }
    var reportReason by remember { mutableStateOf("") }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(KhadiBackground)
    ) {
        HeaderBar(
            hindiTitle = "हथकरघा हाट",
            englishTitle = "Direct Artisan Craft Marketplace",
            onBackClick = if (navController.previousBackStackEntry != null) {
                { navController.popBackStack() }
            } else null
        )

        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // 1. Hero 100% Payout Strip
            item {
                Surface(
                    shape = ShapeLarge,
                    color = DeepIndigoSecondary,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Verified, contentDescription = null, tint = Color.White, modifier = Modifier.size(20.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(text = "100% प्रत्यक्ष शिल्पकार जन-धन भुगतान", style = MaterialTheme.typography.titleMedium, color = Color.White, fontWeight = FontWeight.Bold)
                        }
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = "88% प्रत्यक्ष कारीगर • 7% भारतीय डाक डिलीवरी • 5% कच्चा माल सामग्री कोष",
                            style = MaterialTheme.typography.bodySmall,
                            color = Color(0xFFD0DDFF)
                        )
                    }
                }
            }

            state.purchaseSuccessMessage?.let { msg ->
                item {
                    Surface(shape = ShapeMedium, color = Color(0xFFF1F8F4), border = BorderStroke(1.dp, NeemForestGreen), modifier = Modifier.fillMaxWidth()) {
                        Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.CheckCircle, contentDescription = null, tint = NeemForestGreen, modifier = Modifier.size(20.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(text = msg, style = MaterialTheme.typography.bodySmall, color = NeemForestGreen, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }

            state.reportSuccessMessage?.let { msg ->
                item {
                    Surface(shape = ShapeMedium, color = Color(0xFFFFF8E7), border = BorderStroke(1.dp, TerracottaPrimary), modifier = Modifier.fillMaxWidth()) {
                        Text(text = msg, style = MaterialTheme.typography.bodySmall, color = TerracottaPrimary, fontWeight = FontWeight.Bold, modifier = Modifier.padding(12.dp))
                    }
                }
            }

            // 2. Product Items
            items(state.products, key = { it.productId }) { item ->
                Surface(
                    shape = ShapeLarge,
                    color = CardSurface,
                    border = BorderStroke(1.dp, WarmSandBorder),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            GiTagBadge(giTagStatus = "GI-Certified")
                            Text(text = "₹ ${String.format("%,.0f", item.price)}", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold, color = TerracottaPrimary)
                        }

                        Spacer(modifier = Modifier.height(8.dp))
                        Text(text = item.title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = DeepIndigoSecondary)

                        Spacer(modifier = Modifier.height(4.dp))
                        Text(text = "शिल्पकार: ${item.artisanName} (${item.maskedPehchan})", style = MaterialTheme.typography.bodyMedium, color = TextEnglishSecondary)
                        Text(text = "क्लस्टर: ${item.clusterName}", style = MaterialTheme.typography.bodySmall, color = TextEnglishSecondary)

                        Spacer(modifier = Modifier.height(12.dp))

                        // Verify & Buy buttons
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            DesiButton(
                                text = "पासपोर्ट देखें (Verify)",
                                onClick = {
                                    navController.navigate(Screen.DigitalPassport.createRoute(item.productId))
                                },
                                modifier = Modifier.weight(1f),
                                variant = DesiButtonVariant.OUTLINE
                            )
                            DesiButton(
                                text = "यूपीआई से खरीदें (Buy)",
                                onClick = { viewModel.initiateDirectBuy(item.productId) },
                                modifier = Modifier.weight(1f),
                                variant = DesiButtonVariant.PRIMARY
                            )
                        }

                        Spacer(modifier = Modifier.height(8.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.End
                        ) {
                            Text(
                                text = "नकली या मशीन निर्मित की रिपोर्ट करें (Report Fake)",
                                style = MaterialTheme.typography.labelSmall,
                                color = TerracottaPrimary,
                                modifier = Modifier.clickable { reportingShortcode = item.shortcode }
                            )
                        }
                    }
                }
            }
        }

        // Report Fake Dialog
        if (reportingShortcode != null) {
            AlertDialog(
                onDismissRequest = { reportingShortcode = null },
                confirmButton = {
                    DesiButton(
                        text = "रिपोर्ट दर्ज करें (Submit)",
                        onClick = {
                            viewModel.reportCounterfeit(reportingShortcode!!, reportReason)
                            reportingShortcode = null
                            reportReason = ""
                        },
                        variant = DesiButtonVariant.PRIMARY
                    )
                },
                dismissButton = {
                    DesiButton(
                        text = "रद्द करें (Cancel)",
                        onClick = { reportingShortcode = null },
                        variant = DesiButtonVariant.OUTLINE
                    )
                },
                title = { Text(text = "नकली शिल्प की रिपोर्ट करें", fontWeight = FontWeight.Bold) },
                text = {
                    Column {
                        Text(text = "कोड: $reportingShortcode")
                        Spacer(modifier = Modifier.height(8.dp))
                        OutlinedTextField(
                            value = reportReason,
                            onValueChange = { reportReason = it },
                            label = { Text("कारण बताएं (e.g. machine-made powerloom)") },
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                }
            )
        }
    }
}
