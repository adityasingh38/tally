// src/tally/screens/AuthScreen.js — sign in / sign up, receipt style.
// Shown by TallyNavigation whenever there's no authenticated user.
import React, { useState } from 'react';
import {
  View, Text, TextInput, KeyboardAvoidingView, Platform, Pressable, Alert,
} from 'react-native';
import { useTally } from '../TallyContext';
import { FONTS } from '../theme';
import { Btn, MonoLabel } from '../ui';
import TallyMark from '../TallyMark';
import { supabase } from '../../services/supabase';

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

  const inputStyle = {
    backgroundColor: T.card,
    borderColor: T.line,
    borderWidth: 1,
    borderRadius: 4,
    paddingVertical: 16,
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
          <MonoLabel T={T} color={T.dim} size={13} style={{ marginTop: 16, marginBottom: 44 }}>
            track the damage. financially feral.
          </MonoLabel>

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

            <Btn T={T} accent={accent} accentInk={accentInk} onPress={handleSubmit} disabled={loading} style={{ marginTop: 6 }}>
              {loading ? '…' : isSignUp ? 'create account' : 'sign in'}
            </Btn>

            <Pressable onPress={() => setIsSignUp(!isSignUp)} style={{ alignItems: 'center', paddingVertical: 14 }}>
              <MonoLabel T={T} color={T.dim} size={11}>
                {isSignUp ? 'have an account? sign in' : 'new here? create an account'}
              </MonoLabel>
            </Pressable>
          </View>
        </View>

        <MonoLabel T={T} color={T.faint} size={10} style={{ textAlign: 'center', paddingBottom: 28 }}>
          we never store your texts · we just judge them
        </MonoLabel>
      </KeyboardAvoidingView>
    </View>
  );
}
