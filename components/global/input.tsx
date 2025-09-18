import { Input as TamaguiInput, styled, GetProps } from "tamagui"
import React, { forwardRef } from "react"
import { Platform, TextInput } from "react-native"

// Base Input - Standard input with default styling
const StyledBaseInput = styled(TamaguiInput, {
  // Base styles
  borderWidth: 0,
  color: "$color",
  paddingHorizontal: "$3",
  backgroundColor: "transparent",
  paddingVertical: "$2",
  fontSize: "$4",
  fontWeight: "400",
  fontFamily: Platform.OS === "android" ? "$interRegular" : undefined,
  // Focus state
  focusStyle: {
    borderColor: "$accent8",
  },

  // Error state
  variants: {
    error: {
      true: {
        borderColor: "$red10",
      },
    },
    disabled: {
      true: {
        opacity: 0.5,
      },
    },
  } as const,
})

// Props interface
export interface InputProps extends GetProps<typeof StyledBaseInput> {
  error?: boolean
}

// Base Input component
const InputBase = forwardRef<TextInput, InputProps>((props, ref) => {
  return <StyledBaseInput ref={ref} {...props} />
})
InputBase.displayName = "InputBase"

// Export the Input component (only base)
export const Input = InputBase
