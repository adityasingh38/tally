package com.tally

import android.content.Intent

import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.bridge.Arguments
import com.facebook.react.jstasks.HeadlessJsTaskConfig

/**
 * Runs the "TallyNotifTask" Headless JS task with the captured notification
 * (packageName / title / body). Mirror of HeadlessSmsService.
 */
class HeadlessNotifService : HeadlessJsTaskService() {
  override fun getTaskConfig(intent: Intent?): HeadlessJsTaskConfig? {
    val extras = intent?.extras ?: return null
    return HeadlessJsTaskConfig(
      "TallyNotifTask",
      Arguments.fromBundle(extras),
      30000L, // timeout ms
      true    // allowed in foreground
    )
  }
}
