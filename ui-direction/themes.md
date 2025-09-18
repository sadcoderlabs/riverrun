# Theme System

## Overview

Riverrun uses a sophisticated theme system built with Tamagui to provide consistent styling across the application. The theme system supports both light and dark modes and includes semantic color variants for trading-specific UI elements.

## Theme Structure

The theme system is organized into:

1. **Base Theme**: Core color palettes for light and dark modes
2. **Accent Theme**: Green-focused accent colors for primary actions
3. **Semantic Themes**: Success, warning, and error themes for contextual feedback

## Color Palettes

### Base Theme

The base theme includes 12 color steps for both light and dark modes:

#### Dark Palette

```
darkPalette = [
  "#111113", // 0: Darkest background
  "#19191b", // 1: App background
  "#222325", // 2: Subtle background
  "#292a2e", // 3: UI element background
  "#303136", // 4: Borders
  "#393a40", // 5: Disabled state
  "#46484f", // 6: Low-emphasis text
  "#5f606a", // 7: Medium-emphasis text
  "#6c6e79", // 8: High-emphasis text
  "#797b86", // 9: Highest-emphasis text
  "#b2b3bd", // 10: Bright text
  "#eeeef0", // 11: White text
]
```

#### Light Palette

```
lightPalette = [
  "#fcfcfd", // 0: White background
  "#f9f9fb", // 1: App background
  "#eff0f3", // 2: Subtle background
  "#e7e8ec", // 3: UI element background
  "#e0e1e6", // 4: Borders
  "#d8d9e0", // 5: Disabled state
  "#cdced7", // 6: Low-emphasis text
  "#b9bbc6", // 7: Medium-emphasis text
  "#8b8d98", // 8: High-emphasis text
  "#80828d", // 9: Highest-emphasis text
  "#62636c", // 10: Dark text
  "#1e1f24", // 11: Black text
]
```

### Accent Theme

The accent theme provides green-focused colors for primary actions and highlights:

#### Dark Accent

A range of dark green shades from very dark (`#0f120d`) to bright (`#d6f7c5`).

#### Light Accent

A range of light green shades from white (`#fbfef9`) to dark green (`#23460b`).

### Semantic Themes

- **Success**: Green shades for positive outcomes
- **Warning**: Yellow shades for cautionary states
- **Error**: Red shades for errors and critical states

## Using Themes in Components

### Basic Theme Usage

```tsx
import { Text, Stack } from 'tamagui';

// Using theme colors
<Stack backgroundColor="$background">
  <Text color="$color">Regular text</Text>
  <Text color="$color10">Emphasized text</Text>
</Stack>;
```

### Theme Variants

```tsx
// Using semantic themes
<Stack backgroundColor="$success2" padding="$4">
  <Text color="$success10">Success message</Text>
</Stack>

<Stack backgroundColor="$error2" padding="$4">
  <Text color="$error10">Error message</Text>
</Stack>
```

### Trading-Specific Theme Usage

```tsx
// For price changes
<Text color={priceChange >= 0 ? '$green9' : '$red9'}>
  {priceChange.toFixed(2)}%
</Text>

// For order types
<Button backgroundColor={isBuy ? '$green9' : '$red9'}>
  {isBuy ? 'Buy' : 'Sell'}
</Button>
```

## Theme Tokens

### Color Tokens

- `$background`: Default background color
- `$color`: Default text color
- `$borderColor`: Default border color
- `$shadowColor`: Default shadow color

### Numbered Scale

Each color palette has a numbered scale from 1-12, where lower numbers are lighter and higher numbers are darker:

- `$blue1` through `$blue12`
- `$green1` through `$green12`
- `$red1` through `$red12`
- `$yellow1` through `$yellow12`

### Shadows

The theme includes shadow tokens for elevation:

- `$shadow1`: Subtle shadow
- `$shadow2`: Light shadow
- `$shadow3`: Medium shadow
- `$shadow4`: Pronounced shadow
- `$shadow5`: Heavy shadow
- `$shadow6`: Deepest shadow

## Theme Switching

The application automatically detects the user's system preference for light or dark mode and applies the appropriate theme. The theme system is configured for fast theme switching without flicker.

## Trading-Specific Theme Guidelines

### Price Movement

- Use `$green9` for positive price movements
- Use `$red9` for negative price movements
- Use `$yellow9` for neutral or warning states

### Order Types

- Use green shades for buy orders
- Use red shades for sell orders
- Use neutral colors for order book background

### Charts

- Use a consistent color scheme for charts
- Ensure sufficient contrast between chart elements
- Consider using opacity for historical data

## Extending the Theme

When extending the theme:

1. Add new colors to the appropriate palette in `theme/custom.ts`
2. Ensure both light and dark variants are provided
3. Register the new colors in the theme configuration
4. Use semantic naming for trading-specific colors

## Theme Implementation Details

The theme is implemented using Tamagui's theme system in `tamagui.config.ts` and `theme/custom.ts`. The color palettes are created using a custom HSLA conversion function to ensure consistent color manipulation.

```tsx
// Example from theme/custom.ts
const builtThemes = createThemes({
  base: {
    palette: {
      dark: darkPalette,
      light: lightPalette,
    },
    extra: {
      // Additional theme properties
    },
  },
  accent: {
    palette: {
      dark: [
        /* accent dark palette */
      ],
      light: [
        /* accent light palette */
      ],
    },
  },
  childrenThemes: {
    warning: {
      palette: {
        dark: Object.values(Colors.yellowDark),
        light: Object.values(Colors.yellow),
      },
    },
    // Other semantic themes
  },
});
```
