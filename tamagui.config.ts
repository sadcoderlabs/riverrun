import { defaultConfig } from '@tamagui/config/v4';
import { createTamagui, createFont } from 'tamagui';
import { themes } from './app-internal/components/shared/theme/custom';
import { Platform } from 'react-native';
import { createAnimations } from '@tamagui/animations-moti';

const iosSizes = {
  size: {
    '1': 11, // Caption
    '2': 13, // Footnote
    '3': 15, // Subhead
    '4': 17, // Body, Headline
    '5': 20, // Title 3
    '6': 22, // Title 2
    '7': 28, // Title 1
    '8': 34, // Large Title
    '9': 44, // Large
    '10': 54, // X Large
    '11': 64, // XX Large
    '12': 74, // XXX Large
    '13': 84, // XXXX Large
    '14': 94, // XXXXX Large
    '15': 104, // XXXXXX Large
    '16': 114, // XXXXXXX Large
    true: 17,
  },
};

const iosLineHeights = {
  lineHeight: {
    '1': 11 + 6, // Caption
    '2': 13 + 6, // Footnote
    '3': 15 + 6, // Subhead
    '4': 17 + 6, // Body, Headline
    '5': 20 + 6, // Title 3
    '6': 22 + 6, // Title 2
    '7': 28 + 6, // Title 1
    '8': 34 + 6, // Large Title
    '9': 44 + 6, // Large
    '10': 54 + 6, // X Large
    '11': 64 + 6, // XX Large
    '12': 74 + 6, // XXX Large
    '13': 84 + 10, // XXXX Large
    '14': 94 + 10, // XXXXX Large
    '15': 104 + 10, // XXXXXX Large
    '16': 114 + 10, // XXXXXXX Large
    true: 17 + 10,
  },
};

const androidSizes = {
  size: {
    '1': 11, // Caption
    '2': 12, // Label
    '3': 14, // H6
    '4': 16, // Body, H5
    '5': 22, // H4
    '6': 24, // H3
    '7': 28, // H2
    '8': 32, // H1
    '9': 36, // Large
    '10': 45, // X Large
    '11': 57, // XX Large
    '12': 69, // XXX Large
    '13': 81, // XXXX Large
    '14': 93, // XXXXX Large
    '15': 105, // XXXXXX Large
    '16': 117, // XXXXXXX Large
    true: 16,
  },
};

const androidLineHeights = {
  lineHeight: {
    '1': 11 + 6, // Caption
    '2': 12 + 6, // Label
    '3': 14 + 6, // H6
    '4': 16 + 6, // Body, H5
    '5': 22 + 6, // H4
    '6': 24 + 6, // H3
    '7': 28 + 6, // H2
    '8': 32 + 6, // H1
    '9': 36 + 6, // Large
    '10': 45 + 6, // X Large
    '11': 57 + 6, // XX Large
    '12': 69 + 6, // XXX Large
    '13': 81 + 6, // XXXX Large
    '14': 93 + 6, // XXXXX Large
    '15': 105 + 6, // XXXXXX Large
    '16': 117 + 6, // XXXXXXX Large
    true: 16 + 6,
  },
};

export const sizes = Platform.OS === 'ios' ? iosSizes : androidSizes;
export const lineHeights = Platform.OS === 'ios' ? iosLineHeights : androidLineHeights;

const headingFont = createFont({
  ...defaultConfig.fonts.heading,
  ...lineHeights,
  // ...weights,
  ...sizes,
  // (native only) swaps out fonts by face/style
  // On Android you need to set the face option in createFont or else fonts won't pick up different weights, due to a React Native restriction.

  // face: {
  //   200: { normal: "System", italic: "System" },
  //   300: { normal: "System", italic: "System" },
  //   400: { normal: "System", italic: "System" },
  //   500: { normal: "System", italic: "System" },
  //   600: { normal: "System", italic: "System" },
  //   700: { normal: "System", italic: "System" },
  // },
});

const bodyFont = createFont({
  ...defaultConfig.fonts.body,
  ...sizes,
  ...lineHeights,
  family: 'System, sans-serif',
});

// const skBold = createFont({
//   ...defaultConfig.fonts.heading,
//   family: "Sk-Modernist-Bold",
//   // must match exact weight in the font
//   weight: {
//     1: "600",
//     2: "600",
//     3: "600",
//     4: "600",
//     5: "600",
//     6: "600",
//   },
//   ...sizes,
// })

const interBold = createFont({
  ...defaultConfig.fonts.heading,
  family: 'Inter_700Bold, sans-serif',
  ...lineHeights,
  // must match exact weight in the font
  weight: {
    1: '700',
    2: '700',
    3: '700',
    4: '700',
    5: '700',
    6: '700',
    7: '700',
    8: '700',
    9: '700',
    10: '700',
    11: '700',
    12: '700',
    13: '700',
    14: '700',
    15: '700',
    16: '700',
    true: '700',
  },
  ...sizes,
  face: {
    300: { normal: 'Inter_700Bold', italic: 'Inter_700Bold' },
    400: { normal: 'Inter_700Bold', italic: 'Inter_700Bold' },
    500: { normal: 'Inter_700Bold', italic: 'Inter_700Bold' },
    600: { normal: 'Inter_700Bold', italic: 'Inter_700Bold' },
    700: { normal: 'Inter_700Bold', italic: 'Inter_700Bold' },
    800: { normal: 'Inter_700Bold', italic: 'Inter_700Bold' },
    900: { normal: 'Inter_700Bold', italic: 'Inter_700Bold' },
  },
});
const interMedium = createFont({
  ...defaultConfig.fonts.body,
  family: 'Inter_500Medium, sans-serif',
  ...lineHeights,
  // must match exact weight in the font
  weight: {
    1: '500',
    2: '500',
    3: '500',
    4: '500',
    5: '500',
    6: '500',
    7: '500',
    8: '500',
    9: '500',
    10: '500',
    11: '500',
    12: '500',
    13: '500',
    14: '500',
    15: '500',
    16: '500',
    true: '500',
  },
  ...sizes,
  face: {
    300: { normal: 'Inter_500Medium', italic: 'Inter_500Medium' },
    400: { normal: 'Inter_500Medium', italic: 'Inter_500Medium' },
    500: { normal: 'Inter_500Medium', italic: 'Inter_500Medium' },
    600: { normal: 'Inter_500Medium', italic: 'Inter_500Medium' },
    700: { normal: 'Inter_500Medium', italic: 'Inter_500Medium' },
    800: { normal: 'Inter_500Medium', italic: 'Inter_500Medium' },
    900: { normal: 'Inter_500Medium', italic: 'Inter_500Medium' },
  },
});

const interSemiBold = createFont({
  ...defaultConfig.fonts.body,
  family: 'Inter_600SemiBold, sans-serif', // must match exact weight in the font
  weight: {
    1: '600',
    2: '600',
    3: '600',
    4: '600',
    5: '600',
    6: '600',
    7: '600',
    8: '600',
    9: '600',
    10: '600',
    11: '600',
    12: '600',
    13: '600',
    14: '600',
    15: '600',
    16: '600',
    true: '600',
  },
  ...sizes,
  face: {
    300: { normal: 'Inter_600SemiBold', italic: 'Inter_600SemiBold' },
    400: { normal: 'Inter_600SemiBold', italic: 'Inter_600SemiBold' },
    500: { normal: 'Inter_600SemiBold', italic: 'Inter_600SemiBold' },
    600: { normal: 'Inter_600SemiBold', italic: 'Inter_600SemiBold' },
    700: { normal: 'Inter_600SemiBold', italic: 'Inter_600SemiBold' },
    800: { normal: 'Inter_600SemiBold', italic: 'Inter_600SemiBold' },
    900: { normal: 'Inter_600SemiBold', italic: 'Inter_600SemiBold' },
  },
});

const interRegular = createFont({
  ...defaultConfig.fonts.body,
  family: 'Inter_400Regular, sans-serif', // must match exact weight in the font
  ...lineHeights,
  weight: {
    1: '400',
    2: '400',
    3: '400',
    4: '400',
    5: '400',
    6: '400',
    7: '400',
    8: '400',
    9: '400',
    10: '400',
    11: '400',
    12: '400',
    13: '400',
    14: '400',
    15: '400',
    16: '400',
    true: '400',
  },
  ...sizes,
  face: {
    300: { normal: 'Inter_400Regular', italic: 'Inter_400Regular' },
    400: { normal: 'Inter_400Regular', italic: 'Inter_400Regular' },
    500: { normal: 'Inter_400Regular', italic: 'Inter_400Regular' },
    600: { normal: 'Inter_400Regular', italic: 'Inter_400Regular' },
    700: { normal: 'Inter_400Regular', italic: 'Inter_400Regular' },
    800: { normal: 'Inter_400Regular', italic: 'Inter_400Regular' },
    900: { normal: 'Inter_400Regular', italic: 'Inter_400Regular' },
  },
});

const skMono = createFont({
  ...defaultConfig.fonts.body,
  family: 'Sk-Modernist-Mono, monospace',
  weight: {
    1: '400',
    2: '400',
    3: '400',
    4: '400',
    5: '400',
    6: '400',
  },
  ...sizes,
});

export const tamaguiConfig = createTamagui({
  ...defaultConfig,
  themes,
  fonts: {
    heading: headingFont,
    body: bodyFont,
    skMono,
    interBold,
    interSemiBold,
    interRegular,
    interMedium,
  },
  // Added this to bypass tamagui's Sheet component bug
  media: {
    xs: { maxWidth: 660 },
    gtXs: { minWidth: 660 + 1 },
    sm: { maxWidth: 860 },
    gtSm: { minWidth: 860 + 1 },
    md: { maxWidth: 980 },
    gtMd: { minWidth: 980 + 1 },
    lg: { maxWidth: 1120 },
    gtLg: { minWidth: 1120 + 1 },
    short: { maxHeight: 820 },
    tall: { minHeight: 820 },
    hoverNone: { hover: 'none' },
    pointerCoarse: { pointer: 'coarse' },
  },
  settings: {
    ...defaultConfig.settings,
    onlyAllowShorthands: false,
    fastSchemeChange: true,
  },
  animations: createAnimations({
    fast: {
      type: 'spring',
      damping: 20,
      mass: 1.2,
      stiffness: 250,
    },
    medium: {
      type: 'spring',
      damping: 10,
      mass: 0.9,
      stiffness: 100,
    },
    slow: {
      type: 'spring',
      damping: 20,
      stiffness: 60,
    },
    bouncy: {
      type: 'spring',
      damping: 15,
      mass: 1.2,
      stiffness: 200,
    },
    smooth: {
      type: 'timing',
      duration: 400,
    },
    fade: {
      type: 'timing',
      delay: 800,
    },
  }),
});
export default tamaguiConfig;

export type Conf = typeof tamaguiConfig;

// Provide types for tamagui (ESLint doesn't recognize but it's fine)
declare module 'tamagui' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface TamaguiCustomConfig extends Conf {}
}
