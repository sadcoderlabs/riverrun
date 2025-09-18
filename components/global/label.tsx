import { Label as TamaguiLabel, styled, GetProps, GetRef } from 'tamagui';
import React, { forwardRef } from 'react';

// Styled Label component
const StyledLabel = styled(TamaguiLabel, {
  fontSize: '$2',
  color: '$color06',
});

// Props interface for the Label component
export type LabelProps = GetProps<typeof StyledLabel>;

// Label component using forwardRef
const LabelBase = forwardRef<GetRef<typeof StyledLabel>, LabelProps>((props, ref) => {
  return <StyledLabel ref={ref} unstyled {...props} />;
});
LabelBase.displayName = 'LabelBase';

// Export the Label component
export const Label = LabelBase;
