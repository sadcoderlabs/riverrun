import {
  H1 as TamaguiH1,
  H2 as TamaguiH2,
  H3 as TamaguiH3,
  H4 as TamaguiH4,
  H5 as TamaguiH5,
  H6 as TamaguiH6,
  styled,
  TamaguiTextElement,
} from "tamagui"
import React, { forwardRef } from "react"

// Define prop types upfront
import type { TextProps as TamaguiTextProps } from "tamagui"
export type TextProps = TamaguiTextProps

// H1 - Size 8
const StyledH1 = styled(TamaguiH1, {
  fontFamily: "$heading",
  fontSize: "$8",
  fontWeight: "700",
})

const HeadingH1 = forwardRef<TamaguiTextElement, TextProps>((props, ref) => {
  return (
    <StyledH1 {...props} ref={ref}>
      {props.children}
    </StyledH1>
  )
})
HeadingH1.displayName = "HeadingH1"

// H2 - Size 7
const StyledH2 = styled(TamaguiH2, {
  fontFamily: "$heading",
  fontSize: "$7",
  fontWeight: "700",
})

const HeadingH2 = forwardRef<TamaguiTextElement, TextProps>((props, ref) => {
  return <StyledH2 {...props} ref={ref} />
})
HeadingH2.displayName = "HeadingH2"

// H3 - Size 6
const StyledH3 = styled(TamaguiH3, {
  fontFamily: "$heading",
  fontSize: "$6",
  fontWeight: "700",
})

const HeadingH3 = forwardRef<TamaguiTextElement, TextProps>((props, ref) => {
  return <StyledH3 {...props} ref={ref} />
})
HeadingH3.displayName = "HeadingH3"

// H4 - Size 5
const StyledH4 = styled(TamaguiH4, {
  fontFamily: "$heading",
  fontSize: "$5",
  fontWeight: "600",
})

const HeadingH4 = forwardRef<TamaguiTextElement, TextProps>((props, ref) => {
  return <StyledH4 {...props} ref={ref} />
})
HeadingH4.displayName = "HeadingH4"

// H5 - Size 4
const StyledH5 = styled(TamaguiH5, {
  fontFamily: "$heading",
  fontSize: "$4",
  fontWeight: "500",
})

const HeadingH5 = forwardRef<TamaguiTextElement, TextProps>((props, ref) => {
  return <StyledH5 {...props} ref={ref} />
})
HeadingH5.displayName = "HeadingH5"

// H6 - Size 3
const StyledH6 = styled(TamaguiH6, {
  fontFamily: "$heading",
  fontSize: "$3",
  fontWeight: "500",
})

const HeadingH6 = forwardRef<TamaguiTextElement, TextProps>((props, ref) => {
  return <StyledH6 {...props} ref={ref} />
})
HeadingH6.displayName = "HeadingH6"

// Export individual components
export const H1 = HeadingH1
export const H2 = HeadingH2
export const H3 = HeadingH3
export const H4 = HeadingH4
export const H5 = HeadingH5
export const H6 = HeadingH6

// Export namespace
export const Heading = {
  H1: HeadingH1,
  H2: HeadingH2,
  H3: HeadingH3,
  H4: HeadingH4,
  H5: HeadingH5,
  H6: HeadingH6,
}
