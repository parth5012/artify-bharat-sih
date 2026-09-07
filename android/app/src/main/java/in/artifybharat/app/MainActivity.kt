package `in`.artifybharat.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.navigation.compose.rememberNavController
import `in`.artifybharat.app.presentation.navigation.ArtifyNavGraph
import `in`.artifybharat.app.presentation.theme.ArtifyBharatTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            ArtifyBharatTheme {
                val navController = rememberNavController()
                ArtifyNavGraph(navController = navController)
            }
        }
    }
}
