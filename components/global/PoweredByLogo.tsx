import React from 'react';
import { useColorScheme } from 'react-native';
import { HyperliquidSvg } from './HyperliquidSvg';

interface PoweredByLogoProps {
  width?: number;
  height?: number;
  darkMode?: boolean;
}

/**
 * PoweredByLogo component that renders the Hyperliquid logo
 * This uses a custom SVG component that directly renders the SVG paths
 */
export function PoweredByLogo({ width = 180, height = 30, darkMode }: PoweredByLogoProps) {
  const colorScheme = useColorScheme();

  // Determine if we should use dark mode
  const isDarkMode = darkMode !== undefined ? darkMode : colorScheme === 'dark';

  return <HyperliquidSvg width={width} height={height} darkMode={isDarkMode} />;
}
