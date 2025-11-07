import React from 'react';
import { SvgProps } from 'react-native-svg';
import { useTheme } from 'tamagui';

type IconComponent = React.FC<{ fillColor?: string } & SvgProps>;

interface ThemedSvgProps extends SvgProps {
  /**
   * The theme token (e.g. "$accent9") or direct color value
   */
  color?: string;

  /**
   * The icon component from WildeIcons
   */
  icon: IconComponent;
}

/**
 * ThemedSvg - A wrapper component for Wilde SVG icons that applies theme colors
 *
 * @param icon - The icon component from WildeIcons
 * @param color - Theme token (e.g. "$accent9") or direct color value
 * @param props - Other SVG props like width, height, etc.
 *
 * @example
 * ```tsx
 * import { RewardsIcon } from "@/components/icons/WildeIcons"
 *
 * // With theme token
 * <ThemedSvg icon={RewardsIcon} color="$accent9" width={32} height={32} />
 *
 * // With direct color
 * <ThemedSvg icon={RewardsIcon} color="#FF0000" width={32} height={32} />
 * ```
 */
export const ThemedSvg = ({ icon: Icon, color = '$accent9', ...props }: ThemedSvgProps) => {
  const theme = useTheme();

  // Handle theme tokens properly
  let fillColor = color;
  if (color.startsWith('$') && theme[color]) {
    const themeValue = theme[color];
    // Handle different types of theme values
    if (typeof themeValue === 'string') {
      fillColor = themeValue;
    } else if (themeValue && typeof themeValue === 'object' && 'val' in themeValue) {
      // Some theme values might be objects with a val property
      fillColor = String(themeValue.val);
    } else if (themeValue !== undefined && themeValue !== null) {
      // Last resort - try to convert to string
      fillColor = String(themeValue);
    }
  }

  return <Icon fillColor={fillColor} {...props} />;
};
