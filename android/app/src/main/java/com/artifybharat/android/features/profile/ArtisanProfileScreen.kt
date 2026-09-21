package com.artifybharat.android.features.profile

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountCircle
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.Sync
import androidx.compose.material.icons.filled.Verified
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.artifybharat.android.data.sync.SyncScheduler
import com.artifybharat.android.ui.components.BilingualText
import com.artifybharat.android.ui.components.GiTagBadge
import com.artifybharat.android.ui.components.HeaderBar
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

/**
 * [Artisan App T3] Artisan Profile & Verification — masked identity, cluster/GI,
 * masked payout/DBT, dialect + solo/SHG settings, base-URL inspector + manual sync.
 * Hindi-first (>=20sp), >=56dp touch targets, Khadi/Terracotta. DPDP: masked IDs only.
 */
@Composable
fun ArtisanProfileScreen(
    modifier: Modifier = Modifier,
    onLoggedOut: () -> Unit = {}
) {
    val context = LocalContext.current
    val vm: ArtisanProfileViewModel = viewModel(
        factory = ArtisanProfileViewModelFactory(context.applicationContext)
    )
    val state by vm.uiState.collectAsState()
    var showLogoutConfirm by remember { mutableStateOf(false) }
    var upiInput by remember { mutableStateOf("") }
    var baseUrlInput by remember { mutableStateOf("") }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(KhadiBackground)
    ) {
        HeaderBar(
            hindiTitle = "प्रोफ़ाइल (Profile)",
            englishTitle = "Artisan Profile & Verification"
        )

        LazyColumn(
            modifier = Modifier
                .weight(1f)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            item { IdentityCard(state = state) }

            item { CraftClusterCard(state = state) }

            item {
                PayoutDbtCard(
                    state = state,
                    upiInput = upiInput,
                    onUpiInputChange = { upiInput = it },
                    onSaveUpi = {
                        // DPDP: raw input forwarded for masked persistence only; cleared immediately.
                        vm.updatePayoutUpi(upiInput)
                        upiInput = ""
                    }
                )
            }

            item {
                SettingsCard(
                    state = state,
                    onSelectDialect = { vm.updateDialect(it) },
                    onSelectMode = { vm.updateOnboardingMode(it) },
                    baseUrlInput = baseUrlInput,
                    onBaseUrlInputChange = { baseUrlInput = it },
                    onSaveBaseUrl = {
                        vm.updateBaseUrl(baseUrlInput.trim())
                        baseUrlInput = ""
                    },
                    onManualSync = {
                        SyncScheduler.triggerImmediateSync(context.applicationContext)
                    }
                )
            }

            item {
                Surface(
                    shape = ShapeLarge,
                    color = Color.White,
                    border = BorderStroke(1.dp, WarmSandBorder),
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(min = 56.dp)
                        .clickable(
                            onClickLabel = "लॉगआउट करें. Log out.",
                            onClick = { showLogoutConfirm = true }
                        )
                        .semantics {
                            contentDescription = "लॉगआउट / खाता बदलें. Log out or switch account."
                        }
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.Logout,
                            contentDescription = null,
                            tint = TerracottaPrimary,
                            modifier = Modifier.size(28.dp)
                        )
                        Spacer(modifier = Modifier.width(10.dp))
                        BilingualText(hindi = "लॉगआउट / खाता बदलें", english = "Logout / Switch account")
                    }
                }
            }
        }
    }

    if (showLogoutConfirm) {
        AlertDialog(
            onDismissRequest = { showLogoutConfirm = false },
            title = {
                Text(
                    text = "लॉगआउट करें?",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    color = DeepIndigoSecondary
                )
            },
            text = {
                Text(
                    text = "खाता बदलने पर इस डिवाइस का सत्र साफ़ होगा (Switch account — clears session).",
                    fontSize = 20.sp,
                    color = TextEnglishSecondary
                )
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        showLogoutConfirm = false
                        vm.logout()
                        onLoggedOut()
                    },
                    modifier = Modifier.heightIn(min = 56.dp)
                ) {
                    Text(text = "हाँ, लॉगआउट", fontSize = 20.sp, color = TerracottaPrimary)
                }
            },
            dismissButton = {
                TextButton(
                    onClick = { showLogoutConfirm = false },
                    modifier = Modifier.heightIn(min = 56.dp)
                ) {
                    Text(text = "रद्द करें (Cancel)", fontSize = 20.sp)
                }
            }
        )
    }
}

@Composable
private fun IdentityCard(state: ProfileUiState) {
    Surface(
        shape = ShapeLarge,
        color = CardSurface,
        border = BorderStroke(1.dp, WarmSandBorder),
        modifier = Modifier
            .fillMaxWidth()
            .semantics {
                contentDescription = "कारीगर पहचान ${state.artisanName}. Artisan identity, masked ID only."
            }
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(64.dp)
                    .background(TerracottaPrimary.copy(alpha = 0.12f), CircleShape),
                contentAlignment = Alignment.Center
            ) {
                val initial = state.artisanName.trim().firstOrNull()?.toString() ?: "अ"
                Text(
                    text = initial,
                    fontSize = 28.sp,
                    fontWeight = FontWeight.Bold,
                    color = TerracottaPrimary
                )
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = state.artisanName,
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    color = DeepIndigoSecondary
                )
                Text(
                    text = state.maskedPehchan ?: "PEH-***-*****",
                    fontSize = 20.sp,
                    color = TextEnglishSecondary,
                    modifier = Modifier.semantics {
                        contentDescription = "Masked Pehchan ID ${state.maskedPehchan}. Masked only."
                    }
                )
                Spacer(modifier = Modifier.height(6.dp))
                MinistrySealChip(isVerified = state.isVerified)
            }
            Icon(
                imageVector = Icons.Default.AccountCircle,
                contentDescription = null,
                tint = WarmSandBorder,
                modifier = Modifier.size(28.dp)
            )
        }
    }
}

@Composable
private fun MinistrySealChip(isVerified: Boolean) {
    Surface(
        shape = ShapePill,
        color = if (isVerified) Color(0xFFF1F8F4) else Color(0xFFFFFBEB),
        border = BorderStroke(1.5.dp, if (isVerified) NeemForestGreen else Color(0xFFF59E0B))
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.Default.Verified,
                contentDescription = null,
                tint = if (isVerified) NeemForestGreen else Color(0xFF92400E),
                modifier = Modifier.size(16.dp)
            )
            Spacer(modifier = Modifier.width(6.dp))
            Text(
                text = if (isVerified) "MoSJE सत्यापित सील" else "असत्यापित",
                style = MaterialTheme.typography.labelMedium,
                color = if (isVerified) NeemForestGreen else Color(0xFF92400E),
                fontWeight = FontWeight.Bold
            )
        }
    }
}

@Composable
private fun CraftClusterCard(state: ProfileUiState) {
    Surface(
        shape = ShapeLarge,
        color = CardSurface,
        border = BorderStroke(1.dp, WarmSandBorder),
        modifier = Modifier
            .fillMaxWidth()
            .semantics {
                contentDescription = "क्राफ्ट ${state.craftCategory}, क्लस्टर ${state.clusterName}. Craft and cluster."
            }
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            BilingualText(hindi = "क्राफ्ट व क्लस्टर", english = "Craft & Cluster")
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = state.craftCategory,
                fontSize = 20.sp,
                fontWeight = FontWeight.SemiBold,
                color = DeepIndigoSecondary
            )
            Text(
                text = state.clusterName.ifBlank { "—" },
                fontSize = 20.sp,
                color = TextEnglishSecondary
            )
            Spacer(modifier = Modifier.height(8.dp))
            GiTagBadge(
                giTagStatus = if (state.isVerified) "Verified" else "Pending",
                regNumber = if (state.craftCategory == "handloom") "39" else null
            )
        }
    }
}

@Composable
private fun PayoutDbtCard(
    state: ProfileUiState,
    upiInput: String,
    onUpiInputChange: (String) -> Unit,
    onSaveUpi: () -> Unit
) {
    Surface(
        shape = ShapeLarge,
        color = CardSurface,
        border = BorderStroke(1.dp, WarmSandBorder),
        modifier = Modifier
            .fillMaxWidth()
            .semantics {
                contentDescription = "भुगतान UPI ${state.payoutUpiMasked}. Masked payout only."
            }
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            BilingualText(hindi = "भुगतान / DBT", english = "Payout / DBT")
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = state.payoutUpiMasked ?: "*** (सेट नहीं)",
                fontSize = 20.sp,
                fontWeight = FontWeight.SemiBold,
                color = DeepIndigoSecondary
            )
            Text(
                text = if (state.payoutUpiMasked != null) "DBT सक्रिय (DBT Active — Jan Dhan/UPI)" else "DBT असक्रिय (Set UPI for DBT)",
                style = MaterialTheme.typography.bodySmall,
                color = if (state.payoutUpiMasked != null) NeemForestGreen else TextEnglishSecondary
            )
            Spacer(modifier = Modifier.height(8.dp))
            OutlinedTextField(
                value = upiInput,
                onValueChange = onUpiInputChange,
                label = { Text(text = "नया UPI (New UPI)", fontSize = 20.sp) },
                placeholder = { Text(text = "name@bank", fontSize = 20.sp) },
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )
            Spacer(modifier = Modifier.height(8.dp))
            Surface(
                shape = ShapeMedium,
                color = TerracottaPrimary,
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = 56.dp)
                    .clickable(onClickLabel = "UPI सहेजें. Save UPI masked.", onClick = onSaveUpi)
            ) {
                Box(modifier = Modifier.fillMaxWidth().padding(12.dp), contentAlignment = Alignment.Center) {
                    Text(text = "UPI सहेजें (Save)", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = Color.White)
                }
            }
        }
    }
}

@Composable
private fun SettingsCard(
    state: ProfileUiState,
    onSelectDialect: (String) -> Unit,
    onSelectMode: (String) -> Unit,
    baseUrlInput: String,
    onBaseUrlInputChange: (String) -> Unit,
    onSaveBaseUrl: () -> Unit,
    onManualSync: () -> Unit
) {
    Surface(
        shape = ShapeLarge,
        color = CardSurface,
        border = BorderStroke(1.dp, WarmSandBorder),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            BilingualText(hindi = "सेटिंग्स", english = "Settings")
            Spacer(modifier = Modifier.height(8.dp))
            Text(text = "बोली चुनें (Dialect)", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = DeepIndigoSecondary)
            Spacer(modifier = Modifier.height(8.dp))
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                PROFILE_DIALECTS.forEach { dialect ->
                    val selected = state.preferredDialect == dialect.code
                    Surface(
                        shape = ShapeMedium,
                        color = if (selected) Color(0xFFFFEFE9) else Color.White,
                        border = BorderStroke(1.dp, if (selected) TerracottaPrimary else WarmSandBorder),
                        modifier = Modifier
                            .fillMaxWidth()
                            .heightIn(min = 56.dp)
                            .clickable(
                                onClickLabel = "${dialect.hindi} चुनें. Select ${dialect.english}.",
                                onClick = { onSelectDialect(dialect.code) }
                            )
                            .semantics {
                                contentDescription = "${dialect.hindi} ${dialect.english}, selected $selected."
                            }
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = if (selected) "●" else "○",
                                fontSize = 20.sp,
                                color = if (selected) TerracottaPrimary else TextEnglishSecondary
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(text = dialect.hindi, fontSize = 20.sp, fontWeight = FontWeight.SemiBold, color = DeepIndigoSecondary)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(text = dialect.english, style = MaterialTheme.typography.bodySmall, color = TextEnglishSecondary)
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))
            Text(text = "भूमिका (Role)", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = DeepIndigoSecondary)
            Spacer(modifier = Modifier.height(8.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                RoleToggleButton(
                    hindi = "खुद कारीगर",
                    english = "Solo",
                    selected = state.isSolo,
                    talkBack = "खुद कारीगर solo मोड. Solo artisan mode.",
                    onClick = { onSelectMode("solo") },
                    modifier = Modifier.weight(1f)
                )
                RoleToggleButton(
                    hindi = "SHG सहायक",
                    english = "SHG",
                    selected = !state.isSolo,
                    talkBack = "SHG सहायक shg मोड. SHG helper mode.",
                    onClick = { onSelectMode("shg") },
                    modifier = Modifier.weight(1f)
                )
            }

            Spacer(modifier = Modifier.height(12.dp))
            Text(text = "सर्वर (Base URL)", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = DeepIndigoSecondary)
            Text(
                text = state.effectiveBaseUrl,
                fontSize = 20.sp,
                color = TextEnglishSecondary,
                modifier = Modifier.semantics { contentDescription = "Effective base URL ${state.effectiveBaseUrl}." }
            )
            Spacer(modifier = Modifier.height(8.dp))
            OutlinedTextField(
                value = baseUrlInput,
                onValueChange = onBaseUrlInputChange,
                label = { Text(text = "कस्टम URL (Custom URL)", fontSize = 20.sp) },
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )
            Spacer(modifier = Modifier.height(8.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Surface(
                    shape = ShapeMedium,
                    color = DeepIndigoSecondary,
                    modifier = Modifier
                        .weight(1f)
                        .heightIn(min = 56.dp)
                        .clickable(onClickLabel = "URL सहेजें. Save base URL.", onClick = onSaveBaseUrl)
                ) {
                    Box(modifier = Modifier.fillMaxWidth().padding(12.dp), contentAlignment = Alignment.Center) {
                        Text(text = "सहेजें (Save)", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = Color.White)
                    }
                }
                Surface(
                    shape = ShapeMedium,
                    color = NeemForestGreen,
                    modifier = Modifier
                        .weight(1f)
                        .heightIn(min = 56.dp)
                        .clickable(onClickLabel = "अभी सिंक करें. Sync now.", onClick = onManualSync)
                        .semantics { contentDescription = "अभी सिंक करें. Manual sync now." }
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(12.dp),
                        horizontalArrangement = Arrangement.Center,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(imageVector = Icons.Default.Sync, contentDescription = null, tint = Color.White, modifier = Modifier.size(24.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(text = "सिंक (Sync)", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = Color.White)
                    }
                }
            }
        }
    }
}

@Composable
private fun RoleToggleButton(
    hindi: String,
    english: String,
    selected: Boolean,
    talkBack: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        shape = ShapeMedium,
        color = if (selected) TerracottaPrimary else Color.White,
        border = BorderStroke(1.dp, if (selected) TerracottaPrimary else WarmSandBorder),
        modifier = modifier
            .heightIn(min = 56.dp)
            .clickable(onClickLabel = talkBack, onClick = onClick)
            .semantics { contentDescription = "$talkBack selected $selected." }
    ) {
        Column(
            modifier = Modifier.padding(10.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = hindi,
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
                color = if (selected) Color.White else DeepIndigoSecondary
            )
            Text(
                text = english,
                style = MaterialTheme.typography.labelSmall,
                color = if (selected) Color.White.copy(alpha = 0.85f) else TextEnglishSecondary
            )
        }
    }
}
