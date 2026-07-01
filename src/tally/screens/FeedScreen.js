// src/tally/screens/FeedScreen.js  → your "Transactions" tab
import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTally } from '../TallyContext';
import { FONTS, fmtINR } from '../theme';
import { MonoLabel, ScreenHeader, MonthPicker, Rule } from '../ui';
import { catMeta, REACTIONS } from '../data';

function groupTxsByDate(txs) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterday = today - 86400000;

  const groups = {};
  const order = [];

  for (const tx of txs) {
    let label;
    if (tx.txn_date) {
      const d = new Date(tx.txn_date);
      const txDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      if (txDay === today) {
        label = 'today';
      } else if (txDay === yesterday) {
        label = 'yesterday';
      } else if (txDay >= today - 6 * 86400000) {
        label = d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' }).toLowerCase();
      } else {
        label = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }).toLowerCase();
      }
    } else {
      label = tx.when?.includes('wk') || tx.when?.includes('days') ? 'earlier' : 'recent';
    }

    if (!groups[label]) { groups[label] = []; order.push(label); }
    groups[label].push(tx);
  }

  return order.map(label => ({ label, txs: groups[label] }));
}

export default function FeedScreen({ navigation }) {
  const { T, accent, accentInk, store, refreshing, refreshTxs, openTx,
    selectedMonth, setSelectedMonth, isPremium, openPaywall } = useTally();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('date'); // 'date' | 'amount'
  const [catFilter, setCatFilter] = useState(null); // category id or null

  const filtered = store.txs.filter((tx) => {
    const typeOk = filter === 'all' ? true : filter === 'spent' ? tx.type !== 'credit' : tx.type === 'credit';
    const queryOk = !query || (tx.merchant || '').toLowerCase().includes(query.toLowerCase())
      || (tx.note || '').toLowerCase().includes(query.toLowerCase());
    const catOk = !catFilter || tx.category === catFilter;
    return typeOk && queryOk && catOk;
  });

  // unique categories present in current view (before cat filter applied)
  const activeCats = Array.from(new Set(
    store.txs.filter(t => t.type !== 'credit').map(t => t.category).filter(Boolean)
  ));

  const sorted = sort === 'amount'
    ? [...filtered].sort((a, b) => b.amount - a.amount)
    : filtered;

  const sections = sort === 'amount'
    ? [{ label: 'largest first', txs: sorted }]
    : groupTxsByDate(sorted);

  const FILTERS = [['all', 'all'], ['spent', 'spent'], ['in', 'received']];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: T.bg }}
      contentContainerStyle={{ paddingHorizontal: 18, paddingTop: insets.top + 14, paddingBottom: 120 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshTxs} tintColor={accent} colors={[accent]} />}>
      <ScreenHeader T={T} accent={accent} title="the feed"
        right={<MonoLabel T={T} color={T.faint}>{filtered.length} hits</MonoLabel>} />
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
          fontSize: 14, marginBottom: 14 }}
      />

      {/* filters */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
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

      {/* category filter chips — shown only when there are multiple categories */}
      {activeCats.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: -10, marginBottom: 14 }}>
          <View style={{ flexDirection: 'row', gap: 6, paddingVertical: 4 }}>
            <Pressable onPress={() => setCatFilter(null)}
              style={{ paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1,
                borderColor: !catFilter ? accent : T.line, backgroundColor: !catFilter ? accent + '22' : 'transparent' }}>
              <MonoLabel T={T} color={!catFilter ? accent : T.dim} size={9}>all cats</MonoLabel>
            </Pressable>
            {activeCats.map(id => {
              const m = catMeta(id);
              const on = catFilter === id;
              return (
                <Pressable key={id} onPress={() => setCatFilter(on ? null : id)}
                  style={{ paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1,
                    borderColor: on ? accent : T.line, backgroundColor: on ? accent + '22' : 'transparent' }}>
                  <MonoLabel T={T} color={on ? accent : T.dim} size={9}>{m.tag}</MonoLabel>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* sort */}
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 6, marginTop: -12, marginBottom: 14 }}>
        <MonoLabel T={T} color={T.faint} size={9}>sort:</MonoLabel>
        {[['date', 'date'], ['amount', 'amount']].map(([k, label]) => {
          const on = sort === k;
          return (
            <Pressable key={k} onPress={() => setSort(k)}
              style={{ paddingVertical: 4, paddingHorizontal: 9, borderRadius: 999,
                borderWidth: 1, borderColor: on ? accent : T.line, backgroundColor: on ? accent + '22' : 'transparent' }}>
              <MonoLabel T={T} color={on ? accent : T.dim} size={9}>{label}</MonoLabel>
            </Pressable>
          );
        })}
      </View>

      {filtered.length === 0 && (
        <View style={{ alignItems: 'center', paddingVertical: 60 }}>
          <Text style={{ fontFamily: FONTS.display, fontSize: 28, color: T.faint }}>₹0</Text>
          <MonoLabel T={T} color={T.faint} size={11} style={{ marginTop: 10, textAlign: 'center' }}>
            {query ? 'no matches.' : filter === 'in' ? 'no money in. shocking.' : 'no spends here. quiet month? doubt it.'}
          </MonoLabel>
        </View>
      )}

      {/* date-grouped sections */}
      {sections.map(({ label, txs: group }) => (
        <View key={label} style={{ marginBottom: 8 }}>
          <MonoLabel T={T} color={T.faint} size={10} style={{ marginBottom: 8, letterSpacing: 1.6 }}>{label}</MonoLabel>
          <View style={{ backgroundColor: T.card, borderWidth: 1, borderColor: T.line, borderRadius: 16, overflow: 'hidden' }}>
            {group.map((tx, i) => {
              const m = catMeta(tx.category);
              const credit = tx.type === 'credit';
              const picked = store.reactions[tx.id];
              return (
                <View key={tx.id}>
                  {i > 0 && <Rule T={T} dashed={false} />}
                  <Pressable onPress={() => openTx(tx)}
                    style={({ pressed }) => [{ padding: 14, opacity: pressed ? 0.7 : 1 }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: FONTS.sansBold, fontSize: 16, color: T.text }}>{tx.merchant}</Text>
                        {tx.note
                          ? <Text style={{ fontFamily: FONTS.sans, fontStyle: 'italic', fontSize: 12.5, color: T.dim, marginTop: 3 }}>"{tx.note}"</Text>
                          : <MonoLabel T={T} color={T.faint} size={10} style={{ marginTop: 3 }}>{m.tag}{tx.sms ? ' · sms' : ' · manual'}</MonoLabel>
                        }
                      </View>
                      <Text style={{ fontFamily: FONTS.monoBold, fontSize: 16, color: credit ? T.creditText : T.text }}>
                        {credit ? '+' : '−'}{fmtINR(tx.amount)}
                      </Text>
                    </View>

                    {/* reactions */}
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
                      {REACTIONS.map((r) => {
                        const on = picked === r;
                        return (
                          <Pressable key={r} onPress={() => store.react(tx.id, r)}
                            style={{ width: 30, height: 30, borderRadius: 999, alignItems: 'center', justifyContent: 'center',
                              borderWidth: 1.5, borderColor: on ? accent : T.line,
                              backgroundColor: on ? accent + '22' : 'transparent' }}>
                            <Text style={{ fontSize: 13 }}>{r}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>
      ))}

      {/* filtered total */}
      {filtered.length > 0 && (() => {
        const debits = filtered.filter(t => t.type !== 'credit');
        const credits = filtered.filter(t => t.type === 'credit');
        const debitTotal = debits.reduce((s, t) => s + (t.amount || 0), 0);
        const creditTotal = credits.reduce((s, t) => s + (t.amount || 0), 0);
        return (
          <View style={{ marginTop: 16, flexDirection: 'row', justifyContent: 'space-between',
            borderTopWidth: 1, borderTopColor: T.line, paddingTop: 10 }}>
            <MonoLabel T={T} color={T.faint} size={10}>{filtered.length} transaction{filtered.length !== 1 ? 's' : ''}</MonoLabel>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {creditTotal > 0 && <Text style={{ fontFamily: FONTS.monoBold, fontSize: 12, color: T.creditText }}>+{fmtINR(creditTotal)}</Text>}
              {debitTotal > 0 && <Text style={{ fontFamily: FONTS.monoBold, fontSize: 12, color: T.text }}>−{fmtINR(debitTotal)}</Text>}
            </View>
          </View>
        );
      })()}

      {!isPremium && (
        <Pressable onPress={openPaywall}
          style={{ marginTop: 10, backgroundColor: T.card, borderWidth: 1, borderColor: T.line,
            borderRadius: 14, padding: 16, alignItems: 'center', gap: 4 }}>
          <MonoLabel T={T} color={T.dim} size={10}>showing last 30 days · older history locked</MonoLabel>
          <MonoLabel T={T} color={accent} size={10}>unlock full history with Pro →</MonoLabel>
        </Pressable>
      )}
    </ScrollView>
  );
}
