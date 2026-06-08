// src/tally/screens/HomeScreen.js  → your "Dashboard" tab
import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useTally } from '../TallyContext';
import { FONTS, fmtINR } from '../theme';
import { MonoLabel, Rule, Btn, TxRow, Brand } from '../ui';
import { totalSpent, INCOME, PAYDAY_IN, copeZone, STREAK_BROKE_DAYS, VOICE } from '../data';

export default function HomeScreen({ navigation }) {
  const { T, accent, accentInk, prefs, store, openAdd } = useTally();
  const txs = store.txs;
  const total = totalSpent(txs);
  const left = Math.max(0, INCOME - total);
  const perDay = Math.round(left / PAYDAY_IN);
  const ratio = total / INCOME;
  const zone = copeZone(ratio);
  const recent = txs.slice(0, 5);
  const nudge = (VOICE[prefs.tone] || VOICE.dry)[0];
  const goInsights = () => navigation && navigation.navigate('Insights');

  return (
    <ScrollView style={{ flex: 1, backgroundColor: T.bg }}
      contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 54, paddingBottom: 120 }}>
      {/* header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
          <Brand T={T} color={accent} size={16} />
          <MonoLabel T={T} color={T.dim}>home</MonoLabel>
        </View>
        <MonoLabel T={T} color={T.faint}>mon · jun 24</MonoLabel>
      </View>

      {/* hero */}
      <MonoLabel T={T} color={T.dim} style={{ marginTop: 6 }}>left to burn</MonoLabel>
      <Text style={{ fontFamily: FONTS.display, fontSize: 60, color: T.text, marginTop: 6 }}>{fmtINR(left)}</Text>
      <Text style={{ fontFamily: FONTS.mono, fontSize: 12, color: T.dim, marginTop: 8 }}>
        {fmtINR(perDay)}/day till payday · jun 30
      </Text>
      <View style={{ marginTop: 16, height: 10, borderRadius: 999, backgroundColor: T.chip, overflow: 'hidden', flexDirection: 'row' }}>
        <View style={{ width: `${Math.min(ratio * 100, 100)}%`, backgroundColor: accent }} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
        <MonoLabel T={T} color={T.faint} size={10}>{Math.round(ratio * 100)}% of ₹65k gone</MonoLabel>
        <MonoLabel T={T} color={T.faint} size={10}>{zone.label}</MonoLabel>
      </View>

      {/* mini stats */}
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 22 }}>
        <View style={{ flex: 1, backgroundColor: T.card, borderWidth: 1, borderColor: T.line, borderRadius: 14, padding: 16 }}>
          <Text style={{ fontFamily: FONTS.display, fontSize: 26, color: T.text }}>{STREAK_BROKE_DAYS}d 🔥</Text>
          <MonoLabel T={T} color={T.dim} size={10} style={{ marginTop: 4 }}>broke streak</MonoLabel>
        </View>
        <View style={{ flex: 1, backgroundColor: T.card, borderWidth: 1, borderColor: T.line, borderRadius: 14, padding: 16 }}>
          <Text style={{ fontFamily: FONTS.display, fontSize: 26, color: accent }}>+10% ↗</Text>
          <MonoLabel T={T} color={T.dim} size={10} style={{ marginTop: 4 }}>burn rate</MonoLabel>
        </View>
      </View>

      {/* today's read */}
      <Pressable onPress={goInsights} style={{ marginTop: 22, backgroundColor: T.card, borderWidth: 1, borderColor: T.line, borderRadius: 18, padding: 18 }}>
        <MonoLabel T={T} color={accent} style={{ marginBottom: 9 }}>today's read</MonoLabel>
        <Text style={{ fontFamily: FONTS.sansMed, fontSize: 16, lineHeight: 23, color: T.text }}>{nudge.line}</Text>
        <MonoLabel T={T} color={T.dim} size={10.5} style={{ marginTop: 12 }}>see the full damage →</MonoLabel>
      </Pressable>

      {/* recent */}
      <View style={{ marginTop: 28 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <MonoLabel T={T} color={T.dim}>recent damage</MonoLabel>
          <Pressable onPress={() => navigation && navigation.navigate('Transactions')}>
            <MonoLabel T={T} color={accent} size={10}>see all →</MonoLabel>
          </Pressable>
        </View>
        <Rule T={T} />
        {recent.map((tx) => (
          <View key={tx.id}>
            <TxRow T={T} tx={tx} onPress={() => navigation && navigation.navigate('Transactions')} />
            <Rule T={T} />
          </View>
        ))}
      </View>

      <View style={{ marginTop: 22 }}>
        <Btn T={T} accent={accent} accentInk={accentInk} onPress={openAdd}>＋ log a spend</Btn>
      </View>
    </ScrollView>
  );
}
