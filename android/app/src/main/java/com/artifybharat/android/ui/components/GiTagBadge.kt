package com.artifybharat.android.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Verified
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
import com.artifybharat.android.ui.theme.NeemForestGreen
import com.artifybharat.android.ui.theme.ShapePill

@Composable
fun GiTagBadge(
    giTagStatus: String,
    modifier: Modifier = Modifier,
    regNumber: String? = null
) {
    Surface(
        modifier = modifier,
        shape = ShapePill,
        color = Color(0xFFF1F8F4),
        border = BorderStroke(1.5.dp, NeemForestGreen)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.Default.Verified,
                contentDescription = "GI Verified",
                tint = NeemForestGreen,
                modifier = Modifier.size(16.dp)
            )
            Spacer(modifier = Modifier.width(6.dp))
            val label = if (regNumber != null) "GI Tag: $giTagStatus (#$regNumber)" else "GI Tag: $giTagStatus"
            Text(
                text = label,
                style = MaterialTheme.typography.labelMedium,
                color = NeemForestGreen,
                fontWeight = FontWeight.Bold
            )
        }
    }
}
