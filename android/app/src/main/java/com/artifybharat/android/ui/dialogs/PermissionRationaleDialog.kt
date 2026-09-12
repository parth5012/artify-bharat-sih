package com.artifybharat.android.ui.dialogs

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.artifybharat.android.ui.components.DesiButton
import com.artifybharat.android.ui.components.DesiButtonVariant
import com.artifybharat.android.ui.theme.CardSurface
import com.artifybharat.android.ui.theme.DeepIndigoSecondary
import com.artifybharat.android.ui.theme.ShapeLarge
import com.artifybharat.android.ui.theme.TerracottaPrimary
import com.artifybharat.android.ui.theme.TextEnglishSecondary

enum class PermissionType(
    val icon: ImageVector,
    val hindiTitle: String,
    val englishTitle: String,
    val hindiExplanation: String,
    val englishExplanation: String
) {
    CAMERA(
        icon = Icons.Default.CameraAlt,
        hindiTitle = "कैमरा अनुमति आवश्यक है",
        englishTitle = "Camera Access Required",
        hindiExplanation = "हथकरघा उत्पाद की शुद्धता और प्रगति (WIP) की तस्वीर लेने के लिए कैमरा आवश्यक है। फोटो को सीधे सुरक्षित रखा जाता है।",
        englishExplanation = "Camera is required to capture authentic craft milestones and WIP photos. All files are securely kept in internal app storage."
    ),
    AUDIO(
        icon = Icons.Default.Mic,
        hindiTitle = "माइक / आवाज़ की अनुमति",
        englishTitle = "Microphone Access Required",
        hindiExplanation = "अपनी स्थानीय बोली (भोजपुरी, मैथिली, मारवाड़ी) में उत्पाद का विवरण देने और 'दादी से पूछो' की सलाह के लिए माइक आवश्यक है।",
        englishExplanation = "Microphone is required to record voice cataloging in rural dialects and consult Ask Dadi craft guidance."
    ),
    LOCATION(
        icon = Icons.Default.LocationOn,
        hindiTitle = "स्थान (GPS) की अनुमति",
        englishTitle = "Location (GPS) Required",
        hindiExplanation = "उत्पाद के भौगोलिक उपदर्शन (GI क्लस्टर) और डिजिटल हेरिटेज पासपोर्ट को सत्यापित करने के लिए सटीक स्थान आवश्यक है।",
        englishExplanation = "Precise location is required to anchor cryptographic provenance to your registered artisan craft cluster."
    )
}

@Composable
fun PermissionRationaleDialog(
    permissionType: PermissionType,
    onConfirm: () -> Unit,
    onDismiss: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        confirmButton = {
            DesiButton(
                text = "अनुमति दें (Allow)",
                onClick = onConfirm,
                modifier = Modifier.fillMaxWidth(),
                variant = DesiButtonVariant.PRIMARY
            )
        },
        dismissButton = {
            DesiButton(
                text = "बाद में (Later)",
                onClick = onDismiss,
                modifier = Modifier.fillMaxWidth(),
                variant = DesiButtonVariant.OUTLINE
            )
        },
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .background(TerracottaPrimary.copy(alpha = 0.12f), CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = permissionType.icon,
                        contentDescription = null,
                        tint = TerracottaPrimary,
                        modifier = Modifier.size(24.dp)
                    )
                }
                Spacer(modifier = Modifier.width(12.dp))
                Column {
                    Text(
                        text = permissionType.hindiTitle,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = DeepIndigoSecondary
                    )
                    Text(
                        text = permissionType.englishTitle,
                        style = MaterialTheme.typography.bodySmall,
                        color = TextEnglishSecondary
                    )
                }
            }
        },
        text = {
            Column(modifier = Modifier.padding(vertical = 4.dp)) {
                Text(
                    text = permissionType.hindiExplanation,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurface,
                    lineHeight = 22.sp
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = permissionType.englishExplanation,
                    style = MaterialTheme.typography.bodySmall,
                    color = TextEnglishSecondary,
                    lineHeight = 18.sp
                )
            }
        },
        shape = ShapeLarge,
        containerColor = CardSurface
    )
}
