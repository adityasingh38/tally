// src/tally/screens/FeedScreen.js  → your "Transactions" tab
import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useTally } from '../TallyContext';
import { FONTS, fmtINR } from '../theme';
import { MonoLabel, ScreenHeader } from '../ui';
import { catMeta, REACTIONS } from '../data';

export default function FeedScreen({ navigation }) {
  const { T, accent, accentInk, store } = useTally();
  const [filter, setFilter] = useState('all');
  const txs = store.txs.filter((tx) =>
    filter === 'all' ? true : filter === 'spent' ? tx.type !== 'credit' : tx.type === 'credit');
  const FILTERS = [['all', 'all'], ['spent', 'spent'], ['in', 'received']];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: T.bg }}
      contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 54, paddingBottom: 120 }}>
      <ScreenHeader T={T} accent={accent} title="the feed"
        right={<MonoLabel T={T} color={T.faint}>{store.txs.length} hits</MonoLabel>} />

      {/* filters */}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 6, marginBottom: 18 }}>
        {FILTERS.map(([k, label]) => {
          const on = filter === k;
          return (
            <Pressable key={k} onPress={() => setFilter(k)}
              style={{ flex: 1, paddingVertical: 9, borderRadius: 999, alignItems: 'center',
                borderWidth: 1.5, borderColor: on ? accent : T.line, backgroundColor: on ? accent : 'transparent' }}>
              <Text style={{ fontFamily: FONTS.monoBold, fontSize: 11, letterSpacing: 0.8,
                textTransform: 'uppercase', color: on ? accentInk : T.dim }}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ gap: 12 }}>
        {txs.map((tx) => {
          const m = catMeta(tx.category);
          const credit = tx.type === 'credit';
          const picked = store.reactions[tx.id];
          return (
            <View key={tx.id} style={{ backgroundColor: T.card, borderWidth: 1, borderColor: T.line, borderRadius: 16, padding: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <MonoLabel T={T} color={T.faint} size={10}>{m.tag}{tx.sms ? ' · sms' : ' · manual'}</MonoLabel>
                <MonoLabel T={T} color={T.faint} size={10}>{tx.when || ''}</MonoLabel>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 8, gap: 12 }}>
                <Text style={{ flex: 1, fontFamily: FONTS.sansBold, fontSize: 17, color: T.text }}>{tx.merchant}</Text>
                <Text style={{ fontFamily: FONTS.monoBold, fontSize: 17, color: credit ? T.creditText : T.text }}>
                  {credit ? '+' : '−'}{fmtINR(tx.amount)}
                </Text>
              </View>
              {tx.note ? <Text style={{ fontFamily: FONTS.sans, fontStyle: 'italic', fontSize: 13.5, color: T.dim, marginTop: 5 }}>“{tx.note}”</Text> : null}

              {/* reactions */}
              <View style={{ flexDirection: 'row', gap: 7, marginTop: 13 }}>
                {REACTIONS.map((r) => {
                  const on = picked === r;
                  return (
                    <Pressable key={r} onPress={() => store.react(tx.id, r)}
                      style={{ width: 34, height: 34, borderRadius: 999, alignItems: 'center', justifyContent: 'center',
                        borderWidth: 1.5, borderColor: on ? accent : T.line,
                        backgroundColor: on ? accent + '22' : 'transparent' }}>
                      <Text style={{ fontSize: 15 }}>{r}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}
