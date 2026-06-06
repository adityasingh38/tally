package com.tally

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony

import com.facebook.react.ReactApplication
import com.facebook.react.bridge.Arguments

/**
 * Forwards incoming SMS to JS as an "onSMSReceived" device event.
 * Only delivers while the app process is alive (a React context exists);
 * historical messages are imported separately via react-native-get-sms-android.
 */
class SmsReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return

    val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent) ?: return
    if (messages.isEmpty()) return

    // A single SMS can arrive as multiple parts — concatenate the bodies.
    val address = messages[0].originatingAddress ?: return
    val bodyBuilder = StringBuilder()
    for (msg in messages) {
      bodyBuilder.append(msg.messageBody ?: "")
    }

    val reactHost = (context.applicationContext as? ReactApplication)?.reactHost ?: return
    val reactContext = reactHost.currentReactContext ?: return

    val params = Arguments.createMap().apply {
      putString("originatingAddress", address)
      putString("messageBody", bodyBuilder.toString())
    }
    reactContext.emitDeviceEvent("onSMSReceived", params)
  }
}
