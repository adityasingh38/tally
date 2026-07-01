// src/components/ErrorBoundary.js
// Catches uncaught render errors so the app shows a recoverable screen
// instead of a white/red crash screen. Deliberately self-contained (no
// TallyContext/theme import) since the error that triggered this could have
// come from inside that provider tree.
import React from 'react';
import { View, Text, Pressable } from 'react-native';
import * as Updates from 'expo-updates';
import { reportError } from '../services/crashReporting';

const BG = '#0E0F0C';
const TEXT = '#F2F3EC';
const DIM = '#9DA08F';
const ACCENT = '#D4FF2E';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    reportError(error, { componentStack: info?.componentStack });
  }

  handleReload = async () => {
    try {
      // Also picks up any already-downloaded OTA update, not just a reset.
      await Updates.reloadAsync();
    } catch {
      this.setState({ error: null }); // Expo Go / dev: no native reload API
    }
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <View style={{ flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center', padding: 28 }}>
        <Text style={{ color: TEXT, fontSize: 20, fontWeight: '700', textAlign: 'center' }}>
          something broke.
        </Text>
        <Text style={{ color: DIM, fontSize: 14, textAlign: 'center', marginTop: 10, lineHeight: 20 }}>
          your data's safe — this was just a display crash. tap below to try again.
        </Text>
        <Pressable onPress={this.handleReload}
          style={{ marginTop: 24, backgroundColor: ACCENT, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 28 }}>
          <Text style={{ color: BG, fontWeight: '700', fontSize: 14 }}>reload tally</Text>
        </Pressable>
      </View>
    );
  }
}
