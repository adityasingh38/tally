import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BarChart } from 'react-native-gifted-charts';
import Animated, { FadeInDown } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, RADII } from '../constants';
import { useAuth } from '../hooks/useAuth';
import { useSpendingByCategory } from '../hooks/useTransactions';
import { getAIAdvice } from '../services/aiAdvice';

function monthRange(monthOffset = 0) {
  const d = new Date();
  const from = new Date(d.getFullYear(), d.getMonth() + monthOffset, 1);
  const to = new Date(d.getFullYear(), d.getMonth() + monthOffset + 1, 0);
  return { from, to };
}
const fmtINR = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const MONTH_LABELS = ['3 mo', '2 mo', 'Last', 'This'];

export default function InsightsScreen() {
  const { user } = useAuth();
  const [aiAdvice, setAiAdvice] = useState(null);
  const [adviceLoading, setAdviceLoading] = useState(false);

  const months = useMemo(() => [monthRange(-3), monthRange(-2), monthRange(-1), monthRange(0)], []);
  const m0 = useSpendingByCategory(user?.id, { fromDate: months[0].from, toDate: months[0].to });
  const m1 = useSpendingByCategory(user?.id, { fromDate: months[1].from, toDate: months[1].to });
  const m2 = useSpendingByCategory(user?.id, { fromDate: months[2].from, toDate: months[2].to });
  const m3 = useSpendingByCategory(user?.id, { fromDate: months[3].from, toDate: months[3].to });

  const monthTotals = [m0.total, m1.total, m2.total, m3.total];
  const thisMonth = m3;
  const lastMonth = m2;

  useEffect(() => {
    if (!thisMonth.spending.length) return;
    setAdviceLoading(true);
    AsyncStorage.getItem('tally_goal').then(goal => {
      const spendingWithPct = thisMonth.spending.map(s => ({
        ...s,
        pct: thisMonth.total > 0 ? Math.round((s.amount / thisMonth.total) * 100) : 0,
      }));
      getAIAdvice(spendingWithPct, goal).then(advice => {
        setAiAdvice(advice);
        setAdviceLoading(false);
      });
    });
  }, [thisMonth.spending.length]);

  const delta = lastMonth.total > 0 ? ((thisMonth.total - lastMonth.total) / lastMonth.total) * 100 : 0;
  const trend = delta < 0 ? 'down' : 'up';

  const barData = monthTotals.map((val, i) => ({
    value: val,
    label: MONTH_LABELS[i],
    frontColor: i === 3 ? COLORS.primary : COLORS.surfaceElevated,
  }));

  const topCats = thisMonth.spending.slice(0, 3);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <Animated.Text entering={FadeInDown.springify()} style={styles.title}>Insights 📊</Animated.Text>

        <Animated.View entering={FadeInDown.delay(80).springify()}
          style={[styles.trendCard, { borderColor: trend === 'down' ? COLORS.success : COLORS.warning }]}>
          <Text style={styles.trendEmoji}>{trend === 'down' ? '📉' : '📈'}</Text>
          <View style={styles.trendInfo}>
            <Text style={styles.trendTitle}>
              {trend === 'down'
                ? `You spent ${Math.abs(delta).toFixed(0)}% less than last month`
                : `You spent ${delta.toFixed(0)}% more than last month`}
            </Text>
            <Text style={styles.trendSub}>{fmtINR(thisMonth.total)} this month vs {fmtINR(lastMonth.total)} last</Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(140).springify()} style={styles.section}>
          <Text style={styles.sectionTitle}>Monthly spend</Text>
          <View style={styles.chartCard}>
            <BarChart
              data={barData}
              width={290}
              height={150}
              barWidth={44}
              barBorderRadius={10}
              hideRules
              hideYAxisText
              xAxisColor={COLORS.border}
              yAxisColor="transparent"
              labelWidth={56}
              xAxisLabelTextStyle={{ color: COLORS.textMuted, fontSize: 11, fontWeight: '600' }}
            />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.section}>
          <Text style={styles.sectionTitle}>Top categories this month</Text>
          {topCats.map(cat => (
            <View key={cat.id} style={styles.catCard}>
              <View style={[styles.catIconWrap, { backgroundColor: cat.color + '22' }]}>
                <Text style={styles.catIcon}>{cat.icon}</Text>
              </View>
              <View style={styles.catInfo}>
                <Text style={styles.catLabel}>{cat.label}</Text>
                <Text style={styles.catAmount}>{fmtINR(cat.amount)}</Text>
              </View>
              <View style={[styles.catBadge, { backgroundColor: cat.color + '22' }]}>
                <Text style={[styles.catPct, { color: cat.color }]}>
                  {thisMonth.total > 0 ? Math.round((cat.amount / thisMonth.total) * 100) : 0}%
                </Text>
              </View>
            </View>
          ))}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(260).springify()} style={styles.section}>
          <Text style={styles.sectionTitle}>Quick wins ✨</Text>
          {adviceLoading ? (
            <ActivityIndicator color={COLORS.primary} style={{ padding: 20 }} />
          ) : aiAdvice ? (
            <View style={{ gap: 10 }}>
              {aiAdvice.map((item, i) => (
                <View key={i} style={styles.tip}>
                  <Text style={styles.tipIcon}>{item.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tipText}>{item.tip}</Text>
                    {item.saving ? <Text style={styles.tipSaving}>💸 Potential saving: {item.saving}</Text> : null}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyTip}>Add more transactions to unlock insights.</Text>
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1 },
  title: { fontSize: 28, fontWeight: '900', color: COLORS.text, padding: 24, paddingBottom: 16, letterSpacing: -0.5 },
  trendCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14, marginHorizontal: 16,
    backgroundColor: COLORS.surface, borderRadius: RADII.lg, padding: 18, borderWidth: 1.5,
  },
  trendEmoji: { fontSize: 32 },
  trendInfo: { flex: 1 },
  trendTitle: { fontSize: 15, color: COLORS.text, fontWeight: '800', lineHeight: 22 },
  trendSub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  section: { marginHorizontal: 16, marginTop: 22 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginBottom: 14 },
  chartCard: { backgroundColor: COLORS.surface, borderRadius: RADII.lg, padding: 16, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  catCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.surface,
    borderRadius: RADII.md, padding: 14, borderWidth: 1, borderColor: COLORS.border, marginBottom: 10,
  },
  catIconWrap: { width: 42, height: 42, borderRadius: RADII.md, alignItems: 'center', justifyContent: 'center' },
  catIcon: { fontSize: 20 },
  catInfo: { flex: 1 },
  catLabel: { fontSize: 14, color: COLORS.text, fontWeight: '700' },
  catAmount: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  catBadge: { borderRadius: RADII.pill, paddingHorizontal: 12, paddingVertical: 5 },
  catPct: { fontSize: 14, fontWeight: '800' },
  tip: {
    flexDirection: 'row', gap: 12, backgroundColor: COLORS.surface, borderRadius: RADII.md,
    padding: 16, borderWidth: 1, borderColor: COLORS.border,
  },
  tipIcon: { fontSize: 22 },
  tipText: { color: COLORS.textSecondary, fontSize: 14, lineHeight: 20 },
  tipSaving: { color: COLORS.success, fontSize: 12, fontWeight: '800', marginTop: 4 },
  emptyTip: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center', padding: 20 },
});
