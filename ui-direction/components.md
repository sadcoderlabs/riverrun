# Component System

## Overview

Riverrun's component system is built on top of Tamagui, providing a consistent and performant UI experience for crypto futures trading. This document outlines the component structure, guidelines, and best practices for developing new components.

## Component Organization

Components in Riverrun are organized into the following categories:

### 1. Core Components

These are foundational UI elements that are used throughout the application:

- **Typography**: Text components with consistent styling
- **Buttons**: Various button styles for different actions
- **Inputs**: Text inputs, number inputs, and form controls
- **Cards**: Container components for grouping related information
- **Layout**: Grid, Stack, and other layout components

### 2. Trading-Specific Components

Components designed specifically for trading functionality:

- **PriceDisplay**: For showing asset prices with appropriate formatting
- **OrderEntry**: Components for placing market and limit orders
- **PositionCard**: For displaying current positions
- **TradingChart**: Chart components for price visualization
- **OrderBook**: Components for displaying the order book

### 3. Navigation Components

Components related to app navigation:

- **TabBar**: Custom bottom tab navigation
- **Header**: App headers with context-specific actions
- **Modal**: Modal dialogs and sheets

### 4. Feedback Components

Components that provide feedback to users:

- **Toast**: Non-intrusive notifications
- **Alert**: Important messages requiring attention
- **LoadingIndicator**: Loading states for async operations

## Component Guidelines

### Creating New Components

When creating new components:

1. **Extend Tamagui**: Build on top of Tamagui's existing components when possible
2. **Theme Integration**: Use theme tokens for colors, spacing, and typography
3. **Responsive Design**: Ensure components work across different screen sizes
4. **Performance**: Be mindful of performance, especially for components that update frequently

### Example Component Structure

```tsx
import { Stack, Text, styled } from 'tamagui';

// Define component props
type PriceDisplayProps = {
  value: number;
  change?: number;
  precision?: number;
  size?: 'small' | 'medium' | 'large';
};

// Create the component
export function PriceDisplay({
  value,
  change = 0,
  precision = 2,
  size = 'medium',
}: PriceDisplayProps) {
  const isPositive = change >= 0;

  // Map size to Tamagui size tokens
  const sizeMap = {
    small: '$3',
    medium: '$4',
    large: '$5',
  };

  return (
    <Stack space="$2" flexDirection="row" alignItems="center">
      <Text fontFamily="$interSemiBold" size={sizeMap[size]}>
        ${value.toFixed(precision)}
      </Text>
      {change !== 0 && (
        <Text
          fontFamily="$interMedium"
          size={sizeMap[size] === '$5' ? '$4' : '$2'}
          color={isPositive ? '$green9' : '$red9'}
        >
          {isPositive ? '+' : ''}
          {change.toFixed(precision)}%
        </Text>
      )}
    </Stack>
  );
}

// For more complex components, consider using styled
export const OrderButton = styled(Stack, {
  backgroundColor: '$accent9',
  borderRadius: '$4',
  padding: '$3',

  variants: {
    type: {
      buy: {
        backgroundColor: '$green9',
      },
      sell: {
        backgroundColor: '$red9',
      },
    },
    size: {
      small: {
        padding: '$2',
      },
      large: {
        padding: '$4',
      },
    },
  } as const,
});
```

## Theming Components

All components should respect the application's theme system:

1. **Use Theme Tokens**: Always use theme tokens (`$accent9`, `$background`, etc.) instead of hardcoded colors
2. **Dark Mode Support**: Ensure components look good in both light and dark modes
3. **Semantic Colors**: Use semantic color names for trading contexts (positive/negative for price movements)

## Accessibility Considerations

1. **Text Size**: Support dynamic text sizes
2. **Color Contrast**: Ensure sufficient contrast for text readability
3. **Touch Targets**: Make interactive elements large enough (minimum 44×44 points)
4. **Screen Readers**: Add appropriate accessibility labels

## Trading-Specific UI Patterns

### Price Formatting

- Use consistent decimal places based on the asset
- Show price changes with color coding (green for positive, red for negative)
- Consider using monospace fonts for numerical data to maintain alignment

### Order Entry

- Provide clear feedback for order submission and confirmation
- Include safeguards against accidental submissions
- Show relevant market data alongside order forms

### Position Management

- Clearly indicate position status (open, closing, liquidation risk)
- Show P&L calculations prominently
- Provide quick actions for managing positions

## Animation Guidelines

Use Tamagui's animation system for consistent motion design:

```tsx
import { Stack } from 'tamagui';

// Example of animation usage
<Stack
  animation="bouncy"
  enterStyle={{ opacity: 0, scale: 0.9 }}
  exitStyle={{ opacity: 0, scale: 0.9 }}
>
  {/* Component content */}
</Stack>;
```

Prefer these animation presets:

- `fast`: For micro-interactions
- `medium`: For standard transitions
- `bouncy`: For playful feedback
- `slow`: For emphasis

## Testing Components

Components should be tested for:

1. **Visual consistency**: Appearance across different states and themes
2. **Interaction behavior**: Response to user input
3. **Performance**: Especially for data-heavy components like charts and order books

## Documentation

When creating new components:

1. Document props and their usage
2. Provide examples of common use cases
3. Note any performance considerations
4. Explain any platform-specific behaviors
