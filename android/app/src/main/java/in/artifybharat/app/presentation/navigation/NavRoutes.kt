package `in`.artifybharat.app.presentation.navigation

sealed class Screen(val route: String) {
    object VoiceOnboarding : Screen("voice_onboarding")
    object ZeroSkillDashboard : Screen("zero_skill_dashboard")
    object CameraStudio : Screen("camera_studio")
    object VoiceCataloger : Screen("voice_cataloger")
    object DynamicPricing : Screen("dynamic_pricing")
    object HeritagePassport : Screen("heritage_passport")
    object ChannelExport : Screen("channel_export")
}
