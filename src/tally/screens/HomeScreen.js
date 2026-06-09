// src/tally/screens/HomeScreen.js  → your "Dashboard" tab
import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useTally } from '../TallyContext';
import { FONTS, fmtINR } from '../theme';
import { MonoLabel, Rule, Btn, TxRow, Brand } from '../ui';
import { totalSpent, groupByCat, copeZone } from '../data';

// A real, data-derived "read" — no canned mock lines.
function buildRead(top, total) {
  if (!top || total <= 0) return "no damage logged yet. suspicious, honestly.";
  const pct = Math.round((top.amount / total) * 100);
  return `${fmtINR(top.amount)} on ${top.label.toLowerCase()} — ${pct}% of everything. bold strategy.`;
}

function todayLabel() {
  return new Date()
    .toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    .toLowerCase();
}

export default function HomeScreen({ navigation }) {
  const { T, accent, accentInk, income, store, openAdd } = useTally();

  const txs = store.txs;
  const total = totalSpent(txs);
  const cats = groupByCat(txs);
  const top = cats[0];
  const spends = txs.filter((t) => t.type !== 'credit');
  const count = spends.length;

  const hasIncome = !!income && income > 0;
  const left = hasIncome ? Math.max(0, income - total) : null;
  const ratio = hasIncome ? Math.min(total / income, 1) : 0;
  const zone = copeZone(hasIncome ? total / income : 0.5);

  const recent = txs.slice(0, 5);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: T.bg }}
      contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 54, paddingBottom: 120 }}>
      {/* header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
          <Brand T={T} color={accent} size={16} />
          <MonoLabel T={T} color={T.dim}>home</MonoLabel>
        </View>
        <MonoLabel T={T} color={T.faint}>{todayLabel()}</MonoLabel>
      </View>

      {/* hero */}
      {hasIncome ? (
        <>
          <MonoLabel T={T} color={T.dim} style={{ marginTop: 6 }}>left to burn</MonoLabel>
          <Text style={{ fontFamily: FONTS.display, fontSize: 60, color: T.text, marginTop: 6 }}>{fmtINR(left)}</Text>
          <Text style={{ fontFamily: FONTS.mono, fontSize: 12, color: T.dim, marginTop: 8 }}>
            of {fmtINR(income)} this month
          </Text>
          <View style={{ marginTop: 16, height: 10, borderRadius: 999, backgroundColor: T.chip, overflow: 'hidden', flexDirection: 'row' }}>
            <View style={{ width: `${Math.round(ratio * 100)}%`, backgroundColor: accent }} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
            <MonoLabel T={T} color={T.faint} size={10}>{Math.round(ratio * 100)}% gone</MonoLabel>
            <MonoLabel T={T} color={T.faint} size={10}>{zone.label}</MonoLabel>
          </View>
        </>
      ) : (
        <>
          <MonoLabel T={T} color={T.dim} style={{ marginTop: 6 }}>spent this month</MonoLabel>
          <Text style={{ fontFamily: FONTS.display, fontSize: 60, color: T.text, marginTop: 6 }}>{fmtINR(total)}</Text>
          <Pressable onPress={() => navigation && navigation.navigate('Settings')}>
            <MonoLabel T={T} color={accent} size={11} style={{ marginTop: 10 }}>
              set your income in YOU → see what's left →
            </MonoLabel>
          </Pressable>
        </>
      )}

      {/* mini stats — real */}
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 22 }}>
        <View style={{ flex: 1, backgroundColor: T.card, borderWidth: 1, borderColor: T.line, borderRadius: 14, padding: 16 }}>
          <Text style={{ fontFamily: FONTS.display, fontSize: 26, color: T.text }}>{count}</Text>
          <MonoLabel T={T} color={T.dim} size={10} style={{ marginTop: 4 }}>spends logged</MonoLabel>
        </View>
        <View style={{ flex: 1, backgroundColor: T.card, borderWidth: 1, borderColor: T.line, borderRadius: 14, padding: 16 }}>
          <Text style={{ fontFamily: FONTS.display, fontSize: 26, color: accent }}>{top ? top.tag : '—'}</Text>
          <MonoLabel T={T} color={T.dim} size={10} style={{ marginTop: 4 }}>
            {top ? `top · ${fmtINR(top.amount)}` : 'no category yet'}
          </MonoLabel>
        </View>
      </View>

      {/* today's read — derived from real data */}
      <Pressable onPress={() => navigation && navigation.navigate('Insights')}
        style={{ marginTop: 22, backgroundColor: T.card, borderWidth: 1, borderColor: T.line, borderRadius: 18, padding: 18 }}>
        <MonoLabel T={T} color={accent} style={{ marginBottom: 9 }}>today's read</MonoLabel>
        <Text style={{ fontFamily: FONTS.sansMed, fontSize: 16, lineHeight: 23, color: T.text }}>{buildRead(top, total)}</Text>
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
