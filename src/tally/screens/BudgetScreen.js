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
import { createPurchasePlan } from '../../services/aiAdvice';

// Categories you can set a "delusion" (budget) on — skip transfers/other/investment.
const BUDGETABLE = ['rent', 'food', 'shopping', 'entertainment', 'utilities', 'transport', 'health'];

export default function BudgetScreen() {
  const { T, accent, accentInk, store, income, isPremium, openPaywall } = useTally();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [budgets, setBudgets] = useState({});   // { category: monthly_limit }
  const [editing, setEditing] = useState(null);
  const [inputVal, setInputVal] = useState('');
  const [saving, setSaving] = useState(false);
  const [goal, setGoal] = useState('');
  const [goalCost, setGoalCost] = useState('');
  const [goalMonths, setGoalMonths] = useState('');
  const [plan, setPlan] = useState(null);
  const [planning, setPlanning] = useState(false);

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
    const { error } = await deleteBudget(user.id, catId);
    if (error) { Alert.alert('Delete failed', error.message || 'Try again.'); return; }
    setBudgets((prev) => { const next = { ...prev }; delete next[catId]; return next; });
    if (editing === catId) setEditing(null);
  }

  async function save(catId) {
    const limit = Number(inputVal.replace(/[^0-9]/g, ''));
    if (!limit || limit <= 0) { Alert.alert('Invalid', 'Enter a positive amount.'); return; }
    setSaving(true);
    const { error } = await upsertBudget({ user_id: user.id, category: catId, monthly_limit: limit, alert_threshold: 0.8 });
    setSaving(false);
    if (error) { Alert.alert('Save failed', error.message || 'Try again.'); return; }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setBudgets((prev) => ({ ...prev, [catId]: limit }));
    setEditing(null);
    setInputVal('');
  }

  const setCats = BUDGETABLE.filter((id) => budgets[id] != null);
  const totalLimit = setCats.reduce((a, id) => a + budgets[id], 0);
  const totalSpent = setCats.reduce((a, id) => a + (spentMap[id] || 0), 0);
  const over = totalLimit > 0 ? ((totalSpent - totalLimit) / totalLimit) * 100 : 0;

  const now = new Date();
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = daysInMonth - dayOfMonth;

  async function makePlan() {
    if (!isPremium) { openPaywall(); return; }
    const name = goal.trim();
    const cost = Number(goalCost.replace(/[,\s₹]/g, ''));
    const months = Number(goalMonths);
    if (!name || name.length > 80 || !Number.isFinite(cost) || cost <= 0 || cost > 1e9 ||
      !Number.isInteger(months) || months < 1 || months > 60) {
      Alert.alert('Check your goal', 'Add an item, a positive price, and a timeframe from 1 to 60 months.');
      return;
    }
    const currentTxs = store.allTxs.filter(tx => {
      if (!tx.txn_date) return false;
      const date = new Date(tx.txn_date);
      return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    });
    const categories = groupByCat(currentTxs).slice(0, 10)
      .map(cat => ({ label: cat.label, amount: Math.round(cat.amount) }));
    const spent = currentTxs.filter(tx => tx.type !== 'credit')
      .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
    setPlanning(true);
    setPlan(null);
    try {
      const text = await createPurchasePlan({ goal: name, cost, months,
        income: income || null, spent: Math.round(spent), categories });
      setPlan({ goal: name, cost, months, text });
    } catch (error) {
      Alert.alert('Plan unavailable', error.message);
    } finally {
      setPlanning(false);
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: T.bg }}
      contentContainerStyle={{ paddingHorizontal: 18, paddingTop: insets.top + 14, paddingBottom: 120 }}>
      <ScreenHeader T={T} accent={accent} title="delusions" sub="the limits you set · vs reality" />

      <View style={{ marginTop: 18, padding: 18, backgroundColor: T.card,
        borderWidth: 1, borderColor: T.line, borderRadius: 16 }}>
        <MonoLabel T={T} color={accent} size={10}>TALLY PRO · PURCHASE PLAN</MonoLabel>
        <Text style={{ fontFamily: FONTS.display, fontSize: 25, color: T.text, marginTop: 8 }}>
          want to buy something?
        </Text>
        <Text style={{ fontFamily: FONTS.sans, fontSize: 13, lineHeight: 19,
          color: T.dim, marginTop: 5, marginBottom: 14 }}>
          Tell Tally what it is, the price and when you want it. Get a monthly savings target and a plan based on your spending.
        </Text>
        <TextInput value={goal} onChangeText={value => { setGoal(value); setPlan(null); }}
          maxLength={80} placeholder="what do you want to buy?" accessibilityLabel="Item to buy"
          placeholderTextColor={T.faint}
          style={{ backgroundColor: T.bg, borderWidth: 1, borderColor: T.line,
            borderRadius: 8, padding: 11, color: T.text, fontFamily: FONTS.sans, marginBottom: 8 }} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput value={goalCost} onChangeText={value => { setGoalCost(value); setPlan(null); }}
            keyboardType="numeric" placeholder="price ₹" accessibilityLabel="Purchase price in rupees"
            placeholderTextColor={T.faint}
            style={{ flex: 1, backgroundColor: T.bg, borderWidth: 1, borderColor: T.line,
              borderRadius: 8, padding: 11, color: T.text, fontFamily: FONTS.mono, minWidth: 0 }} />
          <TextInput value={goalMonths} onChangeText={value => { setGoalMonths(value); setPlan(null); }}
            keyboardType="number-pad" placeholder="months" accessibilityLabel="Months to save"
            placeholderTextColor={T.faint}
            style={{ flex: 1, backgroundColor: T.bg, borderWidth: 1, borderColor: T.line,
              borderRadius: 8, padding: 11, color: T.text, fontFamily: FONTS.mono, minWidth: 0 }} />
        </View>
        {Number(goalCost.replace(/[,\s₹]/g, '')) > 0 && Number(goalMonths) > 0 && (
          <MonoLabel T={T} color={T.dim} size={10} style={{ marginTop: 10 }}>
            target: {fmtINR(Math.ceil(Number(goalCost.replace(/[,\s₹]/g, '')) / Number(goalMonths)))} per month
          </MonoLabel>
        )}
        <Pressable onPress={makePlan} disabled={planning}
          style={{ marginTop: 14, padding: 12, borderRadius: 8, backgroundColor: accent,
            alignItems: 'center', opacity: planning ? 0.6 : 1 }}>
          {planning ? <ActivityIndicator color={accentInk} size="small" />
            : <Text style={{ color: accentInk, fontFamily: FONTS.monoBold, fontSize: 12 }}>
                {isPremium ? 'MAKE MY PLAN' : 'UNLOCK PLAN WITH PRO ↗'}
              </Text>}
        </Pressable>
        {plan && (
          <View style={{ marginTop: 14, padding: 13, borderRadius: 8, backgroundColor: T.bg }}>
            <MonoLabel T={T} color={accent} size={10}>{plan.goal} · {fmtINR(plan.cost)} · {plan.months} months</MonoLabel>
            <Text style={{ color: T.text, fontFamily: FONTS.sans, fontSize: 13,
              lineHeight: 20, marginTop: 8 }}>{plan.text}</Text>
          </View>
        )}
      </View>

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
            set a monthly limit for any category below. We'll tell you when you're about to blow it, and when you already have.
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
