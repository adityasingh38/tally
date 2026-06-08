import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { supabase } from '../services/supabase';
import { COLORS, RADII, GRADIENTS, shadow } from '../constants';
import Bouncy from '../components/Bouncy';

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!email || !password) return;
    setLoading(true);
    const fn = isSignUp
      ? supabase.auth.signUp({ email, password })
      : supabase.auth.signInWithPassword({ email, password });
    const { error } = await fn;
    setLoading(false);
    if (error) Alert.alert('Error', error.message);
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#221A3D', '#13111C', '#0F0F13']} style={StyleSheet.absoluteFill} />
      {/* glow blob */}
      <LinearGradient
        colors={[COLORS.primary + '55', 'transparent']}
        style={styles.blob}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.inner}>
          <Animated.View entering={FadeInDown.springify().damping(14)}>
            <Text style={styles.logo}>tally</Text>
            <Text style={styles.tagline}>your money, tracked. no effort. ✨</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(150).springify().damping(14)} style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={COLORS.textMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={COLORS.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <Bouncy onPress={handleSubmit} disabled={loading} style={styles.btnWrap}>
              <LinearGradient
                colors={GRADIENTS.hero}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.btn}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.btnText}>{isSignUp ? 'Create account' : 'Sign in'}</Text>}
              </LinearGradient>
            </Bouncy>

            <Bouncy haptic={false} scaleTo={0.97} onPress={() => setIsSignUp(!isSignUp)} style={styles.switchBtn}>
              <Text style={styles.switchText}>
                {isSignUp ? 'Already have an account? Sign in' : "New here? Create an account"}
              </Text>
            </Bouncy>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>

      <Animated.Text entering={FadeIn.delay(500)} style={styles.footer}>
        🔒 Bank-grade privacy · Android
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
  blob: { position: 'absolute', top: -80, right: -60, width: 320, height: 320, borderRadius: 160 },
  inner: { flex: 1, justifyContent: 'center', padding: 32 },
  logo: { fontSize: 56, fontWeight: '900', color: COLORS.text, letterSpacing: -3, marginBottom: 10 },
  tagline: { fontSize: 16, color: COLORS.textSecondary, marginBottom: 44 },
  form: { gap: 14 },
  input: {
    backgroundColor: COLORS.surface + 'EE', borderColor: COLORS.border, borderWidth: 1,
    borderRadius: RADII.lg, padding: 18, color: COLORS.text, fontSize: 16,
  },
  btnWrap: { marginTop: 6, borderRadius: RADII.pill, ...shadow(COLORS.primary, 14, 0.5) },
  btn: { borderRadius: RADII.pill, paddingVertical: 18, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: 0.3 },
  switchBtn: { alignItems: 'center', padding: 14 },
  switchText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '600' },
  footer: { position: 'absolute', bottom: 28, alignSelf: 'center', color: COLORS.textMuted, fontSize: 12 },
});
