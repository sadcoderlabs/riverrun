#!/bin/bash
# Script: update-production.sh
# Purpose: Publish EAS OTA update to production channel
# Usage: ./scripts/update-production.sh or pnpm update:production
#
# Prerequisites:
# - EAS CLI authenticated (via eas login or EXPO_TOKEN env var)
# - Environment variables configured on EAS platform for "production" environment
# - Should only be run from main branch
#
# Environment Variables:
# - EXPO_TOKEN: EAS authentication token (auto-used by EAS CLI if set)
#   - In CI: Set via GitHub Secrets
#   - Locally: Not needed if logged in via `eas login`

set -e  # Exit immediately if any command fails

# Get current git commit hash (short version)
COMMIT_HASH=$(git rev-parse --short HEAD)

echo "📦 Publishing EAS Update for production channel"
echo "📍 Commit: $COMMIT_HASH"
echo "🌍 Environment: production (from EAS platform)"
echo ""

# Publish OTA update with:
#
# Environment Variable:
# - EXPO_PUBLIC_GIT_COMMIT_HASH: Injected dynamically at build time
#   - This will be embedded in the JavaScript bundle
#   - Available in app code via process.env.EXPO_PUBLIC_GIT_COMMIT_HASH
#
# Flags:
# - --environment production: Uses environment variables from EAS "production" environment
#   - Loads: APP_VARIANT, SEGMENT_WRITE_KEY, SENTRY_AUTH_TOKEN, etc.
#   - Ignores local .env files
#   - Ensures consistency with production builds
#
# - --channel production: Targets builds subscribed to "production" channel
#   - Defined in eas.json build.production.channel
#   - Only production builds (from App Store/Play Store) will receive this update
#
# - --message: Commit message for tracking this update
EXPO_PUBLIC_GIT_COMMIT_HASH=$COMMIT_HASH pnpm exec eas update \
  --environment production \
  --channel production \
  --message "Production: $COMMIT_HASH"

echo ""
echo "✅ Update published successfully"
echo "📱 Production builds will receive this update"
