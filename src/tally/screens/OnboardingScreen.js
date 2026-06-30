// src/tally/screens/OnboardingScreen.js
import React, { useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, PermissionsAndroid, Alert, Linking, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTally } from '../TallyContext';
import { useAuth } from '../../hooks/useAuth';
import { syncHistoricalSMS } from '../../services/smsSync';
import { notifAccessAvailable, isNotifAccessEnabled, openNotifAccessSettings } from '../../services/notificationAccess';
import { scheduleWeeklyDigest, scheduleMonthEndSummary, sendWeeklyDigestWithRealData } from '../../services/weeklyDigest';
import { FONTS } from '../theme';
import { MonoLabel, Btn, Brand } from '../ui';

const FEATURES = [
  ['AUTO', 'reads your bank SMS, logs every spend. no typing, no lying to yourself.'],
  ['VERDICT', "an AI that's deeply unbothered about your feelings."],
  ['RECEIPT', 'a shareable receipt of the monthly carnage.'],
];

export default function OnboardingScreen({ onDone }) {
  const { T, accent, accentInk, setIncome } = useTally();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState(null);
  const [incomeInput, setIncomeInput] = useState('');

  const saveIncome = () => {
    const n = Number(incomeInput.replace(/[^0-9]/g, ''));
    if (n > 0) setIncome(n);
  };
  const finish = () => { saveIncome(); onDone && onDone(); };

  // Play-safe path: read bank/UPI app notifications instead of SMS. Deep-links
  // to the system toggle (no runtime dialog exists for this permission), then
  // finishes onboarding — new spends flow in live as notifications arrive.
  async function handleNotifAccess() {
    saveIncome();
    const already = await isNotifAccessEnabled();
    if (already) { onDone && onDone(); return; }
    Alert.alert(
      'Turn on Notification access',
      'Tally reads transaction alerts from your bank & UPI apps (GPay, PhonePe, Paytm…) to auto-log spends. Flip Tally on in the next screen.',
      [
        { text: 'Open Settings', onPress: () => { openNotifAccessSettings(); onDone && onDone(); } },
        { text: 'Skip for now', style: 'cancel', onPress: () => onDone && onDone() },
      ]
    );
  }

  async function requestSMS() {
    try {
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_SMS, {
        title: 'Tally needs SMS access',
        message: 'To auto-log your bank transactions, Tally reads SMS from your bank.',
        buttonPositive: 'Allow',
        buttonNegative: 'Skip',
      });
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch {
      return false;
    }
  }

  async function handleAllow() {
    saveIncome();
    const granted = await requestSMS();
    if (!granted) {
      Alert.alert(
        'SMS access needed',
        'Tally auto-logs transactions by reading bank SMS. Enable it to continue, or skip for now.',
        [
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
          { text: 'Skip for now', style: 'cancel', onPress: () => onDone && onDone() },
        ]
      );
      return;
    }
    setSyncing(true);
    try {
      if (user?.id) {
        await syncHistoricalSMS(user.id, (p) => setProgress(p));
        scheduleWeeklyDigest().catch(() => {});
        scheduleMonthEndSummary().catch(() => {});
        sendWeeklyDigestWithRealData(user.id).catch(() => {});
      }
    } catch (e) {
      console.error('SMS sync failed:', e);
    }
    setSyncing(false);
    onDone && onDone();
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: T.bg }}
      contentContainerStyle={{ paddingHorizontal: 26, paddingTop: insets.top + 40, paddingBottom: 40, flexGrow: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Brand T={T} color={accent} size={24} />
        <MonoLabel T={T} color={T.dim} size={12}>tally</MonoLabel>
      </View>

      <View style={{ marginTop: 44 }}>
        <Text style={{ fontFamily: FONTS.display, fontSize: 34, lineHeight: 38, color: T.text }}>
          track the damage. <Text style={{ color: accent }}>financially feral.</Text>
        </Text>
        <Text style={{ fontFamily: FONTS.sans, fontSize: 16, lineHeight: 24, color: T.dim, marginTop: 18 }}>
          the money app for people who already know it's bad and want to watch anyway.
        </Text>
      </View>

      <View style={{ marginTop: 38, gap: 18, flex: 1 }}>
        {FEATURES.map(([tag, line]) => (
          <View key={tag} style={{ flexDirection: 'row', gap: 14 }}>
            <Text style={{ fontFamily: FONTS.monoBold, fontSize: 11, color: accent, width: 62, paddingTop: 2, letterSpacing: 0.6 }}>{tag}</Text>
            <Text style={{ flex: 1, fontFamily: FONTS.sans, fontSize: 14.5, lineHeight: 21, color: T.text }}>{line}</Text>
          </View>
        ))}
      </View>

      {/* monthly income — powers "left to burn" */}
      <View style={{ marginTop: 28 }}>
        <MonoLabel T={T} color={T.dim} style={{ marginBottom: 8 }}>monthly income (₹)</MonoLabel>
        <TextInput
          value={incomeInput}
          onChangeText={setIncomeInput}
          keyboardType="numeric"
          placeholder="e.g. 65000"
          placeholderTextColor={T.faint}
          style={{
            backgroundColor: T.card, borderWidth: 1, borderColor: T.line, borderRadius: 4,
            paddingVertical: 14, paddingHorizontal: 16, color: T.text, fontSize: 18, fontFamily: FONTS.mono,
          }}
        />
        <MonoLabel T={T} color={T.faint} size={9.5} style={{ marginTop: 6 }}>
          optional · so we can show what's left to burn
        </MonoLabel>
      </View>

      <View style={{ gap: 10, marginTop: 22 }}>
        {syncing ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 16 }}>
            <ActivityIndicator color={accent} />
            <MonoLabel T={T} color={T.dim} size={11}>
              {progress ? `importing ${progress.inserted || 0} spends…` : 'reading SMS history…'}
            </MonoLabel>
          </View>
        ) : (
          <>
            <Btn T={T} accent={accent} accentInk={accentInk} onPress={handleAllow}>allow SMS access</Btn>
            {notifAccessAvailable() && (
              <Btn T={T} accent={accent} accentInk={accentInk} variant="ghost" onPress={handleNotifAccess}>
                use notifications instead (no SMS)
              </Btn>
            )}
            <Btn T={T} accent={accent} accentInk={accentInk} variant="ghost" onPress={finish}>i'll log it manually</Btn>
            <MonoLabel T={T} color={T.faint} size={9.5} style={{ textAlign: 'center', marginTop: 8 }}>
              we never store your texts. we just judge them.
            </MonoLabel>
          </>
        )}
      </View>
    </ScrollView>
  );
}
