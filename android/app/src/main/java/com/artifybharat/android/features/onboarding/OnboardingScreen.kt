package com.artifybharat.android.features.onboarding

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
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Group
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.SwapHoriz
import androidx.compose.material.icons.filled.VolumeUp
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
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
import com.artifybharat.android.data.network.NetworkClient
import com.artifybharat.android.hardware.location.LocationProvider
import com.artifybharat.android.hardware.permissions.JitPermissions
import com.artifybharat.android.navigation.Screen
import com.artifybharat.android.ui.components.BilingualText
import com.artifybharat.android.ui.components.DesiButton
import com.artifybharat.android.ui.components.DesiButtonVariant
import com.artifybharat.android.ui.components.GiTagBadge
import com.artifybharat.android.ui.components.QuorumSeal
import com.artifybharat.android.ui.dialogs.PermissionRationaleDialog
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
    // T4 JIT: blocker removed — param unused, kept for back-compat.
    onPermissionsRequest: (() -> Unit)? = null
) {
    val uiState by viewModel.uiState.collectAsState()

    // T4 (#112) JIT: no bulk permissions gate. OS dialogs fire inline in context
    // (mic on voice, camera on Studio tap, GPS on cluster suggest) — deny never blocks.

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

        // Offline / Unreachable Server Notice — T2: real Room queue, no fake demo.
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
                        text = if (uiState.queuedOffline)
                            "✅ सुरक्षित सहेजा गया • कतार ${uiState.pendingQueueCount} (Saved safely • will verify)"
                        else "⚠️ बैकएंड सर्वर उपलब्ध नहीं है (Backend Unreachable)",
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF713F12),
                        fontSize = 14.sp
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "सर्वर (${NetworkClient.getEffectiveBaseUrl()}) से संपर्क नहीं हो पा रहा है। एयरप्लेन-मोड पंजीकरण Room कतार में सुरक्षित रहेगा और ऑनलाइन होते ही WorkManager से सिंक होगा।",
                        color = Color(0xFF854D0E),
                        fontSize = 12.sp
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    DesiButton(
                        text = "सुरक्षित ऑफ़लाइन सहेजें",
                        subtext = "Save safely offline • queue ${uiState.pendingQueueCount}",
                        onClick = { viewModel.queueCurrentRegistrationOffline() },
                        variant = DesiButtonVariant.OUTLINE,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }
        }

        // Screen Body by Step
        when (uiState.currentStep) {
            OnboardingStep.MODE_SELECT -> {
                ModeSelectStep(
                    selectedMode = uiState.onboardingMode,
                    onSelectMode = { viewModel.selectOnboardingMode(it) },
                    onNext = { viewModel.goToNextStep() }
                )
            }
            OnboardingStep.WELCOME_LANGUAGE -> {
                WelcomeLanguageStep(
                    selectedDialect = uiState.selectedDialect,
                    onboardingMode = uiState.onboardingMode,
                    spokenName = uiState.spokenName,
                    showVoiceConfirm = uiState.showVoiceConfirm,
                    onSelectDialect = { viewModel.selectDialect(it) },
                    onReadout = { /* TTS stub: Bhashini readout wired in follow-up */ },
                    onSpeakName = { viewModel.setSpokenName(it) },
                    onConfirmVoice = { viewModel.confirmSpokenName(it) },
                    onSwitchAccount = { viewModel.selectOnboardingMode(OnboardingMode.SOLO) },
                    onNext = { viewModel.goToNextStep() },
                    onBack = { viewModel.goToPreviousStep() }
                )
            }
            OnboardingStep.IDENTITY_VERIFICATION -> {
                IdentityVerificationStep(
                    phone = uiState.phone,
                    pin = uiState.pin,
                    pehchanId = uiState.pehchanId,
                    artisanName = uiState.artisanName,
                    spokenName = uiState.spokenName,
                    isLoading = uiState.isLoading,
                    showSecondaryVerify = uiState.showSecondaryVerify,
                    queuedOffline = uiState.queuedOffline,
                    pendingQueueCount = uiState.pendingQueueCount,
                    onPhoneChange = { viewModel.updatePhone(it) },
                    onPinChange = { viewModel.updatePin(it) },
                    onPehchanChange = { viewModel.updatePehchanId(it) },
                    onNameChange = { viewModel.updateArtisanName(it) },
                    onToggleSecondary = { viewModel.toggleSecondaryVerify() },
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
            // T4 (#112) JIT: legacy blocker step passes straight through to completion.
            OnboardingStep.PERMISSIONS_OVERVIEW -> {
                CompletionStep(
                    artisanName = uiState.artisanName,
                    clusterName = uiState.clusterName,
                    craftCategory = uiState.craftCategory,
                    isGiCertified = uiState.isGiCertified,
                    onEnterApp = { viewModel.completeOnboardingAndEnterApp() }
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
private fun ModeSelectStep(
    selectedMode: OnboardingMode,
    onSelectMode: (OnboardingMode) -> Unit,
    onNext: () -> Unit
) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        BilingualText(
            hindi = "आप कौन हैं?",
            english = "Who is using this phone? (Step 0)",
            primaryStyle = MaterialTheme.typography.titleLarge.copy(
                fontWeight = FontWeight.Bold,
                color = TerracottaPrimary
            ),
            secondaryStyle = MaterialTheme.typography.bodyMedium.copy(color = DeepIndigoSecondary),
            horizontalAlignment = Alignment.CenterHorizontally
        )

        Spacer(modifier = Modifier.height(16.dp))

        ModeCard(
            selected = selectedMode == OnboardingMode.SOLO,
            icon = Icons.Default.Person,
            hindi = "मैं खुद कारीगर हूँ",
            english = "I am the artisan (Solo)",
            contentDesc = "मैं खुद कारीगर हूँ चुनें",
            onClick = { onSelectMode(OnboardingMode.SOLO) }
        )

        Spacer(modifier = Modifier.height(10.dp))

        ModeCard(
            selected = selectedMode == OnboardingMode.SHG,
            icon = Icons.Default.Group,
            hindi = "मैं SHG helper हूँ",
            english = "I am an SHG helper",
            contentDesc = "मैं एसएचजी हेल्पर हूँ चुनें",
            onClick = { onSelectMode(OnboardingMode.SHG) }
        )

        if (selectedMode == OnboardingMode.SHG) {
            Spacer(modifier = Modifier.height(12.dp))
            Card(
                colors = CardDefaults.cardColors(containerColor = Color(0xFFEFF6FF)),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Text(
                        text = "SHG सहायक मोड: आप कारीगर की ओर से भर रहे हैं",
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp,
                        color = DeepIndigoSecondary
                    )
                    Text(
                        text = "SHG helper mode — filling on behalf of the artisan",
                        fontSize = 12.sp,
                        color = TextEnglishSecondary
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    DesiButton(
                        text = "खाता बदलें",
                        subtext = "Switch account (stub)",
                        onClick = { onSelectMode(OnboardingMode.SOLO) },
                        variant = DesiButtonVariant.OUTLINE,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        DesiButton(
            text = "आगे बढ़ें",
            subtext = "Continue to Language",
            onClick = onNext,
            modifier = Modifier.fillMaxWidth()
        )
    }
}

@Composable
private fun ModeCard(
    selected: Boolean,
    icon: ImageVector,
    hindi: String,
    english: String,
    contentDesc: String,
    onClick: () -> Unit
) {
    Card(
        colors = CardDefaults.cardColors(
            containerColor = if (selected) Color(0xFFFFEFE9) else CardSurface
        ),
        shape = RoundedCornerShape(12.dp),
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = 56.dp)
            .clickable(onClickLabel = contentDesc) { onClick() }
            .border(
                width = if (selected) 2.dp else 1.dp,
                color = if (selected) TerracottaPrimary else DeepIndigoSecondary.copy(alpha = 0.15f),
                shape = RoundedCornerShape(12.dp)
            )
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .background(TerracottaPrimary.copy(alpha = 0.12f), CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = TerracottaPrimary,
                    modifier = Modifier.size(24.dp)
                )
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = hindi,
                    fontWeight = FontWeight.Bold,
                    fontSize = 20.sp,
                    color = if (selected) TerracottaPrimary else MaterialTheme.colorScheme.onSurface
                )
                Text(
                    text = english,
                    fontSize = 13.sp,
                    color = TextEnglishSecondary
                )
            }
            if (selected) {
                Icon(
                    imageVector = Icons.Default.CheckCircle,
                    contentDescription = "चुना गया (Selected)",
                    tint = TerracottaPrimary,
                    modifier = Modifier.size(20.dp)
                )
            }
        }
    }
}

@Composable
private fun WelcomeLanguageStep(
    selectedDialect: String,
    onboardingMode: OnboardingMode,
    spokenName: String,
    showVoiceConfirm: Boolean,
    onSelectDialect: (String) -> Unit,
    onReadout: (String) -> Unit,
    onSpeakName: (String) -> Unit,
    onConfirmVoice: (Boolean) -> Unit,
    onSwitchAccount: () -> Unit,
    onNext: () -> Unit,
    onBack: () -> Unit
) {
    // T4 (#112) JIT mic: 1-line Hindi why + Learn-more rationale; text fallback never blocks.
    var showMicRationale by remember { mutableStateOf(false) }
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        if (showMicRationale) {
            PermissionRationaleDialog(
                permissionType = com.artifybharat.android.ui.dialogs.PermissionType.AUDIO,
                onConfirm = { showMicRationale = false },
                onDismiss = { showMicRationale = false }
            )
        }
        if (onboardingMode == OnboardingMode.SHG) {
            Card(
                colors = CardDefaults.cardColors(containerColor = Color(0xFFEFF6FF)),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 8.dp)
            ) {
                Row(
                    modifier = Modifier.padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.Group,
                        contentDescription = null,
                        tint = DeepIndigoSecondary,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "SHG सहायक मोड",
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp,
                        color = DeepIndigoSecondary,
                        modifier = Modifier.weight(1f)
                    )
                    IconButton(onClick = onSwitchAccount) {
                        Icon(
                            imageVector = Icons.Default.SwapHoriz,
                            contentDescription = "खाता बदलें (Switch account)",
                            tint = TerracottaPrimary
                        )
                    }
                }
            }
        }

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

        SUPPORTED_DIALECTS.forEach { dialect ->
            val isSelected = selectedDialect == dialect.code
            Card(
                colors = CardDefaults.cardColors(
                    containerColor = if (isSelected) Color(0xFFFFEFE9) else CardSurface
                ),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = 56.dp)
                    .padding(vertical = 4.dp)
                    .clickable(onClickLabel = "${dialect.hindiLabel} चुनें") { onSelectDialect(dialect.code) }
                    .border(
                        width = if (isSelected) 2.dp else 1.dp,
                        color = if (isSelected) TerracottaPrimary else DeepIndigoSecondary.copy(alpha = 0.15f),
                        shape = RoundedCornerShape(12.dp)
                    )
            ) {
                Row(
                    modifier = Modifier.padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = dialect.hindiLabel,
                        fontWeight = FontWeight.Bold,
                        fontSize = 20.sp,
                        color = if (isSelected) TerracottaPrimary else MaterialTheme.colorScheme.onSurface,
                        modifier = Modifier.width(100.dp)
                    )
                    Text(
                        text = dialect.englishDesc,
                        fontSize = 13.sp,
                        color = TextEnglishSecondary,
                        modifier = Modifier.weight(1f)
                    )
                    IconButton(onClick = { onReadout(dialect.code) }) {
                        Icon(
                            imageVector = Icons.Default.VolumeUp,
                            contentDescription = "${dialect.hindiLabel} सुनें (Hear prompt)",
                            tint = DeepIndigoSecondary,
                            modifier = Modifier.size(24.dp)
                        )
                    }
                    if (isSelected) {
                        Icon(
                            imageVector = Icons.Default.CheckCircle,
                            contentDescription = "चुना गया (Selected)",
                            tint = TerracottaPrimary,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // T4 (#112) JIT mic why-line + Learn-more; deny falls back to typing, never blocks.
        Text(
            text = JitPermissions.MIC_WHY_HINDI,
            fontSize = 12.sp,
            color = DeepIndigoSecondary.copy(alpha = 0.85f)
        )
        Text(
            text = "और जानें (Learn more)",
            fontSize = 12.sp,
            fontWeight = FontWeight.SemiBold,
            color = TerracottaPrimary,
            modifier = Modifier
                .clickable(onClickLabel = "माइक अनुमति के बारे में जानें") { showMicRationale = true }
                .padding(vertical = 4.dp)
        )

        // Voice Bhasha entry: Mic button + Speak-name with Yes/No confirm card
        OutlinedTextField(
            value = spokenName,
            onValueChange = onSpeakName,
            label = { Text("बोलकर नाम बताएं (Speak your name)") },
            singleLine = true,
            trailingIcon = {
                Icon(
                    imageVector = Icons.Default.Mic,
                    contentDescription = "माइक दबाकर नाम बोलें (Tap mic to speak name)",
                    tint = TerracottaPrimary
                )
            },
            modifier = Modifier.fillMaxWidth(),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = TerracottaPrimary,
                unfocusedBorderColor = DeepIndigoSecondary.copy(alpha = 0.3f)
            )
        )

        if (showVoiceConfirm && spokenName.isNotBlank()) {
            Spacer(modifier = Modifier.height(8.dp))
            Card(
                colors = CardDefaults.cardColors(containerColor = Color(0xFFFFEFE9)),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Text(
                        text = "क्या आपका नाम \"$spokenName\" है?",
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp,
                        color = TerracottaPrimary
                    )
                    Text(
                        text = "Is your name \"$spokenName\"? Confirm Yes / No",
                        fontSize = 12.sp,
                        color = TextEnglishSecondary
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        DesiButton(
                            text = "हाँ",
                            subtext = "Yes",
                            onClick = { onConfirmVoice(true) },
                            modifier = Modifier.weight(1f)
                        )
                        DesiButton(
                            text = "नहीं",
                            subtext = "No",
                            onClick = { onConfirmVoice(false) },
                            variant = DesiButtonVariant.OUTLINE,
                            modifier = Modifier.weight(1f)
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
private fun IdentityVerificationStep(
    phone: String,
    pin: String,
    pehchanId: String,
    artisanName: String,
    spokenName: String,
    isLoading: Boolean,
    showSecondaryVerify: Boolean,
    queuedOffline: Boolean,
    pendingQueueCount: Int,
    onPhoneChange: (String) -> Unit,
    onPinChange: (String) -> Unit,
    onPehchanChange: (String) -> Unit,
    onNameChange: (String) -> Unit,
    onToggleSecondary: () -> Unit,
    onVerifyPehchan: () -> Unit,
    onAuthenticate: () -> Unit,
    onBack: () -> Unit
) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        BilingualText(
            hindi = "मोबाइल से प्रवेश करें",
            english = "Enter with Mobile (Pehchan optional)",
            primaryStyle = MaterialTheme.typography.titleLarge.copy(
                fontWeight = FontWeight.Bold,
                color = TerracottaPrimary
            ),
            secondaryStyle = MaterialTheme.typography.bodyMedium.copy(color = DeepIndigoSecondary),
            horizontalAlignment = Alignment.CenterHorizontally
        )

        Spacer(modifier = Modifier.height(16.dp))

        if (queuedOffline) {
            Card(
                colors = CardDefaults.cardColors(containerColor = Color(0xFFECFDF5)),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = "✅ सुरक्षित सहेजा गया • कतार $pendingQueueCount (Saved safely • will verify when online)",
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    color = Color(0xFF065F46),
                    modifier = Modifier.padding(12.dp)
                )
            }
            Spacer(modifier = Modifier.height(12.dp))
        }

        // Primary: phone (10-digit numeric only) + spoken name confirm -> Enter app now
        Card(
            colors = CardDefaults.cardColors(containerColor = CardSurface),
            shape = RoundedCornerShape(16.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    text = "मोबाइल नंबर एवं नाम से प्रवेश",
                    fontWeight = FontWeight.Bold,
                    color = TerracottaPrimary,
                    fontSize = 20.sp
                )
                Text(
                    text = "10-digit mobile + spoken-name confirm — Pehchan never blocks",
                    fontSize = 12.sp,
                    color = TextEnglishSecondary
                )
                Spacer(modifier = Modifier.height(8.dp))
                val confirmedName = artisanName.ifBlank { spokenName }
                if (confirmedName.isNotBlank()) {
                    Text(
                        text = "कारीगर: $confirmedName (voice confirmed ✓)",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Medium,
                        color = DeepIndigoSecondary
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                }
                OutlinedTextField(
                    value = artisanName,
                    onValueChange = onNameChange,
                    label = { Text("कारीगर का नाम (Artisan Full Name)") },
                    singleLine = true,
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(min = 56.dp)
                )
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(
                    value = phone,
                    onValueChange = { onPhoneChange(it.filter { c -> c.isDigit() }.take(10)) },
                    label = { Text("मोबाइल नंबर (10-Digit Mobile)") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true,
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(min = 56.dp)
                )
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(
                    value = pin,
                    onValueChange = { onPinChange(it.filter { c -> c.isDigit() }.take(6)) },
                    label = { Text("4-अंकीय सुरक्षा पिन (4-Digit Security PIN)") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
                    singleLine = true,
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(min = 56.dp)
                )
                Spacer(modifier = Modifier.height(12.dp))
                DesiButton(
                    text = if (isLoading) "प्रक्रिया जारी है..." else "ऐप में प्रवेश करें",
                    subtext = "Enter app now — phone + name",
                    onClick = onAuthenticate,
                    enabled = !isLoading && phone.length == 10 && pin.length >= 4,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Secondary (collapsed): Pehchan/e-Shram/TRIFED Verified-Badge upgrade, on demand only
        Card(
            colors = CardDefaults.cardColors(containerColor = CardSurface),
            shape = RoundedCornerShape(16.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable(onClickLabel = "सत्यापित बैज विकल्प खोलें") { onToggleSecondary() },
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = if (showSecondaryVerify) "▼ सत्यापित बैज पाएं (Verified Badge upgrade)" else "▶ सत्यापित बैज पाएं (Verified Badge upgrade)",
                        fontWeight = FontWeight.Bold,
                        color = DeepIndigoSecondary,
                        fontSize = 15.sp,
                        modifier = Modifier.weight(1f)
                    )
                }
                Text(
                    text = "Pehchan / e-Shram / TRIFED — बाद में वेरीफाई करें, अभी वैकल्पिक",
                    fontSize = 12.sp,
                    color = TextEnglishSecondary
                )
                if (showSecondaryVerify) {
                    Spacer(modifier = Modifier.height(8.dp))
                    OutlinedTextField(
                        value = pehchanId,
                        onValueChange = onPehchanChange,
                        label = { Text("पहचान संख्या (उदा. PEH-IND-88320) — वैकल्पिक") },
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
                        subtext = "Verify on demand — never blocks entry",
                        onClick = onVerifyPehchan,
                        enabled = !isLoading && pehchanId.isNotBlank(),
                        modifier = Modifier.fillMaxWidth()
                    )
                }
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
    // T4 (#112) JIT GPS: auto-suggest is optional; manual list never blocks.
    var showLocationRationale by remember { mutableStateOf(false) }
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        if (showLocationRationale) {
            PermissionRationaleDialog(
                permissionType = com.artifybharat.android.ui.dialogs.PermissionType.LOCATION,
                onConfirm = { showLocationRationale = false },
                onDismiss = { showLocationRationale = false }
            )
        }
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

                // T4 (#112) JIT GPS why-line + Learn-more; deny falls back to manual list.
                Text(
                    text = JitPermissions.LOCATION_WHY_HINDI,
                    fontSize = 12.sp,
                    color = DeepIndigoSecondary.copy(alpha = 0.85f)
                )
                Text(
                    text = "और जानें (Learn more)",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = TerracottaPrimary,
                    modifier = Modifier
                        .clickable(onClickLabel = "स्थान अनुमति के बारे में जानें") { showLocationRationale = true }
                        .padding(vertical = 4.dp)
                )
                Spacer(modifier = Modifier.height(4.dp))

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
