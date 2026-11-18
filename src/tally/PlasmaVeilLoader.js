import React, { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, Animated, View } from 'react-native';

// Circular 5×5 dot grid, adapted from Dot Matrix's Plasma Veil motion.
const RING = [1, 2, 3, 9, 14, 19, 23, 22, 21, 15, 10, 5];
const TAIL = [1, 0.78, 0.56, 0.36, 0.22];
const STEPS = 24;
const CYCLE_MS = 1650;

function ringOpacity(position, step) {
  const lead = Math.floor((step / STEPS) * RING.length) % RING.length;
  const opposite = (lead + RING.length / 2) % RING.length;
  let opacity = 0.08;
  for (let tail = 0; tail < TAIL.length; tail += 1) {
    if (position === (lead - tail + RING.length) % RING.length) {
      opacity = Math.max(opacity, TAIL[tail]);
    }
    if (position === (opposite - tail + RING.length) % RING.length) {
      opacity = Math.max(opacity, TAIL[tail] * 0.72);
    }
  }
  return opacity;
}

export default function PlasmaVeilLoader({ color = '#FF5436', size = 'small', style, accessibilityLabel = 'Loading' }) {
  const dimension = typeof size === 'number' ? size : size === 'large' ? 44 : 22;
  const dot = dimension / 7;
  const gap = dot * 0.4;
  const progress = useMemo(() => new Animated.Value(0), []);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then(enabled => {
      if (mounted) setReduceMotion(enabled);
    }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { mounted = false; subscription.remove(); };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      progress.stopAnimation();
      return;
    }
    progress.setValue(0);
    const animation = Animated.loop(Animated.timing(progress, {
      toValue: 1,
      duration: CYCLE_MS,
      useNativeDriver: true,
    }));
    animation.start();
    return () => animation.stop();
  }, [progress, reduceMotion]);

  const inputRange = useMemo(() => Array.from({ length: STEPS + 1 }, (_, step) => step / STEPS), []);

  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={accessibilityLabel}
      style={[{ width: dimension, height: dimension, alignItems: 'center', justifyContent: 'center' }, style]}>
      <View style={{ gap }}>
        {Array.from({ length: 5 }, (_, row) => (
          <View key={row} style={{ flexDirection: 'row', gap }}>
            {Array.from({ length: 5 }, (_, col) => {
              const index = row * 5 + col;
              const outside = Math.hypot(row - 2, col - 2) > 2.24;
              const ring = RING.indexOf(index);
              const opacity = outside ? 0 : ring >= 0
                ? reduceMotion ? 0.2 + (ring / (RING.length - 1)) * 0.56
                  : progress.interpolate({ inputRange, outputRange: inputRange.map((_, step) => ringOpacity(ring, step)) })
                : index === 12 ? 0.16 : 0.08;
              return <Animated.View key={col} style={{ width: dot, height: dot,
                borderRadius: dot / 2, backgroundColor: color, opacity }} />;
            })}
          </View>
        ))}
      </View>
    </View>
  );
}
