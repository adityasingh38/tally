// src/tally/AnimatedSplash.js
// Branded intro: 4 tally bars count in one-by-one, the slash strikes through,
// the wordmark fades up, then the overlay fades out → onDone().
//
// Uses ONLY the core reanimated API (useSharedValue / useAnimatedStyle /
// withTiming / withDelay) — no layout `entering` animations, which have been a
// source of crashes on this RN/Fabric + reanimated setup.
import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withDelay, withTiming, withSpring, runOnJS, Easing,
} from 'react-native-reanimated';
import { FONTS } from './theme';

const INK = '#0E0F0C';
const RED = '#FF5436';
const TEXT = '#F2F3EC';
const DIM = '#63655A';

const H = 92;
const SW = 13;
const GAP = 17;
const ROW_W = 4 * SW + 3 * GAP;   // 103 — explicit so the slash can centre in px
const ROW_H = H * 1.34;
const SLASH_H = H * 1.36;

// One animated bar — pops + fades in at `delay` ms.
function Bar({ delay, progress }) {
  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.6 + progress.value * 0.4 }],
  }));
  return <Animated.View style={[styles.bar, { marginLeft: delay ? GAP : 0 }, style]} />;
}

export default function AnimatedSplash({ onDone }) {
  const wrap = useSharedValue(1);
  const b = [useSharedValue(0), useSharedValue(0), useSharedValue(0), useSharedValue(0)];
  const slash = useSharedValue(0);
  const word = useSharedValue(0);

  useEffect(() => {
    const spring = { damping: 13, stiffness: 150 };
    b.forEach((v, i) => { v.value = withDelay(i * 130, withSpring(1, spring)); });
    slash.value = withDelay(600, withSpring(1, { damping: 15, stiffness: 140 }));
    word.value = withDelay(820, withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }));
    wrap.value = withDelay(1650, withTiming(0, { duration: 380 }, (finished) => {
      if (finished) runOnJS(onDone)();
    }));
  }, []);

  const wrapStyle = useAnimatedStyle(() => ({ opacity: wrap.value }));
  const slashStyle = useAnimatedStyle(() => ({
    opacity: slash.value,
    transform: [
      { rotate: '60deg' },
      { scaleY: 0.4 + slash.value * 0.6 },
    ],
  }));
  const wordStyle = useAnimatedStyle(() => ({
    opacity: word.value,
    transform: [{ translateY: (1 - word.value) * 10 }],
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.fill, wrapStyle]}>
      <View style={styles.markRow}>
        {b.map((v, i) => <Bar key={i} delay={i} progress={v} />)}
        <Animated.View style={[styles.slash, slashStyle]} pointerEvents="none" />
      </View>

      <Animated.Text style={[styles.word, wordStyle]}>tally</Animated.Text>
      <Animated.Text style={[styles.tag, wordStyle]}>track the damage</Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: { backgroundColor: INK, alignItems: 'center', justifyContent: 'center' },
  markRow: { flexDirection: 'row', alignItems: 'flex-end', width: ROW_W, height: ROW_H, position: 'relative' },
  bar: { width: SW, height: H, backgroundColor: RED, borderRadius: 3 },
  slash: {
    position: 'absolute',
    left: (ROW_W - SW) / 2,
    top: (ROW_H - SLASH_H) / 2,
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
