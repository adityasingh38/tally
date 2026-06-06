import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BarChart } from 'react-native-gifted-charts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, CATEGORIES } from '../constants';
import { useAuth } from '../hooks/useAuth';
import { useSpendingByCategory } from '../hooks/useTransactions';
import { getAIAdvice } from '../services/aiAdvice';

function monthRange(monthOffset = 0) {
  const d = new Date();
  const from = new Date(d.getFullYear(), d.getMonth() + monthOffset, 1);
  const to = new Date(d.getFullYear(), d.getMonth() + monthOffset + 1, 0);
  return { from, to };
}

function formatINR(n) {
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

const MONTH_LABELS = ['3 mo ago', '2 mo ago', 'Last mo', 'This mo'];

export default function InsightsScreen() {
  const { user } = useAuth();

  const [aiAdvice, setAiAdvice] = useState(null);
  const [adviceLoading, setAdviceLoading] = useState(false);

  const months = useMemo(() => [
    monthRange(-3), monthRange(-2), monthRange(-1), monthRange(0),
  ], []);

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

  const delta = lastMonth.total > 0
    ? ((thisMonth.total - lastMonth.total) / lastMonth.total) * 100
    : 0;
  const trend = delta < 0 ? 'down' : 'up';

  const barData = monthTotals.map((val, i) => ({
    value: val,
    label: MONTH_LABELS[i],
    frontColor: i === 3 ? COLORS.primary : COLORS.border,
  }));

  const topCats = thisMonth.spending.slice(0, 3);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Insights</Text>

        {/* Trend summary */}
        <View style={[styles.trendCard, { borderColor: trend === 'down' ? COLORS.success : COLORS.warning }]}>
          <Text style={styles.trendEmoji}>{trend === 'down' ? '📉' : '📈'}</Text>
          <View style={styles.trendInfo}>
            <Text style={styles.trendTitle}>
              {trend === 'down'
                ? `You spent ${Math.abs(delta).toFixed(0)}% less than last month`
                : `You spent ${delta.toFixed(0)}% more than last month`}
            </Text>
            <Text style={styles.trendSub}>
              {formatINR(thisMonth.total)} this month vs {formatINR(lastMonth.total)} last month
            </Text>
          </View>
        </View>

        {/* Bar chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Monthly spend</Text>
          <BarChart
            data={barData}
            width={300}
            height={160}
            barWidth={50}
            barBorderRadius={6}
            hideRules
            hideYAxisText
            xAxisColor={COLORS.border}
            yAxisColor="transparent"
            labelWidth={60}
            xAxisLabelTextStyle={{ color: COLORS.textMuted, fontSize: 11 }}
          />
        </View>

        {/* Top categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top categories this month</Text>
          {topCats.map(cat => (
            <View key={cat.id} style={styles.catCard}>
              <Text style={styles.catIcon}>{cat.icon}</Text>
              <View style={styles.catInfo}>
                <Text style={styles.catLabel}>{cat.label}</Text>
                <Text style={styles.catAmount}>{formatINR(cat.amount)}</Text>
              </View>
              <View style={[styles.catBadge, { backgroundColor: cat.color + '22' }]}>
                <Text style={[styles.catPct, { color: cat.color }]}>
                  {thisMonth.total > 0 ? Math.round((cat.amount / thisMonth.total) * 100) : 0}%
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* AI-powered advice */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick wins</Text>
          {adviceLoading ? (
            <ActivityIndicator color={COLORS.primary} style={{ padding: 20 }} />
          ) : aiAdvice ? (
            <View style={{ gap: 10 }}>
              {aiAdvice.map((item, i) => (
                <View key={i} style={styles.tip}>
                  <Text style={styles.tipIcon}>{item.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tipText}>{item.tip}</Text>
                    {item.saving ? (
                      <Text style={styles.tipSaving}>Potential saving: {item.saving}</Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyTip}>Add more transactions to unlock insights.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function formatINR(n) {
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1 },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.text, padding: 24, paddingBottom: 16 },
  trendCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    margin: 16, marginTop: 0, backgroundColor: COLORS.surface,
    borderRadius: 16, padding: 16, borderWidth: 1,
  },
  trendEmoji: { fontSize: 32 },
  trendInfo: { flex: 1 },
  trendTitle: { fontSize: 15, color: COLORS.text, fontWeight: '700', lineHeight: 22 },
  trendSub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  section: { margin: 16, marginTop: 0, marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 14 },
  catCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.surface, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 8,
  },
  catIcon: { fontSize: 24 },
  catInfo: { flex: 1 },
  catLabel: { fontSize: 14, color: COLORS.text, fontWeight: '600' },
  catAmount: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  catBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  catPct: { fontSize: 14, fontWeight: '700' },
  tip: {
    flexDirection: 'row', gap: 12, backgroundColor: COLORS.surface,
    borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.border,
  },
  tipIcon: { fontSize: 20 },
  tipText: { color: COLORS.textSecondary, fontSize: 14, lineHeight: 20 },
  tipSaving: { color: COLORS.success, fontSize: 12, fontWeight: '700', marginTop: 4 },
  emptyTip: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center', padding: 20 },
});
