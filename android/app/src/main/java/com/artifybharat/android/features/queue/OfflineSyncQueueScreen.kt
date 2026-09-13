package com.artifybharat.android.features.queue

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
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Sync
import androidx.compose.material.icons.filled.SyncProblem
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavController
import com.artifybharat.android.data.local.entity.DraftEntity
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
fun OfflineSyncQueueScreen(
    navController: NavController,
    viewModel: OfflineSyncQueueViewModel = viewModel(),
    modifier: Modifier = Modifier
) {
    val state by viewModel.uiState.collectAsState()
    val context = LocalContext.current

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(KhadiBackground)
    ) {
        HeaderBar(
            hindiTitle = "ऑफ़लाइन सिंक कतार",
            englishTitle = "Offline Synchronization Queue",
            onBackClick = if (navController.previousBackStackEntry != null) {
                { navController.popBackStack() }
            } else null
        )

        LazyColumn(
            modifier = Modifier
                .weight(1f)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            // 1. Status Banner
            item {
                Surface(
                    shape = ShapeMedium,
                    color = if (state.pendingCount > 0) Color(0xFFFFF8E7) else Color(0xFFF1F8F4),
                    border = BorderStroke(1.dp, if (state.pendingCount > 0) MarigoldYellow else NeemForestGreen),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(14.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = if (state.pendingCount > 0) Icons.Default.SyncProblem else Icons.Default.Sync,
                            contentDescription = "Sync Status",
                            tint = if (state.pendingCount > 0) TerracottaPrimary else NeemForestGreen,
                            modifier = Modifier.size(24.dp)
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Column {
                            Text(
                                text = "${state.pendingCount} ड्राफ्ट ऑफ़लाइन कतार में सुरक्षित हैं",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = DeepIndigoSecondary
                            )
                            Text(
                                text = "नेटवर्क (2G/4G) उपलब्ध होने पर अपने आप सर्वर से सिंक होंगे।",
                                style = MaterialTheme.typography.bodySmall,
                                color = TextEnglishSecondary,
                                fontSize = 11.sp
                            )
                        }
                    }
                }
            }

            state.statusMessage?.let { msg ->
                item {
                    Text(text = msg, style = MaterialTheme.typography.bodySmall, color = NeemForestGreen, fontWeight = FontWeight.Bold)
                }
            }

            if (state.drafts.isEmpty()) {
                item {
                    Box(modifier = Modifier.fillMaxWidth().padding(top = 40.dp), contentAlignment = Alignment.Center) {
                        Text(text = "कोई ऑफ़लाइन ड्राफ्ट नहीं है (Queue is empty)", style = MaterialTheme.typography.bodyMedium, color = TextEnglishSecondary)
                    }
                }
            }

            // 2. Drafts List
            items(state.drafts, key = { it.localDraftId }) { draft ->
                Surface(
                    shape = ShapeLarge,
                    color = CardSurface,
                    border = BorderStroke(1.dp, WarmSandBorder),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(text = draft.craftCategory.uppercase(), style = MaterialTheme.typography.labelSmall, color = TextEnglishSecondary)
                            DraftStatusBadge(status = draft.status)
                        }

                        Spacer(modifier = Modifier.height(6.dp))
                        Text(text = draft.productTitle, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = DeepIndigoSecondary)

                        Spacer(modifier = Modifier.height(8.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Surface(shape = ShapePill, color = Color(0xFFF5F5F5)) {
                                Text(
                                    text = "फ़ोटो पेलोड: 4.2 MB",
                                    style = MaterialTheme.typography.labelSmall,
                                    fontSize = 10.sp,
                                    color = DeepIndigoSecondary,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                                )
                            }
                            draft.shortcode?.let { code ->
                                Surface(shape = ShapePill, color = Color(0xFFFFEFE9), border = BorderStroke(1.dp, TerracottaPrimary)) {
                                    Text(
                                        text = "कोड: $code",
                                        style = MaterialTheme.typography.labelSmall,
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = TerracottaPrimary,
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                                    )
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(8.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "आईडी: ${draft.localDraftId.take(12)}...",
                                style = MaterialTheme.typography.labelSmall,
                                fontFamily = FontFamily.Monospace,
                                color = TextEnglishSecondary
                            )
                            IconButton(onClick = { viewModel.deleteDraft(draft.localDraftId) }) {
                                Icon(Icons.Default.Delete, contentDescription = "Delete Draft", tint = Color.Gray, modifier = Modifier.size(20.dp))
                            }
                        }
                    }
                }
            }
        }

        // 3. Sticky Bottom Sync CTA
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(Color.White)
                .padding(16.dp)
        ) {
            DesiButton(
                text = "सभी ड्राफ्ट अभी सिंक करें (Sync All Now)",
                onClick = { viewModel.triggerSyncNow(context) },
                modifier = Modifier.fillMaxWidth(),
                variant = DesiButtonVariant.PRIMARY,
                subtext = "Upload drafts to server & mint passports"
            )
        }
    }
}

@Composable
fun DraftStatusBadge(status: String) {
    val (color, bgColor, text) = when (status) {
        DraftEntity.STATUS_SYNCED -> Triple(NeemForestGreen, Color(0xFFF1F8F4), "सिंक हो चुका (Synced)")
        DraftEntity.STATUS_SYNCING -> Triple(DeepIndigoSecondary, Color(0xFFD0DDFF), "सिंक हो रहा है (Syncing)")
        DraftEntity.STATUS_QUEUED -> Triple(Color(0xFFE65100), Color(0xFFFFF3E0), "कतार में (Queued)")
        DraftEntity.STATUS_CONFLICT -> Triple(TerracottaPrimary, Color(0xFFFFEBEE), "विवाद (Conflict V2)")
        else -> Triple(Color.DarkGray, Color(0xFFF5F5F5), "ड्राफ्ट (Draft)")
    }

    Surface(
        shape = ShapePill,
        color = bgColor,
        border = BorderStroke(1.dp, color)
    ) {
        Text(
            text = text,
            style = MaterialTheme.typography.labelSmall,
            color = color,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
        )
    }
}
