import React, { useState, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, TextInput, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { COLORS, CATEGORIES } from '../constants';
import { useAuth } from '../hooks/useAuth';
import { useTransactions } from '../hooks/useTransactions';

function formatINR(n) {
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

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

  const filtered = useMemo(() => {
    return transactions.filter(tx => {
      if (filterType !== 'all' && tx.type !== filterType) return false;
      if (search && !tx.merchant.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [transactions, filterType, search]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Transactions</Text>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.search}
          placeholder="Search merchant..."
          placeholderTextColor={COLORS.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={styles.filters}>
        {['all', 'debit', 'credit'].map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filter, filterType === f && styles.filterActive]}
            onPress={() => setFilterType(f)}
          >
            <Text style={[styles.filterText, filterType === f && styles.filterTextActive]}>
              {f === 'all' ? 'All' : f === 'debit' ? 'Spent' : 'Received'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        onRefresh={refetch}
        refreshing={loading}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        ListEmptyComponent={
          <Text style={styles.empty}>No transactions found.</Text>
        }
        renderItem={({ item: tx }) => {
          const cat = CATEGORIES.find(c => c.id === tx.category) || CATEGORIES[CATEGORIES.length - 1];
          const date = new Date(tx.txn_date);
          return (
            <TouchableOpacity
              style={styles.txCard}
              onPress={() => navigation.navigate('TransactionDetail', { tx })}
            >
              <View style={[styles.txIcon, { backgroundColor: cat.color + '22' }]}>
                <Text style={styles.txIconText}>{cat.icon}</Text>
              </View>
              <View style={styles.txInfo}>
                <Text style={styles.txMerchant} numberOfLines={1}>{tx.merchant}</Text>
                <Text style={styles.txMeta}>
                  {cat.label} · {date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </Text>
              </View>
              <Text style={[styles.txAmount, { color: tx.type === 'debit' ? COLORS.debit : COLORS.credit }]}>
                {tx.type === 'debit' ? '-' : '+'}{formatINR(tx.amount)}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: 24, paddingBottom: 8 },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.text },
  searchRow: { paddingHorizontal: 16, marginBottom: 10 },
  search: {
    backgroundColor: COLORS.surface, borderRadius: 12, padding: 14,
    color: COLORS.text, fontSize: 15, borderWidth: 1, borderColor: COLORS.border,
  },
  filters: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 4 },
  filter: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
  },
  filterActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' },
  filterTextActive: { color: '#fff' },
  txCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.surface, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: COLORS.border,
  },
  txIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  txIconText: { fontSize: 20 },
  txInfo: { flex: 1 },
  txMerchant: { fontSize: 15, color: COLORS.text, fontWeight: '600' },
  txMeta: { fontSize: 12, color: COLORS.textMuted, marginTop: 3 },
  txAmount: { fontSize: 16, fontWeight: '700' },
  empty: { color: COLORS.textMuted, textAlign: 'center', padding: 40 },
});
