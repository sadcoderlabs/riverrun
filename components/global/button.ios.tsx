import { ButtonProps as TamaguiButtonProps, styled, Button as TamaguiButton, TamaguiElement } from "tamagui"
import React, { forwardRef } from "react"

// Create styled components directly instead of functional components
const StyledBaseButton = styled(TamaguiButton, {
  pressTheme: true,
  borderWidth: 0,
  color: "$accent9",
  bg: "transparent",
  hoverStyle: {
    opacity: 0.8,
    bg: "transparent",
  },
  px: "$2.5",
  py: "$0.5",
  size: "$3",
  height: "$2.5",
  rounded: "$12",
  variants: {
    level: {
      sm: { fontSize: "$3", px: "$2.5", py: "$0", size: "$3", height: "$2", rounded: "$12" },
      md: { fontSize: "$3", px: "$3", py: "$0.5", size: "$3", height: "$2.5", rounded: "$12" },
      lg: { fontSize: "$4", px: "$4", py: "$1", size: "$4", height: "$4.5", rounded: "$12" },
    },
  } as const,
  defaultVariants: {
    level: "md",
  },
})

// Use styleable for functional components that wrap styled components
const ButtonBase = forwardRef<TamaguiElement, ButtonProps>((props, ref) => {
  return <StyledBaseButton {...props} ref={ref} />
})
ButtonBase.displayName = "ButtonBase"

const StyledTintedButton = styled(TamaguiButton, {
  fontSize: "$4",
  fontWeight: "400",
  color: "$accent11",
  theme: "accent",
  borderWidth: 0,
  bg: "$accent3",
  px: "$2.5",
  py: "$0.5",
  size: "$3",
  height: "$2.5",
  rounded: "$12",
  variants: {
    level: {
      sm: { fontSize: "$3", px: "$2", py: "$0", size: "$3", height: "$2", rounded: "$12" },
      md: { fontSize: "$3", px: "$2.5", py: "$0.5", size: "$3", height: "$2.5", rounded: "$12" },
      lg: { fontSize: "$4", px: "$4", py: "$1", size: "$4", height: "$4.5", rounded: "$12" },
    },
    disabled: {
      true: {
        opacity: 0.75,
      },
    },
  } as const,
  defaultVariants: {
    level: "md",
  },
})

const ButtonFilled = forwardRef<TamaguiElement, ButtonProps>((props, ref) => {
  return <StyledFilledButton {...props} ref={ref} />
})
ButtonFilled.displayName = "ButtonFilled"

// Tinted Button - styled exactly the same as Filled
const StyledFilledButton = styled(TamaguiButton, {
  fontWeight: "400",
  color: "$accent1",
  bg: "$accent9",
  borderWidth: 0,
  outlineWidth: 0,
  pressStyle: {
    opacity: 0.8,
    bg: "$accent9",
  },
  px: "$3",
  py: "$0.5",
  size: "$3",
  height: "$2.5",
  rounded: "$12",
  variants: {
    level: {
      sm: { fontSize: "$3", px: "$2.5", py: "$0", size: "$3", height: "$2", rounded: "$12" },
      md: { fontSize: "$3", px: "$3", py: "$0.5", size: "$3", height: "$2.5", rounded: "$12" },
      lg: { fontSize: "$4", px: "$4", py: "$1", size: "$4", height: "$4.5", rounded: "$12" },
    },
    disabled: {
      true: {
        opacity: 0.75,
      },
    },
  } as const,
  defaultVariants: {
    level: "md",
  },
})

const ButtonTinted = forwardRef<TamaguiElement, ButtonProps>((props, ref) => {
  return <StyledTintedButton {...props} ref={ref} />
})
ButtonTinted.displayName = "ButtonTinted"

const StyledGrayButton = styled(TamaguiButton, {
  borderWidth: 0,
  fontWeight: "400",
  bg: "$grayA3",
  pressTheme: false,
  color: "$accent9",
  pressStyle: {
    opacity: 0.8,
    bg: "$grayA4",
  },
  px: "$2.5",
  py: "$0.5",
  size: "$3",
  height: "$2.5",
  rounded: "$12",
  variants: {
    level: {
      sm: { fontSize: "$3", px: "$2.5", py: "$0", size: "$3", height: "$2", rounded: "$12" },
      md: { fontSize: "$3", px: "$3", py: "$0.5", size: "$3", height: "$2.5", rounded: "$12" },
      lg: { fontSize: "$4", px: "$4", py: "$1", size: "$4", height: "$4.5", rounded: "$12" },
    },
    disabled: {
      true: {
        opacity: 0.75,
      },
    },
  } as const,
  defaultVariants: {
    level: "md",
  },
})

const ButtonGray = forwardRef<TamaguiElement, ButtonProps>((props, ref) => {
  return <StyledGrayButton {...props} ref={ref} />
})
ButtonGray.displayName = "ButtonGray"

// Inline Button - same as base button but for inline use
const StyledInlineButton = styled(TamaguiButton, {
  unstyled: true,
  pressTheme: true,
  pressStyle: {
    opacity: 0.8,
    bg: "transparent",
  },
  fontSize: "$4",
  fontWeight: "400",
  color: "$accent9",
  variants: {
    level: {
      sm: { fontSize: "$3" },
      md: { fontSize: "$4" },
      lg: { fontSize: "$5" },
    },
  } as const,
  defaultVariants: {
    level: "md",
  },
})

const ButtonInline = forwardRef<TamaguiElement, ButtonProps>((props, ref) => {
  return <StyledInlineButton {...props} ref={ref} />
})
ButtonInline.displayName = "ButtonInline"

export const Button = Object.assign(ButtonBase, {
  Filled: ButtonFilled,
  Tinted: ButtonTinted,
  Gray: ButtonGray,
  Inline: ButtonInline,
}) as typeof ButtonBase & {
  Filled: typeof ButtonFilled
  Tinted: typeof ButtonTinted
  Gray: typeof ButtonGray
  Inline: typeof ButtonInline
}

// Define our custom ButtonProps that includes the level prop
export interface ButtonProps extends TamaguiButtonProps {
  level?: "sm" | "md" | "lg"
}
