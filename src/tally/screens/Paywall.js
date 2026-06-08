// src/tally/screens/Paywall.js — modal sheet (Tally Pro)
import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Modal } from 'react-native';
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
const PLANS = [
  ['monthly', 'Monthly', '₹199', '/mo', null],
  ['yearly', 'Yearly', '₹1,499', '/yr', 'save 37%'],
];

export default function Paywall({ visible, onClose }) {
  const { T, accent, accentInk } = useTally();
  const [plan, setPlan] = useState('yearly');
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
              {PLANS.map(([id, name, price, per, badge]) => {
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
              <Btn T={T} accent={accent} accentInk={accentInk} onPress={onClose}>start — first 7 days free</Btn>
            </View>
            <MonoLabel T={T} color={T.faint} size={9.5} style={{ textAlign: 'center', marginTop: 12 }}>
              cancel anytime · same as your gym membership (you won't)
            </MonoLabel>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
