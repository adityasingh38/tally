// App.js — root. Loads fonts, then renders Tally.
// If you already have an App.js, just merge the font-loading + <TallyNavigation/>.
import 'react-native-gesture-handler';
import React, { useCallback, useState, useEffect } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { AuthProvider } from './src/hooks/useAuth';

import {
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from '@expo-google-fonts/bricolage-grotesque';
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import {
  SpaceMono_400Regular,
  SpaceMono_700Bold,
} from '@expo-google-fonts/space-mono';

import TallyNavigation from './src/tally/TallyNavigation';
import AnimatedSplash from './src/tally/AnimatedSplash';
import notifee, { EventType } from '@notifee/react-native';
import { setupNotificationChannel } from './src/services/budgetAlerts';
import { setupWeeklyDigestChannel, scheduleMonthEndSummary } from './src/services/weeklyDigest';
import { routeFromPressAction } from './src/tally/TallyNavigation';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { initCrashReporting } from './src/services/crashReporting';

SplashScreen.preventAutoHideAsync().catch(() => {});
initCrashReporting();

export default function App() {
  const [introDone, setIntroDone] = useState(false);

  useEffect(() => {
    setupNotificationChannel().catch(() => {});
    setupWeeklyDigestChannel().catch(() => {});
    scheduleMonthEndSummary().catch(() => {});
    // Foreground notification tap → navigate immediately
    return notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.PRESS) {
        routeFromPressAction(detail.pressAction?.id);
      }
    });
  }, []);
  const [loaded] = useFonts({
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    SpaceMono_400Regular,
    SpaceMono_700Bold,
  });

  const onReady = useCallback(() => {
    if (loaded) SplashScreen.hideAsync().catch(() => {});
  }, [loaded]);

  if (!loaded) return <View style={{ flex: 1, backgroundColor: '#0E0F0C' }} />;

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider onLayout={onReady}>
          <StatusBar style="light" />
          <AuthProvider>
            <TallyNavigation />
          </AuthProvider>
          {!introDone && <AnimatedSplash onDone={() => setIntroDone(true)} />}
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
