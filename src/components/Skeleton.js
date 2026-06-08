import React, { useEffect } from 'react';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence,
} from 'react-native-reanimated';
import { COLORS, RADII } from '../constants';

/** Pulsing placeholder block for loading states. */
export default function Skeleton({ width = '100%', height = 16, radius = RADII.sm, style }) {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(withTiming(0.85, { duration: 700 }), withTiming(0.4, { duration: 700 })),
      -1,
      true,
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[{ width, height, borderRadius: radius, backgroundColor: COLORS.surfaceElevated }, animStyle, style]}
    />
  );
}
