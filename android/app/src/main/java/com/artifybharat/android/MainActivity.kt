package com.artifybharat.android

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.navigation.compose.rememberNavController
import com.artifybharat.android.data.preferences.UserPreferencesDataStore
import com.artifybharat.android.navigation.ArtifyBharatNavHost
import com.artifybharat.android.ui.components.OfflineBanner
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
                    val preferences = remember { UserPreferencesDataStore(applicationContext) }
                    val session by preferences.userSessionFlow.collectAsState(initial = null)
                    val navController = rememberNavController()

                    Column(modifier = Modifier.fillMaxSize()) {
                        OfflineBanner(
                            isOffline = false,
                            isOfflineDemo = session?.isOfflineDemo == true
                        )
                        ArtifyBharatNavHost(
                            navController = navController,
                            modifier = Modifier.weight(1f)
                        )
                    }
                }
            }
        }
    }
}
