package com.artifybharat.android.ui.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Shapes
import androidx.compose.ui.unit.dp

val ShapeSmall = RoundedCornerShape(4.dp)
val ShapeMedium = RoundedCornerShape(8.dp)     // Buttons, input containers
val ShapeLarge = RoundedCornerShape(16.dp)     // Product cards, dialogs
val ShapePill = RoundedCornerShape(9999.dp)    // Voice CTA, trust badges

val ArtifyShapes = Shapes(
    small = ShapeSmall,
    medium = ShapeMedium,
    large = ShapeLarge
)
