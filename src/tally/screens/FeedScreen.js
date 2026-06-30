// src/tally/screens/FeedScreen.js  → your "Transactions" tab
import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTally } from '../TallyContext';
import { FONTS, fmtINR } from '../theme';
import { MonoLabel, ScreenHeader, MonthPicker } from '../ui';
import { catMeta, REACTIONS } from '../data';

export default function FeedScreen({ navigation }) {
  const { T, accent, accentInk, store, refreshing, refreshTxs, openTx,
    selectedMonth, setSelectedMonth } = useTally();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const txs = store.txs.filter((tx) => {
    const typeOk = filter === 'all' ? true : filter === 'spent' ? tx.type !== 'credit' : tx.type === 'credit';
    const queryOk = !query || (tx.merchant || '').toLowerCase().includes(query.toLowerCase());
    return typeOk && queryOk;
  });
  const FILTERS = [['all', 'all'], ['spent', 'spent'], ['in', 'received']];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: T.bg }}
      contentContainerStyle={{ paddingHorizontal: 18, paddingTop: insets.top + 14, paddingBottom: 120 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshTxs} tintColor={accent} colors={[accent]} />}>
      <ScreenHeader T={T} accent={accent} title="the feed"
        right={<MonoLabel T={T} color={T.faint}>{store.txs.length} hits</MonoLabel>} />
      <View style={{ marginBottom: 10 }}>
        <MonthPicker T={T} accent={accent} selectedMonth={selectedMonth} onChange={setSelectedMonth} />
      </View>

      {/* search */}
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="search merchants…"
        placeholderTextColor={T.faint}
        style={{ backgroundColor: T.card, borderWidth: 1, borderColor: T.line, borderRadius: 8,
          paddingVertical: 10, paddingHorizontal: 14, color: T.text, fontFamily: FONTS.sans,
          fontSize: 14, marginBottom: 16 }}
      />

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

      {txs.length === 0 && (
        <View style={{ alignItems: 'center', paddingVertical: 60 }}>
          <Text style={{ fontFamily: FONTS.display, fontSize: 28, color: T.faint }}>₹0</Text>
          <MonoLabel T={T} color={T.faint} size={11} style={{ marginTop: 10, textAlign: 'center' }}>
            {filter === 'credit' ? 'no money in. shocking.' : 'no spends here. quiet month? doubt it.'}
          </MonoLabel>
        </View>
      )}

      <View style={{ gap: 12 }}>
        {txs.map((tx) => {
          const m = catMeta(tx.category);
          const credit = tx.type === 'credit';
          const picked = store.reactions[tx.id];
          return (
            <Pressable key={tx.id} onPress={() => openTx(tx)}
              style={({ pressed }) => [{ backgroundColor: T.card, borderWidth: 1, borderColor: T.line, borderRadius: 16, padding: 16, opacity: pressed ? 0.7 : 1 }]}>
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
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}
