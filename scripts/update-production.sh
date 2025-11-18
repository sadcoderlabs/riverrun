#!/bin/bash
set -e

# Get current git commit hash
COMMIT_HASH=$(git rev-parse --short HEAD)

echo "📦 Publishing EAS Update for production channel"
echo "📍 Commit: $COMMIT_HASH"
echo "🌍 Environment: production (from EAS platform)"
echo ""

# Publish update with:
# - EXPO_PUBLIC_GIT_COMMIT_HASH: injected dynamically
# - --environment production: uses EAS platform variables (ignores local .env files)
# - --channel production: targets production builds (defined in eas.json)
EXPO_PUBLIC_GIT_COMMIT_HASH=$COMMIT_HASH pnpm exec eas update \
  --environment production \
  --channel production \
  --message "Production: $COMMIT_HASH"

echo ""
echo "✅ Update published successfully"
echo "📱 Production builds will receive this update"
