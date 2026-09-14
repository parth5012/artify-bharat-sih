package com.artifybharat.android.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.artifybharat.android.ui.theme.DeepIndigoSecondary
import com.artifybharat.android.ui.theme.NeemForestGreen
import com.artifybharat.android.ui.theme.ShapeMedium

@Composable
fun QuorumSeal(
    votesReceived: Int,
    quorumRequired: Int = 3,
    consensusLevel: String = "High",
    isVerified: Boolean = true,
    modifier: Modifier = Modifier
) {
    val borderColor = if (isVerified) NeemForestGreen else DeepIndigoSecondary
    val bgColor = if (isVerified) Color(0xFFF1F8F4) else Color(0xFFF0F4FA)

    Surface(
        modifier = modifier,
        shape = ShapeMedium,
        color = bgColor,
        border = BorderStroke(1.5.dp, borderColor)
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .background(borderColor, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Shield,
                    contentDescription = "Zero-Trust Peer Jury",
                    tint = Color.White,
                    modifier = Modifier.size(20.dp)
                )
            }
            Spacer(modifier = Modifier.width(10.dp))
            Column {
                Text(
                    text = "$quorumRequired-Artisan Zero-Trust Jury ($votesReceived/$quorumRequired Quorum)",
                    style = MaterialTheme.typography.labelLarge,
                    color = DeepIndigoSecondary,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "Consensus: $consensusLevel • MoSJE Cryptographic Quorum",
                    style = MaterialTheme.typography.bodySmall,
                    color = DeepIndigoSecondary.copy(alpha = 0.75f)
                )
            }
        }
    }
}
