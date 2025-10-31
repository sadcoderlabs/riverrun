import { Eye, EyeOff, Info } from '@tamagui/lucide-icons';
import React, { useState } from 'react';
import { Button, Popover, Spinner, Text, XStack, YStack, useTheme } from 'tamagui';
import { CardContainer } from '../global/card-container';
import { useWebData2 } from '@/lib/hyperliquid/hooks';

export function AccountEquity() {
  const [isHidden, setIsHidden] = useState(false);
  const [perpsPopoverOpen, setPerpsPopoverOpen] = useState(false);
  const theme = useTheme();
  const { totalAccountValue, perpAccountValue, spotAccountValue, isLoading, error } = useWebData2();

  const toggleVisibility = () => {
    setIsHidden(!isHidden);
  };

  const formatCurrency = (value: number | undefined) => {
    if (value === undefined) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  return (
    <CardContainer>
      <XStack alignItems="center" justifyContent="space-between" marginBottom="$3">
        <Text color="$color9" fontFamily="$interMedium" fontSize="$3">
          Account Equity
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

      {isLoading ? (
        <XStack alignItems="center" gap="$2">
          <Spinner size="small" color="$color9" />
          <Text fontSize="$5" color="$color9">
            Loading...
          </Text>
        </XStack>
      ) : error ? (
        <Text fontSize="$5" color="$red10">
          Failed to load
        </Text>
      ) : (
        <YStack gap="$2">
          {/* Total Account Value */}
          <YStack>
            <Text color="$color9" fontSize="$2" fontFamily="$interMedium">
              Total Account Value
            </Text>
            <Text fontFamily="$interSemiBold" fontSize="$7" marginTop="$1">
              {isHidden ? '••••••' : formatCurrency(totalAccountValue)}
            </Text>
          </YStack>

          {/* Divider */}
          <YStack height={1} backgroundColor="$gray5" marginVertical="$2" />

          {/* Spot and Perps breakdown */}
          <YStack gap="$2">
            <XStack justifyContent="space-between" alignItems="center">
              <Text color="$color9" fontSize="$3" fontFamily="$interMedium">
                Spot
              </Text>
              <Text fontFamily="$interMedium" fontSize="$4">
                {isHidden ? '••••••' : formatCurrency(spotAccountValue)}
              </Text>
            </XStack>

            <XStack justifyContent="space-between" alignItems="center">
              <XStack alignItems="center" gap="$1.5">
                <Text color="$color9" fontSize="$3" fontFamily="$interMedium">
                  Perps
                </Text>
                <Popover
                  size="$5"
                  allowFlip
                  placement="top"
                  open={perpsPopoverOpen}
                  onOpenChange={setPerpsPopoverOpen}
                >
                  <Popover.Trigger asChild>
                    <Button
                      size="$1"
                      chromeless
                      circular
                      padding="$1"
                      onPress={() => setPerpsPopoverOpen(!perpsPopoverOpen)}
                      pressStyle={{ opacity: 0.7 }}
                    >
                      <Info size={14} color="$color9" />
                    </Button>
                  </Popover.Trigger>

                  <Popover.Content
                    borderWidth={1}
                    borderColor="$borderColor"
                    enterStyle={{ y: -10, opacity: 0 }}
                    exitStyle={{ y: -10, opacity: 0 }}
                    elevate
                    animation={[
                      'quick',
                      {
                        opacity: {
                          overshootClamping: true,
                        },
                      },
                    ]}
                  >
                    <Popover.Arrow borderWidth={1} borderColor="$borderColor" />
                    <YStack padding="$3" gap="$2" maxWidth={280}>
                      <Text fontSize="$3" lineHeight="$3">
                        Balance + Unrealized PNL (approximate account value if all positions were
                        closed)
                      </Text>
                    </YStack>
                  </Popover.Content>
                </Popover>
              </XStack>
              <Text fontFamily="$interMedium" fontSize="$4">
                {isHidden ? '••••••' : formatCurrency(perpAccountValue)}
              </Text>
            </XStack>
          </YStack>
        </YStack>
      )}
    </CardContainer>
  );
}
