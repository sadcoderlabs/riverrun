#!/bin/bash
set -e

# Get current git commit hash
COMMIT_HASH=$(git rev-parse --short HEAD)

echo "📦 Publishing EAS Update for preview channel"
echo "📍 Commit: $COMMIT_HASH"
echo "🌍 Environment: preview (from EAS platform)"
echo ""

# Publish update with:
# - EXPO_PUBLIC_GIT_COMMIT_HASH: injected dynamically
# - --environment preview: uses EAS platform variables (ignores local .env files)
# - --channel preview: targets preview builds (defined in eas.json)
EXPO_PUBLIC_GIT_COMMIT_HASH=$COMMIT_HASH pnpm exec eas update \
  --environment preview \
  --channel preview \
  --message "Preview: $COMMIT_HASH"

echo ""
echo "✅ Update published successfully"
echo "📱 Preview builds will receive this update"
