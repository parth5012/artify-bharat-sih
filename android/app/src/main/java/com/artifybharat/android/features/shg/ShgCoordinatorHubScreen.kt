package com.artifybharat.android.features.shg

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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
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
fun ShgCoordinatorHubScreen(
    navController: NavController,
    viewModel: ShgCoordinatorHubViewModel = viewModel(),
    modifier: Modifier = Modifier
) {
    val state by viewModel.uiState.collectAsState()

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(KhadiBackground)
    ) {
        HeaderBar(
            hindiTitle = "एसएचजी समन्वयक केंद्र",
            englishTitle = "SHG Coordinator Hub & Peer Jury",
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
            // 1. Metrics Strip
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    MetricCard(title = "सक्रिय शिल्प", subtitle = "Active", value = "${state.activeListingsCount}", modifier = Modifier.weight(1f))
                    MetricCard(title = "लंबित जूरी", subtitle = "Pending", value = "${state.pendingJuryCount}", isHighlight = true, modifier = Modifier.weight(1f))
                    MetricCard(title = "प्रमाणित", subtitle = "Verified", value = "${state.verifiedCraftsCount}", modifier = Modifier.weight(1f))
                }
            }

            // Total Payout Card
            item {
                Surface(
                    shape = ShapeMedium,
                    color = Color(0xFFF1F8F4),
                    border = BorderStroke(1.dp, NeemForestGreen),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column {
                            Text(text = "कुल प्रत्यक्ष जन-धन संवितरण (Total Payouts):", style = MaterialTheme.typography.labelSmall, color = TextEnglishSecondary)
                            Text(text = "₹ ${String.format("%,.0f", state.totalDisbursedAmount)}", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = NeemForestGreen)
                        }
                        Surface(shape = ShapePill, color = NeemForestGreen) {
                            Text(text = "100% Direct", color = Color.White, style = MaterialTheme.typography.labelSmall, modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp))
                        }
                    }
                }
            }

            // Section Header
            item {
                Text(
                    text = "3-कारीगर शून्य-विश्वास जूरी समीक्षा (Zero-Trust Peer Jury):",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = DeepIndigoSecondary
                )
            }

            // 2. Jury Review Cards List
            items(state.juryReviewList, key = { it.ticketId }) { item ->
                JuryReviewCard(
                    item = item,
                    onVote = { verdict ->
                        viewModel.submitJuryVote(item.ticketId, verdict)
                    }
                )
            }
        }
    }
}

@Composable
fun MetricCard(
    title: String,
    subtitle: String,
    value: String,
    modifier: Modifier = Modifier,
    isHighlight: Boolean = false
) {
    Surface(
        shape = ShapeMedium,
        color = if (isHighlight) Color(0xFFFFF8E7) else CardSurface,
        border = BorderStroke(1.dp, if (isHighlight) MarigoldYellow else WarmSandBorder),
        modifier = modifier
    ) {
        Column(
            modifier = Modifier.padding(10.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(text = value, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = if (isHighlight) TerracottaPrimary else DeepIndigoSecondary)
            Text(text = title, style = MaterialTheme.typography.labelSmall, fontSize = 10.sp, maxLines = 1)
            Text(text = subtitle, style = MaterialTheme.typography.labelSmall, fontSize = 9.sp, color = TextEnglishSecondary)
        }
    }
}

@Composable
fun JuryReviewCard(
    item: ShgJuryCardItem,
    onVote: (String) -> Unit
) {
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
                Text(text = item.craftCategory.uppercase(), style = MaterialTheme.typography.labelSmall, color = TextEnglishSecondary)
                Surface(
                    shape = ShapePill,
                    color = if (item.quorumVotes >= 3) Color(0xFFF1F8F4) else Color(0xFFFFF8E7),
                    border = BorderStroke(1.dp, if (item.quorumVotes >= 3) NeemForestGreen else MarigoldYellow)
                ) {
                    Text(
                        text = "कोरम: ${item.quorumVotes}/${item.quorumRequired} वोट",
                        style = MaterialTheme.typography.labelSmall,
                        color = DeepIndigoSecondary,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(4.dp))
            Text(text = item.productTitle, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = DeepIndigoSecondary)
            Text(text = "कारीगर: ${item.artisanName}", style = MaterialTheme.typography.bodyMedium, color = TextEnglishSecondary)

            Spacer(modifier = Modifier.height(8.dp))

            // Cluster Centroid Proximity Chip
            Surface(shape = ShapePill, color = Color(0xFFF1F8F4), border = BorderStroke(1.dp, NeemForestGreen)) {
                Row(modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.LocationOn, contentDescription = null, tint = NeemForestGreen, modifier = Modifier.size(14.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "${item.clusterName} • केंद्र से ${String.format("%.1f", item.clusterDistanceKm)} किमी दूरी (सत्यापित)",
                        style = MaterialTheme.typography.labelSmall,
                        color = NeemForestGreen,
                        fontSize = 11.sp
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(text = "कच्चा माल: ₹${String.format("%.0f", item.rawCost)}", style = MaterialTheme.typography.bodySmall, color = TextEnglishSecondary)
                Text(text = "मजदूरी: ₹${String.format("%.0f", item.fairWage)}", style = MaterialTheme.typography.bodySmall, color = TextEnglishSecondary)
                Text(text = "मूल्य: ₹${String.format("%.0f", item.retailPrice)}", style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Bold, color = DeepIndigoSecondary)
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Action Buttons
            if (!item.isReviewed) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    DesiButton(
                        text = "खारिज (Reject)",
                        onClick = { onVote("rejected") },
                        modifier = Modifier.weight(1f),
                        variant = DesiButtonVariant.OUTLINE
                    )
                    DesiButton(
                        text = "प्रमाणित (Vote)",
                        onClick = { onVote("authentic") },
                        modifier = Modifier.weight(1f),
                        variant = DesiButtonVariant.PRIMARY
                    )
                }
            } else {
                Surface(
                    shape = ShapeMedium,
                    color = Color(0xFFF1F8F4),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center
                    ) {
                        Icon(Icons.Default.Check, contentDescription = "Reviewed", tint = NeemForestGreen, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(text = "जूरी वोट दर्ज कर लिया गया (Vote Recorded)", style = MaterialTheme.typography.labelMedium, color = NeemForestGreen, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}
