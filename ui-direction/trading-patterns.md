# Trading UI Patterns

## Overview

This document outlines UI patterns specific to cryptocurrency futures trading in the Riverrun application. These patterns are designed to provide a clear, efficient, and professional trading experience while leveraging the Hyperliquid DEX platform.

## Core Trading UI Components

### Price Display

Price displays should follow these guidelines:

1. **Precision Consistency**: Use consistent decimal places based on the asset
2. **Directional Indicators**: Use color and optional arrows to indicate price movement
3. **Monospace Alignment**: Use monospace fonts for numerical data to maintain alignment
4. **Compact Format**: Use abbreviated formats for large numbers (e.g., "1.2M" instead of "1,200,000")

```tsx
// Example Price Display Component
<PriceDisplay 
  value={29876.45} 
  change={2.34} 
  precision={2} 
  timeframe="24h"
/>
```

### Order Entry

Order entry components should:

1. **Simplify Complexity**: Break down complex trading operations into clear steps
2. **Prevent Errors**: Include validation and confirmation steps for trade execution
3. **Show Context**: Display relevant market data alongside order forms
4. **Provide Feedback**: Clearly indicate order status (pending, filled, rejected)

```tsx
// Example Order Entry Component
<OrderEntry
  type="limit"
  side="buy"
  asset="BTC-PERP"
  currentPrice={29876.45}
  balance={1000}
  leverage={5}
  onSubmit={handleOrderSubmit}
/>
```

### Position Management

Position displays should:

1. **Highlight Status**: Clearly indicate position status (open, closing, liquidation risk)
2. **Emphasize P&L**: Show profit/loss calculations prominently
3. **Quick Actions**: Provide immediate access to close, modify, or add to positions
4. **Risk Indicators**: Visualize liquidation price and margin usage

```tsx
// Example Position Component
<PositionCard
  asset="ETH-PERP"
  side="long"
  size={2.5}
  entryPrice={1850.75}
  currentPrice={1875.25}
  leverage={10}
  liquidationPrice={1650.20}
  pnl={61.25}
  pnlPercentage={3.31}
  onClose={handleClosePosition}
/>
```

## Market Data Visualization

### Order Book

Order book displays should:

1. **Visual Depth**: Use color intensity to indicate order size
2. **Bid-Ask Spread**: Clearly distinguish between buy and sell orders
3. **Aggregation**: Allow users to adjust price level aggregation
4. **Interaction**: Enable order placement by clicking on price levels

```tsx
// Example Order Book Component
<OrderBook
  asset="BTC-PERP"
  depth={10}
  aggregation={1}
  onPriceSelect={handlePriceSelect}
/>
```

### Charts

Trading charts should:

1. **Responsiveness**: Adapt to different screen sizes without losing clarity
2. **Customization**: Allow users to select different chart types and indicators
3. **Performance**: Optimize for smooth rendering even with large datasets
4. **Interaction**: Support gestures for zooming, panning, and selecting data points

```tsx
// Example Chart Component
<TradingChart
  asset="BTC-PERP"
  timeframe="1h"
  chartType="candle"
  indicators={['MA', 'RSI']}
  height={400}
/>
```

### Recent Trades

Recent trades displays should:

1. **Real-time Updates**: Show trades as they happen
2. **Size Indication**: Visually distinguish between different trade sizes
3. **Aggregation**: Optionally combine similar trades to reduce noise
4. **Filtering**: Allow filtering by size or type

```tsx
// Example Recent Trades Component
<RecentTrades
  asset="BTC-PERP"
  limit={50}
  showSize={true}
  minSize={0.1}
/>
```

## Trading-Specific Interactions

### Quick Order Modification

Enable quick order modifications with:

1. **Sliders**: For adjusting size, leverage, or take profit/stop loss levels
2. **Increment Buttons**: For fine-tuning price and quantity
3. **Percentage Shortcuts**: For quickly setting position size based on available balance
4. **Templates**: For saving and reusing common order configurations

### Risk Management Tools

Provide clear risk management tools:

1. **Liquidation Calculator**: Show estimated liquidation price based on position size and leverage
2. **Margin Usage Indicator**: Visualize how much of available margin is being used
3. **PnL Scenarios**: Allow users to see potential outcomes at different price levels
4. **Position Sizing Guidance**: Suggest appropriate position sizes based on account balance

### Trade Confirmation

Implement effective trade confirmation patterns:

1. **Summary View**: Show complete order details before execution
2. **Fee Calculation**: Display estimated fees and total cost
3. **Risk Warnings**: Highlight high leverage or large position sizes
4. **Confirmation Options**: Allow users to set preferences for confirmation steps

## Mobile-Specific Considerations

For mobile trading interfaces:

1. **Thumb-Friendly Controls**: Place critical actions within easy reach
2. **Compact Views**: Design condensed layouts that prioritize essential information
3. **Gesture Support**: Implement swipe gestures for common actions
4. **Progressive Disclosure**: Use expandable sections to manage screen space

## Notifications and Alerts

Trading notifications should:

1. **Prioritize Urgency**: Use different styles based on importance
2. **Be Actionable**: Include direct actions when possible
3. **Be Concise**: Communicate essential information clearly and briefly
4. **Be Timely**: Appear immediately for time-sensitive information

```tsx
// Example Trading Alert Component
<TradingAlert
  type="liquidation_warning"
  asset="BTC-PERP"
  message="Position approaching liquidation price"
  action="Adjust margin"
  onAction={handleAddMargin}
  priority="high"
/>
```

## Hyperliquid-Specific UI Patterns

As Riverrun is powered by Hyperliquid DEX, incorporate these platform-specific patterns:

1. **Cross-Margin Display**: Show shared margin across different positions
2. **Gas Fee Estimation**: Display estimated gas fees for on-chain transactions
3. **Transaction Status**: Show blockchain confirmation status for trades
4. **Wallet Integration**: Seamlessly connect wallet functionality with trading interfaces

## Accessibility in Trading UI

Ensure trading interfaces remain accessible:

1. **Color Independence**: Use both color and symbols for price movement
2. **Screen Reader Support**: Provide clear announcements for market changes
3. **Keyboard Navigation**: Enable full trading functionality via keyboard
4. **Reduced Motion**: Offer options to minimize animations for price updates

## Performance Optimization

For optimal trading experience:

1. **Efficient Updates**: Use selective re-rendering for frequently updating components
2. **Data Throttling**: Implement appropriate throttling for high-frequency data
3. **Lazy Loading**: Load secondary information only when needed
4. **Offline Support**: Provide graceful degradation when connection is unstable

## User Preferences

Allow users to customize their trading experience:

1. **Layout Options**: Enable different arrangements of trading components
2. **Default Values**: Remember preferred order types and sizes
3. **Notification Settings**: Control which alerts are shown and how
4. **Visual Density**: Adjust information density based on user preference
