// src/tally/screens/TxDetailSheet.js — read-only transaction detail (receipt style).
import React from 'react';
import { View, Text, Modal, Pressable } from 'react-native';
import { useTally } from '../TallyContext';
import { FONTS, fmtINR } from '../theme';
import { MonoLabel, Rule, Leader } from '../ui';
import { catMeta, REACTIONS } from '../data';

export default function TxDetailSheet({ visible, tx, onClose }) {
  const { T, accent, store } = useTally();
  if (!tx) return null;

  const m = catMeta(tx.category);
  const credit = tx.type === 'credit';
  const picked = store.reactions[tx.id];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={{ backgroundColor: T.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 22, paddingTop: 12, paddingBottom: 34 }}>
          <View style={{ width: 40, height: 5, borderRadius: 999, backgroundColor: T.lineStrong, alignSelf: 'center', marginBottom: 16 }} />

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <MonoLabel T={T} color={T.faint} size={10}>{m.tag} · {tx.sms ? 'sms' : 'manual'}</MonoLabel>
            <Pressable onPress={onClose}><Text style={{ color: T.dim, fontSize: 20, fontFamily: FONTS.mono }}>✕</Text></Pressable>
          </View>

          <Text style={{ fontFamily: FONTS.display, fontSize: 48, color: credit ? T.creditText : T.text, marginTop: 8 }}>
            {credit ? '+' : '−'}{fmtINR(tx.amount)}
          </Text>
          <Text style={{ fontFamily: FONTS.sansBold, fontSize: 20, color: T.text, marginTop: 4 }}>{tx.merchant}</Text>
          {tx.note ? <Text style={{ fontFamily: FONTS.sans, fontStyle: 'italic', fontSize: 14, color: T.dim, marginTop: 6 }}>“{tx.note}”</Text> : null}

          <View style={{ marginTop: 20 }}>
            <Rule T={T} />
            <View style={{ paddingVertical: 13 }}><Leader T={T} label="category" value={m.label} /></View>
            <Rule T={T} />
            <View style={{ paddingVertical: 13 }}><Leader T={T} label="type" value={credit ? 'credit' : 'debit'} /></View>
            <Rule T={T} />
            <View style={{ paddingVertical: 13 }}><Leader T={T} label="when" value={tx.when || '—'} /></View>
            <Rule T={T} />
          </View>

          {/* reactions */}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 18, justifyContent: 'center' }}>
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
        </View>
      </View>
    </Modal>
  );
}
