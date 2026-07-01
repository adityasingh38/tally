// src/tally/screens/BudgetScreen.js  → your "Budget" tab ("delusions")
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Alert, ActivityIndicator } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTally } from '../TallyContext';
import { useAuth } from '../../hooks/useAuth';
import { getBudgets, upsertBudget, deleteBudget } from '../../services/supabase';
import { FONTS, fmtINR } from '../theme';
import { MonoLabel, ScreenHeader, Tag } from '../ui';
import { groupByCat, CAT_META } from '../data';

// Categories you can set a "delusion" (budget) on — skip transfers/other/investment.
const BUDGETABLE = ['rent', 'food', 'shopping', 'entertainment', 'utilities', 'transport', 'health'];

export default function BudgetScreen() {
  const { T, accent, accentInk, store } = useTally();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [budgets, setBudgets] = useState({});   // { category: monthly_limit }
  const [editing, setEditing] = useState(null);
  const [inputVal, setInputVal] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    getBudgets(user.id).then(({ data }) => {
      if (!data) return;
      const map = {};
      data.forEach((b) => { map[b.category] = b.monthly_limit; });
      setBudgets(map);
    });
  }, [user]);

  // real spend per category from the live store
  const spentMap = {};
  groupByCat(store.txs).forEach((c) => { spentMap[c.id] = c.amount; });

  async function removeBudget(catId) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await deleteBudget(user.id, catId);
    setBudgets((prev) => { const next = { ...prev }; delete next[catId]; return next; });
    if (editing === catId) setEditing(null);
  }

  async function save(catId) {
    const limit = Number(inputVal.replace(/[^0-9]/g, ''));
    if (!limit || limit <= 0) { Alert.alert('Invalid', 'Enter a positive amount.'); return; }
    setSaving(true);
    await upsertBudget({ user_id: user.id, category: catId, monthly_limit: limit, alert_threshold: 0.8 });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setBudgets((prev) => ({ ...prev, [catId]: limit }));
    setEditing(null);
    setInputVal('');
    setSaving(false);
  }

  const setCats = BUDGETABLE.filter((id) => budgets[id] != null);
  const totalLimit = setCats.reduce((a, id) => a + budgets[id], 0);
  const totalSpent = setCats.reduce((a, id) => a + (spentMap[id] || 0), 0);
  const over = totalLimit > 0 ? ((totalSpent - totalLimit) / totalLimit) * 100 : 0;

  const now = new Date();
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = daysInMonth - dayOfMonth;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: T.bg }}
      contentContainerStyle={{ paddingHorizontal: 18, paddingTop: insets.top + 14, paddingBottom: 120 }}>
      <ScreenHeader T={T} accent={accent} title="delusions" sub="the limits you set · vs reality" />

      {/* summary — only when at least one budget is set */}
      {totalLimit > 0 && (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 8 }}>
            <View>
              <MonoLabel T={T} color={T.dim}>the plan</MonoLabel>
              <Text style={{ fontFamily: FONTS.display, fontSize: 30, color: T.text }}>{fmtINR(totalLimit)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <MonoLabel T={T} color={T.dim}>the reality</MonoLabel>
              <Text style={{ fontFamily: FONTS.display, fontSize: 30, color: accent }}>{fmtINR(totalSpent)}</Text>
            </View>
          </View>
          {over > 0 && (
            <View style={{ marginTop: 14 }}>
              <Tag T={T} accent={accent} accentInk={accentInk} rotate={-1}>OVER BY {Math.round(over)}% · A BOLD STRATEGY</Tag>
            </View>
          )}
        </>
      )}

      {/* empty state */}
      {setCats.length === 0 && (
        <View style={{ marginTop: 24, backgroundColor: T.card, borderWidth: 1, borderColor: T.line, borderRadius: 16, padding: 20 }}>
          <MonoLabel T={T} color={T.dim} size={10.5}>no delusions set yet.</MonoLabel>
          <Text style={{ fontFamily: FONTS.sans, fontSize: 14, lineHeight: 20, color: T.dim, marginTop: 8 }}>
            set a monthly limit for any category below. we'll tell you when you're about to blow it — and when you already have.
          </Text>
        </View>
      )}

      {/* per-category */}
      <View style={{ marginTop: 26, gap: 18 }}>
        {BUDGETABLE.map((id) => {
          const meta = CAT_META[id] || { label: id, tag: id.toUpperCase() };
          const limit = budgets[id];
          const spent = spentMap[id] || 0;
          const pct = limit ? (spent / limit) * 100 : 0;
          const blown = pct > 100;
          const isEditing = editing === id;
          // forecast: daily average × remaining days → projected total
          const dailyAvg = dayOfMonth > 0 ? spent / dayOfMonth : 0;
          const projected = spent + dailyAvg * daysLeft;
          const projectedBlowDay = dailyAvg > 0 && limit && !blown
            ? Math.ceil((limit - spent) / dailyAvg) : null;
          const willBlow = projectedBlowDay != null && projectedBlowDay < daysLeft;

          return (
            <View key={id}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 7 }}>
                <Text style={{ fontFamily: FONTS.sansSemi, fontSize: 15, color: T.text }}>{meta.label}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  {limit != null && (
                    <Text style={{ fontFamily: FONTS.mono, fontSize: 12.5, color: T.dim }}>
                      {fmtINR(spent)} <Text style={{ color: T.faint }}>/ {fmtINR(limit)}</Text>
                    </Text>
                  )}
                  <Pressable onPress={() => { setEditing(isEditing ? null : id); setInputVal(limit != null ? String(limit) : ''); }}>
                    <MonoLabel T={T} color={accent} size={10}>{limit != null ? 'edit' : 'set'}</MonoLabel>
                  </Pressable>
                  {limit != null && (
                    <Pressable onPress={() => removeBudget(id)}>
                      <MonoLabel T={T} color={T.red} size={10}>✕</MonoLabel>
                    </Pressable>
                  )}
                </View>
              </View>

              {limit != null && !isEditing && (
                <>
                  <View style={{ height: 9, borderRadius: 999, backgroundColor: T.chip, overflow: 'hidden', flexDirection: 'row' }}>
                    <View style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: blown ? accent : T.lineStrong }} />
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                    <MonoLabel T={T} color={blown ? accent : T.faint} size={10}>
                      {blown ? `blew past by ${Math.round(pct - 100)}%` : `${Math.round(pct)}% used · for now`}
                    </MonoLabel>
                    {!blown && willBlow && (
                      <MonoLabel T={T} color={accent} size={10}>
                        {projectedBlowDay === 0 ? 'hits limit today' : `hits limit in ~${projectedBlowDay}d`}
                      </MonoLabel>
                    )}
                    {!blown && !willBlow && limit && (
                      <MonoLabel T={T} color={T.creditText} size={10}>
                        projected: {fmtINR(Math.round(projected))} / {fmtINR(limit)}
                      </MonoLabel>
                    )}
                  </View>
                </>
              )}

              {isEditing && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <Text style={{ color: T.dim, fontSize: 18, fontFamily: FONTS.sansBold }}>₹</Text>
                  <TextInput
                    value={inputVal}
                    onChangeText={setInputVal}
                    keyboardType="numeric"
                    placeholder="monthly limit"
                    placeholderTextColor={T.faint}
                    autoFocus
                    style={{ flex: 1, backgroundColor: T.card, borderRadius: 4, paddingVertical: 11, paddingHorizontal: 12,
                      color: T.text, fontSize: 16, fontFamily: FONTS.mono, borderWidth: 1, borderColor: T.line }}
                  />
                  <Pressable onPress={() => save(id)} disabled={saving}
                    style={{ backgroundColor: accent, borderRadius: 4, paddingHorizontal: 18, paddingVertical: 12 }}>
                    {saving ? <ActivityIndicator color={accentInk} size="small" />
                      : <Text style={{ color: accentInk, fontFamily: FONTS.monoBold, fontSize: 13, letterSpacing: 1 }}>SAVE</Text>}
                  </Pressable>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}
