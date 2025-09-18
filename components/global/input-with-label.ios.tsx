import React, { forwardRef, ForwardedRef } from "react"
import { InputProps, XStack, YStack } from "tamagui"
import { Input } from "./input"
import { Label } from "./label"
import { Text } from "./text"
import { TextInput } from "react-native"
export default forwardRef(function InputWithLabel(
  {
    label,
    id,
    bg,
    error,
    supportingText,
    ...props
  }: InputProps & { label: string; id: string; bg?: string; supportingText?: string; error?: boolean },
  ref: ForwardedRef<TextInput>,
) {
  return (
    <YStack justifyContent="center" minHeight={56} gap={0} bg={bg} borderRadius="$8" pl="$3.5" pr="$1.5">
      <XStack bg={bg} width={"100%"} alignItems="center" pr="$3" gap="$2">
        <Label minWidth={"20%"} pr={"$2"} color={"$color"} htmlFor="base-input-ios" fontSize="$4" fontWeight="400">
          {label}
        </Label>
        <Input flex={1} overflow="hidden" ref={ref} p={0} id={id} {...props} />
      </XStack>
      {supportingText && (
        <Text.Footnote pr={"$3"} color={error ? "$red10" : "$color06"} pb="$3">
          {supportingText}
        </Text.Footnote>
      )}
    </YStack>
  )
})
