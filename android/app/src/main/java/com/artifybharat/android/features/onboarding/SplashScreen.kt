package com.artifybharat.android.features.onboarding

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Security
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import com.artifybharat.android.data.preferences.UserPreferencesDataStore
import com.artifybharat.android.navigation.Screen
import com.artifybharat.android.ui.components.BilingualText
import com.artifybharat.android.ui.theme.DeepIndigoSecondary
import com.artifybharat.android.ui.theme.KhadiBackground
import com.artifybharat.android.ui.theme.TerracottaPrimary
import kotlinx.coroutines.delay

@Composable
fun SplashScreen(
    navController: NavController,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val preferences = UserPreferencesDataStore(context)
    val session by preferences.userSessionFlow.collectAsState(initial = null)

    LaunchedEffect(session) {
        val currentSession = session ?: return@LaunchedEffect
        // Small delay for smooth brand splash display
        delay(600)
        if (currentSession.isOnboarded) {
            navController.navigate(Screen.VoiceCatalog.route) {
                popUpTo(Screen.Splash.route) { inclusive = true }
                launchSingleTop = true
            }
        } else {
            navController.navigate(Screen.Onboarding.route) {
                popUpTo(Screen.Splash.route) { inclusive = true }
                launchSingleTop = true
            }
        }
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(KhadiBackground),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
            modifier = Modifier.padding(24.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(96.dp)
                    .background(TerracottaPrimary.copy(alpha = 0.12f), CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Security,
                    contentDescription = "ArtifyBharat Emblem",
                    tint = TerracottaPrimary,
                    modifier = Modifier.size(54.dp)
                )
            }

            Spacer(modifier = Modifier.height(24.dp))

            BilingualText(
                hindi = "आर्टिफ़ाई भारत",
                english = "ArtifyBharat • MoSJE SIH 26090",
                primaryStyle = MaterialTheme.typography.headlineMedium.copy(
                    fontWeight = FontWeight.Bold,
                    color = TerracottaPrimary
                ),
                secondaryStyle = MaterialTheme.typography.bodyMedium.copy(
                    color = DeepIndigoSecondary
                ),
                horizontalAlignment = Alignment.CenterHorizontally
            )

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = "डिजिटल विरासत गेटकीपर एवं व्यावसायिक प्रबंधक",
                style = MaterialTheme.typography.bodySmall.copy(
                    color = DeepIndigoSecondary.copy(alpha = 0.8f),
                    fontSize = 13.sp
                )
            )

            Spacer(modifier = Modifier.height(48.dp))

            CircularProgressIndicator(
                color = TerracottaPrimary,
                modifier = Modifier.size(32.dp),
                strokeWidth = 3.dp
            )
        }
    }
}
