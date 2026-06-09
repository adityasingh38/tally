// src/tally/TallyTabBar.js — custom bottom tab bar (receipt language).
// Used via Tab.Navigator's `tabBar` prop.
import React from 'react';
import { View, Text, Pressable } from 'react-native';
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
  if (name === 'Dashboard') return <View style={{ width: 17, height: 17, borderRadius: 5, borderWidth: 2, borderColor: color }} />;
  if (name === 'Transactions') return (
    <View style={{ gap: 3 }}>{[0, 1, 2].map((i) => <View key={i} style={{ width: 17, height: 2.4, borderRadius: 2, backgroundColor: color }} />)}</View>
  );
  if (name === 'Insights') return <TallyMark size={18} color={on ? accent : color} />;
  if (name === 'Budget') return <View style={{ width: 17, height: 17, borderRadius: 9, borderWidth: 2, borderColor: color }} />;
  return <View style={{ width: 17, height: 17, borderRadius: 9, backgroundColor: color }} />;
}

export default function TallyTabBar({ state, navigation }) {
  const { T, accent } = useTally();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flexDirection: 'row', paddingTop: 12, paddingBottom: Math.max(insets.bottom, 12),
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
            style={{ flex: 1, alignItems: 'center', gap: 5 }}>
            <Glyph name={route.name} color={color} accent={accent} on={on} />
            <Text style={{ fontFamily: FONTS.mono, fontSize: 9, letterSpacing: 0.7, textTransform: 'uppercase', color }}>
              {LABELS[route.name] || route.name.toLowerCase()}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
