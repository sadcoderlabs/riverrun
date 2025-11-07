/**
 * ListSection component for grouping list items with an optional label.
 * Provides a consistent container for ListItem components with platform-specific styling.
 *
 * @example
 * // Basic usage
 * <ListSection label="Settings">
 *   <ListItem title="Profile" onPress={() => {}} />
 *   <ListItem title="Notifications" onPress={() => {}} />
 * </ListSection>
 *
 * // Without label
 * <ListSection>
 *   <ListItem title="Option 1" />
 *   <ListItem title="Option 2" />
 * </ListSection>
 *
 * // With border
 * <ListSection label="Bordered Section" bordered>
 *   <ListItem title="Item 1" />
 *   <ListItem title="Item 2" />
 * </ListSection>
 */

import { ReactNode } from 'react';
import { Platform } from 'react-native';
import { Separator, View, YGroup, YStack, YStackProps } from 'tamagui';
import { Text } from './Text';

/**
 * Props for the ListSection component
 *
 * @property label - Optional header text displayed above the list items
 * @property children - Content of the list section (typically ListItem components)
 * @property bordered - Whether to show a border around the section ("default" uses platform-specific border style)
 * @property size - Size token for the spacing (passed to Tamagui YGroup)
 * @property bg - Background color of the section
 * @property edge - If true, the section extends to the edges of the screen without horizontal margins
 */
export interface ListSectionProps extends YStackProps {
  label?: ReactNode;
  children: ReactNode;
  bordered?: boolean | 'default';
  size?: string;
  bg?: YStackProps['backgroundColor'];
  edge?: boolean;
}

/**
 * A container component for grouping related list items with consistent styling.
 * Automatically applies platform-specific styling differences between iOS and Android.
 *
 * Key features:
 * - Optional section label with platform-optimized styling
 * - Configurable borders and background
 * - Optional edge-to-edge layout
 * - Platform-adaptive separators between items
 */
export const ListSection = ({
  label,
  children,
  bordered = false,
  size,
  bg = '$gray1',
  edge,
  ...props
}: ListSectionProps) => {
  return (
    <YStack gap="$2" mx={edge ? 0 : '$4'} my={'$4'} {...props}>
      {label && (
        <Text.Subhead
          fontWeight={'500'}
          color={Platform.OS === 'android' ? '$accent10' : '$color06'}
          ml={Platform.OS === 'android' ? '$4.5' : '$4'}
          mb={Platform.OS === 'android' ? '$2' : undefined}
        >
          {label}
        </Text.Subhead>
      )}
      <View overflow="hidden" borderRadius={edge ? 0 : '$9'}>
        <YGroup
          borderLeftWidth={edge ? 0 : undefined}
          borderRightWidth={edge ? 0 : undefined}
          bordered={bordered === 'default' ? (Platform.OS === 'android' ? 0 : 1) : bordered ? 1 : 0}
          bg={edge ? (Platform.OS === 'android' ? 'transparent' : bg) : bg}
          borderRadius={0}
          separator={
            Platform.OS === 'android' ? null : (
              <Separator borderColor="$listItemBorderColor" ml="$4" />
            )
          }
          size={Platform.OS === 'android' ? size || '$6' : size}
        >
          {children}
        </YGroup>
      </View>
    </YStack>
  );
};
