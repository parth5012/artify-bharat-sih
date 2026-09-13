package com.artifybharat.android.features.print

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Bluetooth
import androidx.compose.material.icons.filled.BluetoothConnected
import androidx.compose.material.icons.filled.Print
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavController
import com.artifybharat.android.hardware.bluetooth.PrinterConnectionStatus
import com.artifybharat.android.navigation.Screen
import com.artifybharat.android.ui.components.DesiButton
import com.artifybharat.android.ui.components.DesiButtonVariant
import com.artifybharat.android.ui.components.HeaderBar
import com.artifybharat.android.ui.theme.CardSurface
import com.artifybharat.android.ui.theme.DeepIndigoSecondary
import com.artifybharat.android.ui.theme.KhadiBackground
import com.artifybharat.android.ui.theme.NeemForestGreen
import com.artifybharat.android.ui.theme.ShapeMedium
import com.artifybharat.android.ui.theme.ShapePill
import com.artifybharat.android.ui.theme.TerracottaPrimary
import com.artifybharat.android.ui.theme.TextEnglishSecondary
import com.artifybharat.android.ui.theme.WarmSandBorder

@Composable
fun ThermalPrintScreen(
    navController: NavController,
    shortcode: String = "A7X-9B2",
    viewModel: ThermalPrintViewModel = viewModel(),
    modifier: Modifier = Modifier
) {
    val state by viewModel.uiState.collectAsState()
    val scrollState = rememberScrollState()

    LaunchedEffect(shortcode) {
        viewModel.setShortcode(shortcode)
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(KhadiBackground)
    ) {
        HeaderBar(
            hindiTitle = "थर्मल टैग प्रिंटर",
            englishTitle = "Step 5: 58mm ESC/POS Thermal Tag Printer",
            onBackClick = if (navController.previousBackStackEntry != null) {
                { navController.popBackStack() }
            } else null
        )

        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(scrollState)
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // 1. Printer Connection Status Strip
            val isConnected = state.printerState.status == PrinterConnectionStatus.CONNECTED
            Surface(
                shape = ShapePill,
                color = if (isConnected) Color(0xFFF1F8F4) else Color(0xFFFFF8E7),
                border = BorderStroke(1.dp, if (isConnected) NeemForestGreen else TerracottaPrimary),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = if (isConnected) Icons.Default.BluetoothConnected else Icons.Default.Bluetooth,
                            contentDescription = "Bluetooth",
                            tint = if (isConnected) NeemForestGreen else TerracottaPrimary,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = if (isConnected) "${state.printerState.connectedDeviceName} कनेक्टेड (Ready)" else "ब्लूटूथ प्रिंटर चुनें (Select Printer)",
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.Bold,
                            color = DeepIndigoSecondary
                        )
                    }

                    if (state.printerState.status == PrinterConnectionStatus.CONNECTING) {
                        CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Paired Printer Selector Chips
            if (state.pairedPrinters.isNotEmpty()) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    state.pairedPrinters.forEach { printer ->
                        val selected = state.selectedPrinterAddress == printer.address
                        Surface(
                            shape = ShapePill,
                            color = if (selected) DeepIndigoSecondary else CardSurface,
                            border = BorderStroke(1.dp, if (selected) DeepIndigoSecondary else WarmSandBorder),
                            modifier = Modifier.clickable { viewModel.selectPrinter(printer.address) }
                        ) {
                            Text(
                                text = printer.name,
                                style = MaterialTheme.typography.labelSmall,
                                color = if (selected) Color.White else DeepIndigoSecondary,
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // 2. Thermal Roll Emulation Card (58mm 384-dot replica with tear line)
            Surface(
                shape = RoundedCornerShape(topStart = 8.dp, topEnd = 8.dp),
                color = Color.White,
                border = BorderStroke(1.5.dp, Color(0xFFCCCCCC)),
                shadowElevation = 4.dp,
                modifier = Modifier
                    .width(280.dp)
                    .border(1.dp, Color(0xFFDDDDDD))
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(text = "================================", fontFamily = FontFamily.Monospace, fontSize = 10.sp, color = Color.Gray)
                    Text(text = "ARTIFY BHARAT", fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    Text(text = "MoSJE - SIH PS 26090", fontFamily = FontFamily.Monospace, fontSize = 11.sp)
                    Text(text = "Digital Heritage Passport", fontFamily = FontFamily.Monospace, fontSize = 10.sp)
                    Text(text = "--------------------------------", fontFamily = FontFamily.Monospace, fontSize = 10.sp, color = Color.Gray)

                    Column(modifier = Modifier.fillMaxWidth()) {
                        Text(text = "PRODUCT: ${state.productTitle}", fontFamily = FontFamily.Monospace, fontSize = 11.sp)
                        Text(text = "CRAFT  : ${state.craftCategory.uppercase()}", fontFamily = FontFamily.Monospace, fontSize = 11.sp)
                        Text(text = "ARTISAN: ${state.artisanName}", fontFamily = FontFamily.Monospace, fontSize = 11.sp)
                        Text(text = "CLUSTER: ${state.clusterName}", fontFamily = FontFamily.Monospace, fontSize = 11.sp)
                        Text(text = "GI CERT: VERIFIED AUTHENTIC", fontFamily = FontFamily.Monospace, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                    }

                    Text(text = "--------------------------------", fontFamily = FontFamily.Monospace, fontSize = 10.sp, color = Color.Gray)
                    Text(text = "FAIR WAGE FLOOR : Rs. ${String.format("%.0f", state.fairWageFloor)}", fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                    Text(text = "RETAIL PRICE    : Rs. ${String.format("%.0f", state.fairRetailPrice)}", fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                    Text(text = "--------------------------------", fontFamily = FontFamily.Monospace, fontSize = 10.sp, color = Color.Gray)

                    // QR Code Symbol placeholder in roll emulation
                    Box(
                        modifier = Modifier
                            .size(100.dp)
                            .background(Color(0xFFEEEEEE))
                            .border(1.dp, Color.Black),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(text = "[QR: ${state.shortcode}]", fontFamily = FontFamily.Monospace, fontSize = 9.sp)
                    }

                    Spacer(modifier = Modifier.height(8.dp))
                    Text(text = "CODE: ${state.shortcode}", fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Bold, fontSize = 18.sp, letterSpacing = 2.sp)
                    Text(text = "SHA256: ${state.passportHash.take(16)}...", fontFamily = FontFamily.Monospace, fontSize = 9.sp, color = Color.DarkGray)
                    Text(text = "Scan to verify authenticity", fontFamily = FontFamily.Monospace, fontSize = 9.sp)
                    Text(text = "- - - - - - - [TEAR LINE] - - - - - - -", fontFamily = FontFamily.Monospace, fontSize = 9.sp, color = Color.LightGray)
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // 3. Copy Count Stepper (1 to 5 copies)
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.Center,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = "प्रतियों की संख्या (Copies):",
                    style = MaterialTheme.typography.titleSmall,
                    color = DeepIndigoSecondary,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.width(16.dp))
                IconButton(
                    onClick = { viewModel.setCopyCount(state.copyCount - 1) },
                    enabled = state.copyCount > 1
                ) {
                    Icon(Icons.Default.Remove, contentDescription = "Decrease", tint = TerracottaPrimary)
                }
                Surface(
                    shape = CircleShape,
                    color = CardSurface,
                    border = BorderStroke(1.dp, WarmSandBorder),
                    modifier = Modifier.size(40.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Text(
                            text = "${state.copyCount}",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = TerracottaPrimary
                        )
                    }
                }
                IconButton(
                    onClick = { viewModel.setCopyCount(state.copyCount + 1) },
                    enabled = state.copyCount < 5
                ) {
                    Icon(Icons.Default.Add, contentDescription = "Increase", tint = TerracottaPrimary)
                }
            }

            state.statusFeedback?.let { feedback ->
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = feedback,
                    style = MaterialTheme.typography.bodySmall,
                    color = if (state.isPrintingSuccess) NeemForestGreen else TerracottaPrimary,
                    fontWeight = FontWeight.Bold
                )
            }
        }

        // 4. Sticky Bottom Action Buttons
        Surface(
            modifier = Modifier.fillMaxWidth(),
            color = Color.White,
            tonalElevation = 8.dp
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                DesiButton(
                    text = "टैग प्रिंट करें (Print 58mm Tag)",
                    onClick = { viewModel.printThermalTag() },
                    modifier = Modifier.fillMaxWidth(),
                    variant = DesiButtonVariant.PRIMARY,
                    subtext = "Send ESC/POS commands to thermal printer"
                )

                Spacer(modifier = Modifier.height(8.dp))

                DesiButton(
                    text = "एसएचजी हब पर जाएं (Go to SHG Hub)",
                    onClick = {
                        navController.navigate(Screen.ShgCoordinatorHub.route)
                    },
                    modifier = Modifier.fillMaxWidth(),
                    variant = DesiButtonVariant.OUTLINE,
                    subtext = "View peer jury & marketplace sync"
                )
            }
        }
    }
}
