import React, { useState, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { COLORS, CATEGORIES, RADII } from '../constants';
import { useAuth } from '../hooks/useAuth';
import { useTransactions } from '../hooks/useTransactions';
import Bouncy from '../components/Bouncy';

const fmtINR = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'debit', label: 'Spent' },
  { key: 'credit', label: 'Received' },
];

export default function TransactionsScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');

  const fromDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d;
  }, []);

  const { transactions, loading, refetch } = useTransactions(user?.id, { fromDate, limit: 200 });

  const filtered = useMemo(() => transactions.filter(tx => {
    if (filterType !== 'all' && tx.type !== filterType) return false;
    if (search && !tx.merchant.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [transactions, filterType, search]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Transactions</Text>
      </View>

      <View style={styles.searchRow}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.search}
          placeholder="Search merchant…"
          placeholderTextColor={COLORS.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={styles.filters}>
        {FILTERS.map(f => {
          const active = filterType === f.key;
          return (
            <Bouncy key={f.key} scaleTo={0.95} onPress={() => setFilterType(f.key)}
              style={[styles.filter, active && styles.filterActive]}>
              <Text style={[styles.filterText, active && styles.filterTextActive]}>{f.label}</Text>
            </Bouncy>
          );
        })}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        onRefresh={refetch}
        refreshing={loading}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingTop: 8, gap: 10 }}
        ListEmptyComponent={<Text style={styles.empty}>No transactions found.</Text>}
        renderItem={({ item: tx, index }) => {
          const cat = CATEGORIES.find(c => c.id === tx.category) || CATEGORIES[CATEGORIES.length - 1];
          const date = new Date(tx.txn_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
          return (
            <Animated.View entering={FadeInDown.delay(Math.min(index * 35, 350)).springify().damping(16)}>
              <Bouncy scaleTo={0.97} style={styles.txCard}
                onPress={() => navigation.navigate('TransactionDetail', { tx })}>
                <View style={[styles.txIcon, { backgroundColor: cat.color + '26' }]}>
                  <Text style={styles.txIconText}>{cat.icon}</Text>
                </View>
                <View style={styles.txInfo}>
                  <Text style={styles.txMerchant} numberOfLines={1}>{tx.merchant}</Text>
                  <Text style={styles.txMeta}>{cat.label} · {date}</Text>
                </View>
                <Text style={[styles.txAmount, { color: tx.type === 'debit' ? COLORS.debit : COLORS.credit }]}>
                  {tx.type === 'debit' ? '-' : '+'}{fmtINR(tx.amount)}
                </Text>
              </Bouncy>
            </Animated.View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: 24, paddingBottom: 10 },
  title: { fontSize: 28, fontWeight: '900', color: COLORS.text, letterSpacing: -0.5 },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 12,
    backgroundColor: COLORS.surface, borderRadius: RADII.lg, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 14,
  },
  searchIcon: { fontSize: 15, marginRight: 8 },
  search: { flex: 1, paddingVertical: 14, color: COLORS.text, fontSize: 15 },
  filters: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 4 },
  filter: {
    paddingHorizontal: 18, paddingVertical: 9, borderRadius: RADII.pill,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
  },
  filterActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '700' },
  filterTextActive: { color: '#fff' },
  txCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.surface, borderRadius: RADII.md, padding: 14,
    borderWidth: 1, borderColor: COLORS.border,
  },
  txIcon: { width: 46, height: 46, borderRadius: RADII.md, alignItems: 'center', justifyContent: 'center' },
  txIconText: { fontSize: 20 },
  txInfo: { flex: 1 },
  txMerchant: { fontSize: 15, color: COLORS.text, fontWeight: '700' },
  txMeta: { fontSize: 12, color: COLORS.textMuted, marginTop: 3 },
  txAmount: { fontSize: 16, fontWeight: '800' },
  empty: { color: COLORS.textMuted, textAlign: 'center', padding: 40 },
});
