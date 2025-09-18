import React, { forwardRef, ForwardedRef } from 'react';
import { InputProps, YStack } from 'tamagui';
import { Input } from './input';
import { Label } from './label';
import { Text } from './text';
import { TextInput } from 'react-native';
export default forwardRef(function InputWithLabel(
  {
    label,
    id,
    error,
    bg = '$gray4',
    supportingText,
    ...props
  }: InputProps & {
    label: string;
    id: string;
    bg?: string;
    supportingText?: string;
    error?: boolean;
  },
  ref: ForwardedRef<TextInput>,
) {
  return (
    <YStack gap="$1">
      <YStack bg={bg} borderRadius="$8" pt="$2" py="$2.5" px="$4.5">
        <Label color={error ? '$red10' : '$color06'} p={0} htmlFor={id}>
          {label}
        </Label>
        <Input
          ref={ref}
          mb={'$1.5'}
          borderBottomWidth={2}
          borderRadius={0}
          p={0}
          height={'$3'}
          id={id}
          error={error}
          borderColor={error ? '$red10' : '$borderColor'}
          placeholder="Enter text..."
          {...props}
        />
      </YStack>
      {supportingText && (
        <Text.Footnote px="$4.5" pb="$4" color={error ? '$red10' : '$color06'}>
          {supportingText}
        </Text.Footnote>
      )}
    </YStack>
  );
});
