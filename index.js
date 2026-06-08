import { registerRootComponent } from 'expo';
import notifee from '@notifee/react-native';

import App from './App';

// Required by notifee so background notification events don't warn/crash.
// Tap routing for background/killed taps is handled on foreground + initial.
notifee.onBackgroundEvent(async () => {});

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
