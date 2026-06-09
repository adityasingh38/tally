// src/tally/AnimatedSplash.js
// Branded intro: 4 tally bars count in one-by-one, the slash strikes through,
// the wordmark fades up, then the whole overlay fades out → onDone().
import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  ZoomIn, FadeInDown, useSharedValue, useAnimatedStyle, withDelay, withTiming, runOnJS,
} from 'react-native-reanimated';
import { FONTS } from './theme';

const INK = '#0E0F0C';
const RED = '#FF5436';

// bar geometry
const H = 92;
const SW = 13;
const GAP = 17;

export default function AnimatedSplash({ onDone }) {
  const wrap = useSharedValue(1);

  useEffect(() => {
    // hold the assembled mark, then fade the overlay out and hand off.
    wrap.value = withDelay(1550, withTiming(0, { duration: 380 }, (finished) => {
      if (finished) runOnJS(onDone)();
    }));
  }, []);

  const wrapStyle = useAnimatedStyle(() => ({ opacity: wrap.value }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.fill, wrapStyle]}>
      {/* the mark */}
      <View style={styles.markRow}>
        {[0, 1, 2, 3].map((i) => (
          <Animated.View
            key={i}
            entering={ZoomIn.delay(i * 130).springify().damping(13).stiffness(140)}
            style={[styles.bar, { marginLeft: i ? GAP : 0 }]}
          />
        ))}
        {/* slash strikes through after the bars */}
        <Animated.View
          entering={ZoomIn.delay(580).springify().damping(15)}
          style={styles.slash}
          pointerEvents="none"
        />
      </View>

      {/* wordmark */}
      <Animated.Text entering={FadeInDown.delay(760).springify().damping(16)} style={styles.word}>
        tally
      </Animated.Text>
      <Animated.Text entering={FadeInDown.delay(900)} style={styles.tag}>
        track the damage
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: { backgroundColor: INK, alignItems: 'center', justifyContent: 'center' },
  markRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: H * 1.34,
    position: 'relative',
  },
  bar: { width: SW, height: H, backgroundColor: RED, borderRadius: 3 },
  slash: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: SW,
    height: H * 1.36,
    backgroundColor: RED,
    borderRadius: 3,
    transform: [
      { translateX: -SW / 2 },
      { translateY: -(H * 1.36) / 2 },
      { rotate: '60deg' },
    ],
  },
  word: {
    fontFamily: FONTS.display,
    fontSize: 40,
    color: '#F2F3EC',
    letterSpacing: -1.5,
    marginTop: 34,
  },
  tag: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    color: '#63655A',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 10,
  },
});
