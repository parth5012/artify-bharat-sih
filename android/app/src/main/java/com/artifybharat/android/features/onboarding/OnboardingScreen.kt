package com.artifybharat.android.features.onboarding

import android.Manifest
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavController
import com.artifybharat.android.hardware.location.LocationProvider
import com.artifybharat.android.navigation.Screen
import com.artifybharat.android.ui.components.BilingualText
import com.artifybharat.android.ui.components.DesiButton
import com.artifybharat.android.ui.components.DesiButtonVariant
import com.artifybharat.android.ui.components.GiTagBadge
import com.artifybharat.android.ui.components.QuorumSeal
import com.artifybharat.android.ui.theme.CardSurface
import com.artifybharat.android.ui.theme.DeepIndigoSecondary
import com.artifybharat.android.ui.theme.KhadiBackground
import com.artifybharat.android.ui.theme.TerracottaPrimary
import com.artifybharat.android.ui.theme.TextEnglishSecondary

@Composable
fun OnboardingScreen(
    navController: NavController,
    modifier: Modifier = Modifier,
    viewModel: OnboardingViewModel = viewModel(),
    onPermissionsRequest: (() -> Unit)? = null
) {
    val uiState by viewModel.uiState.collectAsState()

    val permissionsLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) {
        viewModel.goToNextStep()
    }

    LaunchedEffect(uiState.isOnboardingComplete) {
        if (uiState.isOnboardingComplete) {
            navController.navigate(Screen.VoiceCatalog.route) {
                popUpTo(Screen.Onboarding.route) { inclusive = true }
                launchSingleTop = true
            }
        }
    }

    val scrollState = rememberScrollState()

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(KhadiBackground)
            .padding(16.dp)
            .verticalScroll(scrollState),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Step Indicator Dots
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 12.dp),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically
        ) {
            OnboardingStep.values().forEachIndexed { index, step ->
                val isActive = step.ordinal <= uiState.currentStep.ordinal
                val isCurrent = step == uiState.currentStep
                Box(
                    modifier = Modifier
                        .size(if (isCurrent) 14.dp else 10.dp)
                        .clip(CircleShape)
                        .background(
                            if (isActive) TerracottaPrimary else DeepIndigoSecondary.copy(alpha = 0.25f)
                        )
                )
                if (index < OnboardingStep.values().size - 1) {
                    Box(
                        modifier = Modifier
                            .width(28.dp)
                            .height(3.dp)
                            .background(
                                if (step.ordinal < uiState.currentStep.ordinal) TerracottaPrimary else DeepIndigoSecondary.copy(alpha = 0.2f)
                            )
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        // Error Banner
        if (!uiState.errorMessage.isNullOrBlank()) {
            Card(
                colors = CardDefaults.cardColors(containerColor = Color(0xFFFDE8E8)),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 12.dp)
            ) {
                Row(
                    modifier = Modifier.padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.Warning,
                        contentDescription = "Error",
                        tint = Color(0xFFC81E1E),
                        modifier = Modifier.size(24.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = uiState.errorMessage ?: "",
                        color = Color(0xFF9B1C1C),
                        style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.Medium)
                    )
                }
            }
        }

        // Offline / Unreachable Server Notice
        if (uiState.isServerUnreachable) {
            Card(
                colors = CardDefaults.cardColors(containerColor = Color(0xFFFEF08A)),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 12.dp)
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Text(
                        text = "⚠️ बैकएंड सर्वर उपलब्ध नहीं है (Backend Unreachable)",
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF713F12),
                        fontSize = 14.sp
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "सर्वर (http://10.0.2.2:8000) से संपर्क नहीं हो पा रहा है। क्या आप ऑफ़लाइन डेमो मोड में आगे बढ़ना चाहते हैं?",
                        color = Color(0xFF854D0E),
                        fontSize = 12.sp
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    DesiButton(
                        text = "ऑफ़लाइन डेमो मोड शुरू करें",
                        subtext = "Launch in Offline Demo Mode",
                        onClick = { viewModel.activateOfflineDemoMode() },
                        variant = DesiButtonVariant.OUTLINE,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }
        }

        // Screen Body by Step
        when (uiState.currentStep) {
            OnboardingStep.WELCOME_LANGUAGE -> {
                WelcomeLanguageStep(
                    selectedDialect = uiState.selectedDialect,
                    onSelectDialect = { viewModel.selectDialect(it) },
                    onNext = { viewModel.goToNextStep() }
                )
            }
            OnboardingStep.IDENTITY_VERIFICATION -> {
                IdentityVerificationStep(
                    phone = uiState.phone,
                    pin = uiState.pin,
                    pehchanId = uiState.pehchanId,
                    artisanName = uiState.artisanName,
                    isLoading = uiState.isLoading,
                    onPhoneChange = { viewModel.updatePhone(it) },
                    onPinChange = { viewModel.updatePin(it) },
                    onPehchanChange = { viewModel.updatePehchanId(it) },
                    onNameChange = { viewModel.updateArtisanName(it) },
                    onVerifyPehchan = { viewModel.verifyPehchanAndProceed() },
                    onAuthenticate = { viewModel.authenticateAndProceed() },
                    onBack = { viewModel.goToPreviousStep() }
                )
            }
            OnboardingStep.CLUSTER_CONFIRMATION -> {
                ClusterConfirmationStep(
                    artisanName = uiState.artisanName,
                    clusterName = uiState.clusterName,
                    craftCategory = uiState.craftCategory,
                    isGiCertified = uiState.isGiCertified,
                    giTagName = uiState.giTagName,
                    onClusterChange = { viewModel.updateCluster(it) },
                    onNext = { viewModel.goToNextStep() },
                    onBack = { viewModel.goToPreviousStep() }
                )
            }
            OnboardingStep.PERMISSIONS_OVERVIEW -> {
                PermissionsOverviewStep(
                    onRequestPermissions = {
                        onPermissionsRequest?.invoke() ?: run {
                            permissionsLauncher.launch(
                                arrayOf(
                                    Manifest.permission.RECORD_AUDIO,
                                    Manifest.permission.CAMERA,
                                    Manifest.permission.ACCESS_FINE_LOCATION,
                                    Manifest.permission.ACCESS_COARSE_LOCATION
                                )
                            )
                        }
                    },
                    onBack = { viewModel.goToPreviousStep() }
                )
            }
            OnboardingStep.COMPLETION -> {
                CompletionStep(
                    artisanName = uiState.artisanName,
                    clusterName = uiState.clusterName,
                    craftCategory = uiState.craftCategory,
                    isGiCertified = uiState.isGiCertified,
                    onEnterApp = { viewModel.completeOnboardingAndEnterApp() }
                )
            }
        }
    }
}

@Composable
private fun WelcomeLanguageStep(
    selectedDialect: String,
    onSelectDialect: (String) -> Unit,
    onNext: () -> Unit
) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        BilingualText(
            hindi = "अपनी भाषा और बोली चुनें",
            english = "Select Language & Dialect",
            primaryStyle = MaterialTheme.typography.titleLarge.copy(
                fontWeight = FontWeight.Bold,
                color = TerracottaPrimary
            ),
            secondaryStyle = MaterialTheme.typography.bodyMedium.copy(color = DeepIndigoSecondary),
            horizontalAlignment = Alignment.CenterHorizontally
        )

        Spacer(modifier = Modifier.height(16.dp))

        val dialects = listOf(
            Triple("bhojpuri", "भोजपुरी", "Bhojpuri (पूर्वांचल / बनारस)"),
            Triple("maithili", "मैथिली", "Maithili (मिथिला / मधुबनी)"),
            Triple("awadhi", "अवधी", "Awadhi (अवध / लखनऊ)"),
            Triple("marwari", "मारवाड़ी", "Marwari (राजस्थान / बाड़मेर)"),
            Triple("hindi", "हिंदी", "Hindi (मानक खड़ी बोली)"),
            Triple("english", "English", "English (Official)")
        )

        dialects.forEach { (code, regional, desc) ->
            val isSelected = selectedDialect == code
            Card(
                colors = CardDefaults.cardColors(
                    containerColor = if (isSelected) Color(0xFFFFEFE9) else CardSurface
                ),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 4.dp)
                    .clickable { onSelectDialect(code) }
                    .border(
                        width = if (isSelected) 2.dp else 1.dp,
                        color = if (isSelected) TerracottaPrimary else DeepIndigoSecondary.copy(alpha = 0.15f),
                        shape = RoundedCornerShape(12.dp)
                    )
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = regional,
                        fontWeight = FontWeight.Bold,
                        fontSize = 18.sp,
                        color = if (isSelected) TerracottaPrimary else MaterialTheme.colorScheme.onSurface,
                        modifier = Modifier.width(100.dp)
                    )
                    Text(
                        text = desc,
                        fontSize = 13.sp,
                        color = TextEnglishSecondary,
                        modifier = Modifier.weight(1f)
                    )
                    if (isSelected) {
                        Icon(
                            imageVector = Icons.Default.CheckCircle,
                            contentDescription = "Selected",
                            tint = TerracottaPrimary,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        DesiButton(
            text = "आगे बढ़ें",
            subtext = "Continue to Identity",
            onClick = onNext,
            modifier = Modifier.fillMaxWidth()
        )
    }
}

@Composable
private fun IdentityVerificationStep(
    phone: String,
    pin: String,
    pehchanId: String,
    artisanName: String,
    isLoading: Boolean,
    onPhoneChange: (String) -> Unit,
    onPinChange: (String) -> Unit,
    onPehchanChange: (String) -> Unit,
    onNameChange: (String) -> Unit,
    onVerifyPehchan: () -> Unit,
    onAuthenticate: () -> Unit,
    onBack: () -> Unit
) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        BilingualText(
            hindi = "कारीगर पहचान सत्यापन",
            english = "Artisan Identity Verification (MoSJE / Pehchan)",
            primaryStyle = MaterialTheme.typography.titleLarge.copy(
                fontWeight = FontWeight.Bold,
                color = TerracottaPrimary
            ),
            secondaryStyle = MaterialTheme.typography.bodyMedium.copy(color = DeepIndigoSecondary),
            horizontalAlignment = Alignment.CenterHorizontally
        )

        Spacer(modifier = Modifier.height(16.dp))

        // Pehchan Verification Card
        Card(
            colors = CardDefaults.cardColors(containerColor = CardSurface),
            shape = RoundedCornerShape(16.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    text = "विकल्प 1: सरकारी पहचान संख्या (Pehchan ID)",
                    fontWeight = FontWeight.Bold,
                    color = TerracottaPrimary,
                    fontSize = 15.sp
                )
                Text(
                    text = "हथकरघा एवं हस्तशिल्प बोर्ड द्वारा जारी Pehchan Card दर्ज करें",
                    fontSize = 12.sp,
                    color = TextEnglishSecondary
                )
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(
                    value = pehchanId,
                    onValueChange = onPehchanChange,
                    label = { Text("पहचान संख्या (उदा. PEH-IND-88320)") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = TerracottaPrimary,
                        unfocusedBorderColor = DeepIndigoSecondary.copy(alpha = 0.3f)
                    )
                )
                Spacer(modifier = Modifier.height(10.dp))
                DesiButton(
                    text = if (isLoading) "सत्यापित हो रहा है..." else "पहचान कार्ड सत्यापित करें",
                    subtext = "Verify Government Pehchan Registry",
                    onClick = onVerifyPehchan,
                    enabled = !isLoading && pehchanId.isNotBlank(),
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Phone + PIN Card
        Card(
            colors = CardDefaults.cardColors(containerColor = CardSurface),
            shape = RoundedCornerShape(16.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    text = "विकल्प 2: मोबाइल नंबर एवं 4-अंकीय पिन",
                    fontWeight = FontWeight.Bold,
                    color = DeepIndigoSecondary,
                    fontSize = 15.sp
                )
                Text(
                    text = "सीधे मोबाइल नंबर और सुरक्षित पिन द्वारा लॉगिन या नया खाता बनाएं",
                    fontSize = 12.sp,
                    color = TextEnglishSecondary
                )
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(
                    value = artisanName,
                    onValueChange = onNameChange,
                    label = { Text("कारीगर का नाम (Artisan Full Name)") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(
                    value = phone,
                    onValueChange = onPhoneChange,
                    label = { Text("मोबाइल नंबर (10-Digit Mobile)") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(
                    value = pin,
                    onValueChange = onPinChange,
                    label = { Text("4-अंकीय सुरक्षा पिन (4-Digit Security PIN)") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(modifier = Modifier.height(12.dp))
                DesiButton(
                    text = if (isLoading) "प्रक्रिया जारी है..." else "लॉगिन / रजिस्टर करें",
                    subtext = "Login or Register with PIN",
                    onClick = onAuthenticate,
                    variant = DesiButtonVariant.SECONDARY,
                    enabled = !isLoading && phone.length >= 10 && pin.length >= 4,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        DesiButton(
            text = "पीछे जाएं",
            subtext = "Back",
            onClick = onBack,
            variant = DesiButtonVariant.OUTLINE,
            modifier = Modifier.fillMaxWidth()
        )
    }
}

@Composable
private fun ClusterConfirmationStep(
    artisanName: String,
    clusterName: String,
    craftCategory: String,
    isGiCertified: Boolean,
    giTagName: String?,
    onClusterChange: (String) -> Unit,
    onNext: () -> Unit,
    onBack: () -> Unit
) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        BilingualText(
            hindi = "शिल्प क्लस्टर और श्रेणी पुष्टि",
            english = "Craft Cluster & GI Registry Confirmation",
            primaryStyle = MaterialTheme.typography.titleLarge.copy(
                fontWeight = FontWeight.Bold,
                color = TerracottaPrimary
            ),
            secondaryStyle = MaterialTheme.typography.bodyMedium.copy(color = DeepIndigoSecondary),
            horizontalAlignment = Alignment.CenterHorizontally
        )

        Spacer(modifier = Modifier.height(16.dp))

        Card(
            colors = CardDefaults.cardColors(containerColor = CardSurface),
            shape = RoundedCornerShape(16.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    text = "कारीगर: $artisanName",
                    fontWeight = FontWeight.Bold,
                    fontSize = 17.sp,
                    color = TerracottaPrimary
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "शिल्प श्रेणी: $craftCategory",
                    fontSize = 14.sp,
                    color = DeepIndigoSecondary
                )
                Spacer(modifier = Modifier.height(8.dp))
                if (isGiCertified && !giTagName.isNullOrBlank()) {
                    GiTagBadge(giTagStatus = "certified", regNumber = giTagName)
                    Spacer(modifier = Modifier.height(8.dp))
                }

                Text(
                    text = "चयनित क्लस्टर:",
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 13.sp,
                    color = TextEnglishSecondary
                )
                Spacer(modifier = Modifier.height(4.dp))

                LocationProvider.FAMOUS_CLUSTERS.forEach { cluster ->
                    val isSelected = clusterName == cluster.name
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 4.dp)
                            .clickable { onClusterChange(cluster.name) }
                            .background(
                                if (isSelected) Color(0xFFFFEFE9) else Color.Transparent,
                                RoundedCornerShape(8.dp)
                            )
                            .padding(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.LocationOn,
                            contentDescription = null,
                            tint = if (isSelected) TerracottaPrimary else DeepIndigoSecondary.copy(alpha = 0.5f),
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = cluster.name,
                            fontSize = 13.sp,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                            color = if (isSelected) TerracottaPrimary else MaterialTheme.colorScheme.onSurface
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        DesiButton(
            text = "क्लस्टर की पुष्टि करें",
            subtext = "Confirm Craft Cluster",
            onClick = onNext,
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(modifier = Modifier.height(8.dp))

        DesiButton(
            text = "पीछे जाएं",
            subtext = "Back",
            onClick = onBack,
            variant = DesiButtonVariant.OUTLINE,
            modifier = Modifier.fillMaxWidth()
        )
    }
}

@Composable
private fun PermissionsOverviewStep(
    onRequestPermissions: () -> Unit,
    onBack: () -> Unit
) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        BilingualText(
            hindi = "एप्लिकेशन अनुमतियां",
            english = "Required Hardware Sensor Permissions",
            primaryStyle = MaterialTheme.typography.titleLarge.copy(
                fontWeight = FontWeight.Bold,
                color = TerracottaPrimary
            ),
            secondaryStyle = MaterialTheme.typography.bodyMedium.copy(color = DeepIndigoSecondary),
            horizontalAlignment = Alignment.CenterHorizontally
        )

        Spacer(modifier = Modifier.height(12.dp))

        Text(
            text = "आर्टिफ़ाई भारत की शून्य-कौशल सुविधाओं के लिए निम्न 3 अनुमतियों की आवश्यकता है:",
            fontSize = 13.sp,
            color = DeepIndigoSecondary.copy(alpha = 0.85f),
            modifier = Modifier.padding(horizontal = 8.dp)
        )

        Spacer(modifier = Modifier.height(16.dp))

        PermissionCard(
            icon = Icons.Default.Mic,
            titleHindi = "माइक्रोफोन / आवाज़",
            titleEnglish = "Microphone (Voice Cataloging)",
            desc = "स्थानीय बोलियों (भोजपुरी, मैथिली) में बोलकर उत्पाद दर्ज करने और 'दादी से पूछो' सलाह हेतु।"
        )

        Spacer(modifier = Modifier.height(10.dp))

        PermissionCard(
            icon = Icons.Default.CameraAlt,
            titleHindi = "कैमरा",
            titleEnglish = "Camera (Authenticity Studio)",
            desc = "हथकरघा निर्माण के विभिन्न चरणों की तस्वीरें लेने और एआई फोटो संवर्धन हेतु।"
        )

        Spacer(modifier = Modifier.height(10.dp))

        PermissionCard(
            icon = Icons.Default.LocationOn,
            titleHindi = "स्थान (GPS)",
            titleEnglish = "Location (GI Cluster Anchor)",
            desc = "डिजिटल हेरिटेज पासपोर्ट में प्रमाणित भौगोलिक उपदर्शन (GI) क्लस्टर स्थान दर्ज करने हेतु।"
        )

        Spacer(modifier = Modifier.height(24.dp))

        DesiButton(
            text = "अनुमतियां दें और आगे बढ़ें",
            subtext = "Grant Permissions & Proceed",
            onClick = onRequestPermissions,
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(modifier = Modifier.height(8.dp))

        DesiButton(
            text = "पीछे जाएं",
            subtext = "Back",
            onClick = onBack,
            variant = DesiButtonVariant.OUTLINE,
            modifier = Modifier.fillMaxWidth()
        )
    }
}

@Composable
private fun PermissionCard(
    icon: ImageVector,
    titleHindi: String,
    titleEnglish: String,
    desc: String
) {
    Card(
        colors = CardDefaults.cardColors(containerColor = CardSurface),
        shape = RoundedCornerShape(12.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.padding(14.dp),
            verticalAlignment = Alignment.Top
        ) {
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .background(TerracottaPrimary.copy(alpha = 0.12f), CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = titleEnglish,
                    tint = TerracottaPrimary,
                    modifier = Modifier.size(24.dp)
                )
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column {
                Text(
                    text = titleHindi,
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Text(
                    text = titleEnglish,
                    fontSize = 12.sp,
                    color = TextEnglishSecondary
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = desc,
                    fontSize = 12.sp,
                    color = DeepIndigoSecondary.copy(alpha = 0.8f)
                )
            }
        }
    }
}

@Composable
private fun CompletionStep(
    artisanName: String,
    clusterName: String,
    craftCategory: String,
    isGiCertified: Boolean,
    onEnterApp: () -> Unit
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
        modifier = Modifier.padding(16.dp)
    ) {
        QuorumSeal(
            votesReceived = 3,
            quorumRequired = 3,
            consensusLevel = "High",
            isVerified = true,
            modifier = Modifier.padding(12.dp)
        )

        Spacer(modifier = Modifier.height(20.dp))

        BilingualText(
            hindi = "सत्यापन संपन्न! स्वागत है",
            english = "Onboarding Complete • MoSJE Verified",
            primaryStyle = MaterialTheme.typography.headlineSmall.copy(
                fontWeight = FontWeight.Bold,
                color = TerracottaPrimary
            ),
            secondaryStyle = MaterialTheme.typography.bodyMedium.copy(color = DeepIndigoSecondary),
            horizontalAlignment = Alignment.CenterHorizontally
        )

        Spacer(modifier = Modifier.height(16.dp))

        Card(
            colors = CardDefaults.cardColors(containerColor = CardSurface),
            shape = RoundedCornerShape(16.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = artisanName,
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp,
                    color = TerracottaPrimary
                )
                Text(
                    text = clusterName,
                    fontSize = 14.sp,
                    color = DeepIndigoSecondary
                )
                Text(
                    text = "हस्तशिल्प: $craftCategory • SIH PS 26090",
                    fontSize = 12.sp,
                    color = TextEnglishSecondary
                )
            }
        }

        Spacer(modifier = Modifier.height(28.dp))

        DesiButton(
            text = "आर्टिफ़ाई भारत में प्रवेश करें",
            subtext = "Enter Artisan Workplace",
            onClick = onEnterApp,
            modifier = Modifier.fillMaxWidth()
        )
    }
}
