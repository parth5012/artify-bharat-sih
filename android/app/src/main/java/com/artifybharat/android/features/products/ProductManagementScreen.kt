package com.artifybharat.android.features.products

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
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Image
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
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
import androidx.navigation.NavController
import com.artifybharat.android.navigation.Screen
import com.artifybharat.android.ui.components.GiTagBadge
import com.artifybharat.android.ui.components.HeaderBar
import com.artifybharat.android.ui.theme.CardSurface
import com.artifybharat.android.ui.theme.DeepIndigoSecondary
import com.artifybharat.android.ui.theme.ErrorRed
import com.artifybharat.android.ui.theme.KhadiBackground
import com.artifybharat.android.ui.theme.NeemForestGreen
import com.artifybharat.android.ui.theme.ShapeLarge
import com.artifybharat.android.ui.theme.ShapeMedium
import com.artifybharat.android.ui.theme.ShapePill
import com.artifybharat.android.ui.theme.TerracottaPrimary
import com.artifybharat.android.ui.theme.TextEnglishSecondary
import com.artifybharat.android.ui.theme.WarmSandBorder

private val StatusDraftOrange = Color(0xFFF59E0B)
private val StatusDraftBg = Color(0xFFFFFBEB)
private val StatusSyncedBg = Color(0xFFF1F8F4)
private val StatusFailedBg = Color(0xFFFDECEC)
private val StatusReviewBg = Color(0xFFEFF1FF)

/**
 * [Artisan App T4] Unified Product Management — Room drafts + remote inventory.
 * Filter tabs सभी उत्पाद/ड्राफ्ट/सक्रिय/समीक्षा में; card quick actions
 * Passport / Thermal print / Studio edit / delete-confirm.
 * Hindi-first (>=20sp), >=56dp targets, TalkBack. No nav restructure (T5 owns graph).
 */
@Composable
fun ProductManagementScreen(
    navController: NavController,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val vm: ProductManagementViewModel = viewModel(
        factory = ProductManagementViewModelFactory(context.applicationContext)
    )
    val state by vm.uiState.collectAsState()
    var pendingDelete: ManagedProduct? by remember { mutableStateOf(null) }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(KhadiBackground)
    ) {
        HeaderBar(
            hindiTitle = "मेरे उत्पाद (Products)",
            englishTitle = "Drafts + Inventory • Passport • Print",
            pendingSyncCount = state.draftsCount,
            onSyncClick = { vm.refreshInventory() }
        )

        LazyColumn(
            modifier = Modifier
                .weight(1f)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            item {
                FilterTabs(
                    selected = state.selectedTab,
                    onSelect = { vm.selectTab(it) }
                )
            }

            if (state.isLoading) {
                item {
                    Surface(
                        shape = ShapeMedium,
                        color = CardSurface,
                        border = BorderStroke(1.dp, WarmSandBorder),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = "लोड हो रहा है… (Loading inventory…)",
                            fontSize = 20.sp,
                            color = TextEnglishSecondary,
                            modifier = Modifier.padding(16.dp)
                        )
                    }
                }
            }

            if (state.errorMessage != null) {
                item {
                    Surface(
                        shape = ShapeMedium,
                        color = StatusFailedBg,
                        border = BorderStroke(1.dp, ErrorRed),
                        modifier = Modifier
                            .fillMaxWidth()
                            .semantics {
                                contentDescription = "इन्वेंटरी त्रुटि ${state.errorMessage}. Inventory error."
                            }
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Text(
                                text = state.errorMessage!!,
                                fontSize = 20.sp,
                                color = ErrorRed
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Surface(
                                shape = ShapeMedium,
                                color = Color.White,
                                border = BorderStroke(1.dp, ErrorRed),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .heightIn(min = 56.dp)
                                    .clickable(
                                        onClickLabel = "पुनः प्रयास करें. Retry inventory load.",
                                        onClick = { vm.refreshInventory() }
                                    )
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(12.dp),
                                    horizontalArrangement = Arrangement.Center,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Refresh,
                                        contentDescription = null,
                                        tint = ErrorRed,
                                        modifier = Modifier.size(24.dp)
                                    )
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text(
                                        text = "पुनः प्रयास (Retry)",
                                        fontSize = 20.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = ErrorRed
                                    )
                                }
                            }
                        }
                    }
                }
            }

            if (state.filteredProducts.isEmpty() && !state.isLoading) {
                item {
                    EmptyProductsCard(
                        onAddProduct = { navController.navigate(Screen.VoiceCatalog.route) }
                    )
                }
            } else {
                items(state.filteredProducts, key = { it.id }) { product ->
                    ProductCard(
                        product = product,
                        onViewPassport = {
                            navController.navigate(
                                Screen.DigitalPassport.createRoute(
                                    product.passportHash ?: product.id
                                )
                            )
                        },
                        onPrintTag = {
                            navController.navigate(
                                Screen.ThermalPrint.createRoute(
                                    product.shortcode ?: "A7X-9B2"
                                )
                            )
                        },
                        onEditResume = {
                            navController.navigate(
                                Screen.AuthenticityStudio.createRoute(product.id)
                            )
                        },
                        onDelete = { pendingDelete = product }
                    )
                }
            }
        }
    }

    if (pendingDelete != null) {
        AlertDialog(
            onDismissRequest = { pendingDelete = null },
            title = {
                Text(
                    text = "ड्राफ्ट हटाएं?",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    color = DeepIndigoSecondary
                )
            },
            text = {
                Text(
                    text = "${pendingDelete!!.title} हट जाएगा (Delete draft ${pendingDelete!!.id}).",
                    fontSize = 20.sp,
                    color = TextEnglishSecondary
                )
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        vm.deleteDraft(pendingDelete!!.id)
                        pendingDelete = null
                    },
                    modifier = Modifier.heightIn(min = 56.dp)
                ) {
                    Text(text = "हाँ, हटाएं", fontSize = 20.sp, color = ErrorRed)
                }
            },
            dismissButton = {
                TextButton(
                    onClick = { pendingDelete = null },
                    modifier = Modifier.heightIn(min = 56.dp)
                ) {
                    Text(text = "रद्द करें (Cancel)", fontSize = 20.sp)
                }
            }
        )
    }
}

@Composable
private fun FilterTabs(
    selected: ProductFilterTab,
    onSelect: (ProductFilterTab) -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        ProductFilterTab.values().toList().chunked(2).forEach { row ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                row.forEach { tab ->
                    val isSelected = tab == selected
                    Surface(
                        shape = ShapeMedium,
                        color = if (isSelected) TerracottaPrimary else Color.White,
                        border = BorderStroke(
                            1.dp,
                            if (isSelected) TerracottaPrimary else WarmSandBorder
                        ),
                        modifier = Modifier
                            .weight(1f)
                            .heightIn(min = 56.dp)
                            .clickable(
                                onClickLabel = "${tab.hindiTitle} दिखाएं. Show ${tab.englishTitle}.",
                                onClick = { onSelect(tab) }
                            )
                            .semantics {
                                contentDescription = "${tab.hindiTitle} ${tab.englishTitle}, selected $isSelected."
                            }
                    ) {
                        Column(
                            modifier = Modifier.padding(10.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text(
                                text = tab.hindiTitle,
                                fontSize = 20.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (isSelected) Color.White else DeepIndigoSecondary
                            )
                            Text(
                                text = tab.englishTitle,
                                style = MaterialTheme.typography.labelSmall,
                                color = if (isSelected) Color.White.copy(alpha = 0.85f)
                                else TextEnglishSecondary
                            )
                        }
                    }
                }
                if (row.size == 1) Spacer(modifier = Modifier.weight(1f))
            }
        }
    }
}

@Composable
private fun EmptyProductsCard(onAddProduct: () -> Unit) {
    Surface(
        shape = ShapeLarge,
        color = CardSurface,
        border = BorderStroke(1.dp, WarmSandBorder),
        modifier = Modifier
            .fillMaxWidth()
            .semantics {
                contentDescription = "अभी कोई उत्पाद नहीं है. No products yet, add a new product."
            }
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = "अभी कोई उत्पाद नहीं है",
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
                color = DeepIndigoSecondary
            )
            Text(
                text = "No products yet — ड्राफ्ट या इन्वेंटरी यहाँ दिखेगी",
                fontSize = 20.sp,
                color = TextEnglishSecondary
            )
            Spacer(modifier = Modifier.height(12.dp))
            Surface(
                shape = ShapeMedium,
                color = TerracottaPrimary,
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = 56.dp)
                    .clickable(
                        onClickLabel = "नया उत्पाद जोड़ें, Voice Catalog पर जाएं. Add new product.",
                        onClick = onAddProduct
                    )
                    .semantics {
                        contentDescription = "नया उत्पाद जोड़ें. Add new product."
                    }
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(12.dp),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.Add,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(24.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "नया उत्पाद जोड़ें (Add Product)",
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                }
            }
        }
    }
}

@Composable
private fun ProductCard(
    product: ManagedProduct,
    onViewPassport: () -> Unit,
    onPrintTag: () -> Unit,
    onEditResume: () -> Unit,
    onDelete: () -> Unit
) {
    Surface(
        shape = ShapeLarge,
        color = CardSurface,
        border = BorderStroke(1.dp, WarmSandBorder),
        modifier = Modifier
            .fillMaxWidth()
            .semantics {
                contentDescription = "उत्पाद ${product.title}, स्थिति ${product.status}. Product ${product.id}."
            }
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(64.dp)
                        .background(
                            TerracottaPrimary.copy(alpha = 0.12f),
                            CircleShape
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Image,
                        contentDescription = "उत्पाद थंबनेल placeholder. Product thumbnail placeholder.",
                        tint = TerracottaPrimary,
                        modifier = Modifier.size(32.dp)
                    )
                }
                Spacer(modifier = Modifier.width(12.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = product.title,
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold,
                        color = DeepIndigoSecondary
                    )
                    Text(
                        text = product.craftCategory.uppercase(),
                        style = MaterialTheme.typography.labelSmall,
                        color = TextEnglishSecondary
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        StatusPill(status = product.status)
                        ShortcodePill(shortcode = product.shortcode)
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))
            GiTagBadge(
                giTagStatus = if (product.passportHash != null) "Verified" else "Pending",
                regNumber = if (product.craftCategory.equals(
                        "handloom",
                        ignoreCase = true
                    )
                ) "39" else null
            )

            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = if (product.price > 0.0) "₹${String.format("%.0f", product.price)} (Fair Wage)"
                else "₹ — (मूल्य लंबित / Price pending)",
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
                color = NeemForestGreen,
                modifier = Modifier.semantics {
                    contentDescription = "उचित मूल्य ${String.format("%.0f", product.price)} रुपये. Fair wage price."
                }
            )

            Spacer(modifier = Modifier.height(10.dp))
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    ProductActionButton(
                        hindi = "पासपोर्ट देखें",
                        english = "Passport",
                        talkBack = "पासपोर्ट देखें. View Digital Heritage Passport.",
                        onClick = onViewPassport,
                        container = DeepIndigoSecondary,
                        modifier = Modifier.weight(1f)
                    )
                    ProductActionButton(
                        hindi = "टैग प्रिंट",
                        english = "Print",
                        talkBack = "थर्मल टैग प्रिंट करें. Print thermal tag.",
                        onClick = onPrintTag,
                        container = NeemForestGreen,
                        modifier = Modifier.weight(1f)
                    )
                }
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    ProductActionButton(
                        hindi = if (product.isDraft) "आगे बढ़ाएं" else "संपादन",
                        english = if (product.isDraft) "Resume" else "Edit",
                        talkBack = "संपादन के लिए स्टूडियो खोलें. Open Authenticity Studio.",
                        onClick = onEditResume,
                        container = TerracottaPrimary,
                        modifier = Modifier.weight(1f)
                    )
                    if (product.isDraft) {
                        ProductActionButton(
                            hindi = "हटाएं",
                            english = "Delete",
                            talkBack = "ड्राफ्ट हटाएं. Delete draft.",
                            onClick = onDelete,
                            container = ErrorRed,
                            modifier = Modifier.weight(1f)
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun ProductActionButton(
    hindi: String,
    english: String,
    talkBack: String,
    onClick: () -> Unit,
    container: Color,
    modifier: Modifier = Modifier
) {
    Surface(
        shape = ShapeMedium,
        color = container,
        modifier = modifier
            .heightIn(min = 56.dp)
            .clickable(onClickLabel = talkBack, onClick = onClick)
            .semantics { contentDescription = "$talkBack $hindi $english." }
    ) {
        Column(
            modifier = Modifier.padding(10.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = hindi,
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White
            )
            Text(
                text = english,
                style = MaterialTheme.typography.labelSmall,
                color = Color.White.copy(alpha = 0.85f)
            )
        }
    }
}

@Composable
private fun StatusPill(status: String) {
    val (bg, border, textColor) = when (status) {
        "DRAFT", "QUEUED", "SYNCING" -> Triple(StatusDraftBg, StatusDraftOrange, Color(0xFF92400E))
        "SYNCED", "ACTIVE", "PUBLISHED", "LIVE" -> Triple(StatusSyncedBg, NeemForestGreen, NeemForestGreen)
        "FAILED", "CONFLICT", "REJECTED" -> Triple(StatusFailedBg, ErrorRed, ErrorRed)
        else -> Triple(StatusReviewBg, DeepIndigoSecondary, DeepIndigoSecondary)
    }
    Surface(
        shape = ShapePill,
        color = bg,
        border = BorderStroke(1.5.dp, border),
        modifier = Modifier.semantics {
            contentDescription = "स्थिति $status. Status $status."
        }
    ) {
        Text(
            text = status,
            style = MaterialTheme.typography.labelMedium,
            fontWeight = FontWeight.Bold,
            color = textColor,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
        )
    }
}

@Composable
private fun ShortcodePill(shortcode: String?) {
    Surface(
        shape = ShapePill,
        color = Color.White,
        border = BorderStroke(1.5.dp, WarmSandBorder),
        modifier = Modifier.semantics {
            contentDescription = "शॉर्टकोड ${shortcode ?: "लंबित"}. Shortcode ${shortcode ?: "pending"}."
        }
    ) {
        Text(
            text = shortcode ?: "कोड लंबित",
            style = MaterialTheme.typography.labelMedium,
            fontWeight = FontWeight.Bold,
            color = DeepIndigoSecondary,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
        )
    }
}
