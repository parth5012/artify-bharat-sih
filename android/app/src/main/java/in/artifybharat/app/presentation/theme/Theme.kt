package `in`.artifybharat.app.presentation.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val LightColorScheme = lightColorScheme(
    primary = TerracottaPrimary,
    onPrimary = Color.White,
    secondary = OchreSecondary,
    onSecondary = Color.White,
    background = SilkCream,
    onBackground = DeepCharcoal,
    surface = Color.White,
    onSurface = DeepCharcoal
)

@Composable
fun ArtifyBharatTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = LightColorScheme,
        typography = Typography,
        content = content
    )
}
