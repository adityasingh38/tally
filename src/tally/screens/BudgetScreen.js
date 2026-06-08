// src/tally/screens/BudgetScreen.js  → your "Budget" tab
import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useTally } from '../TallyContext';
import { FONTS, fmtINR } from '../theme';
import { MonoLabel, ScreenHeader, Btn, Tag } from '../ui';
import { groupByCat, DELUSIONS } from '../data';

export default function BudgetScreen({ navigation }) {
  const { T, accent, accentInk, store, openAdd } = useTally();
  const cats = groupByCat(store.txs).filter((c) => c.id !== 'transfer' && c.id !== 'other');
  const totalLimit = Object.values(DELUSIONS).reduce((a, b) => a + b, 0);
  const totalSpentV = cats.reduce((a, c) => a + c.amount, 0);
  const over = ((totalSpentV - totalLimit) / totalLimit) * 100;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: T.bg }}
      contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 54, paddingBottom: 120 }}>
      <ScreenHeader T={T} accent={accent} title="delusions" sub="the limits you set · vs reality" />

      {/* summary */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 8 }}>
        <View>
          <MonoLabel T={T} color={T.dim}>the plan</MonoLabel>
          <Text style={{ fontFamily: FONTS.display, fontSize: 30, color: T.text }}>{fmtINR(totalLimit)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <MonoLabel T={T} color={T.dim}>the reality</MonoLabel>
          <Text style={{ fontFamily: FONTS.display, fontSize: 30, color: accent }}>{fmtINR(totalSpentV)}</Text>
        </View>
      </View>
      <View style={{ marginTop: 14 }}>
        <Tag T={T} accent={accent} accentInk={accentInk} rotate={-1}>OVER BY {Math.round(over)}% · A BOLD STRATEGY</Tag>
      </View>

      {/* per-category */}
      <View style={{ marginTop: 26, gap: 18 }}>
        {cats.map((c) => {
          const limit = DELUSIONS[c.id] || Math.round(c.amount * 0.7);
          const pct = (c.amount / limit) * 100;
          const blown = pct > 100;
          return (
            <View key={c.id}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 7 }}>
                <Text style={{ fontFamily: FONTS.sansSemi, fontSize: 15, color: T.text }}>{c.label}</Text>
                <Text style={{ fontFamily: FONTS.mono, fontSize: 12.5, color: T.dim }}>
                  {fmtINR(c.amount)} <Text style={{ color: T.faint }}>/ {fmtINR(limit)}</Text>
                </Text>
              </View>
              <View style={{ height: 9, borderRadius: 999, backgroundColor: T.chip, overflow: 'hidden', flexDirection: 'row' }}>
                <View style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: blown ? accent : T.lineStrong }} />
              </View>
              <MonoLabel T={T} color={blown ? accent : T.faint} size={10} style={{ marginTop: 6 }}>
                {blown ? `blew past by ${Math.round(pct - 100)}%` : `${Math.round(pct)}% used · for now`}
              </MonoLabel>
            </View>
          );
        })}
      </View>

      <View style={{ marginTop: 26 }}>
        <Btn T={T} accent={accent} accentInk={accentInk} variant="ghost" onPress={openAdd}>＋ set a new delusion</Btn>
      </View>
    </ScrollView>
  );
}
