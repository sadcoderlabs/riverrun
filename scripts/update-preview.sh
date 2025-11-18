#!/bin/bash
# Script: update-preview.sh
# Purpose: Publish EAS OTA update to preview channel
# Usage: ./scripts/update-preview.sh or pnpm update:preview
#
# Prerequisites:
# - EAS CLI authenticated (via eas login or EXPO_TOKEN env var)
# - Environment variables configured on EAS platform for "preview" environment
#
# Environment Variables:
# - EXPO_TOKEN: EAS authentication token (auto-used by EAS CLI if set)
#   - In CI: Set via GitHub Secrets
#   - Locally: Not needed if logged in via `eas login`

set -e  # Exit immediately if any command fails

# Validate EXPO_TOKEN is available (required for CI authentication)
if [[ -z "${EXPO_TOKEN:-}" ]]; then
  echo "❌ EXPO_TOKEN environment variable is not set."
  echo "   Make sure secrets.EXPO_TOKEN is configured for this workflow."
  exit 1
fi

# Indicate whether the script detected the token (value stays masked in logs)
echo "🔑 EXPO_TOKEN detected. Using token-based authentication."

# Get current git commit hash (short version)
COMMIT_HASH=$(git rev-parse --short HEAD)

echo "📦 Publishing EAS Update for preview channel"
echo "📍 Commit: $COMMIT_HASH"
echo "🌍 Environment: preview (from EAS platform)"
echo ""

# Publish OTA update with:
#
# Environment Variable:
# - EXPO_PUBLIC_GIT_COMMIT_HASH: Injected dynamically at build time
#   - This will be embedded in the JavaScript bundle
#   - Available in app code via process.env.EXPO_PUBLIC_GIT_COMMIT_HASH
#
# Flags:
# - --environment preview: Uses environment variables from EAS "preview" environment
#   - Loads: APP_VARIANT, SEGMENT_WRITE_KEY, SENTRY_AUTH_TOKEN, etc.
#   - Ignores local .env files
#   - Ensures consistency with preview builds
#
# - --channel preview: Targets builds subscribed to "preview" channel
#   - Defined in eas.json build.preview.channel
#   - Only preview builds will receive this update
#
# - --message: Commit message for tracking this update
EXPO_PUBLIC_GIT_COMMIT_HASH=$COMMIT_HASH pnpm exec eas update \
  --environment preview \
  --channel preview \
  --message "Preview: $COMMIT_HASH" \
  --non-interactive

echo ""
echo "✅ Update published successfully"
echo "📱 Preview builds will receive this update"
