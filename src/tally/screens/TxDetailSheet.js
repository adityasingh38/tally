// src/tally/screens/TxDetailSheet.js — transaction detail with delete + recategorize.
import React, { useState } from 'react';
import { View, Text, Modal, Pressable, Alert, ActivityIndicator, ScrollView } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTally } from '../TallyContext';
import { FONTS, fmtINR } from '../theme';
import { MonoLabel, Rule, Leader } from '../ui';
import { catMeta, REACTIONS, CAT_META } from '../data';

const RECATEGORIZE_IDS = ['food', 'transport', 'shopping', 'entertainment', 'health', 'rent', 'utilities', 'investment', 'transfer', 'other'];

export default function TxDetailSheet({ visible, tx, onClose }) {
  const { T, accent, accentInk, store } = useTally();
  const [editingCat, setEditingCat] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!tx) return null;

  const m = catMeta(tx.category);
  const credit = tx.type === 'credit';
  const picked = store.reactions[tx.id];

  const merchantKey = (tx.merchant || '').toLowerCase().trim();
  const merchantHistory = merchantKey
    ? store.allTxs
        .filter(t => t.id !== tx.id && (t.merchant || '').toLowerCase().trim() === merchantKey && t.type !== 'credit')
        .sort((a, b) => new Date(b.txn_date || 0) - new Date(a.txn_date || 0))
        .slice(0, 5)
    : [];

  function handleDelete() {
    Alert.alert(
      'Delete transaction',
      `Remove ${tx.merchant} ${fmtINR(tx.amount)} from your history?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          await store.deleteTx(tx);
          onClose();
        }},
      ]
    );
  }

  async function handleRecategorize(newCat) {
    if (newCat === tx.category) { setEditingCat(false); return; }
    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await store.updateTxCategory(tx, newCat);
    setSaving(false);
    setEditingCat(false);
  }

  function handleClose() {
    setEditingCat(false);
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' }}>
        <Pressable style={{ flex: 1 }} onPress={handleClose} />
        <View style={{ backgroundColor: T.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
          paddingHorizontal: 22, paddingTop: 12, paddingBottom: 34 }}>
          <View style={{ width: 40, height: 5, borderRadius: 999, backgroundColor: T.lineStrong, alignSelf: 'center', marginBottom: 16 }} />

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <MonoLabel T={T} color={T.faint} size={10}>{m.tag} · {tx.sms ? 'sms' : 'manual'}</MonoLabel>
            <Pressable onPress={handleClose}>
              <Text style={{ color: T.dim, fontSize: 20, fontFamily: FONTS.mono }}>✕</Text>
            </Pressable>
          </View>

          <Text style={{ fontFamily: FONTS.display, fontSize: 48, color: credit ? T.creditText : T.text, marginTop: 8 }}>
            {credit ? '+' : '−'}{fmtINR(tx.amount)}
          </Text>
          <Text style={{ fontFamily: FONTS.sansBold, fontSize: 20, color: T.text, marginTop: 4 }}>{tx.merchant}</Text>
          {tx.note ? <Text style={{ fontFamily: FONTS.sans, fontStyle: 'italic', fontSize: 14, color: T.dim, marginTop: 6 }}>"{tx.note}"</Text> : null}

          <View style={{ marginTop: 20 }}>
            <Rule T={T} />
            <Pressable onPress={() => setEditingCat(v => !v)}
              style={{ paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Leader T={T} label="category" value={saving ? '…' : m.label} />
              </View>
              {saving
                ? <ActivityIndicator size="small" color={accent} style={{ marginLeft: 8 }} />
                : <MonoLabel T={T} color={accent} size={9} style={{ marginLeft: 8 }}>
                    {editingCat ? 'done' : 'fix →'}
                  </MonoLabel>}
            </Pressable>

            {editingCat && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, paddingBottom: 12 }}>
                {RECATEGORIZE_IDS.map(id => {
                  const meta = CAT_META[id] || { tag: id.toUpperCase() };
                  const on = tx.category === id;
                  return (
                    <Pressable key={id} onPress={() => handleRecategorize(id)}
                      style={{ paddingVertical: 6, paddingHorizontal: 11, borderRadius: 999, borderWidth: 1.5,
                        borderColor: on ? accent : T.line, backgroundColor: on ? accent : 'transparent' }}>
                      <Text style={{ fontFamily: on ? FONTS.monoBold : FONTS.mono, fontSize: 11,
                        color: on ? accentInk : T.dim, letterSpacing: 0.4 }}>{meta.tag}</Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            <Rule T={T} />
            <View style={{ paddingVertical: 13 }}><Leader T={T} label="type" value={credit ? 'credit' : 'debit'} /></View>
            <Rule T={T} />
            <View style={{ paddingVertical: 13 }}><Leader T={T} label="when" value={tx.when || '—'} /></View>
            <Rule T={T} />
          </View>

          {/* merchant history */}
          {merchantHistory.length > 0 && (
            <View style={{ marginTop: 4 }}>
              <MonoLabel T={T} color={T.faint} size={9} style={{ marginBottom: 6 }}>
                more from {tx.merchant?.toLowerCase()}
              </MonoLabel>
              <ScrollView style={{ maxHeight: 150 }} showsVerticalScrollIndicator={false}>
                {merchantHistory.map((t, i) => (
                  <View key={t.id}>
                    {i > 0 && <Rule T={T} />}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 9 }}>
                      <MonoLabel T={T} color={T.dim} size={10.5}>{t.when || t.txn_date?.slice(0, 10) || '—'}</MonoLabel>
                      <Text style={{ fontFamily: FONTS.monoBold, fontSize: 13, color: T.text }}>−{fmtINR(t.amount)}</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
              <Rule T={T} />
            </View>
          )}

          {/* reactions */}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 16, justifyContent: 'center' }}>
            {REACTIONS.map((r) => {
              const on = picked === r;
              return (
                <Pressable key={r} onPress={() => store.react(tx.id, r)}
                  style={{ width: 40, height: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center',
                    borderWidth: 1.5, borderColor: on ? accent : T.line, backgroundColor: on ? accent + '22' : 'transparent' }}>
                  <Text style={{ fontSize: 17 }}>{r}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* delete */}
          <Pressable onPress={handleDelete} style={{ marginTop: 20, alignItems: 'center', paddingVertical: 10 }}>
            <MonoLabel T={T} color={T.red || '#ef4444'} size={10}>delete transaction</MonoLabel>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
