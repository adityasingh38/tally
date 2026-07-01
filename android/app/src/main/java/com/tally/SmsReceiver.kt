package com.tally

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony

import com.facebook.react.HeadlessJsTaskService

/**
 * On incoming SMS, hands the message to a Headless JS task so it is processed
 * the same way (parse -> categorise -> insert) whether the app is foreground,
 * background, or killed. The JS task is "TallySmsTask" (registered in index.js).
 */
class SmsReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return

    val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent) ?: return
    if (messages.isEmpty()) return

    val address = messages[0].originatingAddress ?: return
    // Real SMS timestamp, not the time the headless JS task happens to run —
    // Android can defer headless task execution by minutes under Doze/battery
    // restrictions, which was making txn_date drift from the actual send time.
    val timestampMillis = messages[0].timestampMillis
    val body = StringBuilder()
    for (msg in messages) body.append(msg.messageBody ?: "")

    val serviceIntent = Intent(context, HeadlessSmsService::class.java).apply {
      putExtra("originatingAddress", address)
      putExtra("messageBody", body.toString())
      putExtra("timestampMillis", timestampMillis)
    }
    try {
      context.startService(serviceIntent)
      HeadlessJsTaskService.acquireWakeLockNow(context)
    } catch (e: Exception) {
      // Background service start can be restricted on newer Android; the SMS is
      // skipped in that case and will be picked up by the next history sync.
    }
  }
}
