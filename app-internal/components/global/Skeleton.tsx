import { useEffect, useMemo } from 'react';
import { Animated, Easing } from 'react-native';
import { Stack, styled, XStack, YStack } from 'tamagui';

/**
 * Skeleton component for loading states
 *
 * Provides a pulsing animation placeholder that can be customized for different content types
 *
 * @example
 * // Basic usage - Text line placeholder
 * <Skeleton.Line width={200} height={20} />
 *
 * // Card placeholder
 * <Skeleton.Box width="100%" height={100} borderRadius="$4" />
 *
 * // Circle placeholder (for avatars, etc)
 * <Skeleton.Circle size={40} />
 *
 * // Multiple text lines
 * <YStack gap="$2">
 *   <Skeleton.Line width="80%" height={20} />
 *   <Skeleton.Line width="60%" height={20} />
 *   <Skeleton.Line width="90%" height={20} />
 * </YStack>
 */

// Base styled component with animation
const SkeletonBase = styled(Stack, {
  backgroundColor: '$gray4',
  overflow: 'hidden',
  position: 'relative',
});

// Define prop types for the components
type SkeletonProps = {
  width?: number | `$${string}` | `${number}%`;
  height?: number | `$${string}`;
  borderRadius?: number | `$${string}`;
  [key: string]: any;
};

type CircleProps = {
  size?: number | `$${string}`;
  [key: string]: any;
};

type MetricRowProps = {
  labelWidth?: number | `$${string}` | `${number}%`;
  valueWidth?: number | `$${string}` | `${number}%`;
  height?: number | `$${string}`;
  [key: string]: any;
};

// Animation overlay
function AnimatedGradient() {
  // Use useMemo to prevent recreating the animated value on each render
  const animatedValue = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 1500,
        easing: Easing.bezier(0.4, 0.0, 0.2, 1),
        useNativeDriver: true,
      }),
    );

    animation.start();

    // Cleanup animation on unmount
    return () => {
      animation.stop();
    };
  }, [animatedValue]); // animatedValue is now stable

  // Create shimmer effect
  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-350, 350],
  });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 0,
        left: -100,
        right: -100,
        bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.08)', // More subtle shimmer effect
        transform: [{ translateX }],
      }}
    />
  );
}

// Line variant - for text placeholders
function Line({ width = '100%', height = 16, ...props }: SkeletonProps) {
  return (
    <SkeletonBase width={width as any} height={height as any} borderRadius={'$2' as any} {...props}>
      <AnimatedGradient />
    </SkeletonBase>
  );
}

// Box variant - for card or image placeholders
function Box({ width = '100%', height = 100, ...props }: SkeletonProps) {
  return (
    <SkeletonBase width={width as any} height={height as any} borderRadius={'$4' as any} {...props}>
      <AnimatedGradient />
    </SkeletonBase>
  );
}

// Circle variant - for avatars and icons
function Circle({ size = 40, ...props }: CircleProps) {
  // Handle the borderRadius calculation safely
  const borderRadius = typeof size === 'number' ? size / 2 : size;

  return (
    <SkeletonBase
      width={size as any}
      height={size as any}
      borderRadius={borderRadius as any}
      {...props}
    >
      <AnimatedGradient />
    </SkeletonBase>
  );
}

// Metric row skeleton for financial data
function MetricRow({
  labelWidth = '40%',
  valueWidth = '30%',
  height = 20,
  ...props
}: MetricRowProps) {
  return (
    <YStack {...props}>
      <XStack justifyContent="space-between" alignItems="center">
        <Line width={labelWidth as any} height={height as any} />
        <Line width={valueWidth as any} height={height as any} />
      </XStack>
    </YStack>
  );
}

// Account value skeleton
function AccountValue({ width = '70%', height = 36, ...props }: SkeletonProps) {
  return <Line width={width as any} height={height as any} borderRadius={'$4' as any} {...props} />;
}

// Export the Skeleton component with all variants
export const Skeleton = {
  Line,
  Box,
  Circle,
  MetricRow,
  AccountValue,
};
