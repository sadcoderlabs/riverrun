import { SizableText as TamaguiText, styled, TamaguiTextElement } from 'tamagui';
import React, { forwardRef } from 'react';

// Define prop types upfront
import type { TextProps as TamaguiTextProps } from 'tamagui';
export type TextProps = TamaguiTextProps;

// Text - Size 4 (Body)
const StyledText = styled(TamaguiText, {
  fontFamily: '$body',
  fontSize: '$4',
  lineHeight: '$4',
  fontWeight: '400',
});

const TextBase = forwardRef<TamaguiTextElement, TextProps>((props, ref) => {
  return <StyledText {...props} ref={ref} />;
});
TextBase.displayName = 'TextBase';

// Text.Caption - Size 1
const StyledCaption = styled(TamaguiText, {
  fontFamily: '$body',
  lineHeight: '$1',
  fontSize: '$1',
  fontWeight: '400',
});

const TextCaption = forwardRef<TamaguiTextElement, TextProps>((props, ref) => {
  return <StyledCaption {...props} ref={ref} />;
});
TextCaption.displayName = 'TextCaption';

// Text.Footnote - Size 2
const StyledFootnote = styled(TamaguiText, {
  fontFamily: '$body',
  fontSize: '$2',
  fontWeight: '400',
  lineHeight: '$2',
  color: '$color06',
});

const TextFootnote = forwardRef<TamaguiTextElement, TextProps>((props, ref) => {
  return <StyledFootnote {...props} ref={ref} />;
});
TextFootnote.displayName = 'TextFootnote';

// Text.Subhead - Size 3
const StyledSubhead = styled(TamaguiText, {
  fontFamily: '$body',
  fontSize: '$3',
  lineHeight: '$3',
  fontWeight: '400',
});

const TextSubhead = forwardRef<TamaguiTextElement, TextProps>((props, ref) => {
  return <StyledSubhead {...props} ref={ref} />;
});
TextSubhead.displayName = 'TextSubhead';

// Export individual components
export const Text = Object.assign(TextBase, {
  Caption: TextCaption,
  Footnote: TextFootnote,
  Subhead: TextSubhead,
});
