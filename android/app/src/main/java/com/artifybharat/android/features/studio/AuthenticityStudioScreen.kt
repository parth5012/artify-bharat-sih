package com.artifybharat.android.features.studio

import androidx.camera.view.PreviewView
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Camera
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.WbSunny
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
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
fun AuthenticityStudioScreen(
    navController: NavController,
    draftId: String = "draft-demo-01",
    viewModel: AuthenticityStudioViewModel = viewModel(),
    modifier: Modifier = Modifier
) {
    val state by viewModel.uiState.collectAsState()
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val haptic = LocalHapticFeedback.current

    LaunchedEffect(draftId) {
        viewModel.setDraftId(draftId)
    }

    val previewView = remember { PreviewView(context) }

    LaunchedEffect(lifecycleOwner) {
        try {
            viewModel.cameraManager.bindCamera(lifecycleOwner, previewView.surfaceProvider)
        } catch (e: Exception) {
            // Camera bind fallback
        }
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(KhadiBackground)
    ) {
        HeaderBar(
            hindiTitle = "क्राफ्ट स्टूडियो",
            englishTitle = "Step 2: Authenticity Studio Photography",
            onBackClick = if (navController.previousBackStackEntry != null) {
                { navController.popBackStack() }
            } else null
        )

        // 1. Top Status & Provenance Metadata Strip
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            // GPS Cluster Pill
            Surface(
                shape = ShapePill,
                color = if (state.clusterVerification?.isWithinCluster == true) Color(0xFFF1F8F4) else Color(0xFFFFF8E7),
                border = BorderStroke(1.dp, if (state.clusterVerification?.isWithinCluster == true) NeemForestGreen else MarigoldYellow)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.LocationOn,
                        contentDescription = "GPS",
                        tint = if (state.clusterVerification?.isWithinCluster == true) NeemForestGreen else DeepIndigoSecondary,
                        modifier = Modifier.size(14.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = state.clusterVerification?.matchedCluster?.take(18) ?: "GPS Locating...",
                        style = MaterialTheme.typography.labelSmall,
                        color = DeepIndigoSecondary,
                        fontSize = 11.sp
                    )
                }
            }

            // Natural Light Pill
            Surface(
                shape = ShapePill,
                color = if (state.isNaturalLightGood) Color(0xFFF1F8F4) else Color(0xFFFFF3E0),
                border = BorderStroke(1.dp, if (state.isNaturalLightGood) NeemForestGreen else Color(0xFFE65100))
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.WbSunny,
                        contentDescription = "Light",
                        tint = if (state.isNaturalLightGood) NeemForestGreen else Color(0xFFE65100),
                        modifier = Modifier.size(14.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = if (state.isNaturalLightGood) "प्राकृतिक रोशनी (Good Light)" else "कम रोशनी (Low Light)",
                        style = MaterialTheme.typography.labelSmall,
                        color = DeepIndigoSecondary,
                        fontSize = 11.sp
                    )
                }
            }
        }

        // 2. WIP / Final Segmented Switch
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 4.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            val isWip = state.currentStage == CaptureStage.WIP
            Surface(
                modifier = Modifier
                    .weight(1f)
                    .clickable { viewModel.switchStage(CaptureStage.WIP) },
                shape = ShapeMedium,
                color = if (isWip) TerracottaPrimary else CardSurface,
                border = BorderStroke(1.5.dp, if (isWip) TerracottaPrimary else WarmSandBorder)
            ) {
                Row(
                    modifier = Modifier.padding(vertical = 8.dp),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    if (state.wipPhoto != null) {
                        Icon(Icons.Default.CheckCircle, contentDescription = "Done", tint = if (isWip) Color.White else NeemForestGreen, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                    }
                    Text(
                        text = "1. कार्य प्रगति (WIP)",
                        color = if (isWip) Color.White else DeepIndigoSecondary,
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            val isFinal = state.currentStage == CaptureStage.FINAL
            Surface(
                modifier = Modifier
                    .weight(1f)
                    .clickable { viewModel.switchStage(CaptureStage.FINAL) },
                shape = ShapeMedium,
                color = if (isFinal) TerracottaPrimary else CardSurface,
                border = BorderStroke(1.5.dp, if (isFinal) TerracottaPrimary else WarmSandBorder)
            ) {
                Row(
                    modifier = Modifier.padding(vertical = 8.dp),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    if (state.finalPhoto != null) {
                        Icon(Icons.Default.CheckCircle, contentDescription = "Done", tint = if (isFinal) Color.White else NeemForestGreen, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                    }
                    Text(
                        text = "2. अंतिम शिल्प (Final)",
                        color = if (isFinal) Color.White else DeepIndigoSecondary,
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }

        // 3. Camera Viewfinder with Terracotta Alignment Frame
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
                .padding(16.dp)
                .background(Color.Black, ShapeLarge)
                .border(2.dp, TerracottaPrimary.copy(alpha = 0.6f), ShapeLarge),
            contentAlignment = Alignment.Center
        ) {
            AndroidView(
                factory = { previewView },
                modifier = Modifier.fillMaxSize()
            )

            // 1:1 Aspect ratio guideline overlay
            Box(
                modifier = Modifier
                    .fillMaxSize(0.85f)
                    .aspectRatio(1f)
                    .border(1.5.dp, Color.White.copy(alpha = 0.7f), RoundedCornerShape(12.dp))
            )

            // SHA-256 live watermark chip at bottom of viewfinder
            Surface(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(bottom = 12.dp),
                shape = ShapePill,
                color = Color.Black.copy(alpha = 0.65f)
            ) {
                Text(
                    text = "SHA-256 Provenance Watermark • UTC Locked",
                    style = MaterialTheme.typography.labelSmall,
                    color = Color.White,
                    fontSize = 10.sp,
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                )
            }
        }

        // 4. Shutter Controls & AI Enhancement Trigger
        Surface(
            modifier = Modifier.fillMaxWidth(),
            color = Color.White,
            tonalElevation = 8.dp
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                state.statusMessage?.let { msg ->
                    Text(
                        text = msg,
                        style = MaterialTheme.typography.bodySmall,
                        color = NeemForestGreen,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.align(Alignment.CenterHorizontally)
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceEvenly
                ) {
                    // Left: Thumbnail preview
                    val capturedCount = (if (state.wipPhoto != null) 1 else 0) + (if (state.finalPhoto != null) 1 else 0)
                    Surface(
                        shape = ShapeMedium,
                        color = KhadiBackground,
                        border = BorderStroke(1.dp, WarmSandBorder),
                        modifier = Modifier.size(56.dp)
                    ) {
                        Column(
                            modifier = Modifier.fillMaxSize(),
                            verticalArrangement = Arrangement.Center,
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text(text = "$capturedCount/2", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = TerracottaPrimary)
                            Text(text = "Locked", style = MaterialTheme.typography.labelSmall, fontSize = 9.sp, color = TextEnglishSecondary)
                        }
                    }

                    // Center: 72dp Shutter Button
                    Box(
                        modifier = Modifier
                            .size(72.dp)
                            .background(TerracottaPrimary, CircleShape)
                            .border(4.dp, Color.White, CircleShape)
                            .clickable {
                                haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                viewModel.capturePhoto()
                            },
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Camera,
                            contentDescription = "Shutter",
                            tint = Color.White,
                            modifier = Modifier.size(36.dp)
                        )
                    }

                    // Right: AI Studio Enhancement
                    Surface(
                        shape = ShapeMedium,
                        color = if (state.finalPhoto != null) Color(0xFFF1F8F4) else Color(0xFFF5F5F5),
                        border = BorderStroke(1.dp, if (state.finalPhoto != null) NeemForestGreen else WarmSandBorder),
                        modifier = Modifier
                            .size(56.dp)
                            .clickable(enabled = state.finalPhoto != null) {
                                viewModel.enhanceFinalPhotoWithAi()
                            }
                    ) {
                        Column(
                            modifier = Modifier.fillMaxSize(),
                            verticalArrangement = Arrangement.Center,
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            if (state.isEnhancing) {
                                CircularProgressIndicator(modifier = Modifier.size(24.dp), strokeWidth = 2.dp, color = NeemForestGreen)
                            } else {
                                Icon(Icons.Default.AutoAwesome, contentDescription = "AI Studio", tint = if (state.finalPhoto != null) NeemForestGreen else Color.Gray, modifier = Modifier.size(24.dp))
                                Text(text = "AI Studio", style = MaterialTheme.typography.labelSmall, fontSize = 9.sp, color = DeepIndigoSecondary)
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Bottom CTA: Proceed to Pricing
                DesiButton(
                    text = "उचित मूल्य तय करें (Proceed to Pricing)",
                    onClick = {
                        navController.navigate(Screen.FairWagePricing.route)
                    },
                    modifier = Modifier.fillMaxWidth(),
                    variant = DesiButtonVariant.PRIMARY,
                    subtext = "Step 3: Fair Wage Floor & Dynamic Pricing"
                )
            }
        }
    }
}
