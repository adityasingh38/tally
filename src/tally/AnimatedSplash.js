// src/tally/AnimatedSplash.js
// Branded intro: 4 tally bars count in one-by-one,
// "FINANCIALLY FERAL" slams down from above as a stamp in the position of the 5th stick,
// then vanishes leaving the 5th stick in place. The wordmark fades up → onDone().
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
const ROW_H = H * 1.34;
const SLASH_H = H * 1.36;

const STAMP_W = 146;
const STAMP_H = 26;

const slamHaptic = () => {
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  } catch (e) {}
};

export default function AnimatedSplash({ onDone }) {
  const bars = useRef([0, 0, 0, 0].map(() => new Animated.Value(0))).current;
  const stampDrop = useRef(new Animated.Value(0)).current;
  const stampOpacity = useRef(new Animated.Value(0)).current;
  const slash = useRef(new Animated.Value(0)).current;
  const word = useRef(new Animated.Value(0)).current;
  const wrap = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const barCfg = { duration: 180, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true };

    Animated.sequence([
      // 1. 4 tally bars count in
      Animated.stagger(80, bars.map((v) => Animated.timing(v, { toValue: 1, ...barCfg }))),

      // 2. "FINANCIALLY FERAL" drops from above as a stamp into the 5th stick position
      Animated.parallel([
        Animated.timing(stampOpacity, { toValue: 1, duration: 80, useNativeDriver: true }),
        Animated.timing(stampDrop, {
          toValue: 1,
          duration: 250,
          easing: Easing.out(Easing.back(2.0)),
          useNativeDriver: true,
        }),
      ]),

      // 3. Slash (5th stick) strikes in directly under the stamp with impact
      Animated.timing(slash, {
        toValue: 1,
        duration: 120,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),

      // 4. Hold for user to read the stamp
      Animated.delay(420),

      // 5. Stamp vanishes, leaving the 5th stick in place
      Animated.timing(stampOpacity, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),

      // 6. Wordmark & tagline fade up
      Animated.timing(word, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),

      // 7. Pause, then splash dissolves into the app
      Animated.delay(450),
      Animated.timing(wrap, { toValue: 0, duration: 320, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished && onDone) onDone();
    });

    // Trigger haptic slam at moment of stamp landing (~400ms in)
    const t = setTimeout(slamHaptic, 400);
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

        {/* 5th stick: slash draws diagonally across all 4 bars */}
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

        {/* "FINANCIALLY FERAL" stamp dropping from above in the exact 5th stick position, then vanishing */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.stamp,
            {
              opacity: stampOpacity,
              transform: [
                { translateY: stampDrop.interpolate({ inputRange: [0, 1], outputRange: [-180, 0] }) },
                { scale: stampDrop.interpolate({ inputRange: [0, 1], outputRange: [2.8, 1] }) },
                { rotate: stampDrop.interpolate({ inputRange: [0, 1], outputRange: ['48deg', '56deg'] }) },
              ],
            },
          ]}
        >
          <View style={styles.stampBadge}>
            <Text style={styles.stampText}>FINANCIALLY FERAL</Text>
          </View>
        </Animated.View>
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
  // height == bar height so the slash centres on the bars, not on empty space.
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
  stamp: {
    position: 'absolute',
    left: (ROW_W - STAMP_W) / 2,
    top: (H - STAMP_H) / 2,
    width: STAMP_W,
    height: STAMP_H,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  stampBadge: {
    backgroundColor: RED,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#FFA590',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 8,
  },
  stampText: {
    fontFamily: FONTS.monoBold,
    fontSize: 9.5,
    color: INK,
    letterSpacing: 1.3,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  word: { fontFamily: FONTS.display, fontSize: 40, color: TEXT, letterSpacing: -1.5, marginTop: 34 },
  tag: {
    fontFamily: FONTS.mono, fontSize: 11, color: DIM, letterSpacing: 2,
    textTransform: 'uppercase', marginTop: 10,
  },
});
