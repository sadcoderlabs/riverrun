# Typography System

## Font Setup

The Riverrun application uses the Inter font family, a highly versatile and readable typeface designed for screens. The font is properly integrated into the application using Expo's font system and Tamagui's typography configuration.

### Font Variants

We use four primary variants of the Inter font:

1. **Inter Regular (400)** - For body text and general content
2. **Inter Medium (500)** - For slightly emphasized text and secondary headings
3. **Inter SemiBold (600)** - For important UI elements and primary buttons
4. **Inter Bold (700)** - For headings and strong emphasis

### Implementation Details

The fonts are loaded using Expo's font loading system:

```tsx
// In _layout.tsx
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';

// Load fonts
const [fontsLoaded, fontError] = useFonts({
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
});
```

These fonts are configured in Tamagui through the `tamagui.config.ts` file:

```tsx
// Font definitions in tamagui.config.ts
const interRegular = createFont({
  family: "Inter_400Regular, sans-serif",
  // other configuration...
});

const interMedium = createFont({
  family: "Inter_500Medium, sans-serif",
  // other configuration...
});

const interSemiBold = createFont({
  family: "Inter_600SemiBold, sans-serif",
  // other configuration...
});

const interBold = createFont({
  family: "Inter_700Bold, sans-serif",
  // other configuration...
});

// Registered in Tamagui config
export const tamaguiConfig = createTamagui({
  fonts: {
    heading: headingFont,
    body: bodyFont,
    interBold,
    interSemiBold,
    interRegular,
    interMedium,
  },
  // other configuration...
});
```

## Typography Usage

### Font Sizes

The application uses a type scale that adapts based on the platform (iOS or Android). The scale is defined in `tamagui.config.ts` and includes sizes from 1 to 16, with specific semantic meanings:

#### iOS Scale:
- Size 1: 11px (Caption)
- Size 2: 13px (Footnote)
- Size 3: 15px (Subhead)
- Size 4: 17px (Body, Headline)
- Size 5: 20px (Title 3)
- Size 6: 22px (Title 2)
- Size 7: 28px (Title 1)
- Size 8: 34px (Large Title)
- Size 9-16: Larger sizes for special cases

#### Android Scale:
- Size 1: 11px (Caption)
- Size 2: 12px (Label)
- Size 3: 14px (H6)
- Size 4: 16px (Body, H5)
- Size 5: 22px (H4)
- Size 6: 24px (H3)
- Size 7: 28px (H2)
- Size 8: 32px (H1)
- Size 9-16: Larger sizes for special cases

### Using Typography in Components

When creating components, use the Tamagui font properties to ensure consistency:

```tsx
import { Text } from 'tamagui';

// Basic usage
<Text>Regular text using the default body font</Text>

// Using specific font family
<Text fontFamily="$interBold">Bold text</Text>
<Text fontFamily="$interMedium">Medium weight text</Text>

// Using specific size
<Text size="$4">Body text size</Text>
<Text size="$7">Heading size</Text>

// Combining properties
<Text fontFamily="$interSemiBold" size="$5" color="$accent9">
  Emphasized text with accent color
</Text>
```

### Typography Best Practices

1. **Consistency**: Use the defined font sizes and weights consistently across the application.
2. **Readability**: Ensure text has sufficient contrast against its background.
3. **Hierarchy**: Use font weights and sizes to establish clear visual hierarchy.
4. **Line Height**: Consider appropriate line heights for different text blocks (already configured in the Tamagui setup).
5. **Trading Context**: For trading-specific data, prioritize clarity and quick scanning ability.

## Platform Considerations

The typography system automatically adapts between iOS and Android platforms, ensuring a native feel on each while maintaining design consistency. The platform-specific adjustments are handled in `tamagui.config.ts` through the `Platform.OS` check.
