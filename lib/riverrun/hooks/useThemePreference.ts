import { useThemeStore, type ThemePreference } from '@/store/theme.store'; // Import from zustand store
import tamaguiConfig from '@/tamagui.config';
import { useEffect } from 'react';
import { Appearance, Platform, useColorScheme } from 'react-native'; // Added imports
import { BlurEffectTypes } from 'react-native-screens';
export type EffectiveTheme = 'light' | 'dark';

export interface ThemePreferenceResult {
  effectiveTheme: EffectiveTheme;
  setPreference: (theme: ThemePreference) => void;
  preference: ThemePreference | undefined;
  isLoading: boolean;
  iosBlurEffect: BlurEffectTypes;
  appBg: string;
  tabBarBg: string;
  accentColor: string;
  tabBarTintColor: string;
}

/**
 * Hook for managing theme preference and deriving the effective theme.
 * Handles syncing with OS appearance settings.
 * @returns Object containing theme-related values
 */
export function useThemePreference(): ThemePreferenceResult {
  const preference = useThemeStore(state => state.themePreference);
  const setPreference = useThemeStore(state => state.setThemePreference);
  const isHydrated = useThemeStore(state => state._hasHydrated);
  const systemColorScheme = useColorScheme(); // Get system theme
  const isLoading = !isHydrated;

  // Initialize if undefined after hydration - default to dark theme
  useEffect(() => {
    if (!isLoading && preference === undefined) {
      setPreference('dark');
    }
  }, [isLoading, preference, setPreference]);

  // Sync with OS Appearance API when preference changes
  useEffect(() => {
    if (Platform.OS !== 'web') {
      if (preference === 'system') {
        Appearance.setColorScheme(null);
      } else if (preference === 'light' || preference === 'dark') {
        Appearance.setColorScheme(preference);
      }
    }
  }, [preference]);

  const effectiveTheme =
    preference === 'system' ? (systemColorScheme ?? 'dark') : (preference ?? 'dark');

  const appBg =
    effectiveTheme === 'dark'
      ? tamaguiConfig.themes.dark.gray3.val
      : tamaguiConfig.themes.light.gray3.val;

  const accentColor =
    effectiveTheme === 'dark'
      ? tamaguiConfig.themes.dark.accent9.val
      : tamaguiConfig.themes.light.accent9.val;

  const tabBarBg =
    effectiveTheme === 'dark'
      ? tamaguiConfig.themes.dark.gray3.val
      : tamaguiConfig.themes.light.gray3.val;

  const tabBarTintColor =
    effectiveTheme === 'dark'
      ? tamaguiConfig.themes.dark.grayA3.val
      : tamaguiConfig.themes.light.grayA3.val;

  const iosBlurEffect = effectiveTheme === 'dark' ? 'prominent' : ('prominent' as BlurEffectTypes);

  return {
    effectiveTheme,
    setPreference,
    preference,
    isLoading,
    iosBlurEffect,
    appBg,
    tabBarBg,
    accentColor,
    tabBarTintColor,
  };
}
