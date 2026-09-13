package com.artifybharat.android.hardware.permissions

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import androidx.core.content.ContextCompat
import com.artifybharat.android.ui.dialogs.PermissionRationaleDialog
import com.artifybharat.android.ui.dialogs.PermissionType

object PermissionChecker {
    fun hasPermission(context: Context, permission: String): Boolean {
        return ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED
    }

    fun hasAudioPermission(context: Context): Boolean {
        return hasPermission(context, Manifest.permission.RECORD_AUDIO)
    }

    fun hasCameraPermission(context: Context): Boolean {
        return hasPermission(context, Manifest.permission.CAMERA)
    }

    fun hasLocationPermission(context: Context): Boolean {
        return hasPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) ||
                hasPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION)
    }

    fun hasBluetoothPermission(context: Context): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            hasPermission(context, Manifest.permission.BLUETOOTH_CONNECT) &&
                    hasPermission(context, Manifest.permission.BLUETOOTH_SCAN)
        } else {
            hasPermission(context, Manifest.permission.BLUETOOTH)
        }
    }
}

class PermissionLauncherState(
    val launchRequest: () -> Unit,
    val isGranted: Boolean,
    val isPermanentlyDenied: Boolean
)

@Composable
fun rememberPermissionLauncherFlow(
    permission: String,
    permissionType: PermissionType,
    onPermissionGranted: () -> Unit,
    onPermissionDenied: (() -> Unit)? = null
): PermissionLauncherState {
    val context = LocalContext.current
    var isGranted by remember { mutableStateOf(PermissionChecker.hasPermission(context, permission)) }
    var showRationale by remember { mutableStateOf(false) }
    var isPermanentlyDenied by remember { mutableStateOf(false) }

    val activity = context as? android.app.Activity
    val launcher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { granted ->
        isGranted = granted
        if (granted) {
            onPermissionGranted()
        } else {
            val canShowRationale = activity?.let {
                androidx.core.app.ActivityCompat.shouldShowRequestPermissionRationale(it, permission)
            } ?: false
            isPermanentlyDenied = !canShowRationale
            onPermissionDenied?.invoke()
        }
    }

    if (showRationale) {
        PermissionRationaleDialog(
            permissionType = permissionType,
            isPermanentlyDenied = isPermanentlyDenied,
            onConfirm = {
                showRationale = false
                launcher.launch(permission)
            },
            onDismiss = {
                showRationale = false
                onPermissionDenied?.invoke()
            }
        )
    }

    val launchRequest = {
        if (PermissionChecker.hasPermission(context, permission)) {
            isGranted = true
            onPermissionGranted()
        } else {
            showRationale = true
        }
    }

    return PermissionLauncherState(
        launchRequest = launchRequest,
        isGranted = isGranted,
        isPermanentlyDenied = isPermanentlyDenied
    )
}
