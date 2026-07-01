import { registerRootComponent } from 'expo';
import { AppRegistry } from 'react-native';
import notifee, { EventType } from '@notifee/react-native';
import { registerWidgetTaskHandler } from 'react-native-android-widget';

import App from './App';
import { widgetTaskHandler } from './src/widgets/widget-task-handler';

// Home-screen widget (Tally Pro perk). Runs headless whenever Android needs
// to (re)draw it — see src/widgets/widget-task-handler.js.
registerWidgetTaskHandler(widgetTaskHandler);

// Background tap → navigate when app resumes. routeFromPressAction guards
// navigationRef.isReady() so it's safe to call from the background handler.
notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type === EventType.PRESS) {
    const { routeFromPressAction } = require('./src/tally/TallyNavigation');
    routeFromPressAction(detail.pressAction?.id);
  }
});

// Background SMS processing. Started by the native HeadlessSmsService on each
// incoming SMS; runs even when the app is closed. require() keeps the import
// lazy so the headless context only pulls in what it needs.
AppRegistry.registerHeadlessTask('TallySmsTask', () => async (taskData) => {
  const { handleHeadlessSms } = require('./src/services/smsSync');
  await handleHeadlessSms(taskData || {});
});

// Background notification processing (Play-safe alternative to READ_SMS).
// Started by the native HeadlessNotifService when a watched bank/UPI app posts
// a transaction notification. Same parse -> categorise -> insert pipeline.
AppRegistry.registerHeadlessTask('TallyNotifTask', () => async (taskData) => {
  const { handleHeadlessNotification } = require('./src/services/smsSync');
  await handleHeadlessNotification(taskData || {});
});

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
