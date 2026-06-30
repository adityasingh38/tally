// src/tally/screens/DamageScreen.js  → "Insights" tab
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTally } from '../TallyContext';
import { FONTS, fmtINR } from '../theme';
import { MonoLabel, Rule, Leader, ReceiptShell, Btn, Tag, Brand, MonthPicker } from '../ui';
import { totalSpent, groupByCat, copeZone, fmtMonthLabel } from '../data';
import { getAIVerdict } from '../../services/aiAdvice';

function VerdictSkeleton({ T }) {
  return (
    <View style={{ gap: 16 }}>
      {[0, 1, 2].map(i => (
        <View key={i} style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ width: 46, height: 12, borderRadius: 2, backgroundColor: T.chip, marginTop: 2 }} />
          <View style={{ flex: 1, gap: 6 }}>
            <View style={{ height: 13, borderRadius: 2, backgroundColor: T.chip, width: '90%' }} />
            <View style={{ height: 11, borderRadius: 2, backgroundColor: T.chip, width: '60%' }} />
          </View>
        </View>
      ))}
    </View>
  );
}

export default function DamageScreen() {
  const { T, accent, accentInk, income, store, prefs, selectedMonth, setSelectedMonth } = useTally();
  const insets = useSafeAreaInsets();
  const txs = store.txs;
  const total = totalSpent(txs);
  const rawCats = groupByCat(txs);
  const cats = rawCats.map(c => ({ ...c, pct: total > 0 ? Math.round(c.amount / total * 100) : 0 }));
  const hasIncome = !!income && income > 0;
  const ratio = hasIncome ? total / income : 0.5;
  const zone = copeZone(ratio);
  const blocks = 12, filled = Math.max(0, Math.min(blocks, Math.round(ratio * blocks)));

  const [verdict, setVerdict] = useState(null);
  const [verdictLoading, setVerdictLoading] = useState(false);
  const fetchedRef = useRef(null); // tracks last fetch key to avoid redundant calls

  useEffect(() => {
    if (cats.length === 0) return;
    const key = `${prefs.tone}_${prefs.nihil}_${Math.round(total / 500)}`; // re-fetch per ₹500 spend change
    if (fetchedRef.current === key) return;
    fetchedRef.current = key;

    setVerdictLoading(true);
    getAIVerdict({ cats, total, income, tone: prefs.tone, nihil: prefs.nihil })
      .then(setVerdict)
      .catch(() => {})
      .finally(() => setVerdictLoading(false));
  }, [cats.length, prefs.tone, prefs.nihil, Math.round(total / 500)]);

  const vs = verdict || [];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: T.bg }}
      contentContainerStyle={{ paddingHorizontal: 18, paddingTop: insets.top + 14, paddingBottom: 120 }}>
      <ReceiptShell T={T}>
        {/* header */}
        <View style={{ alignItems: 'center', borderBottomWidth: 1.5, borderStyle: 'dashed',
          borderBottomColor: T.lineStrong, paddingBottom: 16 }}>
          <Brand T={T} color={T.text} size={26} />
          <Text style={{ fontFamily: FONTS.monoBold, letterSpacing: 4, fontSize: 15, color: T.text, marginTop: 10 }}>TALLY</Text>
          <MonoLabel T={T} color={T.dim} size={10.5} style={{ marginTop: 6 }}>THE DAMAGE · RECEIPT</MonoLabel>
          <MonoLabel T={T} color={T.dim} size={10.5} style={{ marginTop: 3 }}>{fmtMonthLabel(selectedMonth)} · BENGALURU</MonoLabel>
          <View style={{ marginTop: 10 }}>
            <MonthPicker T={T} accent={accent} selectedMonth={selectedMonth} onChange={setSelectedMonth} />
          </View>
        </View>

        {/* total */}
        <View style={{ alignItems: 'center', paddingVertical: 18, borderBottomWidth: 1.5,
          borderStyle: 'dashed', borderBottomColor: T.lineStrong }}>
          <MonoLabel T={T} color={T.dim} size={10.5} style={{ letterSpacing: 2 }}>TOTAL DAMAGE</MonoLabel>
          <Text style={{ fontFamily: FONTS.display, fontSize: 52, color: T.text, marginTop: 6 }}>{fmtINR(total)}</Text>
          <View style={{ marginTop: 12 }}>
            <Tag T={T} accent={accent} accentInk={accentInk} rotate={-1.5}>
              {cats[0] ? `${cats[0].tag} LEADS · ${cats[0].pct}% OF SPEND` : 'NO DAMAGE YET'}
            </Tag>
          </View>
        </View>

        {/* itemized */}
        <View style={{ paddingVertical: 16, borderBottomWidth: 1.5, borderStyle: 'dashed',
          borderBottomColor: T.lineStrong, gap: 11 }}>
          {cats.length === 0
            ? <MonoLabel T={T} color={T.faint} size={11}>nothing logged yet — suspiciously clean.</MonoLabel>
            : cats.map((c) => <Leader key={c.id} T={T} label={c.tag} value={fmtINR(c.amount)} />)}
        </View>

        {/* cope meter */}
        <View style={{ paddingVertical: 16, borderBottomWidth: 1.5, borderStyle: 'dashed', borderBottomColor: T.lineStrong }}>
          <MonoLabel T={T} color={T.dim} size={10.5} style={{ letterSpacing: 2, marginBottom: 10 }}>COPE METER</MonoLabel>
          <View style={{ flexDirection: 'row', gap: 3, marginBottom: 10 }}>
            {Array.from({ length: blocks }).map((_, i) => (
              <View key={i} style={{ flex: 1, height: 18, borderRadius: 2,
                backgroundColor: i < filled ? accent : T.chip,
                borderWidth: 1, borderColor: i < filled ? 'transparent' : T.line }} />
            ))}
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <Text style={{ fontFamily: FONTS.monoBold, fontSize: 16, color: T.text, textTransform: 'uppercase', letterSpacing: 0.5 }}>{zone.label}</Text>
            <Text style={{ fontFamily: FONTS.mono, fontSize: 12, color: T.dim }}>{Math.round(ratio * 100)}%</Text>
          </View>
          <Text style={{ fontFamily: FONTS.mono, fontSize: 11.5, color: T.dim, marginTop: 6 }}>{zone.note}</Text>
        </View>

        {/* verdict */}
        <View style={{ paddingTop: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <MonoLabel T={T} color={T.dim} size={10.5} style={{ letterSpacing: 2 }}>* THE VERDICT *</MonoLabel>
            {verdictLoading && (
              <MonoLabel T={T} color={T.faint} size={9}>generating…</MonoLabel>
            )}
          </View>

          {cats.length === 0 && (
            <MonoLabel T={T} color={T.faint} size={11}>log a spend and we'll judge it.</MonoLabel>
          )}

          {cats.length > 0 && verdictLoading && vs.length === 0 && (
            <VerdictSkeleton T={T} />
          )}

          {vs.length > 0 && (
            <View style={{ gap: 16 }}>
              {vs.map((v, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: 12 }}>
                  <Text style={{ fontFamily: FONTS.monoBold, fontSize: 11, color: accent, paddingTop: 2, width: 46 }}>{v.tag}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: FONTS.sans, fontSize: 13, lineHeight: 19, color: T.text }}>{v.line}</Text>
                    <Text style={{ fontFamily: FONTS.mono, fontSize: 11, color: T.dim, marginTop: 5 }}>› {v.sub}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* barcode + footer */}
        <View style={{ borderTopWidth: 1.5, borderStyle: 'dashed', borderTopColor: T.lineStrong, marginTop: 16,
          paddingTop: 16, alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', height: 42, alignItems: 'stretch', gap: 1.5, marginBottom: 12 }}>
            {Array.from({ length: 46 }).map((_, i) => (
              <View key={i} style={{ width: (i * 7 % 3) + 1, backgroundColor: T.text, opacity: i % 4 === 0 ? 1 : 0.7 }} />
            ))}
          </View>
          <MonoLabel T={T} color={T.dim} size={10.5}>THANK YOU FOR SPENDING</MonoLabel>
          <MonoLabel T={T} color={T.dim} size={10.5} style={{ marginTop: 3 }}>COME AGAIN (YOU WILL)</MonoLabel>
        </View>
      </ReceiptShell>

      <View style={{ marginTop: 18 }}>
        <Btn T={T} accent={accent} accentInk={accentInk} variant="ink" onPress={() => {}}>print & share ↗</Btn>
      </View>
    </ScrollView>
  );
}
