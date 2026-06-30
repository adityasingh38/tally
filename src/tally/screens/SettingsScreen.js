// src/tally/screens/SettingsScreen.js  → your "Settings" tab
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Alert, PermissionsAndroid, ActivityIndicator, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTally } from '../TallyContext';
import { useAuth } from '../../hooks/useAuth';
import { syncHistoricalSMS } from '../../services/smsSync';
import { usePremium } from '../../hooks/usePremium';
import { notifAccessAvailable, isNotifAccessEnabled, openNotifAccessSettings } from '../../services/notificationAccess';
import { getTransactions, deleteAccount } from '../../services/supabase';
import { exportToCSV } from '../../services/export';
import { requestNotificationPermission } from '../../services/budgetAlerts';
import { FONTS, fmtINR } from '../theme';
import { MonoLabel, Rule, ScreenHeader, Brand } from '../ui';

function Toggle({ T, accent, on, onChange }) {
  return (
    <Pressable onPress={() => onChange(!on)}
      style={{ width: 48, height: 28, borderRadius: 999, backgroundColor: on ? accent : T.lineStrong, justifyContent: 'center' }}>
      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', marginLeft: on ? 23 : 3 }} />
    </Pressable>
  );
}
function Seg({ T, accent, accentInk, options, value, onChange }) {
  return (
    <View style={{ flexDirection: 'row', gap: 4, backgroundColor: T.chip, borderRadius: 999, padding: 3 }}>
      {options.map(([val, label]) => {
        const on = value === val;
        return (
          <Pressable key={String(val)} onPress={() => onChange(val)}
            style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, backgroundColor: on ? accent : 'transparent' }}>
            <Text style={{ fontFamily: on ? FONTS.monoBold : FONTS.mono, fontSize: 11, letterSpacing: 0.4,
              textTransform: 'uppercase', color: on ? accentInk : T.dim }}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
function Row({ T, label, sub, control, onPress }) {
  const Wrap = onPress ? Pressable : View;
  return (
    <Wrap onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14, paddingVertical: 15 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: FONTS.sansSemi, fontSize: 15, color: T.text, lineHeight: 19 }}>{label}</Text>
        {sub ? <Text style={{ fontFamily: FONTS.sans, fontSize: 12, color: T.dim, marginTop: 3, lineHeight: 16 }}>{sub}</Text> : null}
      </View>
      <View>{control}</View>
    </Wrap>
  );
}

export default function SettingsScreen() {
  const { T, accent, accentInk, prefs, setPref, openPaywall, income, setIncome, isPremium } = useTally();
  const { user, signOut } = useAuth();
  const { restore } = usePremium();
  const insets = useSafeAreaInsets();
  const [notif, setNotif] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [editIncome, setEditIncome] = useState(false);
  const [incomeInput, setIncomeInput] = useState('');
  const [notifAccess, setNotifAccess] = useState(false);
  const [restoring, setRestoring] = useState(false);

  // Reflect the live notification-access grant (user may toggle it in system
  // Settings and return). Re-checked on mount; openSettings sets it optimistic.
  useEffect(() => { isNotifAccessEnabled().then(setNotifAccess); }, []);

  function saveIncome() {
    const n = Number(incomeInput.replace(/[^0-9]/g, ''));
    if (n > 0) setIncome(n);
    setEditIncome(false);
    setIncomeInput('');
  }

  async function handleSync() {
    try {
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_SMS);
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert('Permission required', 'Enable SMS permission in device Settings.');
        return;
      }
      setSyncing(true);
      const result = await syncHistoricalSMS(user.id, null);
      Alert.alert('Sync complete', `Imported ${result?.inserted || 0} new transactions.`);
    } catch (e) {
      Alert.alert('Sync failed', e.message);
    } finally {
      setSyncing(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const { data } = await getTransactions({ userId: user.id, limit: 5000, fromDate: new Date(0) });
      if (!data?.length) { Alert.alert('No data', 'No transactions to export yet.'); return; }
      await exportToCSV(data);
    } catch (e) {
      Alert.alert('Export failed', e.message);
    } finally {
      setExporting(false);
    }
  }

  async function handleNotifications(next) {
    if (!next) { setNotif(false); return; }
    const granted = await requestNotificationPermission();
    setNotif(granted);
    Alert.alert(granted ? 'Notifications on ✓' : 'Denied', granted ? "You'll get the weekly damage report." : 'Enable in device Settings.');
  }

  async function handleRestore() {
    setRestoring(true);
    const ok = await restore();
    setRestoring(false);
    Alert.alert(ok ? 'Restored' : 'Nothing found', ok ? 'Pro access unlocked.' : 'No active subscription on this account.');
  }

  function handleLogout() {
    Alert.alert('Log out', 'Sign out of Tally?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: signOut },
    ]);
  }

  function handleDelete() {
    Alert.alert('Delete account', 'Permanently deletes your account and all transactions. Cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const { error } = await deleteAccount();
        if (error) { Alert.alert('Delete failed', error.message); return; }
        await signOut();
      } },
    ]);
  }

  const handle = (user?.email || 'you').split('@')[0];
  const initial = handle[0]?.toLowerCase() || 'b';

  return (
    <ScrollView style={{ flex: 1, backgroundColor: T.bg }}
      contentContainerStyle={{ paddingHorizontal: 18, paddingTop: insets.top + 14, paddingBottom: 120 }}>
      <ScreenHeader T={T} accent={accent} title="you" />

      {/* profile */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 6 }}>
        <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: accent, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: FONTS.display, fontSize: 24, color: accentInk }}>{initial}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ fontFamily: FONTS.display, fontSize: 22, color: T.text }}>@{handle}</Text>
          <MonoLabel T={T} color={T.dim} size={10.5} style={{ marginTop: 3 }}>{isPremium ? 'tally pro' : 'tally free'}</MonoLabel>
        </View>
      </View>

      {/* monthly income — powers "left to burn" */}
      <View style={{ marginTop: 20, backgroundColor: T.card, borderWidth: 1, borderColor: T.line, borderRadius: 6, padding: 16 }}>
        {editIncome ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ color: T.dim, fontSize: 18, fontFamily: FONTS.sansBold }}>₹</Text>
            <TextInput
              value={incomeInput}
              onChangeText={setIncomeInput}
              keyboardType="numeric"
              placeholder="monthly income"
              placeholderTextColor={T.faint}
              autoFocus
              style={{ flex: 1, color: T.text, fontSize: 18, fontFamily: FONTS.mono }}
            />
            <Pressable onPress={saveIncome} style={{ backgroundColor: accent, borderRadius: 4, paddingHorizontal: 16, paddingVertical: 9 }}>
              <Text style={{ color: accentInk, fontFamily: FONTS.monoBold, fontSize: 12, letterSpacing: 1 }}>SAVE</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={() => { setEditIncome(true); setIncomeInput(income ? String(income) : ''); }}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <MonoLabel T={T} color={T.dim} size={10}>monthly income</MonoLabel>
              <Text style={{ fontFamily: FONTS.display, fontSize: 22, color: income ? T.text : T.faint, marginTop: 3 }}>
                {income ? fmtINR(income) : 'not set'}
              </Text>
            </View>
            <MonoLabel T={T} color={accent} size={11}>{income ? 'edit' : 'set'} →</MonoLabel>
          </Pressable>
        )}
      </View>

      {/* pro upsell — hidden if already pro */}
      {!isPremium && <Pressable onPress={openPaywall} style={{ marginTop: 20, backgroundColor: T.text, borderRadius: 16, padding: 18 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: FONTS.display, fontSize: 19, color: T.bg, lineHeight: 23 }}>go Pro → unlock the carnage</Text>
            <Text style={{ fontFamily: FONTS.mono, fontSize: 11, color: T.bg, opacity: 0.7, marginTop: 7 }}>full history · receipts · ₹199/mo</Text>
          </View>
          <Text style={{ fontSize: 20, color: T.bg }}>↗</Text>
        </View>
      </Pressable>}

      {/* vibe */}
      <MonoLabel T={T} color={T.faint} style={{ marginTop: 28, marginBottom: 4 }}>the vibe</MonoLabel>
      <Rule T={T} />
      <Row T={T} label="Dark mode" sub="ink or paper" control={<Toggle T={T} accent={accent} on={prefs.dark} onChange={(v) => setPref('dark', v)} />} />
      <Rule T={T} />
      <Row T={T} label="Accent" sub="the one colour" control={<Seg T={T} accent={accent} accentInk={accentInk}
        options={[['red', 'red'], ['mono', 'mono'], ['acid', 'acid']]} value={prefs.accent} onChange={(v) => setPref('accent', v)} />} />
      <Rule T={T} />
      <Row T={T} label="AI tone" sub="how it talks to you" control={<Seg T={T} accent={accent} accentInk={accentInk}
        options={[['dry', 'dry'], ['unhinged', 'unhinged']]} value={prefs.tone} onChange={(v) => setPref('tone', v)} />} />
      <Rule T={T} />
      <Row T={T} label="Nihilism" sub="how dark it goes" control={<Seg T={T} accent={accent} accentInk={accentInk}
        options={[[1, 'mild'], [2, 'medium'], [3, 'feral']]} value={prefs.nihil} onChange={(v) => setPref('nihil', v)} />} />

      {/* data */}
      <MonoLabel T={T} color={T.faint} style={{ marginTop: 28, marginBottom: 4 }}>data</MonoLabel>
      <Rule T={T} />
      <Row T={T} label={syncing ? 'Syncing…' : 'Sync SMS history'} sub="re-scan bank texts for missed spends"
        onPress={syncing ? undefined : handleSync}
        control={syncing ? <ActivityIndicator color={accent} /> : <MonoLabel T={T} color={accent} size={11}>sync →</MonoLabel>} />
      {notifAccessAvailable() && (
        <>
          <Rule T={T} />
          <Row T={T} label="Notification access" sub="auto-log from GPay, PhonePe, Paytm & bank apps"
            onPress={() => { openNotifAccessSettings(); setNotifAccess(true); }}
            control={<MonoLabel T={T} color={notifAccess ? accent : T.dim} size={11}>
              {notifAccess ? 'on ✓' : 'set up →'}
            </MonoLabel>} />
        </>
      )}
      <Rule T={T} />
      <Row T={T} label={exporting ? 'Exporting…' : 'Export the damage'} sub="csv of every transaction"
        onPress={exporting ? undefined : handleExport}
        control={exporting ? <ActivityIndicator color={accent} /> : <MonoLabel T={T} color={T.dim} size={11}>↗</MonoLabel>} />

      {/* account */}
      <MonoLabel T={T} color={T.faint} style={{ marginTop: 28, marginBottom: 4 }}>account</MonoLabel>
      <Rule T={T} />
      <Row T={T} label="Notifications" sub="weekly damage report" control={<Toggle T={T} accent={accent} on={notif} onChange={handleNotifications} />} />
      {!isPremium && (
        <>
          <Rule T={T} />
          <Row T={T} label={restoring ? 'Restoring…' : 'Restore purchase'} sub="already subscribed? get your Pro back"
            onPress={restoring ? undefined : handleRestore}
            control={restoring ? <ActivityIndicator color={accent} /> : <MonoLabel T={T} color={accent} size={11}>restore →</MonoLabel>} />
        </>
      )}
      <Rule T={T} />
      <Row T={T} label="Log out" onPress={handleLogout} control={<MonoLabel T={T} color={accent} size={11}>bye →</MonoLabel>} />
      <Rule T={T} />
      <Row T={T} label="Delete account" sub="permanent · cannot be undone" onPress={handleDelete}
        control={<MonoLabel T={T} color={T.red} size={11}>✕</MonoLabel>} />

      <View style={{ alignItems: 'center', marginTop: 34, gap: 10 }}>
        <Brand T={T} color={T.faint} size={20} />
        <MonoLabel T={T} color={T.faint} size={10}>v1.0 · made it worse, beautifully</MonoLabel>
      </View>
    </ScrollView>
  );
}
