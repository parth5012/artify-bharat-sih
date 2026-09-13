package com.artifybharat.android.navigation

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.CurrencyRupee
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.QrCode
import androidx.compose.material.icons.filled.Sync
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.navArgument
import androidx.navigation.navDeepLink
import com.artifybharat.android.features.studio.AuthenticityStudioScreen
import com.artifybharat.android.features.voice.VoiceCatalogScreen
import com.artifybharat.android.ui.components.HeaderBar
import com.artifybharat.android.ui.theme.DeepIndigoSecondary
import com.artifybharat.android.ui.theme.KhadiBackground
import com.artifybharat.android.ui.theme.TerracottaPrimary

data class BottomNavItem(
    val route: String,
    val hindi: String,
    val english: String,
    val icon: ImageVector
)

val BottomNavItems = listOf(
    BottomNavItem(Screen.VoiceCatalog.route, "आवाज़", "Voice", Icons.Default.Mic),
    BottomNavItem(Screen.AuthenticityStudio.route, "स्टूडियो", "Studio", Icons.Default.CameraAlt),
    BottomNavItem(Screen.FairWagePricing.route, "मूल्य", "Price", Icons.Default.CurrencyRupee),
    BottomNavItem(Screen.DigitalPassport.createRoute("sample"), "पासपोर्ट", "Passport", Icons.Default.QrCode),
    BottomNavItem(Screen.OfflineSyncQueue.route, "सिंक", "Queue", Icons.Default.Sync)
)

@Composable
fun ArtifyBharatNavHost(
    navController: NavHostController,
    modifier: Modifier = Modifier
) {
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    Scaffold(
        bottomBar = {
            NavigationBar(
                containerColor = Color.White,
                tonalElevation = 8.dp
            ) {
                BottomNavItems.forEach { item ->
                    val selected = currentRoute?.startsWith(item.route.substringBefore("?")) == true
                    NavigationBarItem(
                        selected = selected,
                        onClick = {
                            navController.navigate(item.route) {
                                popUpTo(Screen.VoiceCatalog.route) { saveState = true }
                                launchSingleTop = true
                                restoreState = true
                            }
                        },
                        icon = {
                            Icon(
                                imageVector = item.icon,
                                contentDescription = item.english
                            )
                        },
                        label = {
                            Text(text = item.hindi, style = MaterialTheme.typography.labelSmall)
                        },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = TerracottaPrimary,
                            selectedTextColor = TerracottaPrimary,
                            unselectedIconColor = DeepIndigoSecondary.copy(alpha = 0.6f),
                            unselectedTextColor = DeepIndigoSecondary.copy(alpha = 0.6f),
                            indicatorColor = Color(0xFFFFEFE9)
                        )
                    )
                }
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = Screen.VoiceCatalog.route,
            modifier = modifier.padding(innerPadding)
        ) {
            composable(Screen.VoiceCatalog.route) {
                VoiceCatalogScreen(navController = navController)
            }
            composable(
                route = Screen.AuthenticityStudio.route,
                arguments = listOf(navArgument("draftId") {
                    type = NavType.StringType
                    defaultValue = "draft-demo-01"
                })
            ) { backStackEntry ->
                val draftId = backStackEntry.arguments?.getString("draftId") ?: "draft-demo-01"
                AuthenticityStudioScreen(navController = navController, draftId = draftId)
            }
            composable(Screen.FairWagePricing.route) {
                ScreenPlaceholder(
                    screen = Screen.FairWagePricing,
                    navController = navController
                )
            }
            composable(
                route = Screen.DigitalPassport.route,
                arguments = listOf(navArgument("productId") {
                    type = NavType.StringType
                    defaultValue = "sample"
                }),
                deepLinks = listOf(
                    navDeepLink { uriPattern = "https://artifybharat.gov.in/verify/{productId}" }
                )
            ) {
                ScreenPlaceholder(
                    screen = Screen.DigitalPassport,
                    navController = navController
                )
            }
            composable(
                route = Screen.ThermalPrint.route,
                arguments = listOf(navArgument("shortcode") {
                    type = NavType.StringType
                    defaultValue = "A7X-9B2"
                })
            ) {
                ScreenPlaceholder(
                    screen = Screen.ThermalPrint,
                    navController = navController
                )
            }
            composable(Screen.OfflineSyncQueue.route) {
                ScreenPlaceholder(
                    screen = Screen.OfflineSyncQueue,
                    navController = navController
                )
            }
            composable(Screen.ShgCoordinatorHub.route) {
                ScreenPlaceholder(
                    screen = Screen.ShgCoordinatorHub,
                    navController = navController
                )
            }
            composable(Screen.DirectMarketplace.route) {
                ScreenPlaceholder(
                    screen = Screen.DirectMarketplace,
                    navController = navController
                )
            }
        }
    }
}

@Composable
fun ScreenPlaceholder(
    screen: Screen,
    navController: NavHostController
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(KhadiBackground)
    ) {
        HeaderBar(
            hindiTitle = screen.hindiTitle,
            englishTitle = screen.englishTitle,
            onBackClick = if (navController.previousBackStackEntry != null) {
                { navController.popBackStack() }
            } else null,
            pendingSyncCount = 0
        )
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            contentAlignment = Alignment.Center
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    text = screen.hindiTitle,
                    style = MaterialTheme.typography.headlineMedium,
                    color = DeepIndigoSecondary
                )
                Text(
                    text = screen.englishTitle,
                    style = MaterialTheme.typography.bodyLarge,
                    color = TerracottaPrimary
                )
            }
        }
    }
}
