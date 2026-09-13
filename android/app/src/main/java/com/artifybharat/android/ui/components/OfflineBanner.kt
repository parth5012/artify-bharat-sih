package com.artifybharat.android.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CloudOff
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun OfflineBanner(
    isOffline: Boolean,
    isOfflineDemo: Boolean = false,
    message: String? = null,
    modifier: Modifier = Modifier
) {
    AnimatedVisibility(
        visible = isOffline || isOfflineDemo,
        modifier = modifier
    ) {
        val bgColor = if (isOfflineDemo) Color(0xFFFEF3C7) else Color(0xFFFFEDD5)
        val contentColor = if (isOfflineDemo) Color(0xFF92400E) else Color(0xFF9A3412)
        val icon = if (isOfflineDemo) Icons.Default.Warning else Icons.Default.CloudOff
        val text = when {
            !message.isNullOrBlank() -> message
            isOfflineDemo -> "⚠️ ऑफ़लाइन डेमो मोड (Demo Mode) • डेटा स्थानीय रूप से सहेजा जा रहा है"
            else -> "⚠️ सर्वर डिस्कनेक्ट है (Backend Offline) • परिवर्तन स्थानीय कतार में सुरक्षित हैं"
        }

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(bgColor)
                .padding(horizontal = 14.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = contentColor,
                modifier = Modifier.size(16.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = text,
                color = contentColor,
                style = MaterialTheme.typography.labelSmall.copy(
                    fontSize = 11.5.sp,
                    fontWeight = FontWeight.Medium
                )
            )
        }
    }
}
