package com.artifybharat.android.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.artifybharat.android.ui.theme.DeepIndigoSecondary
import com.artifybharat.android.ui.theme.ShapeMedium
import com.artifybharat.android.ui.theme.TerracottaPrimary

enum class DesiButtonVariant {
    PRIMARY,
    SECONDARY,
    OUTLINE
}

@Composable
fun DesiButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    variant: DesiButtonVariant = DesiButtonVariant.PRIMARY,
    enabled: Boolean = true,
    subtext: String? = null
) {
    val buttonModifier = modifier
        .heightIn(min = 56.dp)
        .defaultMinSize(minHeight = 56.dp)

    when (variant) {
        DesiButtonVariant.PRIMARY -> {
            Button(
                onClick = onClick,
                modifier = buttonModifier,
                enabled = enabled,
                shape = ShapeMedium,
                colors = ButtonDefaults.buttonColors(
                    containerColor = TerracottaPrimary,
                    contentColor = Color.White
                )
            ) {
                BilingualButtonContent(text = text, subtext = subtext, textColor = Color.White)
            }
        }
        DesiButtonVariant.SECONDARY, DesiButtonVariant.OUTLINE -> {
            OutlinedButton(
                onClick = onClick,
                modifier = buttonModifier,
                enabled = enabled,
                shape = ShapeMedium,
                border = BorderStroke(2.dp, DeepIndigoSecondary),
                colors = ButtonDefaults.outlinedButtonColors(
                    contentColor = DeepIndigoSecondary
                )
            ) {
                BilingualButtonContent(text = text, subtext = subtext, textColor = DeepIndigoSecondary)
            }
        }
    }
}

@Composable
private fun BilingualButtonContent(
    text: String,
    subtext: String?,
    textColor: Color
) {
    if (subtext != null) {
        androidx.compose.foundation.layout.Column(
            horizontalAlignment = androidx.compose.ui.Alignment.CenterHorizontally
        ) {
            Text(
                text = text,
                style = MaterialTheme.typography.titleMedium,
                color = textColor,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = subtext,
                style = MaterialTheme.typography.labelSmall,
                color = textColor.copy(alpha = 0.8f)
            )
        }
    } else {
        Text(
            text = text,
            style = MaterialTheme.typography.titleMedium,
            color = textColor,
            fontWeight = FontWeight.Bold
        )
    }
}
