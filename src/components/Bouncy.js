import React from 'react';
import { Pressable } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Pressable that springs down on touch (playful bounce) and fires a light haptic
 * on press. Drop-in replacement for TouchableOpacity.
 */
export default function Bouncy({
  children, onPress, style, haptic = true, scaleTo = 0.94, disabled, ...rest
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={() => { scale.value = withSpring(scaleTo, { damping: 15, stiffness: 400 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 10, stiffness: 250 }); }}
      onPress={(e) => {
        if (haptic) { try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {} }
        onPress?.(e);
      }}
      style={[style, animStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}
