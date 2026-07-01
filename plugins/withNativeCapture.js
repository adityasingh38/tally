const { withAndroidManifest } = require('@expo/config-plugins');

// Encodes the hand-edited native additions in android/app/src/main/
// AndroidManifest.xml (SmsReceiver, HeadlessSmsService,
// TallyNotificationListenerService, HeadlessNotifService) so `expo prebuild
// --clean` regenerates them instead of silently dropping the SMS/notification
// capture pipeline. Native Kotlin sources under android/app/src/main/java/
// com/tally/ are untouched by prebuild and don't need a plugin.
function addReceiver(app, receiver) {
  app.receiver = app.receiver || [];
  if (app.receiver.some(r => r.$['android:name'] === receiver.$['android:name'])) return;
  app.receiver.push(receiver);
}

function addService(app, service) {
  app.service = app.service || [];
  if (app.service.some(s => s.$['android:name'] === service.$['android:name'])) return;
  app.service.push(service);
}

function withNativeCapture(config) {
  return withAndroidManifest(config, config => {
    const manifest = config.modResults.manifest;
    const app = manifest.application[0];

    addReceiver(app, {
      $: {
        'android:name': '.SmsReceiver',
        'android:exported': 'true',
        'android:permission': 'android.permission.BROADCAST_SMS',
      },
      'intent-filter': [{
        $: { 'android:priority': '999' },
        action: [{ $: { 'android:name': 'android.provider.Telephony.SMS_RECEIVED' } }],
      }],
    });

    addService(app, {
      $: { 'android:name': '.HeadlessSmsService', 'android:exported': 'false' },
    });

    addService(app, {
      $: {
        'android:name': '.TallyNotificationListenerService',
        'android:exported': 'false',
        'android:label': '@string/app_name',
        'android:permission': 'android.permission.BIND_NOTIFICATION_LISTENER_SERVICE',
      },
      'intent-filter': [{
        action: [{ $: { 'android:name': 'android.service.notification.NotificationListenerService' } }],
      }],
    });

    addService(app, {
      $: { 'android:name': '.HeadlessNotifService', 'android:exported': 'false' },
    });

    return config;
  });
}

module.exports = withNativeCapture;
