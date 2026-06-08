package com.tally

import android.content.Intent

import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.bridge.Arguments
import com.facebook.react.jstasks.HeadlessJsTaskConfig

/**
 * Runs the "TallySmsTask" Headless JS task with the incoming SMS data.
 * allowedInForeground=true so it also works while the app is open.
 */
class HeadlessSmsService : HeadlessJsTaskService() {
  override fun getTaskConfig(intent: Intent?): HeadlessJsTaskConfig? {
    val extras = intent?.extras ?: return null
    return HeadlessJsTaskConfig(
      "TallySmsTask",
      Arguments.fromBundle(extras),
      30000L, // timeout ms (Long required)
      true    // allowed in foreground
    )
  }
}
