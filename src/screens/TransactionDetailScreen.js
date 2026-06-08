import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import Animated, { FadeInDown, FadeIn, ZoomIn } from 'react-native-reanimated';
import { COLORS, CATEGORIES, RADII, shadow } from '../constants';
import { updateTransactionCategory } from '../services/supabase';
import Bouncy from '../components/Bouncy';

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
    setCategoryId(newId);
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
        <Bouncy scaleTo={0.9} onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>✕</Text>
        </Bouncy>
        <Text style={styles.title}>Transaction</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={ZoomIn.springify().damping(13)} style={[styles.iconCircle, { backgroundColor: cat.color + '26' }, shadow(cat.color, 16, 0.4)]}>
          <Text style={styles.iconText}>{cat.icon}</Text>
        </Animated.View>

        <Animated.Text entering={FadeInDown.delay(80).springify()}
          style={[styles.amount, { color: tx.type === 'debit' ? COLORS.debit : COLORS.credit }]}>
          {tx.type === 'debit' ? '-' : '+'}₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(120).springify()} style={styles.merchant}>{tx.merchant}</Animated.Text>
        <Animated.Text entering={FadeInDown.delay(160).springify()} style={styles.dateStr}>
          {date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </Animated.Text>

        <Animated.View entering={FadeInDown.delay(220).springify()} style={styles.details}>
          <Bouncy scaleTo={0.98} style={styles.detailRow} onPress={() => setPicking(true)}>
            <Text style={styles.detailLabel}>Category</Text>
            <Text style={styles.detailValue}>
              {cat.icon} {cat.label}  <Text style={styles.editHint}>{saving ? 'Saving…' : 'Edit'}</Text>
            </Text>
          </Bouncy>
          <DetailRow label="Type" value={tx.type === 'debit' ? 'Debit' : 'Credit'} />
          <DetailRow label="Source" value={tx.source} last />
        </Animated.View>
      </ScrollView>

      <Modal visible={picking} transparent animationType="fade" onRequestClose={() => setPicking(false)}>
        <Bouncy haptic={false} scaleTo={1} style={styles.modalBg} onPress={() => setPicking(false)}>
          <Animated.View entering={FadeInDown.springify().damping(16)} style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Change category</Text>
            <View style={styles.chipWrap}>
              {CATEGORIES.map(c => {
                const active = c.id === categoryId;
                return (
                  <Bouncy key={c.id} scaleTo={0.93}
                    style={[styles.chip, active && { backgroundColor: c.color + '33', borderColor: c.color }]}
                    onPress={() => changeCategory(c.id)}>
                    <Text style={styles.chipText}>{c.icon} {c.label}</Text>
                  </Bouncy>
                );
              })}
            </View>
          </Animated.View>
        </Bouncy>
      </Modal>
    </SafeAreaView>
  );
}

function DetailRow({ label, value, last }) {
  return (
    <View style={[styles.detailRow, last && { borderBottomWidth: 0 }]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  backBtn: { width: 40, height: 40, borderRadius: RADII.pill, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
  backText: { color: COLORS.textSecondary, fontSize: 18, fontWeight: '700' },
  title: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  content: { padding: 24, alignItems: 'center' },
  iconCircle: { width: 88, height: 88, borderRadius: RADII.xl, alignItems: 'center', justifyContent: 'center', marginBottom: 22 },
  iconText: { fontSize: 40 },
  amount: { fontSize: 44, fontWeight: '900', letterSpacing: -1 },
  merchant: { fontSize: 22, fontWeight: '800', color: COLORS.text, marginTop: 8 },
  dateStr: { fontSize: 14, color: COLORS.textMuted, marginTop: 6, marginBottom: 32 },
  details: { width: '100%', backgroundColor: COLORS.surface, borderRadius: RADII.lg, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  detailLabel: { fontSize: 14, color: COLORS.textMuted },
  detailValue: { fontSize: 14, color: COLORS.text, fontWeight: '700' },
  editHint: { fontSize: 12, color: COLORS.primary, fontWeight: '800' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: COLORS.surfaceElevated, borderTopLeftRadius: RADII.xl, borderTopRightRadius: RADII.xl, padding: 20, paddingBottom: 34 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text, marginBottom: 16 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surface, borderRadius: RADII.pill, paddingHorizontal: 16, paddingVertical: 11 },
  chipText: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
});
