package com.artifybharat.android

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import androidx.navigation.compose.rememberNavController
import com.artifybharat.android.navigation.ArtifyBharatNavHost
import com.artifybharat.android.ui.theme.ArtifyBharatTheme
import com.artifybharat.android.ui.theme.KhadiBackground

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            ArtifyBharatTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = KhadiBackground
                ) {
                    val navController = rememberNavController()
                    ArtifyBharatNavHost(navController = navController)
                }
            }
        }
    }
}
