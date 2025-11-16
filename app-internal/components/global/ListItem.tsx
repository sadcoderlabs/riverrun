/**
 * ListItem and related components for creating consistent list interfaces.
 * Provides a customizable list item with various display options following platform-specific styling.
 *
 * This component is often used within a ListSection to create organized, grouped lists.
 *
 * @example
 * // Basic usage
 * <ListSection label="Settings">
 *   <ListItem
 *     title="Profile"
 *     subTitle="Edit your profile information"
 *     showIosChevron
 *     onPress={() => navigate('profile')}
 *   />
 *   <ListItem
 *     title="Notifications"
 *     icon={<NotificationIcon />}
 *     showIosChevron
 *     onPress={() => navigate('notifications')}
 *   />
 * </ListSection>
 *
 * @note This component has platform-specific styling that adjusts based on Android or iOS.
 */

import { Check, ChevronRight } from '@tamagui/lucide-icons';
import { ReactNode, forwardRef } from 'react';
import { Platform, View as ReactNativeView } from 'react-native';
import { ListItemFrame, View, XStack, YStack } from 'tamagui';
import { Button, ButtonProps } from './Button';
import { Text } from './Text';

/**
 * Props for the ListItem component.
 *
 * @property title - Main text content (string or ReactNode)
 * @property subTitle - Secondary text content displayed below the title (string or ReactNode)
 * @property description - Description text content displayed below the title (string or ReactNode)
 * @property icon - Icon to display at the left side of the item (ReactNode)
 * @property iconAfter - Icon to display at the right side of the item (ReactNode)
 * @property onPress - Function to call when the item is pressed
 * @property disabled - Whether the item is disabled (affects appearance and interaction)
 * @property text - Additional text to display on the right side (string or ReactNode)
 * @property showIosChevron - Whether to show a chevron icon on iOS (for navigation indication)
 * @property isChecked - Whether to show a checkmark (for selection indication)
 */
export interface ListItemProps {
  title?: ReactNode;
  subTitle?: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  iconAfter?: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  text?: ReactNode;
  textAlign?: 'left' | 'center' | 'right';
  showIosChevron?: boolean;
  isChecked?: boolean;
  minHeight?: any;
}

// Export ListSection from its own file
export { ListSection, ListSectionProps } from './ListSection';

/**
 * A list item component with configurable content and styling.
 * Adapts to platform-specific design guidelines for iOS and Android.
 *
 * Features:
 * - Primary and secondary text
 * - Left and right icons
 * - Optional selection indicator (checkmark)
 * - Platform-specific navigation indicator (chevron on iOS)
 * - Pressable with configurable action
 */
export const ListItem = forwardRef<ReactNativeView, ListItemProps>(
  (
    {
      title,
      subTitle,
      icon,
      iconAfter,
      onPress,
      disabled,
      text,
      showIosChevron,
      isChecked,
      description,
      minHeight,
      ...props
    },
    ref,
  ) => {
    return (
      <ListItemFrame
        bg="transparent"
        minHeight={minHeight ?? (Platform.OS === 'android' ? '$5' : 56)}
        ref={ref}
        pressStyle={{ opacity: 0.8, bg: '$color02' }}
        onPress={onPress}
        px={Platform.OS === 'android' ? '$4.5' : '$4'}
        py={Platform.OS === 'android' ? '$3' : '$2.5'}
        disabled={disabled}
        disabledStyle={{ opacity: 0.5, backgroundColor: undefined }}
        {...props}
      >
        <YStack flex={1} justifyContent="center">
          <XStack gap="$2.5" flex={1} justifyContent="center" alignItems="center">
            {icon && <XStack>{icon}</XStack>}
            <YStack minWidth={'20%'} flex={1} gap={Platform.OS === 'android' ? 0 : '$0.5'}>
              {typeof title === 'string' ? (
                <Text fontFamily={Platform.OS === 'android' ? '$interMedium' : undefined}>
                  {title}
                </Text>
              ) : (
                title
              )}
              <View>
                {typeof subTitle === 'string' ? (
                  <Text.Subhead color={'$grayA9'}>{subTitle}</Text.Subhead>
                ) : (
                  subTitle
                )}
              </View>
            </YStack>

            {(text || iconAfter) && (
              <XStack>
                {typeof text === 'string' ? (
                  <Text
                    textAlign="right"
                    fontFamily={Platform.OS === 'android' ? '$interMedium' : undefined}
                    color={'$color04'}
                  >
                    {text}
                  </Text>
                ) : (
                  text
                )}
                {iconAfter}
              </XStack>
            )}

            {isChecked && (
              <View marginRight="$2">
                <Check color={'$color04'} strokeWidth={2} size={18} />
              </View>
            )}

            {showIosChevron && Platform.OS === 'ios' && (
              <ChevronRight size="$1" color={'$color04'} />
            )}
          </XStack>
          {description && (
            <XStack gap="$2.5" flex={1}>
              {/* shadow icon for spacing */}
              {icon && <XStack opacity={0}>{icon}</XStack>}
              {typeof description === 'string' ? (
                <Text.Subhead flex={1} flexWrap="wrap" color={'$grayA9'}>
                  {description}
                </Text.Subhead>
              ) : (
                description
              )}
            </XStack>
          )}
        </YStack>
      </ListItemFrame>
    );
  },
);

// Add display name for better debugging
ListItem.displayName = 'ListItem';

/**
 * Props for the ListButton component, extending ButtonProps.
 */
export type ListButtonProps = ButtonProps;

/**
 * A button designed specifically for use within list contexts.
 * Styled to match the appearance of ListItem while providing button functionality.
 *
 * @example
 * <ListSection>
 *   <ListButton onPress={() => handleAction()}>
 *     Perform Action
 *   </ListButton>
 * </ListSection>
 */
export const ListButton = forwardRef<ReactNativeView, ListButtonProps>((props, ref) => {
  return (
    <Button
      ref={ref}
      height="auto"
      px={Platform.OS === 'android' ? '$4.5' : '$4'}
      minHeight={Platform.OS === 'android' ? '$5' : 56}
      rounded={0}
      fontSize="$4"
      fontWeight={Platform.OS === 'android' ? '500' : '400'}
      flex={1}
      {...props}
    />
  );
});

// Add display name for better debugging
ListButton.displayName = 'ListButton';
