import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import notifee, { EventType } from '@notifee/react-native';
import Navigation, { routeFromPressAction } from './src/navigation';
import { AuthProvider } from './src/hooks/useAuth';
import { setupNotificationChannel } from './src/services/budgetAlerts';

export default function App() {
  useEffect(() => {
    setupNotificationChannel();

    // App opened from a notification while killed.
    notifee.getInitialNotification().then(initial => {
      if (initial?.pressAction) routeFromPressAction(initial.pressAction.id);
    });

    // App in foreground/background when the notification is tapped.
    const unsub = notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.PRESS) routeFromPressAction(detail.pressAction?.id);
    });
    return unsub;
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <AuthProvider>
        <Navigation />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
