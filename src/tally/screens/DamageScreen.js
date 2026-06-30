// src/tally/screens/DamageScreen.js  → "Insights" tab
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, Share, Modal, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTally } from '../TallyContext';
import { FONTS, fmtINR } from '../theme';
import { MonoLabel, Rule, Leader, ReceiptShell, Btn, Tag, Brand, MonthPicker, TxRow } from '../ui';
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

function buildReceiptText(cats, total, income, zone, selectedMonth) {
  const W = 34;
  const pad = (s) => {
    const n = Math.max(0, W - String(s).length);
    return ' '.repeat(Math.floor(n / 2)) + s;
  };
  const ldr = (l, v) => {
    const dots = Math.max(1, W - l.length - v.length - 2);
    return `${l} ${'.'.repeat(dots)} ${v}`;
  };
  const line = '─'.repeat(W);
  const rows = cats.map(c => ldr(c.tag, fmtINR(c.amount)));
  const incomeLines = income
    ? [ldr('INCOME', fmtINR(income)), ldr('SPENT', fmtINR(total)), ldr('RATIO', `${Math.round(total / income * 100)}%`)]
    : [];

  return [
    line,
    pad('TALLY'),
    pad('THE DAMAGE · RECEIPT'),
    pad(fmtMonthLabel(selectedMonth)),
    line,
    '',
    pad('TOTAL DAMAGE'),
    pad(fmtINR(total)),
    '',
    line,
    ...rows,
    ...(incomeLines.length ? ['', ...incomeLines] : []),
    line,
    '',
    `COPE METER  ${zone.label.toUpperCase()}`,
    `            ${zone.note}`,
    '',
    line,
    pad('THANK YOU FOR SPENDING'),
    pad('COME AGAIN (YOU WILL)'),
    line,
    '',
    'tally · track the damage · financially feral',
  ].join('\n');
}

export default function DamageScreen() {
  const { T, accent, accentInk, income, store, prefs, selectedMonth, setSelectedMonth, openTx } = useTally();
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
  const [activeCat, setActiveCat] = useState(null);
  const fetchedRef = useRef(null);

  useEffect(() => {
    if (cats.length === 0) return;
    const key = `${prefs.tone}_${prefs.nihil}_${Math.round(total / 500)}`;
    if (fetchedRef.current === key) return;
    fetchedRef.current = key;

    setVerdictLoading(true);
    getAIVerdict({ cats, total, income, tone: prefs.tone, nihil: prefs.nihil })
      .then(setVerdict)
      .catch(() => {})
      .finally(() => setVerdictLoading(false));
  }, [cats.length, prefs.tone, prefs.nihil, Math.round(total / 500)]);

  const vs = verdict || [];

  const activeCatMeta = activeCat ? cats.find(c => c.id === activeCat) : null;
  const activeTxs = activeCat
    ? txs.filter(t => t.category === activeCat && t.type !== 'credit')
    : [];

  async function handleShare() {
    try {
      await Share.share({ message: buildReceiptText(cats, total, income, zone, selectedMonth) });
    } catch {}
  }

  return (
    <>
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

          {/* itemized — tappable for drill-down */}
          <View style={{ paddingVertical: 16, borderBottomWidth: 1.5, borderStyle: 'dashed',
            borderBottomColor: T.lineStrong, gap: 11 }}>
            {cats.length === 0
              ? <MonoLabel T={T} color={T.faint} size={11}>nothing logged yet — suspiciously clean.</MonoLabel>
              : cats.map((c) => (
                <Pressable key={c.id} onPress={() => setActiveCat(c.id)}
                  style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, flexDirection: 'row', alignItems: 'center' }]}>
                  <View style={{ flex: 1 }}>
                    <Leader T={T} label={c.tag} value={fmtINR(c.amount)} />
                  </View>
                  <Text style={{ fontFamily: FONTS.mono, fontSize: 10, color: T.faint, marginLeft: 6 }}>›</Text>
                </Pressable>
              ))}
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
              {verdictLoading && <MonoLabel T={T} color={T.faint} size={9}>generating…</MonoLabel>}
            </View>

            {cats.length === 0 && (
              <MonoLabel T={T} color={T.faint} size={11}>log a spend and we'll judge it.</MonoLabel>
            )}
            {cats.length > 0 && verdictLoading && vs.length === 0 && <VerdictSkeleton T={T} />}
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
          <Btn T={T} accent={accent} accentInk={accentInk} variant="ink" onPress={handleShare}>
            print & share ↗
          </Btn>
        </View>
      </ScrollView>

      {/* category drill-down modal */}
      <Modal visible={!!activeCat} transparent animationType="slide" onRequestClose={() => setActiveCat(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' }} onPress={() => setActiveCat(null)}>
          <Pressable style={{ position: 'absolute', bottom: 0, left: 0, right: 0,
            backgroundColor: T.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
            <View style={{ padding: 20, paddingBottom: 40 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <View>
                  <MonoLabel T={T} color={accent} size={11}>{activeCatMeta?.tag}</MonoLabel>
                  <Text style={{ fontFamily: FONTS.display, fontSize: 28, color: T.text, marginTop: 2 }}>
                    {activeCatMeta ? fmtINR(activeCatMeta.amount) : ''}
                  </Text>
                </View>
                <MonoLabel T={T} color={T.faint} size={10}>{activeTxs.length} transactions</MonoLabel>
              </View>
              <Rule T={T} />
              <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
                {activeTxs.length === 0
                  ? <MonoLabel T={T} color={T.faint} size={11} style={{ paddingVertical: 20 }}>nothing here.</MonoLabel>
                  : activeTxs.map(tx => (
                    <View key={tx.id}>
                      <TxRow T={T} tx={tx} onPress={() => { setActiveCat(null); openTx(tx); }} />
                      <Rule T={T} />
                    </View>
                  ))}
              </ScrollView>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
