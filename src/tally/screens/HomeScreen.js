// src/tally/screens/HomeScreen.js  → your "Dashboard" tab
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTally } from '../TallyContext';
import { useAuth } from '../../hooks/useAuth';
import { getBudgets } from '../../services/supabase';
import { FONTS, fmtINR } from '../theme';
import { MonoLabel, Rule, Btn, TxRow, Brand, MonthPicker } from '../ui';
import { totalSpent, groupByCat, copeZone, monthlyTotals } from '../data';

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

function TrendBars({ T, accent, allTxs }) {
  const bars = monthlyTotals(allTxs, 4);
  const max = Math.max(...bars.map(b => b.total), 1);
  const now = new Date();
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const hasData = bars.some(b => b.total > 0);
  if (!hasData) return null;

  return (
    <View style={{ marginTop: 22 }}>
      <MonoLabel T={T} color={T.faint} size={10} style={{ marginBottom: 10 }}>trend · last 4 months</MonoLabel>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 72 }}>
        {bars.map((b) => {
          const isCurrent = b.key === currentKey;
          const barH = b.total > 0 ? Math.max(6, Math.round(52 * (b.total / max))) : 4;
          const fmt = b.total >= 100000
            ? `${(b.total / 100000).toFixed(1)}L`
            : b.total >= 1000
            ? `${Math.round(b.total / 1000)}k`
            : b.total > 0 ? String(Math.round(b.total)) : '';
          return (
            <View key={b.key} style={{ flex: 1, alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
              <MonoLabel T={T} color={isCurrent ? accent : T.faint} size={9}>{fmt}</MonoLabel>
              <View style={{ width: '100%', height: barH, borderRadius: 3,
                backgroundColor: isCurrent ? accent : T.chip }} />
              <MonoLabel T={T} color={isCurrent ? T.text : T.faint} size={9}>{b.label}</MonoLabel>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default function HomeScreen({ navigation }) {
  const { T, accent, accentInk, income, store, openAdd, refreshing, refreshTxs, openTx,
    selectedMonth, setSelectedMonth } = useTally();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

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

  const now2 = new Date();
  const isCurrentMonth = now2.getFullYear() === selectedMonth.year && now2.getMonth() === selectedMonth.month;
  const daysLeft = isCurrentMonth
    ? Math.max(1, new Date(selectedMonth.year, selectedMonth.month + 1, 0).getDate() - now2.getDate() + 1)
    : 0;
  const dailyBudget = hasIncome && left > 0 && daysLeft > 0 ? Math.round(left / daysLeft) : null;

  // today's spend
  const todayStr = now2.toISOString().slice(0, 10);
  const todayTotal = isCurrentMonth
    ? totalSpent(txs.filter(tx => tx.txn_date && tx.txn_date.slice(0, 10) === todayStr && tx.type !== 'credit'))
    : 0;

  // spending forecast — only for current month with enough data
  const dayOfMonth = now2.getDate();
  const daysInMonth = new Date(selectedMonth.year, selectedMonth.month + 1, 0).getDate();
  const avgDailySpend = isCurrentMonth && dayOfMonth >= 3 ? total / dayOfMonth : null;
  const projectedSpend = avgDailySpend ? Math.round(avgDailySpend * daysInMonth) : null;
  const projectedOver = hasIncome && projectedSpend ? projectedSpend > income : false;

  // budget warnings — categories at >= 80% of monthly limit
  const [budgets, setBudgets] = useState({});
  useEffect(() => {
    if (!user) return;
    getBudgets(user.id).then(({ data }) => {
      if (!data) return;
      const map = {};
      data.forEach((b) => { map[b.category] = { limit: b.monthly_limit, threshold: b.alert_threshold ?? 0.8 }; });
      setBudgets(map);
    });
  }, [user]);
  const spentMap = {};
  groupByCat(txs).forEach((c) => { spentMap[c.id] = c.amount; });
  const budgetWarnings = Object.entries(budgets)
    .map(([cat, { limit, threshold }]) => {
      const spent = spentMap[cat] || 0;
      const pct = spent / limit;
      if (pct < threshold) return null;
      return { cat, spent, limit, pct, blown: pct >= 1 };
    })
    .filter(Boolean)
    .sort((a, b) => b.pct - a.pct);

  // spending streak — consecutive days (going back from yesterday) under rough daily limit
  const roughDailyLimit = hasIncome && income > 0 ? Math.round(income / daysInMonth) : null;
  const streak = (() => {
    if (!roughDailyLimit || !isCurrentMonth) return 0;
    const byDay = {};
    store.allTxs.forEach((tx) => {
      if (!tx.txn_date || tx.type === 'credit') return;
      const d = tx.txn_date.slice(0, 10);
      byDay[d] = (byDay[d] || 0) + (tx.amount || 0);
    });
    let count = 0;
    const cur = new Date(now2);
    cur.setDate(cur.getDate() - 1); // start from yesterday
    for (let i = 0; i < 60; i++) {
      const ds = cur.toISOString().slice(0, 10);
      const daySpent = byDay[ds] || 0;
      if (daySpent === 0) { cur.setDate(cur.getDate() - 1); continue; } // skip zero-spend days
      if (daySpent > roughDailyLimit) break;
      count++;
      cur.setDate(cur.getDate() - 1);
    }
    return count;
  })();

  const recent = txs.slice(0, 5);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: T.bg }}
      contentContainerStyle={{ paddingHorizontal: 18, paddingTop: insets.top + 14, paddingBottom: 120 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshTxs} tintColor={accent} colors={[accent]} />}>
      {/* header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
          <Brand T={T} color={accent} size={16} />
          <MonoLabel T={T} color={T.dim}>home</MonoLabel>
        </View>
        <MonoLabel T={T} color={T.faint}>{todayLabel()}</MonoLabel>
      </View>

      {/* month picker */}
      <View style={{ marginTop: 8, marginBottom: 2 }}>
        <MonthPicker T={T} accent={accent} selectedMonth={selectedMonth} onChange={setSelectedMonth} />
      </View>

      {/* hero */}
      {hasIncome ? (
        <>
          <MonoLabel T={T} color={T.dim} style={{ marginTop: 10 }}>left to burn</MonoLabel>
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
          {dailyBudget != null && (
            <View style={{ marginTop: 10, backgroundColor: T.card, borderWidth: 1, borderColor: T.line,
              borderRadius: 10, paddingVertical: 9, paddingHorizontal: 13,
              flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <MonoLabel T={T} color={T.dim} size={10}>daily budget to survive</MonoLabel>
              <Text style={{ fontFamily: FONTS.monoBold, fontSize: 14, color: accent }}>{fmtINR(dailyBudget)}/day</Text>
            </View>
          )}
          {hasIncome && left === 0 && (
            <View style={{ marginTop: 10, backgroundColor: T.card, borderWidth: 1, borderColor: T.red,
              borderRadius: 10, paddingVertical: 9, paddingHorizontal: 13 }}>
              <MonoLabel T={T} color={T.red} size={10}>over budget · {fmtINR(total - income)} in the hole</MonoLabel>
            </View>
          )}
          {hasIncome && left > 0 && isCurrentMonth && (() => {
            const savedPct = Math.round((left / income) * 100);
            if (savedPct < 5) return null;
            return (
              <View style={{ marginTop: 10, backgroundColor: T.card, borderWidth: 1, borderColor: T.creditText + '55',
                borderRadius: 10, paddingVertical: 9, paddingHorizontal: 13,
                flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <MonoLabel T={T} color={T.creditText} size={10}>saved so far this month</MonoLabel>
                <Text style={{ fontFamily: FONTS.monoBold, fontSize: 13, color: T.creditText }}>
                  {fmtINR(left)} · {savedPct}%
                </Text>
              </View>
            );
          })()}
        </>
      ) : (
        <>
          <MonoLabel T={T} color={T.dim} style={{ marginTop: 10 }}>spent this month</MonoLabel>
          <Text style={{ fontFamily: FONTS.display, fontSize: 60, color: T.text, marginTop: 6 }}>{fmtINR(total)}</Text>
          <Pressable onPress={() => navigation && navigation.navigate('Settings')}>
            <MonoLabel T={T} color={accent} size={11} style={{ marginTop: 10 }}>
              set your income in YOU → see what's left →
            </MonoLabel>
          </Pressable>
        </>
      )}

      {/* mini stats */}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 22 }}>
        <View style={{ flex: 1, backgroundColor: T.card, borderWidth: 1, borderColor: T.line, borderRadius: 14, padding: 14 }}>
          <Text style={{ fontFamily: FONTS.display, fontSize: 22, color: T.text }}>{count}</Text>
          <MonoLabel T={T} color={T.dim} size={9.5} style={{ marginTop: 3 }}>spends</MonoLabel>
        </View>
        <View style={{ flex: 1, backgroundColor: T.card, borderWidth: 1, borderColor: T.line, borderRadius: 14, padding: 14 }}>
          <Text style={{ fontFamily: FONTS.display, fontSize: 22, color: accent }}>{top ? top.tag : '—'}</Text>
          <MonoLabel T={T} color={T.dim} size={9.5} style={{ marginTop: 3 }}>
            {top ? `top · ${fmtINR(top.amount)}` : 'no top yet'}
          </MonoLabel>
        </View>
        {isCurrentMonth && (
          <View style={{ flex: 1, backgroundColor: T.card, borderWidth: 1, borderColor: T.line, borderRadius: 14, padding: 14 }}>
            <Text style={{ fontFamily: FONTS.display, fontSize: 22, color: todayTotal > 0 ? T.text : T.faint }}>
              {todayTotal > 0 ? fmtINR(todayTotal) : '₹0'}
            </Text>
            <MonoLabel T={T} color={T.dim} size={9.5} style={{ marginTop: 3 }}>today</MonoLabel>
          </View>
        )}
      </View>

      {/* streak card */}
      {streak >= 3 && (
        <View style={{ marginTop: 10, backgroundColor: T.card, borderWidth: 1, borderColor: T.line,
          borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14,
          flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <MonoLabel T={T} color={T.dim} size={10}>days under {fmtINR(roughDailyLimit)}</MonoLabel>
          <Text style={{ fontFamily: FONTS.monoBold, fontSize: 16, color: T.creditText }}>
            {streak} day{streak !== 1 ? 's' : ''} clean
          </Text>
        </View>
      )}

      {/* 4-month trend bars */}
      <TrendBars T={T} accent={accent} allTxs={store.allTxs} />

      {/* today's read */}
      <Pressable onPress={() => navigation && navigation.navigate('Insights')}
        style={{ marginTop: 22, backgroundColor: T.card, borderWidth: 1, borderColor: T.line, borderRadius: 18, padding: 18 }}>
        <MonoLabel T={T} color={accent} style={{ marginBottom: 9 }}>today's read</MonoLabel>
        <Text style={{ fontFamily: FONTS.sansMed, fontSize: 16, lineHeight: 23, color: T.text }}>{buildRead(top, total)}</Text>
        <MonoLabel T={T} color={T.dim} size={10.5} style={{ marginTop: 12 }}>see the full damage →</MonoLabel>
      </Pressable>

      {/* spending forecast */}
      {projectedSpend != null && (
        <View style={{ marginTop: 14, backgroundColor: T.card, borderWidth: 1,
          borderColor: projectedOver ? T.red : T.line, borderRadius: 14,
          padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <MonoLabel T={T} color={T.dim} size={10}>at this pace, month total →</MonoLabel>
          <Text style={{ fontFamily: FONTS.monoBold, fontSize: 14, color: projectedOver ? T.red : T.text }}>
            {fmtINR(projectedSpend)}
          </Text>
        </View>
      )}

      {/* budget warnings */}
      {isCurrentMonth && budgetWarnings.length > 0 && (
        <View style={{ marginTop: 14, gap: 8 }}>
          <MonoLabel T={T} color={T.dim}>budget alerts</MonoLabel>
          {budgetWarnings.map(({ cat, spent, limit, pct, blown }) => (
            <Pressable key={cat} onPress={() => navigation && navigation.navigate('Budget')}
              style={{ backgroundColor: T.card, borderWidth: 1,
                borderColor: blown ? T.red : T.line, borderRadius: 14,
                paddingVertical: 12, paddingHorizontal: 14,
                flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ fontFamily: FONTS.sansSemi, fontSize: 14, color: blown ? T.red : T.text }}>
                  {cat}
                </Text>
                <MonoLabel T={T} color={T.faint} size={10} style={{ marginTop: 2 }}>
                  {fmtINR(spent)} of {fmtINR(limit)} · {blown ? 'over' : `${Math.round(pct * 100)}% used`}
                </MonoLabel>
              </View>
              <MonoLabel T={T} color={blown ? T.red : accent} size={11}>
                {blown ? `+${fmtINR(Math.round(spent - limit))}` : `${fmtINR(Math.round(limit - spent))} left`}
              </MonoLabel>
            </Pressable>
          ))}
        </View>
      )}

      {/* recent */}
      <View style={{ marginTop: 28 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <MonoLabel T={T} color={T.dim}>recent damage</MonoLabel>
          <Pressable onPress={() => navigation && navigation.navigate('Transactions')}>
            <MonoLabel T={T} color={accent} size={10}>see all →</MonoLabel>
          </Pressable>
        </View>
        <Rule T={T} />
        {recent.length === 0 && (
          <MonoLabel T={T} color={T.faint} size={11} style={{ paddingVertical: 16 }}>
            nothing logged this month. either budgeting or lying.
          </MonoLabel>
        )}
        {recent.map((tx) => (
          <View key={tx.id}>
            <TxRow T={T} tx={tx} onPress={() => openTx(tx)} />
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
