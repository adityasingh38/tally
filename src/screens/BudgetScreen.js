import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, useSharedValue, useAnimatedStyle, withSpring, withDelay } from 'react-native-reanimated';
import { COLORS, CATEGORIES, RADII } from '../constants';
import { useAuth } from '../hooks/useAuth';
import { getBudgets, upsertBudget } from '../services/supabase';
import { useSpendingByCategory } from '../hooks/useTransactions';
import Bouncy from '../components/Bouncy';

function startOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
const fmtINR = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`;

export default function BudgetScreen() {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState({});
  const [editing, setEditing] = useState(null);
  const [inputVal, setInputVal] = useState('');
  const [saving, setSaving] = useState(false);

  const fromDate = useMemo(() => startOfMonth(), []);
  const toDate = useMemo(() => new Date(), []);
  const { spending } = useSpendingByCategory(user?.id, { fromDate, toDate });

  useEffect(() => {
    if (!user) return;
    getBudgets(user.id).then(({ data }) => {
      if (!data) return;
      const map = {};
      data.forEach(b => { map[b.category] = b; });
      setBudgets(map);
    });
  }, [user]);

  async function saveBudget(categoryId) {
    const limit = parseFloat(inputVal);
    if (!limit || limit <= 0) {
      Alert.alert('Invalid', 'Enter a positive amount.');
      return;
    }
    setSaving(true);
    await upsertBudget({ user_id: user.id, category: categoryId, monthly_limit: limit, alert_threshold: 0.8 });
    setBudgets(prev => ({ ...prev, [categoryId]: { category: categoryId, monthly_limit: limit, alert_threshold: 0.8 } }));
    setEditing(null);
    setInputVal('');
    setSaving(false);
  }

  const spentMap = {};
  spending.forEach(s => { spentMap[s.id] = s.amount; });

  return (
    <SafeAreaView style={styles.safe}>
      <Animated.View entering={FadeInDown.springify()}>
        <Text style={styles.title}>Budgets 🎯</Text>
        <Text style={styles.subtitle}>Set monthly limits. Get nudged at 80%.</Text>
      </Animated.View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} showsVerticalScrollIndicator={false}>
        {CATEGORIES.filter(c => c.id !== 'transfer').map((cat, i) => {
          const budget = budgets[cat.id];
          const spent = spentMap[cat.id] || 0;
          const ratio = budget ? spent / budget.monthly_limit : 0;
          const isEditing = editing === cat.id;

          return (
            <Animated.View key={cat.id} entering={FadeInDown.delay(i * 50).springify().damping(16)} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconWrap, { backgroundColor: cat.color + '22' }]}>
                  <Text style={styles.catIcon}>{cat.icon}</Text>
                </View>
                <View style={styles.catInfo}>
                  <Text style={styles.catLabel}>{cat.label}</Text>
                  {budget && (
                    <Text style={styles.catSub}>{fmtINR(spent)} of {fmtINR(budget.monthly_limit)}</Text>
                  )}
                </View>
                <Bouncy scaleTo={0.93}
                  onPress={() => { setEditing(isEditing ? null : cat.id); setInputVal(budget?.monthly_limit?.toString() || ''); }}
                  style={styles.editBtn}>
                  <Text style={styles.editBtnText}>{budget ? 'Edit' : 'Set'}</Text>
                </Bouncy>
              </View>

              {budget && !isEditing && (
                <ProgressBar ratio={ratio} color={cat.color} index={i} />
              )}

              {isEditing && (
                <View style={styles.inputRow}>
                  <Text style={styles.rupee}>₹</Text>
                  <TextInput
                    style={styles.input}
                    value={inputVal}
                    onChangeText={setInputVal}
                    keyboardType="numeric"
                    placeholder="Monthly limit"
                    placeholderTextColor={COLORS.textMuted}
                    autoFocus
                  />
                  <Bouncy scaleTo={0.93} style={styles.saveBtn} onPress={() => saveBudget(cat.id)} disabled={saving}>
                    {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Save</Text>}
                  </Bouncy>
                </View>
              )}
            </Animated.View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

function ProgressBar({ ratio, color, index }) {
  const frac = Math.min(ratio, 1);
  const fillColor = ratio >= 1 ? COLORS.danger : ratio >= 0.8 ? COLORS.warning : color;
  const [trackW, setTrackW] = useState(0);
  const w = useSharedValue(0);
  useEffect(() => {
    if (trackW > 0) {
      w.value = withDelay(200 + index * 50, withSpring(trackW * frac, { damping: 14, stiffness: 110 }));
    }
  }, [trackW, frac]);
  const barStyle = useAnimatedStyle(() => ({ width: w.value }));
  return (
    <View style={styles.progressBg} onLayout={e => setTrackW(e.nativeEvent.layout.width)}>
      <Animated.View style={[styles.progressFill, { backgroundColor: fillColor }, barStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  title: { fontSize: 28, fontWeight: '900', color: COLORS.text, paddingHorizontal: 24, paddingTop: 24, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: COLORS.textMuted, paddingHorizontal: 24, marginTop: 4, marginBottom: 8 },
  card: { backgroundColor: COLORS.surface, borderRadius: RADII.lg, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: { width: 40, height: 40, borderRadius: RADII.md, alignItems: 'center', justifyContent: 'center' },
  catIcon: { fontSize: 20 },
  catInfo: { flex: 1 },
  catLabel: { fontSize: 15, color: COLORS.text, fontWeight: '700' },
  catSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  editBtn: { backgroundColor: COLORS.surfaceElevated, borderRadius: RADII.pill, paddingHorizontal: 16, paddingVertical: 8 },
  editBtnText: { color: COLORS.primary, fontSize: 13, fontWeight: '800' },
  progressBg: { height: 8, backgroundColor: COLORS.surfaceElevated, borderRadius: RADII.pill, marginTop: 14, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: RADII.pill },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  rupee: { color: COLORS.textSecondary, fontSize: 18, fontWeight: '700' },
  input: { flex: 1, backgroundColor: COLORS.surfaceElevated, borderRadius: RADII.md, padding: 12, color: COLORS.text, fontSize: 16, borderWidth: 1, borderColor: COLORS.border },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: RADII.md, paddingHorizontal: 18, paddingVertical: 12 },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
});
