# Color Usage Guidelines

## Overview

This document provides guidelines for using colors consistently throughout the Riverrun application. Following these guidelines ensures visual consistency, accessibility, and proper theming support for both light and dark modes.

## Core Principles

1. **Use Theme Tokens**: Always use theme tokens (e.g., `$accent9`, `$color`) instead of hardcoded hex values
2. **Semantic Colors**: Choose colors based on their semantic meaning, not just visual appearance
3. **Contrast Ratio**: Ensure sufficient contrast between text and background colors
4. **Mode Support**: All color choices should work well in both light and dark modes

## Theme Color Reference

### Base Colors

- `$background`: Primary background color
- `$color`: Primary text color
- `$borderColor`: Standard border color
- `$shadowColor`: Shadow color for elevation effects

### Numbered Scale

Each color palette provides a numbered scale from 1-12:

- Lower numbers (1-3): Very light shades, suitable for backgrounds
- Mid-range numbers (4-8): Medium shades for UI elements and borders
- Higher numbers (9-12): Dark/saturated shades for text and emphasis

### Semantic Colors

- **Accent**: `$accent1` through `$accent12` - Primary brand colors (green)
- **Success**: `$success1` through `$success12` - Positive outcomes
- **Warning**: `$warning1` through `$warning12` - Cautionary states
- **Error**: `$error1` through `$error12` - Error states

## Component-Specific Guidelines

### Navigation Components

Navigation components should use:

- `$accent9`: For active/selected state
- `$color9`: For inactive/unselected state
- `$background`: For container backgrounds
- `$borderColor`: For subtle separators

```tsx
// Example: Navigation item styling
const NavItem = styled(YStack, {
  variants: {
    active: {
      true: { color: '$accent9' },
      false: { color: '$color9' },
    },
  },
});
```

### Buttons

Button components should follow these color patterns:

- **Base/Text Button**: `$accent9` for text, transparent background
- **Filled Button**: `$accent9` for background, `$accent1` for text
- **Tinted Button**: `$accent3` for background, `$accent11` for text
- **Gray Button**: Border color `$borderColor`, text `$accent9`

### Interactive Elements

For interactive elements:

- Use `pressTheme: true` to enable automatic press state styling
- Define `hoverStyle` and `pressStyle` with appropriate color adjustments
- Avoid hardcoded opacity values; use theme tokens when possible

### Icon Components

When using icon components (like those from @tamagui/lucide-icons):

```tsx
// Incorrect: Using string literals with $ prefix
<Icon color={isActive ? '$accent9' : '$color9'} />

// Correct: Using theme object properties
import { useTheme } from 'tamagui';

function MyComponent() {
  const theme = useTheme();
  return <Icon color={isActive ? theme.accent9 : theme.color9} />;
}
```

Icon components require the actual color value, not the token string. Always use the `useTheme` hook to access theme colors for icons.

## Common Mistakes to Avoid

1. **Hardcoded Colors**: Never use hex values like `#00C097` directly in components
2. **Inconsistent States**: Maintain consistency between normal, hover, and pressed states
3. **Missing Dark Mode**: Test all color combinations in both light and dark modes
4. **Poor Contrast**: Ensure text remains readable on all backgrounds

## Implementation Examples

### Correct Usage

```tsx
// Good: Using theme tokens
const StyledButton = styled(Button, {
  backgroundColor: '$accent9',
  color: '$accent1',
  borderColor: '$borderColor',
});

// Good: Using semantic variants
<Text color={isProfitable ? '$success9' : '$error9'}>
  {value.toFixed(2)}
</Text>
```

### Incorrect Usage

```tsx
// Bad: Hardcoded colors
const StyledButton = styled(Button, {
  backgroundColor: '#00C097', // Don't do this!
  color: 'white',            // Don't do this!
});

// Bad: Inconsistent token usage
<Icon color={isActive ? '$accent9' : '#797b86'} /> // Don't mix tokens and hex
```

## Color Accessibility

- Maintain a minimum contrast ratio of 4.5:1 for normal text
- Use the WCAG color contrast analyzer to verify accessibility
- Provide additional visual cues beyond just color (icons, patterns)

## Adding New Colors

If you need to add new colors:

1. Add them to the appropriate palette in `theme/custom.ts`
2. Provide both light and dark mode variants
3. Follow the existing naming conventions
4. Document the new color's semantic purpose

Remember that all UI components should adapt to theme changes automatically without requiring code modifications.
