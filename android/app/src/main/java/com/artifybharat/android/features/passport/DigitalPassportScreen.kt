package com.artifybharat.android.features.passport

import android.content.Intent
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
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
import androidx.compose.material.icons.filled.Print
import androidx.compose.material.icons.filled.QrCode
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.Verified
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
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
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavController
import com.artifybharat.android.navigation.Screen
import com.artifybharat.android.ui.components.DesiButton
import com.artifybharat.android.ui.components.DesiButtonVariant
import com.artifybharat.android.ui.components.HeaderBar
import com.artifybharat.android.ui.components.QuorumSeal
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
fun DigitalPassportScreen(
    navController: NavController,
    productId: String = "sample",
    viewModel: DigitalPassportViewModel = viewModel(),
    modifier: Modifier = Modifier
) {
    val state by viewModel.uiState.collectAsState()
    val context = LocalContext.current
    val scrollState = rememberScrollState()

    LaunchedEffect(productId) {
        viewModel.mintOrLoadPassport(productId)
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(KhadiBackground)
    ) {
        HeaderBar(
            hindiTitle = "डिजिटल विरासत पासपोर्ट",
            englishTitle = "Step 4: Digital Craft Passport & Provenance",
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
            // 1. Official MoSJE & SIH 26090 Badge
            Surface(
                shape = ShapePill,
                color = Color(0xFFF1F8F4),
                border = BorderStroke(1.5.dp, NeemForestGreen)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.Verified,
                        contentDescription = "MoSJE Verified",
                        tint = NeemForestGreen,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "MoSJE SIH 26090 • GI-238 Verified Authentic",
                        style = MaterialTheme.typography.labelMedium,
                        color = NeemForestGreen,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // 2. High-Contrast QR Code Surface
            Surface(
                shape = ShapeLarge,
                color = CardSurface,
                border = BorderStroke(2.dp, TerracottaPrimary),
                shadowElevation = 6.dp,
                modifier = Modifier.size(240.dp)
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(16.dp),
                    contentAlignment = Alignment.Center
                ) {
                    state.qrBitmap?.let { bmp ->
                        Image(
                            bitmap = bmp.asImageBitmap(),
                            contentDescription = "Passport QR Code",
                            modifier = Modifier.fillMaxSize()
                        )
                    } ?: CircularProgressIndicator(color = TerracottaPrimary)
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // 3. Human-Readable Shortcode Banner (e.g. A7X-9B2)
            Surface(
                shape = ShapeMedium,
                color = Color(0xFFFFEFE9),
                border = BorderStroke(2.dp, TerracottaPrimary),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(12.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = "सत्यापन कोड (Shortcode):",
                        style = MaterialTheme.typography.labelSmall,
                        color = DeepIndigoSecondary
                    )
                    Text(
                        text = state.shortcode,
                        style = MaterialTheme.typography.headlineLarge,
                        fontFamily = FontFamily.Monospace,
                        fontWeight = FontWeight.Bold,
                        color = TerracottaPrimary,
                        letterSpacing = 4.sp
                    )
                    Text(
                        text = state.verificationUrl,
                        style = MaterialTheme.typography.bodySmall,
                        color = TextEnglishSecondary,
                        fontSize = 11.sp
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // 4. Cryptographic SHA-256 Provenance Hash
            Surface(
                shape = ShapeMedium,
                color = CardSurface,
                border = BorderStroke(1.dp, WarmSandBorder),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Text(
                        text = "क्रिप्टोग्राफिक हैश (SHA-256 Digest):",
                        style = MaterialTheme.typography.labelSmall,
                        color = DeepIndigoSecondary,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = state.passportHash,
                        style = MaterialTheme.typography.bodySmall,
                        fontFamily = FontFamily.Monospace,
                        color = DeepIndigoSecondary.copy(alpha = 0.8f),
                        fontSize = 11.sp
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // 5. 3-Artisan Quorum Seal
            QuorumSeal(
                votesReceived = 3,
                quorumRequired = 3,
                consensusLevel = "100% Unanimous Authentic",
                isVerified = true,
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(16.dp))

            // 6. Share Button
            DesiButton(
                text = "पासपोर्ट लिंक शेयर करें (Share Passport)",
                onClick = {
                    val sendIntent = Intent().apply {
                        action = Intent.ACTION_SEND
                        putExtra(Intent.EXTRA_TEXT, "Verify my authentic handcrafted craft on ArtifyBharat (MoSJE): ${state.verificationUrl}")
                        type = "text/plain"
                    }
                    context.startActivity(Intent.createChooser(sendIntent, "Share Heritage Passport"))
                },
                modifier = Modifier.fillMaxWidth(),
                variant = DesiButtonVariant.OUTLINE
            )
        }

        // 7. Sticky Bottom CTA: Proceed to Thermal Print
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(Color.White)
                .padding(16.dp)
        ) {
            DesiButton(
                text = "थर्मल टैग प्रिंट करें (Print Thermal Tag)",
                onClick = {
                    navController.navigate(Screen.ThermalPrint.createRoute(state.shortcode))
                },
                modifier = Modifier.fillMaxWidth(),
                variant = DesiButtonVariant.PRIMARY,
                subtext = "Step 5: 58mm Thermal Label Bluetooth Print"
            )
        }
    }
}
