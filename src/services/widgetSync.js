// src/services/widgetSync.js
// Bridge between the running app's React state and the home-screen widget,
// which renders via a separate headless JS context (registerWidgetTaskHandler
// in index.js) that has no access to React state or context. The app writes
// a small summary here whenever it changes; the widget task handler reads it.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestWidgetUpdate } from 'react-native-android-widget';
import { BrokeStreakWidget } from '../widgets/BrokeStreakWidget';

export const WIDGET_CACHE_KEY = 'tally_widget_cache_v1';
export const WIDGET_NAME = 'BrokeStreakWidget';

export async function writeWidgetCache({ streak, todayTotal, isPremium }) {
  const payload = { streak, todayTotal, isPremium };
  try {
    await AsyncStorage.setItem(WIDGET_CACHE_KEY, JSON.stringify(payload));
  } catch {
    return; // widget just shows stale data until the next successful write
  }
  requestWidgetUpdate({
    widgetName: WIDGET_NAME,
    renderWidget: () => <BrokeStreakWidget {...payload} />,
  }).catch(() => {});
}

export async function readWidgetCache() {
  try {
    const raw = await AsyncStorage.getItem(WIDGET_CACHE_KEY);
    if (!raw) return { streak: 0, todayTotal: 0, isPremium: false };
    return JSON.parse(raw);
  } catch {
    return { streak: 0, todayTotal: 0, isPremium: false };
  }
}
