package `in`.artifybharat.app.presentation.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import `in`.artifybharat.app.presentation.screens.*

@Composable
fun ArtifyNavGraph(navController: NavHostController) {
    NavHost(
        navController = navController,
        startDestination = Screen.VoiceOnboarding.route
    ) {
        composable(Screen.VoiceOnboarding.route) {
            Page1VoiceOnboardingScreen(
                onNavigateToDashboard = {
                    navController.navigate(Screen.ZeroSkillDashboard.route) {
                        popUpTo(Screen.VoiceOnboarding.route) { inclusive = true }
                    }
                }
            )
        }

        composable(Screen.ZeroSkillDashboard.route) {
            Page2ZeroSkillDashboardScreen(
                onNavigateToCameraStudio = {
                    navController.navigate(Screen.CameraStudio.route)
                },
                onNavigateToInventory = {
                    navController.navigate(Screen.MyInventory.route)
                },
                onNavigateToAskDadi = {
                    navController.navigate(Screen.AskDadi.route)
                }
            )
        }

        composable(Screen.CameraStudio.route) {
            Page3CameraStudioScreen(
                onNavigateToVoiceCataloger = {
                    navController.navigate(Screen.VoiceCataloger.route)
                }
            )
        }

        composable(Screen.VoiceCataloger.route) {
            Page4VoiceCatalogerScreen(
                onNavigateToDynamicPricing = {
                    navController.navigate(Screen.DynamicPricing.route)
                }
            )
        }

        composable(Screen.DynamicPricing.route) {
            Page5DynamicPricingScreen(
                onNavigateToHeritagePassport = {
                    navController.navigate(Screen.HeritagePassport.route)
                }
            )
        }

        composable(Screen.HeritagePassport.route) {
            Page6HeritagePassportScreen(
                onNavigateToChannelExport = {
                    navController.navigate(Screen.ChannelExport.route)
                }
            )
        }

        composable(Screen.ChannelExport.route) {
            Page7ChannelExportScreen(
                onNavigateToHome = {
                    navController.navigate(Screen.ZeroSkillDashboard.route) {
                        popUpTo(Screen.ZeroSkillDashboard.route) { inclusive = true }
                    }
                }
            )
        }

        composable(Screen.AskDadi.route) {
            Page8AskDadiScreen(
                onNavigateBack = { navController.popBackStack() },
                onNavigateToCamera = { navController.navigate(Screen.CameraStudio.route) },
                onNavigateToPricing = { navController.navigate(Screen.DynamicPricing.route) }
            )
        }

        composable(Screen.MyInventory.route) {
            Page9MyInventoryScreen(
                onNavigateBack = { navController.popBackStack() },
                onNavigateToNewProduct = { navController.navigate(Screen.CameraStudio.route) }
            )
        }
    }
}
