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

# CI requires EXPO_TOKEN, but local developers can rely on `eas login`
if [[ -z "${EXPO_TOKEN:-}" ]]; then
  if [[ "${CI:-}" == "true" ]]; then
    echo "❌ EXPO_TOKEN environment variable is not set."
    echo "   Make sure secrets.EXPO_TOKEN is configured for this workflow."
    exit 1
  fi
  echo "⚠️ EXPO_TOKEN not set. Using local EAS session (run 'eas login' if needed)."
else
  echo "🔑 EXPO_TOKEN detected. Using token-based authentication."
fi

# Ensure bundler has enough memory (especially on CI runners)
if [[ "${NODE_OPTIONS:-}" != *"--max-old-space-size="* ]]; then
  export NODE_OPTIONS="--max-old-space-size=4096 ${NODE_OPTIONS:-}"
  echo "🧠 NODE_OPTIONS updated for higher memory limit (--max-old-space-size=4096)."
fi

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
# - --non-interactive: Added automatically for CI runs to prevent prompts
EAS_UPDATE_ARGS=(
  --environment preview
  --channel preview
  --message "Preview: $COMMIT_HASH"
)
if [[ "${CI:-}" == "true" ]]; then
  EAS_UPDATE_ARGS+=(--non-interactive)
fi

EXPO_PUBLIC_GIT_COMMIT_HASH=$COMMIT_HASH pnpm exec eas update "${EAS_UPDATE_ARGS[@]}"

echo ""
echo "📤 Uploading source maps to Sentry..."
pnpm exec sentry-expo-upload-sourcemaps dist

echo ""
echo "✅ Update published successfully"
echo "📱 Preview builds will receive this update"
