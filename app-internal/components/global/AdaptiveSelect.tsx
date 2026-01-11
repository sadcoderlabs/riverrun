/**
 * AdaptiveSelect component for cross-platform select/dropdown functionality.
 *
 * This component provides a platform-adaptive dropdown/select implementation:
 * - On iOS/Android: Uses native action sheet (bottom sheet menu)
 * - On web: Uses Tamagui's Select component with popup behavior
 *
 * The component uses a context-based approach to allow declarative usage with
 * child components for trigger and items, similar to other UI libraries.
 *
 * @example
 * // Basic usage
 * <AdaptiveSelect
 *   value={selectedValue}
 *   onValueChange={setValue}
 *   title="Select an option"
 * >
 *   <AdaptiveSelect.Trigger>
 *     <Button>{selectedValue || "Select..."}</Button>
 *   </AdaptiveSelect.Trigger>
 *   <AdaptiveSelect.Item value="option1" index={0}>Option 1</AdaptiveSelect.Item>
 *   <AdaptiveSelect.Item value="option2" index={1}>Option 2</AdaptiveSelect.Item>
 *   <AdaptiveSelect.Item value="option3" index={2}>Option 3</AdaptiveSelect.Item>
 * </AdaptiveSelect>
 */

import { useActionSheet } from '@expo/react-native-action-sheet';
import { ChevronDown } from '@tamagui/lucide-icons';
import React, {
  ReactElement,
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Platform, View } from 'react-native';
import { Select as TamaguiSelect, YStack, useTheme } from 'tamagui';

type ElementWithChildren = ReactElement & {
  props: { children?: ReactNode } & Record<string, unknown>;
};

/**
 * Context type for sharing state between AdaptiveSelect components
 *
 * @internal
 */
type AdaptiveSelectContextType = {
  value: string;
  setValue: (value: string) => void;
  options: { value: string; label: string; index: number }[];
  addOption: (option: { value: string; label: string; index: number }) => void;
  customTrigger: ReactElement;
  setTrigger: (trigger: ReactElement) => void;
  title?: string;
};

/**
 * Context for AdaptiveSelect component to share state between parent and children
 *
 * @internal
 */
const AdaptiveSelectContext = createContext<AdaptiveSelectContextType | undefined>(undefined);

/**
 * Hook to access the AdaptiveSelect context
 *
 * @internal
 * @returns The AdaptiveSelect context values
 * @throws Error if used outside an AdaptiveSelect component
 */
const useAdaptiveSelectContext = () => {
  const context = useContext(
    AdaptiveSelectContext as React.Context<AdaptiveSelectContextType | undefined>,
  );
  if (!context) {
    throw new Error('AdaptiveSelect components must be used within an AdaptiveSelect');
  }
  return context;
};

/**
 * Props for the AdaptiveSelect component
 *
 * @property children - The trigger and item components
 * @property value - The currently selected value
 * @property defaultValue - The default value (used if value is not provided)
 * @property onValueChange - Callback function when value changes
 * @property sheetOnly - If true, forces action sheet style even on web
 * @property title - Optional title for the action sheet (visible on native platforms)
 */
type AdaptiveSelectProps = {
  children: ReactNode;
  value: string;
  defaultValue?: string;
  onValueChange: (value: string) => void;
  sheetOnly?: boolean;
  title?: string;
};

/**
 * AdaptiveSelect component for cross-platform select functionality.
 *
 * Provides a unified API for:
 * - Action sheet selection on iOS/Android (native bottom sheet/menu)
 * - Popup selection on web (standard select/dropdown UI)
 *
 * The component collects options from its children and displays them
 * in a platform-appropriate UI when triggered.
 */
const AdaptiveSelect = function AdaptiveSelect({
  children,
  value,
  onValueChange,
  sheetOnly = false,
  title,
}: AdaptiveSelectProps) {
  // Use state for options to ensure components re-render when options change
  const [options, setOptions] = useState<{ value: string; label: string; index: number }[]>([]);

  // Use state to track if custom trigger is set
  const [customTriggerSet, setCustomTriggerSet] = useState(false);
  const customTriggerRef = useRef<ReactElement | null>(null);

  // Track which option indexes have been added to prevent duplicate calls
  const addedOptionsRef = useRef<Set<number>>(new Set());

  // Memoize addOption to prevent re-renders causing infinite loop
  const addOption = useCallback((option: { value: string; label: string; index: number }) => {
    // Skip if this index was already added
    if (addedOptionsRef.current.has(option.index)) return;

    addedOptionsRef.current.add(option.index);

    setOptions(prev => {
      const exists = prev.findIndex(o => o.index === option.index);
      if (exists >= 0) {
        const newOptions = [...prev];
        newOptions[exists] = option;
        return newOptions;
      }
      return [...prev, option];
    });
  }, []);

  // Pre-register all options immediately when they're passed as children
  // This ensures options are available before any selection happens
  React.useEffect(() => {
    // Reset options when component remounts or children change
    addedOptionsRef.current = new Set();

    // Find and register all AdaptiveSelect.Item children
    React.Children.forEach(children, child => {
      if (React.isValidElement(child)) {
        // Type assertion for the child element
        const typedChild = child as React.ReactElement<
          {
            value?: string;
            index?: number;
            children?: ReactNode;
          },
          typeof AdaptiveSelect.Item
        >;

        // Check if it's an AdaptiveSelect.Item and has the required props
        if (
          typedChild.type === AdaptiveSelect.Item &&
          typeof typedChild.props.value === 'string' &&
          typeof typedChild.props.index === 'number'
        ) {
          // Get the label from children or use a default
          const label =
            typeof typedChild.props.children === 'string'
              ? typedChild.props.children
              : `Option ${typedChild.props.index + 1}`;

          // Register the option
          addOption({
            value: typedChild.props.value,
            label,
            index: typedChild.props.index,
          });
        }
      }
    });
  }, [children, addOption]);

  // Set trigger function
  const setTrigger = useCallback((trigger: ReactElement) => {
    customTriggerRef.current = trigger;
    setCustomTriggerSet(true);
  }, []);

  // Context value
  const contextValue = React.useMemo(
    () => ({
      value,
      setValue: onValueChange,
      options,
      addOption,
      title,
      get customTrigger() {
        if (!customTriggerRef.current) {
          throw new Error('AdaptiveSelect requires a Trigger component');
        }
        return customTriggerRef.current;
      },
      setTrigger,
    }),
    [value, onValueChange, options, addOption, setTrigger, title],
  );

  // Only render children initially to collect options and trigger
  if (!customTriggerSet) {
    return (
      <AdaptiveSelectContext.Provider value={contextValue}>
        {children}
      </AdaptiveSelectContext.Provider>
    );
  }

  // Once trigger is set, render the actual select component
  return (
    <AdaptiveSelectContext.Provider value={contextValue}>
      {children}
      {Platform.OS === 'web' && !sheetOnly ? <WebSelect /> : <NativeActionSheetSelect />}
    </AdaptiveSelectContext.Provider>
  );
};

/**
 * Native implementation that uses the action sheet API
 *
 * @internal
 */
function NativeActionSheetSelect() {
  const { value, setValue, options, customTrigger, title } = useAdaptiveSelectContext();
  const { showActionSheetWithOptions } = useActionSheet();
  const tamaguiTheme = useTheme();
  const tintColor = tamaguiTheme.accent9.get('web');

  // No need to pre-create options array as we'll create it in showActionSheet

  const tintColorValue = useMemo(() => {
    // Safely access theme properties with fallbacks
    // const darkColor = '#0077ff';
    // const lightColor = '#0066cc';
    return tintColor;
  }, [tintColor]);

  const showActionSheet = useCallback(() => {
    if (options.length === 0) return;

    // Ensure options are sorted by index for correct selection
    const sortedOptions = [...options].sort((a, b) => a.index - b.index);

    // Create options array from sorted options
    const labels = sortedOptions.map(opt => opt.label);
    labels.push('Cancel');

    // Show action sheet
    showActionSheetWithOptions(
      {
        options: labels,
        cancelButtonIndex: labels.length - 1,
        title,
        // Set colors based on theme
        ...(Platform.OS === 'ios'
          ? {
              tintColor: tintColorValue,
            }
          : {}),
      },
      buttonIndex => {
        if (buttonIndex !== undefined && buttonIndex !== labels.length - 1) {
          // Get the selected option from the sorted array using buttonIndex
          const selectedOption = sortedOptions[buttonIndex];
          if (selectedOption) {
            // Immediately update the value
            setValue(selectedOption.value);
          }
        }
      },
    );
  }, [options, setValue, showActionSheetWithOptions, tintColorValue, title]);

  // Find the label text for selected item
  const selectedLabel = useMemo(() => {
    const selectedOption = options.find(opt => opt.value === value);
    return selectedOption?.label || value || 'Select...';
  }, [options, value]);

  // Ensure customTrigger is a valid React element
  if (!React.isValidElement(customTrigger)) {
    console.warn('AdaptiveSelect.Trigger requires a valid React element as children');
    return null;
  }

  // Assert customTrigger type due to TypeScript limitations
  const typedTrigger = customTrigger as ReactElement<{ onPress?: () => void; disabled?: boolean }>;

  // Define the UI rendering logic outside of useMemo
  const renderTrigger = () => {
    try {
      // Default props collection
      const baseProps = {
        onPress: showActionSheet,
        disabled: options.length === 0,
      };

      // Find the deepest element containing a string and update it
      const deepUpdateText = (element: ReactElement): ReactElement => {
        const elementWithChildren = element as ElementWithChildren;

        if (typeof elementWithChildren.props.children === 'string') {
          return React.cloneElement(element, elementWithChildren.props, selectedLabel);
        }

        if (React.isValidElement(elementWithChildren.props.children)) {
          return React.cloneElement(
            element,
            elementWithChildren.props,
            deepUpdateText(elementWithChildren.props.children),
          );
        }

        return element;
      };

      // Execute different strategies based on type
      return deepUpdateText(React.cloneElement(typedTrigger, baseProps));
    } catch (error) {
      // Fallback to simple clone on error
      console.warn('Error updating trigger:', error);
      return React.cloneElement(typedTrigger, {
        onPress: showActionSheet,
        disabled: options.length === 0,
      } as { onPress?: () => void; disabled?: boolean });
    }
  };

  // Return the rendered trigger
  return renderTrigger();
}

/**
 * Web implementation that uses Tamagui's Select component
 *
 * @internal
 */
function WebSelect() {
  const { value, setValue, options, customTrigger, title } = useAdaptiveSelectContext();

  // Define hooks at the top level before any conditional returns
  const selectedOption = options.find(opt => opt.value === value);
  const selectedLabel = selectedOption?.label || value || 'Select...';
  const typedTrigger = customTrigger as React.ReactElement<any>;

  // Define deepUpdateText before any conditional returns
  const deepUpdateText = useCallback(
    (element: React.ReactElement): React.ReactElement => {
      const elementWithChildren = element as ElementWithChildren;

      if (typeof elementWithChildren.props.children === 'string') {
        return React.cloneElement(element, elementWithChildren.props, selectedLabel);
      }

      if (React.isValidElement(elementWithChildren.props.children)) {
        return React.cloneElement(
          element,
          elementWithChildren.props,
          deepUpdateText(elementWithChildren.props.children),
        );
      }

      return element;
    },
    [selectedLabel],
  );

  const enhancedTrigger = useMemo(() => {
    return deepUpdateText(typedTrigger);
  }, [deepUpdateText, typedTrigger]);

  // If no options available, show disabled trigger
  if (options.length === 0) {
    return React.cloneElement(customTrigger, { disabled: true } as { disabled: boolean });
  }

  // Wrap Tamagui Select's web implementation in our component
  return (
    <TamaguiSelect
      id="food"
      value={value}
      onValueChange={setValue}
      disablePreventBodyScroll
      {...(title ? { 'aria-label': title } : {})}
    >
      <TamaguiSelect.Trigger asChild>
        {React.cloneElement(enhancedTrigger, {
          'data-disabled': options.length === 0,
        } as { 'data-disabled'?: boolean })}
      </TamaguiSelect.Trigger>
      <TamaguiSelect.Content zIndex={200000}>
        <TamaguiSelect.ScrollUpButton
          alignItems="center"
          justifyContent="center"
          position="relative"
          width="100%"
          height="$3"
        >
          <YStack zIndex={10}>
            <ChevronDown size="$1" />
          </YStack>
        </TamaguiSelect.ScrollUpButton>
        <TamaguiSelect.Viewport>
          <TamaguiSelect.Group>
            {/* Show title if provided */}
            {title && (
              <View style={{ paddingHorizontal: 10, paddingVertical: 5 }}>
                <TamaguiSelect.Label>{title}</TamaguiSelect.Label>
              </View>
            )}
            {/* Sort options by index and render as Select.Item */}
            {options
              .sort((a, b) => a.index - b.index)
              .map(option => (
                <TamaguiSelect.Item
                  key={option.value}
                  index={option.index}
                  value={option.value}
                  textValue={option.label}
                >
                  <TamaguiSelect.ItemText>{option.label}</TamaguiSelect.ItemText>
                </TamaguiSelect.Item>
              ))}
          </TamaguiSelect.Group>
        </TamaguiSelect.Viewport>
      </TamaguiSelect.Content>
    </TamaguiSelect>
  );
}

/**
 * AdaptiveSelect.Trigger component for rendering the trigger element
 *
 * @param children - The element to render as the trigger (e.g., Button, Text)
 */
AdaptiveSelect.Trigger = function AdaptiveSelectTrigger({ children }: { children: ReactNode }) {
  const { setTrigger } = useAdaptiveSelectContext();

  // Always define hooks at the top level
  React.useEffect(() => {
    if (React.isValidElement(children)) {
      setTrigger(children as ReactElement);
    }
  }, [children, setTrigger]);

  // Early return if children is not a valid element
  if (!React.isValidElement(children)) {
    console.error('AdaptiveSelect.Trigger children must be a valid React element');
    return null;
  }
  // Return null since the actual rendering happens in the parent
  return null;
};

/**
 * AdaptiveSelect.Item component for defining selection options
 *
 * @param value - The value of this option
 * @param index - The index/position of this option in the list
 * @param children - The label content (typically a string)
 */
AdaptiveSelect.Item = function AdaptiveSelectItem({
  value,
  index,
  children,
}: {
  value: string;
  index: number;
  children: ReactNode;
}) {
  const { addOption } = useAdaptiveSelectContext();
  const label = typeof children === 'string' ? children : `Option ${index + 1}`;

  // Register this option with the parent component
  React.useEffect(() => {
    addOption({ value, label, index });
  }, [addOption, index, label, value]);

  // Return null since the actual rendering happens in the parent
  return null;
};

export default AdaptiveSelect;
