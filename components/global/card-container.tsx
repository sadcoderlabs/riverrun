import React, { ReactNode } from 'react';
import { styled, YStack, YStackProps } from 'tamagui';

export interface CardContainerProps extends YStackProps {
  children: ReactNode;
}

const StyledCard = styled(YStack, {
  backgroundColor: '$background',
  borderRadius: '$6',
  borderWidth: 1,
  borderColor: '$borderColor',
  padding: '$4',
  shadowColor: '$shadowColor',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 8,
  elevation: 2,
  overflow: 'hidden',
});

export function CardContainer({ children, ...props }: CardContainerProps) {
  return <StyledCard {...props}>{children}</StyledCard>;
}
