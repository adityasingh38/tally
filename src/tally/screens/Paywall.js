// src/tally/screens/Paywall.js — modal sheet (Tally Pro)
import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Modal, Alert, ActivityIndicator } from 'react-native';
import { useTally } from '../TallyContext';
import { FONTS } from '../theme';
import { MonoLabel, Btn, Tag, Brand } from '../ui';

const PERKS = [
  ['FULL', 'every transaction, forever — not just 30 days'],
  ['AI++', 'unlimited unhinged verdicts + weekly roasts'],
  ['RECEIPT', 'hi-res shareable receipts, no watermark'],
  ['BANKS', 'connect unlimited accounts & cards'],
  ['WIDGET', 'the broke-streak widget for your home screen'],
];
// Package types shortcut off the RevenueCat Offering object (offerings.monthly,
// .annual, .lifetime) — display copy pulls price/name from the store product
// itself so it never drifts from what's actually configured in RevenueCat.
const PLAN_DEFS = [
  ['monthly', 'monthly', 'Monthly', '/mo'],
  ['yearly', 'annual', 'Yearly', '/yr'],
  ['lifetime', 'lifetime', 'Lifetime', ''],
];

// Static fallback for dev/preview builds where offerings haven't loaded
// (RevenueCat not configured) — no lifetime price is known statically.
const FALLBACK_PLANS = [
  ['monthly', 'Monthly', '₹199', '/mo', null],
  ['yearly', 'Yearly', '₹1,499', '/yr', 'save 37%'],
];

function buildPlans(offerings) {
  if (!offerings) return null;
  const available = PLAN_DEFS
    .map(([id, key, name, per]) => ({ id, pkg: offerings[key], name, per }))
    .filter(p => p.pkg);
  if (!available.length) return null;

  const monthly = available.find(p => p.id === 'monthly');
  return available.map(p => {
    let badge = null;
    if (p.id === 'yearly' && monthly) {
      const savings = 1 - p.pkg.product.price / (monthly.pkg.product.price * 12);
      if (savings > 0) badge = `save ${Math.round(savings * 100)}%`;
    }
    return [p.id, p.name, p.pkg.product.priceString, p.per, badge, p.pkg];
  });
}

export default function Paywall({ visible, onClose }) {
  const { T, accent, accentInk, offerings, purchase, restore, premiumLoading: rcLoading } = useTally();
  const plans = buildPlans(offerings) || FALLBACK_PLANS;
  const [plan, setPlan] = useState('yearly');
  const [busy, setBusy] = useState(false);

  async function handlePurchase() {
    if (!offerings) {
      // RevenueCat not configured — dev / preview build
      Alert.alert('Not configured', 'RevenueCat API key not set. Set REVENUE_CAT_API_KEY in constants to enable billing.');
      return;
    }
    const selected = plans.find(p => p[0] === plan);
    const pkg = selected?.[5];
    if (!pkg) { Alert.alert('Unavailable', 'Plan not available. Try again later.'); return; }
    setBusy(true);
    const result = await purchase(pkg);
    setBusy(false);
    if (result.success) { onClose(); return; }
    if (!result.cancelled) Alert.alert('Purchase failed', result.error || 'Something went wrong. Try again.');
  }

  async function handleRestore() {
    setBusy(true);
    const ok = await restore();
    setBusy(false);
    Alert.alert(ok ? 'Restored' : 'Nothing to restore', ok ? 'Pro access unlocked.' : 'No active subscription found on this account.');
    if (ok) onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={{ backgroundColor: T.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
          paddingHorizontal: 22, paddingTop: 12, paddingBottom: 34, maxHeight: '92%' }}>
          <View style={{ width: 40, height: 5, borderRadius: 999, backgroundColor: T.lineStrong, alignSelf: 'center', marginBottom: 18 }} />
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
              <Brand T={T} color={accent} size={20} />
              <Tag T={T} accent={accent} accentInk={accentInk} rotate={-2}>PRO</Tag>
            </View>
            <Text style={{ fontFamily: FONTS.display, fontSize: 34, lineHeight: 38, color: T.text, marginTop: 16 }}>
              see the whole carnage.
            </Text>
            <Text style={{ fontFamily: FONTS.sans, fontSize: 14.5, lineHeight: 22, color: T.dim, marginTop: 12 }}>
              free shows you the last 30 days. the damage goes back further. you know it does.
            </Text>

            <View style={{ marginTop: 22, gap: 14 }}>
              {PERKS.map(([tag, line]) => (
                <View key={tag} style={{ flexDirection: 'row', gap: 13 }}>
                  <Text style={{ fontFamily: FONTS.monoBold, fontSize: 10.5, color: accent, width: 62, letterSpacing: 0.6 }}>{tag}</Text>
                  <Text style={{ flex: 1, fontFamily: FONTS.sans, fontSize: 14, lineHeight: 20, color: T.text }}>{line}</Text>
                </View>
              ))}
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 24 }}>
              {plans.map(([id, name, price, per, badge]) => {
                const on = plan === id;
                return (
                  <Pressable key={id} onPress={() => setPlan(id)}
                    style={{ flex: 1, borderRadius: 16, padding: 15, borderWidth: 2,
                      borderColor: on ? accent : T.line, backgroundColor: on ? T.card : 'transparent' }}>
                    {badge ? <View style={{ position: 'absolute', top: -10, right: 10 }}>
                      <Tag T={T} accent={accent} accentInk={accentInk}>{badge}</Tag></View> : null}
                    <MonoLabel T={T} color={T.dim} size={10}>{name}</MonoLabel>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 7, gap: 2 }}>
                      <Text style={{ fontFamily: FONTS.display, fontSize: 24, color: T.text }}>{price}</Text>
                      <Text style={{ fontFamily: FONTS.mono, fontSize: 11, color: T.faint, marginBottom: 3 }}>{per}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <View style={{ marginTop: 18 }}>
              <Btn T={T} accent={accent} accentInk={accentInk} onPress={handlePurchase} disabled={busy || rcLoading}>
                {busy ? <ActivityIndicator color={accentInk} size="small" /> : 'start — first 7 days free'}
              </Btn>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 18, marginTop: 14 }}>
              <Pressable onPress={handleRestore} disabled={busy}>
                <MonoLabel T={T} color={T.dim} size={9.5}>restore purchase</MonoLabel>
              </Pressable>
              <MonoLabel T={T} color={T.faint} size={9.5}>·</MonoLabel>
              <MonoLabel T={T} color={T.faint} size={9.5}>cancel anytime</MonoLabel>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
