// src/tally/AnimatedSplash.js
// Branded intro: 4 tally bars count in one-by-one,
// 5th stick slashes across all 4 bars at 56°,
// then the wordmark & tagline fade up → onDone().
//
// Uses React Native's built-in Animated API (NOT reanimated) with the native driver.
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import * as Haptics from 'expo-haptics';
import { FONTS } from './theme';

const INK = '#0E0F0C';
const RED = '#FF5436';
const TEXT = '#F2F3EC';
const DIM = '#63655A';

const H = 92;
const SW = 13;
const GAP = 17;
const ROW_W = 4 * SW + 3 * GAP;
const SLASH_H = H * 1.36;

const slashHaptic = () => {
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  } catch (e) {}
};

export default function AnimatedSplash({ onDone }) {
  const bars = useRef([0, 0, 0, 0].map(() => new Animated.Value(0))).current;
  const slash = useRef(new Animated.Value(0)).current;
  const word = useRef(new Animated.Value(0)).current;
  const wrap = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const barCfg = { duration: 180, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true };

    Animated.sequence([
      // 1. 4 tally bars count in staggered
      Animated.stagger(80, bars.map((v) => Animated.timing(v, { toValue: 1, ...barCfg }))),

      // 2. 5th stick slashes diagonally across all 4 bars at 56°
      Animated.timing(slash, {
        toValue: 1,
        duration: 160,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),

      // 3. Wordmark & tagline fade up
      Animated.timing(word, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),

      // 4. Pause, then splash dissolves into the app
      Animated.delay(500),
      Animated.timing(wrap, { toValue: 0, duration: 320, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished && onDone) onDone();
    });

    // Trigger haptic slam at moment of slash landing (~420ms in)
    const t = setTimeout(slashHaptic, 420);
    return () => clearTimeout(t);
  }, []);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.fill, { opacity: wrap }]}>
      <View style={styles.markRow}>
        {bars.map((v, i) => (
          <Animated.View
            key={i}
            style={[
              styles.bar,
              {
                marginLeft: i ? GAP : 0,
                opacity: v,
                transformOrigin: 'center bottom',
                transform: [
                  { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
                  { scaleY: v.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] }) },
                ],
              },
            ]}
          />
        ))}

        {/* 5th stick: slash draws diagonally across all 4 bars at 56° */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.slash,
            {
              opacity: slash.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 1, 1] }),
              transformOrigin: 'center bottom',
              transform: [{ rotate: '56deg' }, { scaleY: slash.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) }],
            },
          ]}
        />
      </View>

      <Animated.Text
        style={[styles.word, { opacity: word, transform: [{ translateY: word.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }]}
      >
        tally
      </Animated.Text>
      <Animated.Text style={[styles.tag, { opacity: word }]}>track the damage</Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: { backgroundColor: INK, alignItems: 'center', justifyContent: 'center' },
  markRow: { flexDirection: 'row', alignItems: 'flex-end', width: ROW_W, height: H, position: 'relative' },
  bar: { width: SW, height: H, backgroundColor: RED, borderRadius: 3 },
  slash: {
    position: 'absolute',
    left: (ROW_W - SW) / 2,   // horizontally centred on the bar group
    top: (H - SLASH_H) / 2,   // vertically centred on the bars (overshoots top/bottom)
    width: SW,
    height: SLASH_H,
    backgroundColor: RED,
    borderRadius: 3,
  },
  word: { fontFamily: FONTS.display, fontSize: 40, color: TEXT, letterSpacing: -1.5, marginTop: 34 },
  tag: {
    fontFamily: FONTS.mono, fontSize: 11, color: DIM, letterSpacing: 2,
    textTransform: 'uppercase', marginTop: 10,
  },
});
