package com.artifybharat.android.ui.theme

import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private fun Context.findActivity(): Activity? {
    var currentContext = this
    while (currentContext is ContextWrapper) {
        if (currentContext is Activity) {
            return currentContext
        }
        currentContext = currentContext.baseContext
    }
    return null
}

private val LightColorScheme = lightColorScheme(
    primary = TerracottaPrimary,
    onPrimary = CardSurface,
    primaryContainer = TerracottaAccent,
    onPrimaryContainer = CardSurface,
    secondary = DeepIndigoSecondary,
    onSecondary = CardSurface,
    secondaryContainer = IndigoContainer,
    onSecondaryContainer = DeepIndigoSecondary,
    tertiary = MarigoldYellow,
    onTertiary = DeepIndigoSecondary,
    background = KhadiBackground,
    onBackground = OnSurfaceText,
    surface = KhadiSurface,
    onSurface = OnSurfaceText,
    surfaceVariant = CardSurfaceVariant,
    onSurfaceVariant = OnSurfaceVariant,
    outline = WarmSandBorder,
    error = ErrorRed,
    onError = CardSurface
)

@Composable
fun ArtifyBharatTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    // We enforce the Khadi & Terracotta warm light theme for authentic Indian craft visual parity
    val colorScheme = LightColorScheme

    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val activity = view.context.findActivity()
            activity?.window?.let { window ->
                window.statusBarColor = KhadiBackground.toArgb()
                WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = true
            }
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = ArtifyTypography,
        shapes = ArtifyShapes,
        content = content
    )
}
