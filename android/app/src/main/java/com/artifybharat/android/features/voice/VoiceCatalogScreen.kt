package com.artifybharat.android.features.voice

import android.Manifest
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
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
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Warning
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
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavController
import com.artifybharat.android.hardware.permissions.rememberPermissionLauncherFlow
import com.artifybharat.android.navigation.Screen
import com.artifybharat.android.ui.components.BilingualText
import com.artifybharat.android.ui.components.DesiButton
import com.artifybharat.android.ui.components.DesiButtonVariant
import com.artifybharat.android.ui.components.GiTagBadge
import com.artifybharat.android.ui.components.HeaderBar
import com.artifybharat.android.ui.dialogs.PermissionType
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

val SUPPORTED_DIALECTS = listOf(
    Pair("bhojpuri", "भोजपुरी (Bhojpuri)"),
    Pair("maithili", "मैथिली (Maithili)"),
    Pair("hindi", "हिंदी (Hindi)"),
    Pair("marwari", "मारवाड़ी (Marwari)"),
    Pair("odia", "ଓଡ଼ିଆ (Odia)"),
    Pair("bengali", "বাংলা (Bengali)"),
    Pair("tamil", "தமிழ் (Tamil)"),
    Pair("telugu", "తెలుగు (Telugu)")
)

@Composable
fun VoiceCatalogScreen(
    navController: NavController,
    viewModel: VoiceCatalogViewModel = viewModel(),
    modifier: Modifier = Modifier
) {
    val state by viewModel.uiState.collectAsState()
    val scrollState = rememberScrollState()

    val audioPermissionState = rememberPermissionLauncherFlow(
        permission = Manifest.permission.RECORD_AUDIO,
        permissionType = PermissionType.AUDIO,
        onPermissionGranted = {
            viewModel.startVoiceRecording()
        }
    )

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(KhadiBackground)
    ) {
        HeaderBar(
            hindiTitle = "आवाज़ से कैटलॉग",
            englishTitle = "Multilingual Voice Auto-Cataloger",
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
            // 1. Dialect Selection Chips
            Text(
                text = "अपनी भाषा / बोली चुनें (Select Dialect):",
                style = MaterialTheme.typography.labelLarge,
                color = DeepIndigoSecondary,
                modifier = Modifier.align(Alignment.Start)
            )
            Spacer(modifier = Modifier.height(8.dp))

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                SUPPORTED_DIALECTS.forEach { (code, label) ->
                    val isSelected = state.selectedDialect == code
                    Surface(
                        shape = ShapePill,
                        color = if (isSelected) TerracottaPrimary else CardSurface,
                        border = BorderStroke(1.dp, if (isSelected) TerracottaPrimary else WarmSandBorder),
                        modifier = Modifier
                            .clickable { viewModel.selectDialect(code) }
                            .padding(vertical = 4.dp)
                    ) {
                        Text(
                            text = label,
                            style = MaterialTheme.typography.labelMedium,
                            color = if (isSelected) Color.White else DeepIndigoSecondary,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                            modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // 2. Real-time Audio Waveform Canvas
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(64.dp)
                    .background(CardSurface, ShapeMedium)
                    .padding(8.dp),
                contentAlignment = Alignment.Center
            ) {
                Canvas(modifier = Modifier.fillMaxSize()) {
                    val canvasWidth = size.width
                    val canvasHeight = size.height
                    val centerY = canvasHeight / 2f
                    val barCount = 32
                    val step = canvasWidth / barCount

                    for (i in 0 until barCount) {
                        val factor = if (state.isRecording) {
                            (state.currentRms * ((i % 5 + 1) / 5f)).coerceIn(0.1f, 1.0f)
                        } else 0.08f

                        val barHeight = canvasHeight * factor
                        val x = i * step + step / 2f
                        drawLine(
                            color = if (state.isRecording) TerracottaPrimary else DeepIndigoSecondary.copy(alpha = 0.25f),
                            start = Offset(x, centerY - barHeight / 2f),
                            end = Offset(x, centerY + barHeight / 2f),
                            strokeWidth = 4.dp.toPx()
                        )
                    }
                }
            }

            // 3. Noise Warning Banner (>65dB)
            AnimatedVisibility(visible = state.isExcessiveNoise) {
                Surface(
                    shape = ShapeMedium,
                    color = Color(0xFFFFF3E0),
                    border = BorderStroke(1.dp, MarigoldYellow),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 12.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(10.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.Warning,
                            contentDescription = "Noise Warning",
                            tint = Color(0xFFE65100),
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "पृष्ठभूमि का शोर अधिक है (${String.format("%.0f", state.ambientNoiseDb)} dB)। कृपया शांत स्थान पर बोलें।",
                            style = MaterialTheme.typography.bodySmall,
                            color = Color(0xFFE65100),
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // 4. Pulsing Terracotta Mic FAB
            val infiniteTransition = rememberInfiniteTransition(label = "micPulse")
            val pulseScale by infiniteTransition.animateFloat(
                initialValue = 1.0f,
                targetValue = if (state.isRecording) 1.2f else 1.0f,
                animationSpec = infiniteRepeatable(
                    animation = tween(600, easing = FastOutSlowInEasing),
                    repeatMode = RepeatMode.Reverse
                ),
                label = "scale"
            )

            Box(
                modifier = Modifier
                    .size(96.dp)
                    .scale(if (state.isRecording) pulseScale else 1.0f)
                    .background(
                        if (state.isRecording) TerracottaPrimary else MarigoldYellow,
                        CircleShape
                    )
            .clickable {
                if (state.isRecording) {
                    viewModel.stopRecordingAndCatalog()
                } else {
                    audioPermissionState.launchRequest()
                }
            },
                contentAlignment = Alignment.Center
            ) {
                if (state.isProcessing) {
                    CircularProgressIndicator(
                        color = Color.White,
                        modifier = Modifier.size(40.dp)
                    )
                } else {
                    Icon(
                        imageVector = Icons.Default.Mic,
                        contentDescription = "Microphone",
                        tint = if (state.isRecording) Color.White else DeepIndigoSecondary,
                        modifier = Modifier.size(44.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))
            BilingualText(
                hindi = if (state.isRecording) "बोलना बंद करने के लिए टैप करें" else "बोलने के लिए माइक दबाएं",
                english = if (state.isRecording) "Tap to stop & analyze" else "Tap microphone to speak",
                horizontalAlignment = Alignment.CenterHorizontally
            )

            Spacer(modifier = Modifier.height(24.dp))

            // 5. Extracted Results Mosaic Card
            if (state.isCataloged) {
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
                            Text(
                                text = "पहचाना गया उत्पाद (Catalog Mosaic)",
                                style = MaterialTheme.typography.titleMedium,
                                color = DeepIndigoSecondary,
                                fontWeight = FontWeight.Bold
                            )
                            GiTagBadge(giTagStatus = state.giTagStatus)
                        }

                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = state.productTitle ?: "हस्तनिर्मित शिल्प",
                            style = MaterialTheme.typography.headlineSmall,
                            color = TerracottaPrimary,
                            fontWeight = FontWeight.Bold
                        )

                        Spacer(modifier = Modifier.height(4.dp))
                        state.regionalTranscript?.let { tx ->
                            Text(
                                text = "\"$tx\"",
                                style = MaterialTheme.typography.bodyMedium,
                                color = DeepIndigoSecondary.copy(alpha = 0.85f),
                                fontStyle = androidx.compose.ui.text.font.FontStyle.Italic
                            )
                        }

                        Spacer(modifier = Modifier.height(12.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Column {
                                Text(text = "अनुमानित समय (Labor):", style = MaterialTheme.typography.labelSmall, color = TextEnglishSecondary)
                                Text(text = "${state.estimatedDays} दिन (${String.format("%.0f", state.estimatedLaborHours)} घंटे)", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold)
                            }
                            Column {
                                Text(text = "कच्चा माल (Materials):", style = MaterialTheme.typography.labelSmall, color = TextEnglishSecondary)
                                Text(text = "₹ ${String.format("%.0f", state.rawCostEstimate)}", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold)
                            }
                        }

                        state.dadiAdvice?.let { advice ->
                            Spacer(modifier = Modifier.height(12.dp))
                            Surface(
                                shape = ShapeMedium,
                                color = Color(0xFFF1F8F4),
                                border = BorderStroke(1.dp, NeemForestGreen),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(modifier = Modifier.padding(10.dp)) {
                                    Text(
                                        text = "दादी की सलाह (Ask Dadi):",
                                        style = MaterialTheme.typography.labelMedium,
                                        color = NeemForestGreen,
                                        fontWeight = FontWeight.Bold
                                    )
                                    Text(
                                        text = advice,
                                        style = MaterialTheme.typography.bodySmall,
                                        color = DeepIndigoSecondary
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }

        // 6. Bottom Sticky CTA
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(Color.White)
                .padding(16.dp)
        ) {
            DesiButton(
                text = "शिल्प स्टूडियो में जाएं (Proceed to Studio)",
                onClick = {
                    navController.navigate(Screen.AuthenticityStudio.createRoute(state.currentDraftId))
                },
                modifier = Modifier.fillMaxWidth(),
                variant = DesiButtonVariant.PRIMARY,
                subtext = "Step 2: Authenticity Studio Photography"
            )
        }
    }
}
