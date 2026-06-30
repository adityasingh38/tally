package com.tally

import android.content.Intent
import android.provider.Settings

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * JS bridge for the notification-listener permission. There is no runtime dialog
 * for notification access — it's a system settings toggle — so we expose:
 *   isEnabled() -> Boolean   (is Tally currently granted access?)
 *   openSettings()           (deep-link the user to the toggle screen)
 */
class NotificationAccessModule(
  private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "NotificationAccess"

  @ReactMethod
  fun isEnabled(promise: Promise) {
    try {
      val enabledList = Settings.Secure.getString(
        reactContext.contentResolver,
        "enabled_notification_listeners"
      ) ?: ""
      val granted = enabledList.split(":").any { it.contains(reactContext.packageName) }
      promise.resolve(granted)
    } catch (e: Exception) {
      promise.reject("ERR_NOTIF_ACCESS", e)
    }
  }

  @ReactMethod
  fun openSettings() {
    val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
    reactContext.startActivity(intent)
  }
}
