// src/widgets/BrokeStreakWidget.js
// Home-screen widget JSX — rendered outside the app's React tree (native
// RemoteViews, not a real screen), so it can't import theme.js/ui.js or
// anything that touches the DOM/RN view hierarchy. Kept deliberately plain.
import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import { fmtINR } from '../tally/theme';

const BG = '#15160E';
const ACCENT = '#D4FF2E';
const TEXT = '#F2F3EC';
const DIM = '#9DA08F';

export function BrokeStreakWidget({ streak, todayTotal, isPremium }) {
  if (!isPremium) {
    return (
      <FlexWidget
        clickAction="OPEN_APP"
        style={{ height: 'match_parent', width: 'match_parent', backgroundColor: BG,
          borderRadius: 20, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <TextWidget text="TALLY PRO" style={{ color: ACCENT, fontSize: 11, fontWeight: '700', letterSpacing: 2 }} />
        <TextWidget text="unlock the broke-streak widget" style={{ color: DIM, fontSize: 12, textAlign: 'center', marginTop: 6 }} />
      </FlexWidget>
    );
  }

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{ height: 'match_parent', width: 'match_parent', backgroundColor: BG,
        borderRadius: 20, padding: 16, justifyContent: 'space-between' }}>
      <TextWidget text="BROKE STREAK" style={{ color: DIM, fontSize: 10, fontWeight: '700', letterSpacing: 1.5 }} />
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
        <TextWidget text={String(streak)} style={{ color: ACCENT, fontSize: 40, fontWeight: '800' }} />
        <TextWidget text={streak === 1 ? ' day' : ' days'} style={{ color: TEXT, fontSize: 14, marginBottom: 6 }} />
      </FlexWidget>
      <TextWidget text={`today: ${fmtINR(todayTotal)}`} style={{ color: DIM, fontSize: 12 }} />
    </FlexWidget>
  );
}
