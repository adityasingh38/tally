// src/tally/TallyTabBar.js — custom bottom tab bar (receipt language).
// Used via Tab.Navigator's `tabBar` prop.
import React from 'react';
import { View, Text, Pressable } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTally } from './TallyContext';
import { FONTS } from './theme';
import TallyMark from './TallyMark';

// route name → { label, glyph }
const LABELS = {
  Dashboard: 'home', Transactions: 'feed', Insights: 'damage', Budget: 'budget', Settings: 'you',
};

function Glyph({ name, color, accent, on }) {
  const size = 24;
  if (name === 'Dashboard') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M3 10.5L12 3l9 7.5V20a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 20v-9.5z" />
        <Path d="M9 21v-7h6v7" />
      </Svg>
    );
  }
  if (name === 'Transactions') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M4 2v20l2.5-1.5L9 22l2.5-1.5L14 22l2.5-1.5L19 22l2-1.5V2l-2 1.5L16.5 2 14 3.5 11.5 2 9 3.5 6.5 2 4 3.5z" />
        <Path d="M8 7h8" />
        <Path d="M8 11h8" />
        <Path d="M8 15h5" />
      </Svg>
    );
  }
  if (name === 'Insights') {
    return <TallyMark size={24} color={on ? accent : color} />;
  }
  if (name === 'Budget') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
        <Path d="M22 12A10 10 0 0 0 12 2v10z" />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <Circle cx={12} cy={7} r={4} />
    </Svg>
  );
}

export default function TallyTabBar({ state, navigation }) {
  const { T, accent } = useTally();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flexDirection: 'row', paddingTop: 10, paddingBottom: Math.max(insets.bottom, 10),
      backgroundColor: T.bg, borderTopWidth: 1, borderTopColor: T.line }}>
      {state.routes.map((route, index) => {
        const on = state.index === index;
        const color = on ? T.text : T.faint;
        const onPress = () => {
          const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!on && !e.defaultPrevented) {
            try { Haptics.selectionAsync(); } catch (err) {}
            navigation.navigate(route.name);
          }
        };
        return (
          <Pressable key={route.key} onPress={onPress}
            style={{ flex: 1, alignItems: 'center', gap: 6, paddingVertical: 4 }}>
            <View style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}>
              <Glyph name={route.name} color={color} accent={accent} on={on} />
            </View>
            <Text style={{ fontFamily: FONTS.mono, fontSize: 9.5, letterSpacing: 0.8, textTransform: 'uppercase', color }}>
              {LABELS[route.name] || route.name.toLowerCase()}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
