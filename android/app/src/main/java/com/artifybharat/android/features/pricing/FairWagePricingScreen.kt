package com.artifybharat.android.features.pricing

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
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
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
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
import com.artifybharat.android.ui.components.HeaderBar
import com.artifybharat.android.ui.theme.CardSurface
import com.artifybharat.android.ui.theme.DeepIndigoSecondary
import com.artifybharat.android.ui.theme.KhadiBackground
import com.artifybharat.android.ui.theme.MarigoldYellow
import com.artifybharat.android.ui.theme.NeemForestGreen
import com.artifybharat.android.ui.theme.ShapeLarge
import com.artifybharat.android.ui.theme.ShapeMedium
import com.artifybharat.android.ui.theme.ShapePill
import com.artifybharat.android.ui.theme.TerracottaPrimary
import com.artifybharat.android.ui.theme.TextEnglishSecondary
import com.artifybharat.android.ui.theme.WarmSandBorder

@Composable
fun FairWagePricingScreen(
    navController: NavController,
    draftId: String = "draft-demo-01",
    viewModel: FairWagePricingViewModel = viewModel(),
    modifier: Modifier = Modifier
) {
    val state by viewModel.uiState.collectAsState()
    val scrollState = rememberScrollState()

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(KhadiBackground)
    ) {
        HeaderBar(
            hindiTitle = "उचित पारिश्रमिक मूल्य",
            englishTitle = "Step 3: Fair Wage Floor & Dynamic Pricing",
            onBackClick = if (navController.previousBackStackEntry != null) {
                { navController.popBackStack() }
            } else null
        )

        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(scrollState)
                .padding(16.dp)
        ) {
            // 1. Statutory Wage Floor Callout Banner
            Surface(
                shape = ShapeMedium,
                color = Color(0xFFF1F8F4),
                border = BorderStroke(1.5.dp, NeemForestGreen),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(40.dp)
                            .background(NeemForestGreen, ShapePill),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Shield,
                            contentDescription = "Fair Wage Shield",
                            tint = Color.White,
                            modifier = Modifier.size(24.dp)
                        )
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text(
                            text = "न्यूनतम वैधानिक पारिश्रमिक सीमा (Wage Floor)",
                            style = MaterialTheme.typography.labelMedium,
                            color = NeemForestGreen,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "₹ ${String.format("%.0f", state.statutoryFloorPrice)} Minimum Guaranteed Wage",
                            style = MaterialTheme.typography.titleMedium,
                            color = DeepIndigoSecondary,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "MoSJE & Haryana statutory rate: ₹${String.format("%.0f", state.hourlyWageRate)}/hr",
                            style = MaterialTheme.typography.bodySmall,
                            color = TextEnglishSecondary,
                            fontSize = 11.sp
                        )
                    }
                }
            }

            // Sub-floor Warning Banner
            AnimatedVisibility(visible = state.isSubFloorWarning) {
                Surface(
                    shape = ShapeMedium,
                    color = Color(0xFFFFEBEE),
                    border = BorderStroke(1.dp, TerracottaPrimary),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 10.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(10.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.Warning,
                            contentDescription = "Sub-floor Warning",
                            tint = TerracottaPrimary,
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "चेतावनी: चुना गया मूल्य वैधानिक न्यूनतम मजदूरी से कम है। कृपया मूल्य बढ़ाएं।",
                            style = MaterialTheme.typography.bodySmall,
                            color = TerracottaPrimary,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // 2. Interactive Price Recommendation Slider
            Surface(
                shape = ShapeLarge,
                color = CardSurface,
                border = BorderStroke(1.dp, WarmSandBorder),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "खुदरा विक्रय मूल्य चुनें (Selected Retail Price):",
                        style = MaterialTheme.typography.labelLarge,
                        color = DeepIndigoSecondary
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    Row(
                        verticalAlignment = Alignment.Bottom,
                        horizontalArrangement = Arrangement.SpaceBetween,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = "₹ ${String.format("%.0f", state.selectedPrice)}",
                            style = MaterialTheme.typography.headlineLarge,
                            color = TerracottaPrimary,
                            fontWeight = FontWeight.Bold
                        )
                        Surface(
                            shape = ShapePill,
                            color = Color(0xFFF1F8F4),
                            border = BorderStroke(1.dp, NeemForestGreen)
                        ) {
                            Text(
                                text = "लाभ: ₹${String.format("%.0f", state.artisanNetProfit)}",
                                style = MaterialTheme.typography.labelMedium,
                                color = NeemForestGreen,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))
                    Slider(
                        value = state.selectedPrice.toFloat(),
                        onValueChange = { viewModel.onPriceSliderChange(it.toDouble()) },
                        valueRange = 3000f..6000f,
                        steps = 30,
                        colors = SliderDefaults.colors(
                            thumbColor = TerracottaPrimary,
                            activeTrackColor = TerracottaPrimary,
                            inactiveTrackColor = WarmSandBorder
                        )
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(text = "फ्लोर: ₹${String.format("%.0f", state.statutoryFloorPrice)}", style = MaterialTheme.typography.labelSmall, color = TextEnglishSecondary)
                        Text(text = "सुझाव: ₹3850 - ₹4400", style = MaterialTheme.typography.labelSmall, color = NeemForestGreen, fontWeight = FontWeight.Bold)
                        Text(text = "अधिकतम: ₹6000", style = MaterialTheme.typography.labelSmall, color = TextEnglishSecondary)
                    }
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // 3. Transparent Cost Breakdown Mosaic
            Text(
                text = "पारदर्शी लागत विभाजन (Financial Cost Breakdown):",
                style = MaterialTheme.typography.titleMedium,
                color = DeepIndigoSecondary,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(10.dp))

            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                BreakdownRow(
                    hindi = "कच्चा माल",
                    english = "Raw Materials & Natural Dyes",
                    amount = state.costBreakdown.rawMaterials
                )
                BreakdownRow(
                    hindi = "वैधानिक कारीगर पारिश्रमिक",
                    english = "Guaranteed Fair Labor Wage (${String.format("%.0f", state.laborHours)} hrs)",
                    amount = state.costBreakdown.fairWages,
                    isHighlight = true
                )
                BreakdownRow(
                    hindi = "पैकेजिंग व डाक परिवहन",
                    english = "Packaging & India Post Logistics",
                    amount = state.costBreakdown.packagingAndLogistics
                )
                BreakdownRow(
                    hindi = "शिल्पकार शुद्ध लाभ",
                    english = "Artisan Net Profit (Direct Jan Dhan)",
                    amount = state.costBreakdown.artisanProfit,
                    isProfit = true
                )
            }
        }

        // 4. Sticky Bottom CTA
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(Color.White)
                .padding(16.dp)
        ) {
            DesiButton(
                text = if (state.isSubFloorWarning) "मूल्य वैधानिक सीमा से कम है" else "मूल्य लॉक करें व पासपोर्ट बनाएं",
                onClick = {
                    viewModel.lockPrice { lockedDraftId ->
                        navController.navigate(Screen.DigitalPassport.createRoute(lockedDraftId))
                    }
                },
                modifier = Modifier.fillMaxWidth(),
                variant = DesiButtonVariant.PRIMARY,
                enabled = !state.isSubFloorWarning && state.selectedPrice >= state.statutoryFloorPrice,
                subtext = if (state.isSubFloorWarning) "Increase price above ₹${String.format("%.0f", state.statutoryFloorPrice)} to proceed" else "Lock Price & Mint Digital Heritage Passport"
            )
        }
    }
}

@Composable
fun BreakdownRow(
    hindi: String,
    english: String,
    amount: Double,
    isHighlight: Boolean = false,
    isProfit: Boolean = false
) {
    val bgColor = if (isProfit) Color(0xFFF1F8F4) else if (isHighlight) Color(0xFFFFF8E7) else CardSurface
    val borderColor = if (isProfit) NeemForestGreen else if (isHighlight) MarigoldYellow else WarmSandBorder

    Surface(
        shape = ShapeMedium,
        color = bgColor,
        border = BorderStroke(1.dp, borderColor),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .padding(horizontal = 14.dp, vertical = 10.dp)
                .fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(text = hindi, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold, color = DeepIndigoSecondary)
                Text(text = english, style = MaterialTheme.typography.labelSmall, color = TextEnglishSecondary)
            }
            Text(
                text = "₹ ${String.format("%.0f", amount)}",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = if (isProfit) NeemForestGreen else DeepIndigoSecondary
            )
        }
    }
}
