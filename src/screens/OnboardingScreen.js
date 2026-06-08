import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, PermissionsAndroid, Alert, ScrollView, Linking, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, RADII, GRADIENTS, shadow } from '../constants';
import { useAuth } from '../hooks/useAuth';
import { syncHistoricalSMS } from '../services/smsSync';
import { scheduleWeeklyDigest } from '../services/weeklyDigest';
import Bouncy from '../components/Bouncy';

const GOALS = [
  { emoji: '💰', label: 'Save more each month' },
  { emoji: '🔍', label: 'Understand where my money goes' },
  { emoji: '✂️', label: 'Reduce unnecessary spending' },
  { emoji: '🛟', label: 'Build an emergency fund' },
  { emoji: '🏃', label: 'Pay off debt faster' },
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
        'SMS access needed',
        'Tally auto-logs transactions by reading bank SMS. Enable the SMS permission to continue, or skip for now.',
        [
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
          { text: 'Skip for now', style: 'cancel', onPress: () => { completeOnboarding(); } },
        ]
      );
      return;
    }

    setSyncing(true);
    try {
      const finalGoal = goal === 'other' ? customGoal : goal;
      await AsyncStorage.setItem('tally_goal', finalGoal);
      await syncHistoricalSMS(user.id, (progress) => setSyncProgress(progress));
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
        <LinearGradient colors={['#221A3D', '#13111C', '#0F0F13']} style={StyleSheet.absoluteFill} />
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Animated.Text entering={FadeInDown.springify()} style={styles.emoji}>🎯</Animated.Text>
          <Animated.Text entering={FadeInDown.delay(80).springify()} style={styles.title}>
            What's your money goal?
          </Animated.Text>
          <Animated.Text entering={FadeInDown.delay(140).springify()} style={styles.subtitle}>
            Tally frames every insight around this.
          </Animated.Text>

          <View style={styles.options}>
            {GOALS.map((g, i) => {
              const active = goal === g.label;
              return (
                <Animated.View key={g.label} entering={FadeInDown.delay(200 + i * 60).springify()}>
                  <Bouncy scaleTo={0.97} onPress={() => setGoal(g.label)}
                    style={[styles.option, active && styles.optionSelected]}>
                    <Text style={styles.optionEmoji}>{g.emoji}</Text>
                    <Text style={[styles.optionText, active && styles.optionTextSelected]}>{g.label}</Text>
                  </Bouncy>
                </Animated.View>
              );
            })}
            <Animated.View entering={FadeInDown.delay(200 + GOALS.length * 60).springify()}>
              <Bouncy scaleTo={0.97} onPress={() => setGoal('other')}
                style={[styles.option, goal === 'other' && styles.optionSelected]}>
                <Text style={styles.optionEmoji}>✏️</Text>
                <Text style={[styles.optionText, goal === 'other' && styles.optionTextSelected]}>
                  Something else…
                </Text>
              </Bouncy>
            </Animated.View>
            {goal === 'other' && (
              <TextInput
                style={styles.input}
                placeholder="Type your goal"
                placeholderTextColor={COLORS.textMuted}
                value={customGoal}
                onChangeText={setCustomGoal}
              />
            )}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Bouncy onPress={() => goal && setStep(1)} disabled={!goal} style={[styles.btnWrap, !goal && { opacity: 0.4 }]}>
            <LinearGradient colors={GRADIENTS.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.btn}>
              <Text style={styles.btnText}>Continue →</Text>
            </LinearGradient>
          </Bouncy>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#221A3D', '#13111C', '#0F0F13']} style={StyleSheet.absoluteFill} />
      <View style={styles.scrollCentered}>
        <Animated.Text entering={FadeInDown.springify()} style={styles.emoji}>📱</Animated.Text>
        <Animated.Text entering={FadeInDown.delay(80).springify()} style={styles.title}>
          Enable auto-logging
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(140).springify()} style={styles.subtitle}>
          Tally reads bank SMS to log transactions automatically. No manual entry. Ever.
        </Animated.Text>

        <Animated.View entering={FadeInDown.delay(220).springify()} style={styles.featureList}>
          {[
            ['🔒', 'Reads only bank SMS, never personal'],
            ['🗑️', 'Raw messages are never stored on our servers'],
            ['⚡', 'Works in the background'],
          ].map(([icon, f]) => (
            <View key={f} style={styles.feature}>
              <Text style={styles.featureIcon}>{icon}</Text>
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </Animated.View>
      </View>

      <View style={styles.footer}>
        {syncing ? (
          <View style={styles.syncBox}>
            <ActivityIndicator color={COLORS.primary} />
            <Text style={styles.syncText}>
              {syncProgress ? `Importing ${syncProgress.inserted || 0} transactions…` : 'Reading SMS history…'}
            </Text>
          </View>
        ) : (
          <>
            <Bouncy onPress={handleSMSSync} style={styles.btnWrap}>
              <LinearGradient colors={GRADIENTS.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.btn}>
                <Text style={styles.btnText}>Enable SMS access</Text>
              </LinearGradient>
            </Bouncy>
            <Bouncy haptic={false} onPress={completeOnboarding} style={styles.skipBtn}>
              <Text style={styles.skipText}>Skip for now</Text>
            </Bouncy>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 28, paddingTop: 72 },
  scrollCentered: { flex: 1, padding: 28, justifyContent: 'center' },
  emoji: { fontSize: 56, marginBottom: 16 },
  title: { fontSize: 30, fontWeight: '900', color: COLORS.text, marginBottom: 8, letterSpacing: -0.5 },
  subtitle: { fontSize: 16, color: COLORS.textSecondary, lineHeight: 24, marginBottom: 28 },
  options: { gap: 12 },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: RADII.lg, padding: 18,
  },
  optionSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '1F' },
  optionEmoji: { fontSize: 22 },
  optionText: { color: COLORS.textSecondary, fontSize: 15, fontWeight: '600', flex: 1 },
  optionTextSelected: { color: COLORS.text, fontWeight: '700' },
  input: {
    backgroundColor: COLORS.surface, borderColor: COLORS.border, borderWidth: 1,
    borderRadius: RADII.lg, padding: 16, color: COLORS.text, fontSize: 15,
  },
  featureList: { gap: 18, marginTop: 8 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  featureIcon: { fontSize: 22 },
  featureText: { color: COLORS.textSecondary, fontSize: 15, fontWeight: '500', flex: 1 },
  footer: { padding: 24, gap: 4 },
  btnWrap: { borderRadius: RADII.pill, ...shadow(COLORS.primary, 14, 0.5) },
  btn: { borderRadius: RADII.pill, paddingVertical: 18, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  skipBtn: { alignItems: 'center', padding: 16 },
  skipText: { color: COLORS.textMuted, fontSize: 14, fontWeight: '600' },
  syncBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 18 },
  syncText: { color: COLORS.textSecondary, fontSize: 15, fontWeight: '600' },
});
