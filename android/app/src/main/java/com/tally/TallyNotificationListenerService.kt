package com.tally

import android.content.Intent
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification

import com.facebook.react.HeadlessJsTaskService

/**
 * Play-Store-safe alternative to READ_SMS: instead of reading the SMS inbox we
 * read the *notifications* that bank and UPI apps post when a transaction
 * happens ("Paid ₹450 to Swiggy", "₹1,200 debited from A/c ..."). Same data,
 * a permission Google actually allows for finance apps.
 *
 * On a matching notification we hand title+text to the "TallyNotifTask" Headless
 * JS task (HeadlessNotifService) so it is parsed -> categorised -> inserted the
 * same way an SMS is, foreground/background/killed.
 *
 * The user must grant "Notification access" manually (Settings deep-link from
 * the app); there is no runtime-permission dialog for this — it's a system
 * toggle, by design.
 */
class TallyNotificationListenerService : NotificationListenerService() {

  // Bank + UPI apps whose payment notifications we care about. Messaging apps
  // are deliberately excluded — bank *SMS* is already covered by SmsReceiver,
  // and reading chat notifications would be noisy and invasive.
  private val watched = setOf(
    // UPI super-apps
    "com.google.android.apps.nbu.paisa.user", // Google Pay
    "com.phonepe.app",                        // PhonePe
    "net.one97.paytm",                        // Paytm
    "com.dreamplug.androidapp",               // CRED
    "in.org.npci.upiapp",                     // BHIM
    "com.mobikwik_new",                       // MobiKwik
    "com.freecharge.android",                 // FreeCharge
    "in.amazon.mShop.android.shopping",       // Amazon Pay
    "com.airtel.money",                       // Airtel Payments Bank
    // Private & new-age banks
    "com.snapwork.hdfc",                      // HDFC
    "com.csam.icici.bank.imobile",            // ICICI iMobile
    "com.sbi.lotusintouch",                   // SBI YONO
    "com.sbi.SBIFreedomPlus",                 // SBI Anywhere
    "com.axis.mobile",                        // Axis
    "com.msf.kbank.mobile",                   // Kotak
    "com.kotak.mahindra.kotak811",            // Kotak 811
    "com.bankofbaroda.mconnect",              // BoB
    "com.fss.pnbpsp",                         // PNB
    "com.infrasofttech.indianBank",           // Indian Bank
    "com.yesbank.yesmobile",                  // Yes Bank
    "com.rbl.rblbank",                        // RBL Bank
    "com.federalbank.mobbanking",             // Federal Bank
    "com.idfcfirstbank.mobilebanking",        // IDFC First Bank
    "com.sc.digitalbank",                     // Standard Chartered
    "com.jupiter.money",                      // Jupiter Money
    "com.fampay.merchant",                    // FamPay
    "com.niyo.consumer",                      // Niyo
    "com.bajajfinservlending",               // Bajaj Finance
    "com.aubank.mobilebanking"               // AU Small Finance Bank
  )

  override fun onNotificationPosted(sbn: StatusBarNotification?) {
    val pkg = sbn?.packageName ?: return
    if (pkg !in watched) return

    val extras = sbn.notification?.extras ?: return
    val title = extras.getCharSequence("android.title")?.toString().orEmpty()
    // bigText is the expanded body; fall back to the collapsed text line.
    val text = (extras.getCharSequence("android.bigText")
      ?: extras.getCharSequence("android.text"))?.toString().orEmpty()

    val body = listOf(title, text).filter { it.isNotBlank() }.joinToString(". ")
    if (body.isBlank()) return

    val serviceIntent = Intent(this, HeadlessNotifService::class.java).apply {
      putExtra("packageName", pkg)
      putExtra("title", title)
      putExtra("body", body)
      // Real post time, not headless-task-execution time (see SmsReceiver).
      putExtra("postTime", sbn.postTime)
    }
    try {
      startService(serviceIntent)
      HeadlessJsTaskService.acquireWakeLockNow(this)
    } catch (e: Exception) {
      // Background service start can be restricted; the txn is then skipped and
      // picked up by the next history sync. Never crash the listener.
    }
  }

  override fun onNotificationRemoved(sbn: StatusBarNotification?) { /* no-op */ }
}
