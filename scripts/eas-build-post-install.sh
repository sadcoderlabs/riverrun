#!/bin/bash
# Script: eas-build-post-install.sh
# Purpose: Set EXPO_PUBLIC_GIT_COMMIT_HASH from EAS Build's built-in variable
#
# This hook runs after `pnpm install` on EAS Build servers.
# It converts EAS_BUILD_GIT_COMMIT_HASH (built-in) to EXPO_PUBLIC_GIT_COMMIT_HASH
# so Metro bundler can inline it into the JavaScript bundle.
#
# Reference: https://docs.expo.dev/build-reference/npm-hooks/

# Only run on EAS Build (EAS_BUILD is set to "true" on EAS Build servers)
if [[ "$EAS_BUILD" != "true" ]]; then
  echo "⏭️  Not running on EAS Build, skipping..."
  exit 0
fi

if [[ -n "$EAS_BUILD_GIT_COMMIT_HASH" ]]; then
  # Use first 7 characters for short hash
  SHORT_HASH="${EAS_BUILD_GIT_COMMIT_HASH:0:7}"
  echo "📍 Setting EXPO_PUBLIC_GIT_COMMIT_HASH=$SHORT_HASH"

  # set-env is a special command available on EAS Build workers
  # It sets environment variables for subsequent build phases
  set-env EXPO_PUBLIC_GIT_COMMIT_HASH "$SHORT_HASH"
else
  echo "⚠️  EAS_BUILD_GIT_COMMIT_HASH not available"
fi
