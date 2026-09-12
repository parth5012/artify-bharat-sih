package com.artifybharat.android.ui.components

import androidx.compose.foundation.layout.Column
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import com.artifybharat.android.ui.theme.TextEnglishSecondary

@Composable
fun BilingualText(
    hindi: String,
    english: String,
    modifier: Modifier = Modifier,
    primaryStyle: TextStyle = MaterialTheme.typography.titleMedium,
    secondaryStyle: TextStyle = MaterialTheme.typography.bodySmall,
    horizontalAlignment: Alignment.Horizontal = Alignment.Start
) {
    Column(
        modifier = modifier,
        horizontalAlignment = horizontalAlignment
    ) {
        Text(
            text = hindi,
            style = primaryStyle,
            color = MaterialTheme.colorScheme.onSurface,
            fontWeight = FontWeight.SemiBold
        )
        Text(
            text = english,
            style = secondaryStyle,
            color = TextEnglishSecondary,
            fontWeight = FontWeight.Normal
        )
    }
}
