import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { COLORS, CATEGORIES } from '../constants';
import { updateTransactionCategory } from '../services/supabase';

export default function TransactionDetailScreen({ route }) {
  const navigation = useNavigation();
  const { tx } = route.params;
  const [categoryId, setCategoryId] = useState(tx.category);
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);

  const cat = CATEGORIES.find(c => c.id === categoryId) || CATEGORIES[CATEGORIES.length - 1];
  const date = new Date(tx.txn_date);

  async function changeCategory(newId) {
    setPicking(false);
    if (newId === categoryId) return;
    const prev = categoryId;
    setCategoryId(newId); // optimistic
    setSaving(true);
    const { error } = await updateTransactionCategory(tx.id, newId);
    setSaving(false);
    if (error) {
      setCategoryId(prev);
      Alert.alert('Could not update', error.message);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Transaction</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.iconCircle, { backgroundColor: cat.color + '22' }]}>
          <Text style={styles.iconText}>{cat.icon}</Text>
        </View>

        <Text style={[styles.amount, { color: tx.type === 'debit' ? COLORS.debit : COLORS.credit }]}>
          {tx.type === 'debit' ? '-' : '+'}₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </Text>
        <Text style={styles.merchant}>{tx.merchant}</Text>
        <Text style={styles.dateStr}>
          {date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </Text>

        <View style={styles.details}>
          <TouchableOpacity style={styles.detailRow} onPress={() => setPicking(true)}>
            <Text style={styles.detailLabel}>Category</Text>
            <Text style={styles.detailValue}>
              {cat.icon} {cat.label}  <Text style={styles.editHint}>{saving ? 'Saving…' : 'Edit'}</Text>
            </Text>
          </TouchableOpacity>
          <DetailRow label="Type" value={tx.type === 'debit' ? 'Debit' : 'Credit'} />
          <DetailRow label="Source" value={tx.source} />
        </View>
      </ScrollView>

      <Modal visible={picking} transparent animationType="slide" onRequestClose={() => setPicking(false)}>
        <TouchableOpacity style={styles.modalBg} activeOpacity={1} onPress={() => setPicking(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Change category</Text>
            <View style={styles.chipWrap}>
              {CATEGORIES.map(c => {
                const active = c.id === categoryId;
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.chip, active && { backgroundColor: c.color + '33', borderColor: c.color }]}
                    onPress={() => changeCategory(c.id)}
                  >
                    <Text style={styles.chipText}>{c.icon} {c.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

function DetailRow({ label, value }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backText: { color: COLORS.textSecondary, fontSize: 18 },
  title: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  content: { padding: 24, alignItems: 'center' },
  iconCircle: { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  iconText: { fontSize: 36 },
  amount: { fontSize: 42, fontWeight: '800', letterSpacing: -1 },
  merchant: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginTop: 8 },
  dateStr: { fontSize: 14, color: COLORS.textMuted, marginTop: 6, marginBottom: 32 },
  details: { width: '100%', backgroundColor: COLORS.surface, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden', marginBottom: 20 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  detailLabel: { fontSize: 14, color: COLORS.textMuted },
  detailValue: { fontSize: 14, color: COLORS.text, fontWeight: '600' },
  editHint: { fontSize: 12, color: COLORS.primary, fontWeight: '700' },
  smsBox: { width: '100%', backgroundColor: COLORS.surface, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, padding: 16 },
  smsLabel: { fontSize: 12, color: COLORS.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  smsText: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: COLORS.surfaceElevated, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32 },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10 },
  chipText: { color: COLORS.text, fontSize: 14, fontWeight: '500' },
});
