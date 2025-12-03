#!/bin/bash
# Script: build.sh
# Purpose: Build the app using EAS Build with specified profile and platform
# Usage: ./scripts/build.sh <profile> <platform> [--force]
#        profile: development | preview | production
#        platform: all | ios | android
#        --force: Skip main branch check for production builds (use with caution)

set -e

PROFILE=""
PLATFORM=""
FORCE=false

# 解析參數
while [[ $# -gt 0 ]]; do
  case $1 in
    --force)
      FORCE=true
      shift
      ;;
    *)
      if [[ -z "$PROFILE" ]]; then
        PROFILE=$1
      elif [[ -z "$PLATFORM" ]]; then
        PLATFORM=$1
      fi
      shift
      ;;
  esac
done

# 參數驗證
if [[ -z "$PROFILE" ]] || [[ -z "$PLATFORM" ]]; then
  echo "❌ Usage: ./scripts/build.sh <profile> <platform> [--force]"
  echo "   profile: development | preview | production"
  echo "   platform: all | ios | android"
  echo "   --force: Skip main branch check for production builds"
  exit 1
fi

# Production builds 必須在 main branch（除非使用 --force）
if [[ "$PROFILE" == "production" ]]; then
  CURRENT_BRANCH=$(git branch --show-current)
  if [[ "$CURRENT_BRANCH" != "main" ]]; then
    if [[ "$FORCE" == "true" ]]; then
      echo "⚠️  WARNING: Production build on non-main branch '$CURRENT_BRANCH' (--force enabled)"
    else
      echo "❌ Production builds must be run from the 'main' branch."
      echo "   Current branch: $CURRENT_BRANCH"
      echo "   Use --force to override (not recommended)"
      exit 1
    fi
  else
    echo "✅ On main branch, proceeding with production build..."
  fi
fi

# EXPO_TOKEN 認證檢查
if [[ -z "${EXPO_TOKEN:-}" ]]; then
  if [[ "${CI:-}" == "true" ]]; then
    echo "❌ EXPO_TOKEN environment variable is not set."
    exit 1
  fi
  echo "⚠️  EXPO_TOKEN not set. Using local EAS session."
else
  echo "🔑 EXPO_TOKEN detected."
fi

# 記憶體優化
if [[ "${NODE_OPTIONS:-}" != *"--max-old-space-size="* ]]; then
  export NODE_OPTIONS="--max-old-space-size=4096 ${NODE_OPTIONS:-}"
fi

# Git commit hash (for display only)
# NOTE: EXPO_PUBLIC_GIT_COMMIT_HASH is set by eas-build-post-install hook on EAS servers.
# Setting it here locally has NO effect because eas build runs on EAS cloud servers,
# not locally. The hook uses EAS_BUILD_GIT_COMMIT_HASH (built-in EAS variable) instead.
# See: scripts/eas-build-post-install.sh
COMMIT_HASH=$(git rev-parse --short HEAD)

# 建構 EAS build 參數
EAS_BUILD_ARGS=(
  --profile "$PROFILE"
  --platform "$PLATFORM"
)

# Production builds 自動提交到 app store
if [[ "$PROFILE" == "production" ]]; then
  EAS_BUILD_ARGS+=(--auto-submit)
fi

# CI 環境下使用 non-interactive 模式
if [[ "${CI:-}" == "true" ]]; then
  EAS_BUILD_ARGS+=(--non-interactive)
fi

echo "🚀 Starting EAS build..."
echo "   Profile: $PROFILE"
echo "   Platform: $PLATFORM"
echo "   Commit: $COMMIT_HASH"

pnpm exec eas build "${EAS_BUILD_ARGS[@]}"

echo "✅ Build completed successfully!"
