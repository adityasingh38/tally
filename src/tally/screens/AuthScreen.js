// src/tally/screens/AuthScreen.js — sign in / sign up, receipt style.
// Shown by TallyNavigation whenever there's no authenticated user.
import React, { useState } from 'react';
import {
  View, Text, TextInput, KeyboardAvoidingView, Platform, Pressable, Alert, Linking,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useTally } from '../TallyContext';
import { FONTS } from '../theme';
import { Btn, MonoLabel, PlasmaVeilLoader } from '../ui';
import TallyMark from '../TallyMark';
import { supabase } from '../../services/supabase';

function GoogleIcon({ size = 18 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <Path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <Path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <Path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </Svg>
  );
}

export default function AuthScreen() {
  const { T, accent, accentInk } = useTally();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!email || !password) {
      Alert.alert('Hold on', 'Enter an email and password.');
      return;
    }
    setLoading(true);
    const { error } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) Alert.alert('Error', error.message);
    // success → onAuthStateChange flips `user`, navigator swaps this screen out.
  }

  async function handleGoogleAuth() {
    setLoading(true);
    try {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (e) {}

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'tally://auth-callback',
          skipBrowserRedirect: true,
        },
      });
      if (error) throw error;
      if (data?.url) {
        await Linking.openURL(data.url);
      }
    } catch (err) {
      Alert.alert('Google Sign-In', err?.message || 'Could not connect to Google.');
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    backgroundColor: T.card,
    borderColor: T.line,
    borderWidth: 1,
    borderRadius: 4,
    paddingVertical: 15,
    paddingHorizontal: 16,
    color: T.text,
    fontSize: 16,
    fontFamily: FONTS.sans,
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 32 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 14 }}>
            <TallyMark size={40} color={accent} />
            <Text style={{ fontFamily: FONTS.display, fontSize: 54, color: T.text, letterSpacing: -3, lineHeight: 56 }}>
              tally
            </Text>
          </View>
          <MonoLabel T={T} color={T.dim} size={13} style={{ marginTop: 14, marginBottom: 32 }}>
            track the damage. Financially feral.
          </MonoLabel>

          {/* Segmented Mode Selector: Sign In / Create Account */}
          <View style={{
            flexDirection: 'row',
            backgroundColor: T.surface,
            borderRadius: 6,
            padding: 4,
            borderWidth: 1,
            borderColor: T.line,
            marginBottom: 16,
          }}>
            <Pressable
              onPress={() => {
                try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (e) {}
                setIsSignUp(false);
              }}
              style={{
                flex: 1,
                paddingVertical: 10,
                alignItems: 'center',
                borderRadius: 4,
                backgroundColor: !isSignUp ? accent : 'transparent',
              }}
            >
              <Text style={{
                fontFamily: FONTS.monoBold,
                fontSize: 12,
                letterSpacing: 1,
                textTransform: 'uppercase',
                color: !isSignUp ? accentInk : T.dim,
              }}>
                Sign In
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (e) {}
                setIsSignUp(true);
              }}
              style={{
                flex: 1,
                paddingVertical: 10,
                alignItems: 'center',
                borderRadius: 4,
                backgroundColor: isSignUp ? accent : 'transparent',
              }}
            >
              <Text style={{
                fontFamily: FONTS.monoBold,
                fontSize: 12,
                letterSpacing: 1,
                textTransform: 'uppercase',
                color: isSignUp ? accentInk : T.dim,
              }}>
                Create Account
              </Text>
            </Pressable>
          </View>

          {/* Sign in with Google */}
          <Pressable
            onPress={handleGoogleAuth}
            disabled={loading}
            style={({ pressed }) => [{
              width: '100%',
              borderRadius: 4,
              paddingVertical: 14,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              backgroundColor: T.card,
              borderWidth: 1,
              borderColor: T.lineStrong,
              opacity: loading ? 0.5 : pressed ? 0.82 : 1,
            }]}
          >
            <GoogleIcon size={18} />
            <Text style={{ fontFamily: FONTS.sansMed, fontSize: 14, color: T.text, letterSpacing: 0.2 }}>
              {isSignUp ? 'Sign up with Google' : 'Sign in with Google'}
            </Text>
          </Pressable>

          {/* Divider */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 16, gap: 12 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: T.line }} />
            <MonoLabel T={T} color={T.faint} size={10}>OR</MonoLabel>
            <View style={{ flex: 1, height: 1, backgroundColor: T.line }} />
          </View>

          {/* Email / Password Form */}
          <View style={{ gap: 12 }}>
            <TextInput
              style={inputStyle}
              placeholder="email"
              placeholderTextColor={T.faint}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TextInput
              style={inputStyle}
              placeholder="password"
              placeholderTextColor={T.faint}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <Btn T={T} accent={accent} accentInk={accentInk} onPress={handleSubmit} disabled={loading} style={{ marginTop: 4 }}>
              {loading ? <PlasmaVeilLoader color={accentInk} accessibilityLabel={isSignUp ? 'Creating account' : 'Signing in'} />
                : isSignUp ? 'create account' : 'sign in'}
            </Btn>

            <Pressable
              onPress={() => {
                try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (e) {}
                setIsSignUp(!isSignUp);
              }}
              style={{ alignItems: 'center', paddingVertical: 12 }}
            >
              <MonoLabel T={T} color={T.dim} size={11}>
                {isSignUp ? 'have an account? sign in' : 'new here? create an account'}
              </MonoLabel>
            </Pressable>
          </View>
        </View>

        <MonoLabel T={T} color={T.faint} size={10} style={{ textAlign: 'center', paddingBottom: 24 }}>
          transaction details saved · full alerts not stored
        </MonoLabel>
      </KeyboardAvoidingView>
    </View>
  );
}
