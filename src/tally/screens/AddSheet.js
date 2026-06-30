// src/tally/screens/AddSheet.js — log a spend (modal). Calls store.addTx → live update.
import React, { useState } from 'react';
import { View, Text, Pressable, Modal, TextInput } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as StoreReview from 'expo-store-review';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTally } from '../TallyContext';
import { useAuth } from '../../hooks/useAuth';
import { FONTS } from '../theme';
import { MonoLabel, Btn } from '../ui';
import { CAT_META } from '../data';
import { checkBudgetAlerts } from '../../services/budgetAlerts';

const REVIEW_KEY = 'tally:review_prompted';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'];
const CAT_IDS = ['food', 'transport', 'shopping', 'entertainment', 'health', 'rent', 'utilities'];

export default function AddSheet({ visible, onClose }) {
  const { T, accent, accentInk, store } = useTally();
  const { user } = useAuth();
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [note, setNote] = useState('');
  const [cat, setCat] = useState('food');
  const num = Number(amount || 0);

  const tap = (k) => {
    if (k === '⌫') return setAmount((a) => a.slice(0, -1));
    if (k === '.' && amount.includes('.')) return;
    if (amount.replace('.', '').length >= 7) return;
    setAmount((a) => (a === '0' && k !== '.' ? k : a + k));
  };

  const save = async () => {
    if (num <= 0) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    store.addTx({ merchant: merchant.trim() || 'Mystery spend', amount: num, category: cat, type: 'debit', note: note.trim() || 'logged by hand' });
    if (user?.id) checkBudgetAlerts(user.id).catch(() => {});
    setAmount(''); setMerchant(''); setNote(''); setCat('food');
    onClose();
    // prompt for review after 5th manual add, once per install
    try {
      const already = await AsyncStorage.getItem(REVIEW_KEY);
      if (!already) {
        const countStr = await AsyncStorage.getItem('tally:manual_add_count');
        const count = Number(countStr || 0) + 1;
        await AsyncStorage.setItem('tally:manual_add_count', String(count));
        if (count >= 5 && await StoreReview.hasAction()) {
          await AsyncStorage.setItem(REVIEW_KEY, '1');
          StoreReview.requestReview();
        }
      }
    } catch {}
  };

  const display = num > 0 ? num.toLocaleString('en-IN') : '0';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={{ backgroundColor: T.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
          paddingHorizontal: 20, paddingTop: 12, paddingBottom: 34 }}>
          <View style={{ width: 40, height: 5, borderRadius: 999, backgroundColor: T.lineStrong, alignSelf: 'center', marginBottom: 14 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <MonoLabel T={T} color={T.dim}>log the damage</MonoLabel>
            <Pressable onPress={onClose}><Text style={{ color: T.dim, fontSize: 20, fontFamily: FONTS.mono }}>✕</Text></Pressable>
          </View>

          <View style={{ alignItems: 'center', paddingTop: 14, paddingBottom: 2 }}>
            <Text style={{ fontFamily: FONTS.display, fontSize: 56, color: num > 0 ? T.text : T.faint }}>₹{display}</Text>
          </View>

          <TextInput value={merchant} onChangeText={setMerchant} placeholder="where did it go?"
            placeholderTextColor={T.faint}
            style={{ textAlign: 'center', color: T.text, fontFamily: FONTS.mono, fontSize: 14, paddingVertical: 6 }} />

          <TextInput value={note} onChangeText={setNote} placeholder="add a note (optional)"
            placeholderTextColor={T.faint}
            style={{ textAlign: 'center', color: T.dim, fontFamily: FONTS.sans, fontStyle: 'italic',
              fontSize: 13, paddingVertical: 4, marginBottom: 4 }} />

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, justifyContent: 'center', marginVertical: 12 }}>
            {CAT_IDS.map((id) => {
              const on = cat === id;
              return (
                <Pressable key={id} onPress={() => setCat(id)}
                  style={{ paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1.5,
                    borderColor: on ? accent : T.line, backgroundColor: on ? accent : 'transparent' }}>
                  <Text style={{ fontFamily: on ? FONTS.monoBold : FONTS.mono, fontSize: 11, letterSpacing: 0.4,
                    color: on ? accentInk : T.dim }}>{CAT_META[id].tag}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
            {KEYS.map((k) => (
              <Pressable key={k} onPress={() => tap(k)}
                style={{ width: '31.5%', paddingVertical: 15, borderRadius: 12, alignItems: 'center',
                  backgroundColor: T.card, borderWidth: 1, borderColor: T.line }}>
                <Text style={{ fontFamily: FONTS.mono, fontSize: 20, color: T.text }}>{k}</Text>
              </Pressable>
            ))}
          </View>

          <Btn T={T} accent={accent} accentInk={accentInk} onPress={save} disabled={num <= 0}>log it ↗</Btn>
        </View>
      </View>
    </Modal>
  );
}
