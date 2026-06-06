import React, { useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { COLORS, CATEGORIES } from '../constants';
import { useAuth } from '../hooks/useAuth';
import { useTransactions, useSpendingByCategory } from '../hooks/useTransactions';

function startOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function formatINR(amount) {
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();

  const fromDate = useMemo(() => startOfMonth(), []);
  const toDate = useMemo(() => new Date(), []);
  const freeFromDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d;
  }, []);

  const { transactions, loading, refetch } = useTransactions(user?.id, { fromDate: freeFromDate, limit: 5 });
  const { spending, total } = useSpendingByCategory(user?.id, { fromDate, toDate });

  const topCategory = spending[0];
  const wins = useMemo(() => buildWins(spending, total), [spending, total]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={COLORS.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.headerSub}>Here's your month so far</Text>
          </View>
        </View>

        {/* Total spend card */}
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Spent this month</Text>
          <Text style={styles.totalAmount}>{formatINR(total)}</Text>
          {topCategory && (
            <Text style={styles.totalSub}>
              Most on {topCategory.icon} {topCategory.label} ({formatINR(topCategory.amount)})
            </Text>
          )}
        </View>

        {/* Win banner */}
        {wins.length > 0 && (
          <View style={styles.winBanner}>
            <Text style={styles.winEmoji}>🎉</Text>
            <Text style={styles.winText}>{wins[0]}</Text>
          </View>
        )}

        {/* Category breakdown */}
        {spending.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Where it went</Text>
            {spending.slice(0, 5).map(cat => (
              <CategoryRow key={cat.id} cat={cat} total={total} />
            ))}
          </View>
        )}

        {/* Recent transactions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Transactions')}>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>
          {transactions.slice(0, 5).map(tx => (
            <TransactionRow key={tx.id} tx={tx} onPress={() => navigation.navigate('TransactionDetail', { tx })} />
          ))}
          {transactions.length === 0 && !loading && (
            <Text style={styles.emptyText}>No transactions yet. Enable SMS access in Settings.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function CategoryRow({ cat, total }) {
  const pct = total > 0 ? (cat.amount / total) * 100 : 0;
  return (
    <View style={styles.catRow}>
      <Text style={styles.catIcon}>{cat.icon}</Text>
      <View style={styles.catInfo}>
        <View style={styles.catTop}>
          <Text style={styles.catLabel}>{cat.label}</Text>
          <Text style={styles.catAmount}>₹{cat.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
        </View>
        <View style={styles.barBg}>
          <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: cat.color }]} />
        </View>
      </View>
    </View>
  );
}

function TransactionRow({ tx, onPress }) {
  const cat = CATEGORIES.find(c => c.id === tx.category) || CATEGORIES[CATEGORIES.length - 1];
  const date = new Date(tx.txn_date);
  const dateStr = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

  return (
    <TouchableOpacity style={styles.txRow} onPress={onPress}>
      <View style={[styles.txIcon, { backgroundColor: cat.color + '22' }]}>
        <Text style={styles.txIconText}>{cat.icon}</Text>
      </View>
      <View style={styles.txInfo}>
        <Text style={styles.txMerchant} numberOfLines={1}>{tx.merchant}</Text>
        <Text style={styles.txDate}>{dateStr}</Text>
      </View>
      <Text style={[styles.txAmount, { color: tx.type === 'debit' ? COLORS.debit : COLORS.credit }]}>
        {tx.type === 'debit' ? '-' : '+'}₹{tx.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
      </Text>
    </TouchableOpacity>
  );
}

function buildWins(spending, total) {
  const wins = [];
  const food = spending.find(s => s.id === 'food');
  if (food && total > 0 && food.amount / total < 0.3) {
    wins.push(`Food is only ${Math.round((food.amount / total) * 100)}% of your spend. Great balance.`);
  }
  if (total < 10000) wins.push('Under ₹10,000 this month. Solid.');
  return wins;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingBottom: 8 },
  greeting: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  headerSub: { fontSize: 14, color: COLORS.textSecondary, marginTop: 2 },
  totalCard: {
    margin: 16, marginTop: 8, backgroundColor: COLORS.primary,
    borderRadius: 20, padding: 24,
  },
  totalLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  totalAmount: { fontSize: 40, fontWeight: '800', color: '#fff', marginTop: 4 },
  totalSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 8 },
  winBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    margin: 16, marginTop: 0, backgroundColor: COLORS.success + '22',
    borderRadius: 12, padding: 14, borderWidth: 1, borderColor: COLORS.success + '44',
  },
  winEmoji: { fontSize: 20 },
  winText: { flex: 1, color: COLORS.success, fontSize: 14, fontWeight: '600' },
  section: { margin: 16, marginTop: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  seeAll: { color: COLORS.primary, fontSize: 14, fontWeight: '600' },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  catIcon: { fontSize: 22 },
  catInfo: { flex: 1 },
  catTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  catLabel: { fontSize: 14, color: COLORS.text, fontWeight: '500' },
  catAmount: { fontSize: 14, color: COLORS.text, fontWeight: '600' },
  barBg: { height: 4, backgroundColor: COLORS.border, borderRadius: 2 },
  barFill: { height: 4, borderRadius: 2 },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  txIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  txIconText: { fontSize: 18 },
  txInfo: { flex: 1 },
  txMerchant: { fontSize: 15, color: COLORS.text, fontWeight: '600' },
  txDate: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  txAmount: { fontSize: 15, fontWeight: '700' },
  emptyText: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center', padding: 24 },
});
