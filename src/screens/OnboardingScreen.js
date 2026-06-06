import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  PermissionsAndroid, Alert, ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../constants';
import { useAuth } from '../hooks/useAuth';
import { syncHistoricalSMS } from '../services/smsSync';
import { scheduleWeeklyDigest } from '../services/weeklyDigest';

const GOALS = [
  'Save more each month',
  'Understand where my money goes',
  'Reduce unnecessary spending',
  'Build an emergency fund',
  'Pay off debt faster',
];

export default function OnboardingScreen() {
  const { user, completeOnboarding } = useAuth();
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState('');
  const [customGoal, setCustomGoal] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(null);

  async function requestSMSPermission() {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_SMS,
        {
          title: 'Tally needs SMS access',
          message: 'To auto-log your bank transactions, Tally reads SMS from your bank.',
          buttonPositive: 'Allow',
          buttonNegative: 'Skip',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch {
      return false;
    }
  }

  async function handleSMSSync() {
    const granted = await requestSMSPermission();
    if (!granted) {
      Alert.alert(
        'Permission skipped',
        'You can enable SMS access later in Settings. Transactions won\'t be auto-logged until then.'
      );
      await completeOnboarding();
      return;
    }

    setSyncing(true);
    try {
      const finalGoal = goal === 'other' ? customGoal : goal;
      await AsyncStorage.setItem('tally_goal', finalGoal);

      await syncHistoricalSMS(user.id, (progress) => {
        setSyncProgress(progress);
      });
      scheduleWeeklyDigest().catch(() => {});
    } catch (e) {
      console.error('SMS sync failed:', e);
    }

    setSyncing(false);
    await completeOnboarding();
  }

  if (step === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.emoji}>🎯</Text>
        <Text style={styles.title}>What's your financial goal?</Text>
        <Text style={styles.subtitle}>Tally will frame all insights around this.</Text>

        <ScrollView style={styles.options} contentContainerStyle={{ gap: 10 }}>
          {GOALS.map(g => (
            <TouchableOpacity
              key={g}
              style={[styles.option, goal === g && styles.optionSelected]}
              onPress={() => setGoal(g)}
            >
              <Text style={[styles.optionText, goal === g && styles.optionTextSelected]}>{g}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.option, goal === 'other' && styles.optionSelected]}
            onPress={() => setGoal('other')}
          >
            <Text style={[styles.optionText, goal === 'other' && styles.optionTextSelected]}>
              Something else...
            </Text>
          </TouchableOpacity>
          {goal === 'other' && (
            <TextInput
              style={styles.input}
              placeholder="Type your goal"
              placeholderTextColor={COLORS.textMuted}
              value={customGoal}
              onChangeText={setCustomGoal}
            />
          )}
        </ScrollView>

        <TouchableOpacity
          style={[styles.btn, !goal && styles.btnDisabled]}
          onPress={() => goal && setStep(1)}
          disabled={!goal}
        >
          <Text style={styles.btnText}>Continue →</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>📱</Text>
      <Text style={styles.title}>Enable auto-logging</Text>
      <Text style={styles.subtitle}>
        Tally reads SMS from your bank to log transactions automatically. No manual entry. Ever.
      </Text>

      <View style={styles.featureList}>
        {['Reads only bank SMS (not personal)', 'Never stores your raw messages on our servers', 'Works offline'].map(f => (
          <View key={f} style={styles.feature}>
            <Text style={styles.featureIcon}>✓</Text>
            <Text style={styles.featureText}>{f}</Text>
          </View>
        ))}
      </View>

      {syncing ? (
        <View style={styles.syncBox}>
          <Text style={styles.syncText}>
            {syncProgress
              ? `Importing ${syncProgress.inserted || 0} transactions...`
              : 'Reading SMS history...'}
          </Text>
        </View>
      ) : (
        <TouchableOpacity style={styles.btn} onPress={handleSMSSync}>
          <Text style={styles.btnText}>Enable SMS access</Text>
        </TouchableOpacity>
      )}

      {!syncing && (
        <TouchableOpacity onPress={completeOnboarding} style={styles.skipBtn}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 32, justifyContent: 'center' },
  emoji: { fontSize: 56, marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.text, marginBottom: 8 },
  subtitle: { fontSize: 16, color: COLORS.textSecondary, lineHeight: 24, marginBottom: 32 },
  options: { maxHeight: 320, marginBottom: 24 },
  option: {
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 12, padding: 16,
  },
  optionSelected: { borderColor: COLORS.primary, backgroundColor: '#6C63FF22' },
  optionText: { color: COLORS.textSecondary, fontSize: 15 },
  optionTextSelected: { color: COLORS.primary, fontWeight: '600' },
  input: {
    backgroundColor: COLORS.surface, borderColor: COLORS.border, borderWidth: 1,
    borderRadius: 12, padding: 16, color: COLORS.text, fontSize: 15,
  },
  btn: {
    backgroundColor: COLORS.primary, borderRadius: 12, padding: 18, alignItems: 'center',
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  featureList: { gap: 16, marginBottom: 40 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureIcon: { color: COLORS.success, fontSize: 18, fontWeight: '700' },
  featureText: { color: COLORS.textSecondary, fontSize: 15 },
  syncBox: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 20, alignItems: 'center' },
  syncText: { color: COLORS.textSecondary, fontSize: 15 },
  skipBtn: { alignItems: 'center', padding: 16 },
  skipText: { color: COLORS.textMuted, fontSize: 14 },
});
