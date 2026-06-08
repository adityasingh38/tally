import React, { useMemo, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import Animated, {
  FadeInDown, useSharedValue, useAnimatedStyle, withSpring, withDelay,
} from 'react-native-reanimated';
import { COLORS, CATEGORIES, RADII, GRADIENTS, shadow } from '../constants';
import { useAuth } from '../hooks/useAuth';
import { useTransactions, useSpendingByCategory } from '../hooks/useTransactions';
import Bouncy from '../components/Bouncy';
import AnimatedNumber from '../components/AnimatedNumber';
import Skeleton from '../components/Skeleton';

function startOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
const fmtINR = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`;

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
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={COLORS.primary} />}
      >
        <Animated.View entering={FadeInDown.springify().damping(16)} style={styles.header}>
          <Text style={styles.greeting}>{getGreeting()} 👋</Text>
          <Text style={styles.headerSub}>here's your month so far</Text>
        </Animated.View>

        {/* Hero gradient card */}
        <Animated.View entering={FadeInDown.delay(80).springify().damping(15)} style={styles.heroWrap}>
          <LinearGradient colors={GRADIENTS.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <Text style={styles.heroLabel}>SPENT THIS MONTH</Text>
            <AnimatedNumber value={total} format={fmtINR} style={styles.heroAmount} />
            {topCategory && (
              <View style={styles.heroChip}>
                <Text style={styles.heroChipText}>
                  {topCategory.icon} Most on {topCategory.label} · {fmtINR(topCategory.amount)}
                </Text>
              </View>
            )}
          </LinearGradient>
        </Animated.View>

        {/* Win banner */}
        {wins.length > 0 && (
          <Animated.View entering={FadeInDown.delay(160).springify()} style={styles.winBanner}>
            <Text style={styles.winEmoji}>🎉</Text>
            <Text style={styles.winText}>{wins[0]}</Text>
          </Animated.View>
        )}

        {/* Category breakdown */}
        {spending.length > 0 && (
          <Animated.View entering={FadeInDown.delay(220).springify()} style={styles.section}>
            <Text style={styles.sectionTitle}>Where it went</Text>
            {spending.slice(0, 5).map((cat, i) => (
              <CategoryRow key={cat.id} cat={cat} total={total} index={i} />
            ))}
          </Animated.View>
        )}

        {/* Recent */}
        <Animated.View entering={FadeInDown.delay(280).springify()} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent</Text>
            <Bouncy haptic={false} scaleTo={0.92} onPress={() => navigation.navigate('Transactions')}>
              <Text style={styles.seeAll}>See all →</Text>
            </Bouncy>
          </View>

          {loading && transactions.length === 0 && (
            <View style={{ gap: 12 }}>
              {[0, 1, 2].map(i => <Skeleton key={i} height={56} radius={RADII.md} />)}
            </View>
          )}

          {transactions.slice(0, 5).map((tx, i) => (
            <Animated.View key={tx.id} entering={FadeInDown.delay(320 + i * 60).springify()}>
              <TransactionRow tx={tx} onPress={() => navigation.navigate('TransactionDetail', { tx })} />
            </Animated.View>
          ))}

          {transactions.length === 0 && !loading && (
            <Text style={styles.emptyText}>No transactions yet. Enable SMS access in Settings.</Text>
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

function CategoryRow({ cat, total, index }) {
  const pct = total > 0 ? (cat.amount / total) * 100 : 0;
  const w = useSharedValue(0);
  useEffect(() => {
    w.value = withDelay(250 + index * 80, withSpring(pct, { damping: 14, stiffness: 110 }));
  }, [pct]);
  const barStyle = useAnimatedStyle(() => ({ width: `${w.value}%` }));

  return (
    <View style={styles.catRow}>
      <View style={[styles.catIconWrap, { backgroundColor: cat.color + '22' }]}>
        <Text style={styles.catIcon}>{cat.icon}</Text>
      </View>
      <View style={styles.catInfo}>
        <View style={styles.catTop}>
          <Text style={styles.catLabel}>{cat.label}</Text>
          <Text style={styles.catAmount}>{fmtINR(cat.amount)}</Text>
        </View>
        <View style={styles.barBg}>
          <Animated.View style={[styles.barFill, { backgroundColor: cat.color }, barStyle]} />
        </View>
      </View>
    </View>
  );
}

function TransactionRow({ tx, onPress }) {
  const cat = CATEGORIES.find(c => c.id === tx.category) || CATEGORIES[CATEGORIES.length - 1];
  const dateStr = new Date(tx.txn_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  return (
    <Bouncy scaleTo={0.97} style={styles.txRow} onPress={onPress}>
      <View style={[styles.txIcon, { backgroundColor: cat.color + '26' }]}>
        <Text style={styles.txIconText}>{cat.icon}</Text>
      </View>
      <View style={styles.txInfo}>
        <Text style={styles.txMerchant} numberOfLines={1}>{tx.merchant}</Text>
        <Text style={styles.txDate}>{cat.label} · {dateStr}</Text>
      </View>
      <Text style={[styles.txAmount, { color: tx.type === 'debit' ? COLORS.debit : COLORS.credit }]}>
        {tx.type === 'debit' ? '-' : '+'}{fmtINR(tx.amount)}
      </Text>
    </Bouncy>
  );
}

function buildWins(spending, total) {
  const wins = [];
  const food = spending.find(s => s.id === 'food');
  if (food && total > 0 && food.amount / total < 0.3) {
    wins.push(`Food is only ${Math.round((food.amount / total) * 100)}% of your spend. Great balance!`);
  }
  if (total > 0 && total < 10000) wins.push('Under ₹10,000 this month. Solid 💪');
  return wins;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1 },
  header: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 4 },
  greeting: { fontSize: 26, fontWeight: '900', color: COLORS.text, letterSpacing: -0.5 },
  headerSub: { fontSize: 15, color: COLORS.textSecondary, marginTop: 2 },

  heroWrap: { marginHorizontal: 16, marginTop: 12, borderRadius: RADII.xl, ...shadow(COLORS.primary, 18, 0.45) },
  hero: { borderRadius: RADII.xl, padding: 26 },
  heroLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '800', letterSpacing: 1.2 },
  heroAmount: { fontSize: 46, fontWeight: '900', color: '#fff', marginTop: 6, letterSpacing: -1 },
  heroChip: {
    alignSelf: 'flex-start', marginTop: 14, backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: RADII.pill, paddingHorizontal: 14, paddingVertical: 7,
  },
  heroChipText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  winBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginTop: 14,
    backgroundColor: COLORS.success + '1F', borderRadius: RADII.lg, padding: 16,
    borderWidth: 1, borderColor: COLORS.success + '3A',
  },
  winEmoji: { fontSize: 22 },
  winText: { flex: 1, color: COLORS.success, fontSize: 14, fontWeight: '700' },

  section: { marginHorizontal: 16, marginTop: 22 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginBottom: 14 },
  seeAll: { color: COLORS.primary, fontSize: 14, fontWeight: '700' },

  catRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  catIconWrap: { width: 40, height: 40, borderRadius: RADII.md, alignItems: 'center', justifyContent: 'center' },
  catIcon: { fontSize: 20 },
  catInfo: { flex: 1 },
  catTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  catLabel: { fontSize: 14, color: COLORS.text, fontWeight: '600' },
  catAmount: { fontSize: 14, color: COLORS.text, fontWeight: '700' },
  barBg: { height: 8, backgroundColor: COLORS.surfaceElevated, borderRadius: RADII.pill, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: RADII.pill },

  txRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, marginBottom: 8,
    backgroundColor: COLORS.surface, borderRadius: RADII.md, borderWidth: 1, borderColor: COLORS.border,
  },
  txIcon: { width: 44, height: 44, borderRadius: RADII.md, alignItems: 'center', justifyContent: 'center' },
  txIconText: { fontSize: 20 },
  txInfo: { flex: 1 },
  txMerchant: { fontSize: 15, color: COLORS.text, fontWeight: '700' },
  txDate: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  txAmount: { fontSize: 16, fontWeight: '800' },
  emptyText: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center', padding: 24 },
});
