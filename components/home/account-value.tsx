import { Eye, EyeOff } from '@tamagui/lucide-icons';
import React, { useState } from 'react';
import { Text, XStack, useTheme } from 'tamagui';
import { CardContainer } from '../global/card-container';

interface AccountValueProps {
  value: number;
}

export function AccountValue({ value }: AccountValueProps) {
  const [isHidden, setIsHidden] = useState(false);
  const theme = useTheme();

  const toggleVisibility = () => {
    setIsHidden(!isHidden);
  };

  const formattedValue = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);

  return (
    <CardContainer>
      <XStack alignItems="center" justifyContent="space-between" marginBottom="$2">
        <Text color="$color9" fontFamily="$interMedium" fontSize="$3">
          Account Value
        </Text>
        <XStack
          pressStyle={{ opacity: 0.7 }}
          onPress={toggleVisibility}
          padding="$1"
          borderRadius="$2"
          bg="$background02"
        >
          {isHidden ? (
            <EyeOff size={18} color={theme.color9} />
          ) : (
            <Eye size={18} color={theme.color9} />
          )}
        </XStack>
      </XStack>
      <Text fontFamily="$interSemiBold" fontSize="$7">
        {isHidden ? '••••••' : formattedValue}
      </Text>
    </CardContainer>
  );
}
