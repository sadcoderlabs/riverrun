import React, { useState } from 'react';
import { Spinner, Text, XStack, YStack, Popover, Button } from 'tamagui';
import { Info } from '@tamagui/lucide-icons';
import { CardContainer } from '../global/card-container';
import { useWebData2Context } from '@/lib/hyperliquid/context/WebData2Context';

interface MetricRowProps {
  label: string;
  value: string;
  valueColor?: '$color' | '$green9' | '$red9';
  tooltip?: string;
}

function MetricRow({ label, value, valueColor = '$color', tooltip }: MetricRowProps) {
  const [open, setOpen] = useState(false);

  return (
    <XStack justifyContent="space-between" alignItems="center">
      <XStack alignItems="center" gap="$1.5">
        <Text color="$color9" fontSize="$3" fontFamily="$interMedium">
          {label}
        </Text>
        {tooltip && (
          <Popover size="$5" allowFlip placement="top" open={open} onOpenChange={setOpen}>
            <Popover.Trigger asChild>
              <Button
                size="$1"
                chromeless
                circular
                padding="$1"
                onPress={() => setOpen(!open)}
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
                  {tooltip}
                </Text>
              </YStack>
            </Popover.Content>
          </Popover>
        )}
      </XStack>
      <Text fontFamily="$interMedium" fontSize="$4" color={valueColor}>
        {value}
      </Text>
    </XStack>
  );
}

export function PerpsOverview() {
  const {
    perpBalance,
    unrealizedPnl,
    crossMarginRatio,
    maintenanceMargin,
    crossAccountLeverage,
    isLoading,
    error,
  } = useWebData2Context();

  const formatCurrency = (value: number | undefined) => {
    if (value === undefined) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatPercentage = (value: number | undefined) => {
    if (value === undefined) return '0.00%';
    return `${value.toFixed(2)}%`;
  };

  const formatLeverage = (value: number | undefined) => {
    if (value === undefined) return '0.00x';
    return `${value.toFixed(2)}x`;
  };

  const getPnlColor = (pnl: number | undefined): '$color' | '$green9' | '$red9' => {
    if (pnl === undefined) return '$color';
    return pnl >= 0 ? '$green9' : '$red9';
  };

  const formatPnl = (pnl: number | undefined) => {
    if (pnl === undefined) return '$0.00';
    const formatted = formatCurrency(pnl);
    return pnl >= 0 ? `+${formatted}` : formatted;
  };

  return (
    <CardContainer>
      <Text color="$color9" fontFamily="$interMedium" fontSize="$3" marginBottom="$3">
        Perps Overview
      </Text>

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
        <YStack gap="$2.5">
          <MetricRow
            label="Balance"
            value={formatCurrency(perpBalance)}
            tooltip="Total Net transfers + Total realized PnL + Total net funding fee"
          />

          <MetricRow
            label="Unrealized PNL"
            value={formatPnl(unrealizedPnl)}
            valueColor={getPnlColor(unrealizedPnl)}
            tooltip="The profit or loss from your current open positions that hasn't been realized yet"
          />

          <MetricRow
            label="Cross Margin Ratio"
            value={formatPercentage(crossMarginRatio)}
            tooltip="Maintenance Margin / Portfolio Value. Your cross positions will be liquidated if margin ratio reaches 100%"
          />

          <MetricRow
            label="Maintenance Margin"
            value={formatCurrency(maintenanceMargin)}
            tooltip="The minimum portfolio value required to keep your cross positions open"
          />

          <MetricRow
            label="Cross Account Leverage"
            value={formatLeverage(crossAccountLeverage)}
            tooltip="Total cross positions value / Cross account value"
          />
        </YStack>
      )}
    </CardContainer>
  );
}
