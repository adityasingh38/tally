// JS wrapper for the native NotificationAccess module (android/.../NotificationAccessModule.kt).
// Lets the app check + request the notification-listener permission — the
// Play-safe alternative to READ_SMS. No-ops gracefully on platforms/builds
// where the native module isn't present.
import { NativeModules, Platform } from 'react-native';

const { NotificationAccess } = NativeModules;

export function notifAccessAvailable() {
  return Platform.OS === 'android' && !!NotificationAccess;
}

// Is Tally currently granted notification access? Returns false if unavailable.
export async function isNotifAccessEnabled() {
  if (!notifAccessAvailable()) return false;
  try {
    return await NotificationAccess.isEnabled();
  } catch {
    return false;
  }
}

// Deep-link the user to the system "Notification access" toggle. They must flip
// it on for Tally manually — there is no runtime dialog for this permission.
export function openNotifAccessSettings() {
  if (!notifAccessAvailable()) return;
  NotificationAccess.openSettings();
}
