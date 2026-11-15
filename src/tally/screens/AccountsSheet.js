import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { useTally } from '../TallyContext';
import { BANKS, canAddAccount } from '../../services/accounts';
import { deleteAccountProfile, getAccountProfiles, insertAccountProfile } from '../../services/supabase';
import { FONTS } from '../theme';
import { Btn, MonoLabel } from '../ui';

export default function AccountsSheet({ visible, onClose }) {
  const { user } = useAuth();
  const { T, accent, accentInk, isPremium, openPaywall } = useTally();
  const [accounts, setAccounts] = useState([]);
  const [bankKey, setBankKey] = useState(null);
  const [last4, setLast4] = useState('');
  const [label, setLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible || !user?.id) return;
    let live = true;
    setLoading(true);
    getAccountProfiles(user.id).then(({ data, error }) => {
      if (!live) return;
      if (error) Alert.alert('Accounts unavailable', error.message);
      else setAccounts(data || []);
    }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [visible, user?.id]);

  function showPro() {
    onClose();
    setTimeout(openPaywall, 300);
  }

  async function add() {
    if (!canAddAccount(accounts, isPremium)) { showPro(); return; }
    if (!bankKey || !/^\d{4}$/.test(last4)) {
      Alert.alert('Choose a bank and four digits', 'Enter only the last four digits shown in its transaction alerts.');
      return;
    }
    const bank = BANKS.find(item => item.key === bankKey);
    const safeLabel = label.trim().slice(0, 60) || `${bank.label} •${last4}`;
    setSaving(true);
    const { data, error } = await insertAccountProfile({
      bank_key: bankKey, last4, label: safeLabel,
    });
    setSaving(false);
    if (error) { Alert.alert('Could not add account', error.message); return; }
    setAccounts(previous => [...previous, data]);
    setBankKey(null); setLast4(''); setLabel('');
  }

  function remove(account) {
    Alert.alert('Remove account label?', 'Captured transactions stay in your feed.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        const { error } = await deleteAccountProfile(account.id);
        if (error) Alert.alert('Could not remove account', error.message);
        else setAccounts(previous => previous.filter(item => item.id !== account.id));
      } },
    ]);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={{ maxHeight: '88%', backgroundColor: T.surface, borderTopLeftRadius: 22,
          borderTopRightRadius: 22, padding: 22, paddingBottom: 34 }}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={{ fontFamily: FONTS.display, fontSize: 30, color: T.text }}>your accounts.</Text>
            <Text style={{ fontFamily: FONTS.sans, color: T.dim, fontSize: 13, lineHeight: 19, marginTop: 8 }}>
              Label captured transactions using a bank and the last four digits in its alerts. This does not connect to your bank. Never enter a full card number or PIN.
            </Text>

            <MonoLabel T={T} color={T.dim} size={10} style={{ marginTop: 24, marginBottom: 8 }}>saved labels</MonoLabel>
            {loading ? <ActivityIndicator color={accent} /> : accounts.length === 0
              ? <Text style={{ color: T.faint, fontFamily: FONTS.sans, fontSize: 13 }}>no accounts labeled yet.</Text>
              : accounts.map(account => (
                <View key={account.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  borderWidth: 1, borderColor: T.line, borderRadius: 10, padding: 12, marginBottom: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: T.text, fontFamily: FONTS.sansSemi, fontSize: 14 }}>{account.label}</Text>
                    <MonoLabel T={T} color={T.faint} size={9}>{account.bank_key} · •{account.last4}</MonoLabel>
                  </View>
                  <Pressable onPress={() => remove(account)} style={{ padding: 8 }}>
                    <MonoLabel T={T} color={T.red} size={9}>remove</MonoLabel>
                  </Pressable>
                </View>
              ))}

            {!canAddAccount(accounts, isPremium) ? (
              <Pressable onPress={showPro} style={{ marginTop: 18, padding: 14, borderRadius: 10,
                borderWidth: 1, borderColor: accent }}>
                <MonoLabel T={T} color={accent} size={10}>one label on free · group more with Pro ↗</MonoLabel>
              </Pressable>
            ) : (
              <View style={{ marginTop: 20 }}>
                <MonoLabel T={T} color={T.dim} size={10}>choose bank</MonoLabel>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8, marginBottom: 14 }}>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {BANKS.map(bank => (
                      <Pressable key={bank.key} onPress={() => setBankKey(bank.key)}
                        style={{ padding: 9, borderRadius: 8, borderWidth: 1,
                          borderColor: bankKey === bank.key ? accent : T.line }}>
                        <MonoLabel T={T} color={bankKey === bank.key ? accent : T.dim} size={9}>{bank.label}</MonoLabel>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
                <TextInput value={last4} onChangeText={value => setLast4(value.replace(/\D/g, '').slice(0, 4))}
                  keyboardType="number-pad" placeholder="last four digits only" placeholderTextColor={T.faint}
                  style={{ color: T.text, backgroundColor: T.card, borderWidth: 1, borderColor: T.line,
                    borderRadius: 8, padding: 12, fontFamily: FONTS.mono, marginBottom: 8 }} />
                <TextInput value={label} onChangeText={setLabel} maxLength={60}
                  placeholder="label (optional, e.g. salary account)" placeholderTextColor={T.faint}
                  style={{ color: T.text, backgroundColor: T.card, borderWidth: 1, borderColor: T.line,
                    borderRadius: 8, padding: 12, fontFamily: FONTS.sans, marginBottom: 14 }} />
                <Btn T={T} accent={accent} accentInk={accentInk} onPress={add} disabled={saving || loading}>
                  {saving ? 'saving…' : 'add account label'}
                </Btn>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
