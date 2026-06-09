// src/tally/AnimatedSplash.js
// Branded intro: 4 tally bars count in one-by-one, the slash strikes through,
// the wordmark fades up, then the overlay fades out → onDone().
//
// Uses React Native's built-in Animated API (NOT reanimated). The reanimated
// worklet runtime crashes on this build (mapper "Object is not a function"),
// and the rest of the app doesn't use animated styles — so the splash stays on
// the bulletproof core Animated API with the native driver.
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
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

export default function AnimatedSplash({ onDone }) {
  const bars = useRef([0, 0, 0, 0].map(() => new Animated.Value(0))).current;
  const slash = useRef(new Animated.Value(0)).current;
  const word = useRef(new Animated.Value(0)).current;
  const wrap = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const cfg = { duration: 260, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true };
    Animated.sequence([
      Animated.stagger(120, bars.map((v) => Animated.timing(v, { toValue: 1, ...cfg }))),
      Animated.timing(slash, { toValue: 1, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(word, { toValue: 1, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.delay(550),
      Animated.timing(wrap, { toValue: 0, duration: 360, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished && onDone) onDone();
    });
  }, []);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.fill, { opacity: wrap }]}>
      <View style={styles.markRow}>
        {bars.map((v, i) => (
          <Animated.View
            key={i}
            style={[
              styles.bar,
              { marginLeft: i ? GAP : 0, opacity: v, transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] },
            ]}
          />
        ))}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.slash,
            { opacity: slash, transform: [{ rotate: '60deg' }, { scaleY: slash.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }] },
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
  word: { fontFamily: FONTS.display, fontSize: 40, color: TEXT, letterSpacing: -1.5, marginTop: 34 },
  tag: {
    fontFamily: FONTS.mono, fontSize: 11, color: DIM, letterSpacing: 2,
    textTransform: 'uppercase', marginTop: 10,
  },
});
