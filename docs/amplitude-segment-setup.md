# Amplitude + Segment Integration Guide

This guide explains how to connect Segment to Amplitude to receive analytics events from the Riverrun mobile app.

## Overview

The Riverrun app uses a dual telemetry system:

- **Sentry**: Error tracking, performance monitoring, and selective breadcrumbs
- **Segment**: Analytics events (user actions, screen views, etc.)

Segment acts as a data pipeline that forwards events to downstream destinations like Amplitude. This allows you to:

- Track user behavior and engagement
- Analyze conversion funnels
- Monitor feature adoption
- Build custom dashboards and reports

## Architecture Flow

```
Riverrun App
    ↓
  Telemetry Service
    ↓
  Segment SDK
    ↓
  Segment Cloud
    ↓
  Amplitude (and other destinations)
```

## Setup Instructions

### 1. Create an Amplitude Account

1. Go to [https://amplitude.com/](https://amplitude.com/)
2. Sign up for a free account or log in to your existing account
3. Create a new project for Riverrun (if not already created)
4. Note down your **Amplitude API Key** (you'll need this in Step 2)

### 2. Connect Segment to Amplitude

1. Log in to your Segment account at [https://app.segment.com/](https://app.segment.com/)
2. Navigate to your **Riverrun source** (the Segment source that receives events from the app)
3. Click on **"Destinations"** in the left sidebar
4. Click **"Add Destination"**
5. Search for **"Amplitude"** and select it
6. Click **"Configure Amplitude"**
7. Enter your **Amplitude API Key** from Step 1
8. Configure the following settings:

   **Recommended Settings:**
   - **Enable Destination**: ✅ On
   - **Track All Pages as Screen Views**: ✅ On (for mobile apps)
   - **Track Named Pages**: ✅ On
   - **Track Categorized Pages**: ✅ On
   - **Use Amplitude User ID**: ✅ On
   - **Group Identify Traits**: ✅ Off (unless you need group analytics)

9. Click **"Save Changes"**

### 3. Verify the Integration

Once connected, you can verify that events are flowing correctly:

#### In the Riverrun App:

1. Open the app and go to **Settings → Telemetry**
2. Ensure "Enable Telemetry" is turned **ON**
3. Click **"Test Track Event"** to send a test event
4. Click **"Test Track Screen"** to send a test screen view

#### In Segment Debugger:

1. Go to **Segment → Sources → Riverrun → Debugger**
2. You should see events appearing in real-time:
   - `order_submitted`
   - `wallet_connected`
   - `screen_viewed`
   - etc.

#### In Amplitude:

1. Go to **Amplitude → User Look-Up**
2. Find a test user (search by wallet address)
3. Check their event stream - you should see events from Segment:
   - **Event Type**: `order_submitted`, `wallet_connected`, etc.
   - **Source**: Segment

⚠️ **Note**: There may be a 1-5 minute delay before events appear in Amplitude.

## Event Types

The app sends the following event types to Segment (and Amplitude):

### Lifecycle Events (Automatic)

These events are automatically tracked by the Segment SDK:

- `Application Opened` - When the app starts
- `Application Backgrounded` - When the app goes to background
- `Application Foregrounded` - When the app returns to foreground

### Wallet Events

- `wallet_connected` (with `walletSource` and `address`)
- `wallet_disconnected`
- `wallet_switched`

### Trading Events

- `order_submitted` (with market, side, orderType, leverage, size)
- `order_confirmed`
- `order_failed`
- `order_cancelled`
- `position_opened`
- `position_closed`
- `position_modified`
- `market_selected`
- `leverage_changed`

### Feature Events

- `agent_approved`
- `builder_fee_set`
- `referral_code_applied`
- `bridge_initiated`
- `bridge_completed`
- `bridge_failed`

### Screen Views

- `Home`, `Trade`, `Chart`, `Settings`, `Deposit`, `Withdraw`, etc.

## User Identification

Users are automatically identified when they connect their wallet:

- **User ID**: Wallet address (e.g., `0x1234...5678`)
- **Traits**: `walletSource` (either `privy` or `reown`)

When a user disconnects their wallet, Segment calls `reset()` to clear the user identity.

## Troubleshooting

### Events not appearing in Amplitude?

1. **Check Segment Debugger**: Verify events are reaching Segment first
2. **Check Amplitude API Key**: Ensure it's correct in Segment settings
3. **Check Destination Status**: Ensure Amplitude destination is enabled
4. **Wait 5 minutes**: Initial events may take time to process
5. **Check Telemetry Settings**: Ensure telemetry is enabled in the app

### Events appearing in Segment but not Amplitude?

1. **Check Amplitude Connection Status**: Go to Segment → Destinations → Amplitude → Settings
2. **Look for Error Messages**: Check for any connection errors
3. **Verify API Key**: Double-check your Amplitude API Key
4. **Check Amplitude Project**: Ensure you're looking at the correct project

### How to disable telemetry?

Users can disable telemetry in **Settings → Telemetry** by toggling off "Enable Telemetry". This will:

- Stop sending events to Segment
- Stop sending errors to Sentry
- Respect user privacy preferences

## Additional Destinations

You can add other destinations to Segment alongside Amplitude:

- **Google Analytics**: Web and app analytics
- **Mixpanel**: Product analytics
- **Intercom**: Customer messaging
- **Facebook Pixel**: Ad tracking
- **Data Warehouses**: BigQuery, Snowflake, Redshift

To add a destination, follow the same process as adding Amplitude in Segment's Destinations catalog.

## Privacy & Compliance

The telemetry system is designed with privacy in mind:

- **Opt-in by default**: Telemetry is enabled by default but users can disable it
- **No PII in events**: Events do not contain emails, names, or personal information
- **Wallet addresses only**: The only identifier is the public wallet address
- **Sensitive data filtering**: Private keys, mnemonics, and passwords are filtered out

## References

- [Segment Documentation](https://segment.com/docs/)
- [Amplitude Documentation](https://developers.amplitude.com/)
- [Segment + Amplitude Integration](https://segment.com/docs/connections/destinations/catalog/amplitude/)
