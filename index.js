import { registerRootComponent } from 'expo';
import { AppRegistry } from 'react-native';
import notifee from '@notifee/react-native';

import App from './App';

// Required by notifee so background notification events don't warn/crash.
// Tap routing for background/killed taps is handled on foreground + initial.
notifee.onBackgroundEvent(async () => {});

// Background SMS processing. Started by the native HeadlessSmsService on each
// incoming SMS; runs even when the app is closed. require() keeps the import
// lazy so the headless context only pulls in what it needs.
AppRegistry.registerHeadlessTask('TallySmsTask', () => async (taskData) => {
  const { handleHeadlessSms } = require('./src/services/smsSync');
  await handleHeadlessSms(taskData || {});
});

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
