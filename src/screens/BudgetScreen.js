import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, CATEGORIES } from '../constants';
import { useAuth } from '../hooks/useAuth';
import { getBudgets, upsertBudget } from '../services/supabase';
import { useSpendingByCategory } from '../hooks/useTransactions';

function startOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export default function BudgetScreen() {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState({});
  const [editing, setEditing] = useState(null);
  const [inputVal, setInputVal] = useState('');
  const [saving, setSaving] = useState(false);

  const { spending } = useSpendingByCategory(user?.id, {
    fromDate: startOfMonth(),
    toDate: new Date(),
  });

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
    await upsertBudget({
      user_id: user.id,
      category: categoryId,
      monthly_limit: limit,
      alert_threshold: 0.8,
    });
    setBudgets(prev => ({
      ...prev,
      [categoryId]: { category: categoryId, monthly_limit: limit, alert_threshold: 0.8 },
    }));
    setEditing(null);
    setInputVal('');
    setSaving(false);
  }

  const spentMap = {};
  spending.forEach(s => { spentMap[s.id] = s.amount; });

  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.title}>Budgets</Text>
      <Text style={styles.subtitle}>Set monthly limits. Get alerted at 80%.</Text>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
        {CATEGORIES.filter(c => c.id !== 'transfer').map(cat => {
          const budget = budgets[cat.id];
          const spent = spentMap[cat.id] || 0;
          const ratio = budget ? spent / budget.monthly_limit : 0;
          const isEditing = editing === cat.id;

          return (
            <View key={cat.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.catIcon}>{cat.icon}</Text>
                <View style={styles.catInfo}>
                  <Text style={styles.catLabel}>{cat.label}</Text>
                  {budget && (
                    <Text style={styles.catSub}>
                      ₹{spent.toLocaleString('en-IN', { maximumFractionDigits: 0 })} of ₹{budget.monthly_limit.toLocaleString('en-IN')}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setEditing(isEditing ? null : cat.id);
                    setInputVal(budget?.monthly_limit?.toString() || '');
                  }}
                  style={styles.editBtn}
                >
                  <Text style={styles.editBtnText}>{budget ? 'Edit' : 'Set'}</Text>
                </TouchableOpacity>
              </View>

              {budget && !isEditing && (
                <View style={styles.progressBg}>
                  <View style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(ratio * 100, 100)}%`,
                      backgroundColor: ratio >= 1 ? COLORS.danger : ratio >= 0.8 ? COLORS.warning : cat.color,
                    },
                  ]} />
                </View>
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
                  <TouchableOpacity
                    style={styles.saveBtn}
                    onPress={() => saveBudget(cat.id)}
                    disabled={saving}
                  >
                    {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Save</Text>}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.text, padding: 24, paddingBottom: 4 },
  subtitle: { fontSize: 14, color: COLORS.textMuted, paddingHorizontal: 24, marginBottom: 8 },
  card: {
    backgroundColor: COLORS.surface, borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: COLORS.border,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  catIcon: { fontSize: 22 },
  catInfo: { flex: 1 },
  catLabel: { fontSize: 15, color: COLORS.text, fontWeight: '600' },
  catSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  editBtn: { backgroundColor: COLORS.surfaceElevated, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  editBtnText: { color: COLORS.primary, fontSize: 13, fontWeight: '700' },
  progressBg: { height: 4, backgroundColor: COLORS.border, borderRadius: 2, marginTop: 12 },
  progressFill: { height: 4, borderRadius: 2 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  rupee: { color: COLORS.textSecondary, fontSize: 18, fontWeight: '600' },
  input: {
    flex: 1, backgroundColor: COLORS.surfaceElevated, borderRadius: 10,
    padding: 10, color: COLORS.text, fontSize: 16, borderWidth: 1, borderColor: COLORS.border,
  },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
