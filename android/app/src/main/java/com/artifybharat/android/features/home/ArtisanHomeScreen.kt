package com.artifybharat.android.features.home

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Print
import androidx.compose.material.icons.filled.Sync
import androidx.compose.material.icons.filled.Verified
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavController
import com.artifybharat.android.data.local.entity.DraftEntity
import com.artifybharat.android.navigation.Screen
import com.artifybharat.android.ui.components.HeaderBar
import com.artifybharat.android.ui.components.OfflineBanner
import com.artifybharat.android.ui.theme.CardSurface
import com.artifybharat.android.ui.theme.DeepIndigoSecondary
import com.artifybharat.android.ui.theme.KhadiBackground
import com.artifybharat.android.ui.theme.NeemForestGreen
import com.artifybharat.android.ui.theme.ShapeLarge
import com.artifybharat.android.ui.theme.ShapeMedium
import com.artifybharat.android.ui.theme.TerracottaPrimary
import com.artifybharat.android.ui.theme.TextEnglishSecondary
import com.artifybharat.android.ui.theme.WarmSandBorder

private data class QuickAction(
    val hindi: String,
    val english: String,
    val icon: ImageVector,
    val talkBack: String,
    val onClick: (NavController, HomeUiState) -> Unit
)

private val QUICK_ACTIONS = listOf(
    QuickAction(
        hindi = "नया उत्पाद",
        english = "New Product",
        icon = Icons.Default.Mic,
        talkBack = "नया उत्पाद बनाएं, Voice Catalog पर जाएं. New product, go to Voice Catalog."
    ) { nav, _ -> nav.navigate(Screen.VoiceCatalog.route) },
    QuickAction(
        hindi = "क्राफ्ट स्टूडियो",
        english = "Craft Studio",
        icon = Icons.Default.CameraAlt,
        talkBack = "क्राफ्ट स्टूडियो खोलें. Open Authenticity Studio."
    ) { nav, state ->
        val draftId = state.recentDrafts.firstOrNull()?.localDraftId ?: "draft-demo-01"
        nav.navigate(Screen.AuthenticityStudio.createRoute(draftId))
    },
    QuickAction(
        hindi = "टैग प्रिंट",
        english = "Print Tag",
        icon = Icons.Default.Print,
        talkBack = "थर्मल टैग प्रिंट करें. Print thermal tag."
    ) { nav, state ->
        val code = state.recentDrafts.firstOrNull()?.shortcode ?: "A7X-9B2"
        nav.navigate(Screen.ThermalPrint.createRoute(code))
    },
    QuickAction(
        hindi = "सिंक कतार",
        english = "Sync Queue",
        icon = Icons.Default.Sync,
        talkBack = "ऑफ़लाइन सिंक कतार देखें. Open offline sync queue."
    ) { nav, _ -> nav.navigate(Screen.OfflineSyncQueue.route) }
)

/**
 * [Artisan App T2] Artisan Home Dashboard — greeting, metrics, quick actions, recent drafts.
 * Hindi-first (>=20sp), >=56dp touch targets, KhadiBackground + TerracottaPrimary.
 * Navigation only — no nav-graph restructure (T5 owns that).
 */
@Composable
fun ArtisanHomeScreen(
    navController: NavController,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val vm: ArtisanHomeViewModel = viewModel(
        factory = ArtisanHomeViewModelFactory(context.applicationContext)
    )
    val state by vm.uiState.collectAsState()

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(KhadiBackground)
    ) {
        HeaderBar(
            hindiTitle = "नमस्ते, ${state.artisanName}",
            englishTitle = state.clusterName.ifBlank { "Artisan Home Dashboard" },
            isOnline = !state.isOffline,
            pendingSyncCount = state.pendingDraftsCount,
            onSyncClick = { navController.navigate(Screen.OfflineSyncQueue.route) }
        )
        OfflineBanner(isOffline = state.isOffline, isOfflineDemo = state.isOffline)

        LazyColumn(
            modifier = Modifier
                .weight(1f)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            item { VerificationBadgeCard(isVerified = state.isVerified) }

            item { MetricsRow(state = state) }

            item {
                Text(
                    text = "त्वरित कार्य (Quick Actions)",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    color = DeepIndigoSecondary
                )
                Spacer(modifier = Modifier.height(8.dp))
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    QUICK_ACTIONS.chunked(2).forEach { row ->
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            row.forEach { action ->
                                QuickActionCard(
                                    action = action,
                                    state = state,
                                    navController = navController,
                                    modifier = Modifier.weight(1f)
                                )
                            }
                            if (row.size == 1) Spacer(modifier = Modifier.weight(1f))
                        }
                    }
                }
            }

            item {
                Text(
                    text = "हाल के ड्राफ्ट (Recent Drafts)",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    color = DeepIndigoSecondary
                )
            }

            if (state.recentDrafts.isEmpty()) {
                item {
                    Surface(
                        shape = ShapeMedium,
                        color = CardSurface,
                        border = BorderStroke(1.dp, WarmSandBorder),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = "अभी कोई ड्राफ्ट नहीं है — नया उत्पाद बनाकर शुरुआत करें (No drafts yet)",
                            fontSize = 20.sp,
                            color = TextEnglishSecondary,
                            modifier = Modifier.padding(16.dp)
                        )
                    }
                }
            } else {
                items(state.recentDrafts, key = { it.localDraftId }) { draft ->
                    RecentDraftCard(
                        draft = draft,
                        onResume = {
                            navController.navigate(
                                Screen.AuthenticityStudio.createRoute(draft.localDraftId)
                            )
                        }
                    )
                }
            }
        }
    }
}

@Composable
private fun VerificationBadgeCard(isVerified: Boolean) {
    if (isVerified) {
        Surface(
            shape = ShapeMedium,
            color = Color(0xFFF1F8F4),
            border = BorderStroke(1.dp, NeemForestGreen),
            modifier = Modifier
                .fillMaxWidth()
                .semantics {
                    contentDescription = "MoSJE Pehchan सत्यापित कारीगर. Verified artisan."
                }
        ) {
            Row(
                modifier = Modifier.padding(14.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = Icons.Default.Verified,
                    contentDescription = null,
                    tint = NeemForestGreen,
                    modifier = Modifier.size(28.dp)
                )
                Spacer(modifier = Modifier.width(10.dp))
                Column {
                    Text(
                        text = "MoSJE / Pehchan सत्यापित कारीगर",
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold,
                        color = NeemForestGreen
                    )
                    Text(
                        text = "Verified Artisan Origin — buyer trust badge active",
                        style = MaterialTheme.typography.bodySmall,
                        color = DeepIndigoSecondary
                    )
                }
            }
        }
    } else {
        Surface(
            shape = ShapeMedium,
            color = Color(0xFFFFFBEB),
            border = BorderStroke(1.dp, Color(0xFFF59E0B)),
            modifier = Modifier
                .fillMaxWidth()
                .semantics {
                    contentDescription = "असत्यापित कारीगर. Unverified, verify later optional."
                }
        ) {
            Column(modifier = Modifier.padding(14.dp)) {
                Text(
                    text = "🔶 असत्यापित • Unverified — सत्यापित बैज पाएं",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF92400E)
                )
                Text(
                    text = "Pehchan / e-Shram / TRIFED से बाद में वेरीफाई करें (optional)",
                    style = MaterialTheme.typography.bodySmall,
                    color = DeepIndigoSecondary
                )
            }
        }
    }
}

@Composable
private fun MetricsRow(state: HomeUiState) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        MetricCard(
            hindi = "सक्रिय उत्पाद",
            english = "Active",
            value = "${state.activeListingsCount}",
            talkBack = "सक्रिय उत्पाद ${state.activeListingsCount}. Active listings ${state.activeListingsCount}.",
            modifier = Modifier.weight(1f)
        )
        MetricCard(
            hindi = "ड्राफ्ट कतार",
            english = "Draft Queue",
            value = "${state.pendingDraftsCount}",
            talkBack = "ड्राफ्ट कतार ${state.pendingDraftsCount}. Pending drafts ${state.pendingDraftsCount}.",
            modifier = Modifier.weight(1f)
        )
        MetricCard(
            hindi = "अनुमानित आय",
            english = "Est. Earnings",
            value = "₹${String.format("%.0f", state.estimatedEarnings)}",
            talkBack = "अनुमानित आय ${String.format("%.0f", state.estimatedEarnings)} रुपये. Estimated earnings.",
            modifier = Modifier.weight(1f)
        )
    }
}

@Composable
private fun MetricCard(
    hindi: String,
    english: String,
    value: String,
    talkBack: String,
    modifier: Modifier = Modifier
) {
    Surface(
        shape = ShapeLarge,
        color = CardSurface,
        border = BorderStroke(1.dp, WarmSandBorder),
        modifier = modifier.semantics { contentDescription = talkBack }
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = value,
                fontSize = 22.sp,
                fontWeight = FontWeight.Bold,
                color = TerracottaPrimary
            )
            Text(
                text = hindi,
                fontSize = 20.sp,
                fontWeight = FontWeight.SemiBold,
                color = DeepIndigoSecondary
            )
            Text(
                text = english,
                style = MaterialTheme.typography.labelSmall,
                color = TextEnglishSecondary
            )
        }
    }
}

@Composable
private fun QuickActionCard(
    action: QuickAction,
    state: HomeUiState,
    navController: NavController,
    modifier: Modifier = Modifier
) {
    Surface(
        shape = ShapeLarge,
        color = CardSurface,
        border = BorderStroke(1.dp, WarmSandBorder),
        modifier = modifier
            .heightIn(min = 56.dp)
            .clickable(
                onClickLabel = action.talkBack,
                onClick = { action.onClick(navController, state) }
            )
            .semantics { contentDescription = action.talkBack }
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = action.icon,
                contentDescription = null,
                tint = TerracottaPrimary,
                modifier = Modifier.size(28.dp)
            )
            Spacer(modifier = Modifier.width(10.dp))
            Column {
                Text(
                    text = action.hindi,
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    color = DeepIndigoSecondary
                )
                Text(
                    text = action.english,
                    style = MaterialTheme.typography.labelSmall,
                    color = TextEnglishSecondary
                )
            }
        }
    }
}

@Composable
private fun RecentDraftCard(
    draft: DraftEntity,
    onResume: () -> Unit
) {
    Surface(
        shape = ShapeLarge,
        color = CardSurface,
        border = BorderStroke(1.dp, WarmSandBorder),
        modifier = Modifier
            .fillMaxWidth()
            .semantics {
                contentDescription = "ड्राफ्ट ${draft.productTitle}. Draft ${draft.localDraftId}."
            }
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Text(
                text = draft.productTitle,
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
                color = DeepIndigoSecondary
            )
            Text(
                text = draft.craftCategory.uppercase(),
                style = MaterialTheme.typography.labelSmall,
                color = TextEnglishSecondary
            )
            Spacer(modifier = Modifier.height(10.dp))
            Surface(
                shape = ShapeMedium,
                color = TerracottaPrimary,
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = 56.dp)
                    .clickable(
                        onClickLabel = "आगे बढ़ाएं, ड्राफ्ट फिर से शुरू करें. Resume draft.",
                        onClick = onResume
                    )
                    .semantics {
                        contentDescription = "आगे बढ़ाएं, ड्राफ्ट फिर से शुरू करें. Resume draft ${draft.localDraftId}."
                    }
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(12.dp),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "आगे बढ़ाएं (Resume)",
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                }
            }
        }
    }
}
