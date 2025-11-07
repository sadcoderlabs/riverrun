import * as hl from '@nktkas/hyperliquid';
import React, { useMemo } from 'react';
import type { GetThemeValueForKey } from 'tamagui';
import { Text, XStack, YStack } from 'tamagui';
import { Button } from './Button';

import { CardContainer, CardContainerProps } from './CardContainer';

type ColorToken = GetThemeValueForKey<'color'>;

interface LabelValueProps {
  label: string;
  value: string;
  emphasize?: boolean;
  valueColor?: ColorToken;
}

const LabelValue = ({ label, value, emphasize = false, valueColor }: LabelValueProps) => {
  return (
    <XStack alignItems="center" justifyContent="space-between">
      <Text color="$color9" fontSize="$2">
        {label}
      </Text>
      <Text
        fontSize="$2"
        fontFamily={emphasize ? '$interSemiBold' : '$interMedium'}
        color={valueColor ?? '$color'}
      >
        {value}
      </Text>
    </XStack>
  );
};

const SideBadge = ({ side }: { side: 'Buy' | 'Sell' | string }) => {
  const isBuy = side === 'Buy';
  const badgeColor = isBuy ? '$green9' : '$red9';
  const badgeBackground = isBuy ? '$green2' : '$red2';

  return (
    <XStack
      px="$2"
      py="$1"
      borderRadius="$5"
      alignItems="center"
      borderWidth={1}
      borderColor={badgeColor}
      backgroundColor={badgeBackground}
    >
      <Text fontSize="$1" color={badgeColor} fontFamily="$interSemiBold">
        {side}
      </Text>
    </XStack>
  );
};

const formatNumber = (value: number | string | undefined, decimals = 4) => {
  if (value === undefined || value === null) {
    return '-';
  }

  const numericValue = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(numericValue)) {
    return '-';
  }

  return numericValue.toFixed(decimals);
};

const formatTimestamp = (timestamp?: number) => {
  if (!timestamp) {
    return '-';
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}`;
};

const formatSide = (side: string | undefined) => {
  const normalized = side?.toUpperCase();
  if (normalized === 'B' || normalized === 'BUY') {
    return 'Buy';
  }

  if (normalized === 'A' || normalized === 'SELL' || normalized === 'S') {
    return 'Sell';
  }

  return side ?? '-';
};

type BorderColorToken = GetThemeValueForKey<'borderColor'>;
type BackgroundColorToken = GetThemeValueForKey<'backgroundColor'>;

export interface OrderItemProps extends Omit<CardContainerProps, 'children'> {
  order: hl.OpenOrdersResponse[number];
  onCancel?: (order: hl.OpenOrdersResponse[number]) => void;
  isCanceling?: boolean;
  cancelDisabled?: boolean;
  cancelLabel?: string;
  agentApprovalState?: 'approved' | 'needsApproval' | 'unknown';
}

export function OrderItem({
  order,
  onCancel,
  isCanceling = false,
  cancelDisabled = false,
  cancelLabel = 'Cancel Order',
  agentApprovalState = 'unknown',
  ...cardProps
}: OrderItemProps) {
  const {
    sideLabel,
    isBuy,
    priceDisplay,
    sizeDisplay,
    valueDisplay,
    timestampDisplay,
    priceLabel,
    isTriggerOrder,
  } = useMemo(() => {
    const sideLabel = formatSide(order.side);
    const isBuy = sideLabel === 'Buy';
    const priceDisplay = formatNumber(order.limitPx);
    const sizeDisplay = formatNumber(order.sz);

    const numericPrice = Number(order.limitPx);
    const numericSize = Number(order.sz);
    const isZeroSize = Number.isFinite(numericSize) && numericSize === 0;
    const isTriggerOrder = isZeroSize && Number.isFinite(numericPrice);

    const value =
      !isTriggerOrder && Number.isFinite(numericPrice * numericSize)
        ? `$${(numericPrice * numericSize).toFixed(2)}`
        : '-';

    return {
      sideLabel,
      isBuy,
      priceDisplay: priceDisplay === '-' ? '-' : `$${priceDisplay}`,
      sizeDisplay,
      valueDisplay: value,
      timestampDisplay: formatTimestamp(order.timestamp),
      priceLabel: isTriggerOrder ? 'Trigger Price' : 'Price',
      isTriggerOrder,
    };
  }, [order.limitPx, order.side, order.sz, order.timestamp]);

  const accentColor = (isBuy ? '$green10' : '$red10') as ColorToken;
  const disableCancel = cancelDisabled || isCanceling || !onCancel;

  const cancelColors = useMemo<{
    background: BackgroundColorToken | undefined;
    border: BorderColorToken | undefined;
    text: ColorToken | undefined;
  }>(() => {
    switch (agentApprovalState) {
      case 'approved':
        return {
          background: '$accent9' as BackgroundColorToken,
          border: '$accent9' as BorderColorToken,
          text: '$accent1' as ColorToken,
        };
      case 'needsApproval':
        return {
          background: '$gray6' as BackgroundColorToken,
          border: '$gray7' as BorderColorToken,
          text: '$color12' as ColorToken,
        };
      default:
        return {
          background: '$background' as BackgroundColorToken,
          border: '$borderColor' as BorderColorToken,
          text: '$color' as ColorToken,
        };
    }
  }, [agentApprovalState]);

  return (
    <CardContainer gap="$4" {...cardProps}>
      <XStack justifyContent="space-between" alignItems="center">
        <XStack alignItems="center" gap="$2">
          <Text fontSize="$4" fontFamily="$interSemiBold">
            {order.coin}
          </Text>
          {sideLabel ? <SideBadge side={sideLabel} /> : null}
        </XStack>
        <Text color="$color9" fontSize="$1">
          {timestampDisplay}
        </Text>
      </XStack>

      <YStack gap="$2">
        <LabelValue label={priceLabel} value={priceDisplay} emphasize />
        {isTriggerOrder ? null : <LabelValue label="Size" value={sizeDisplay} />}
        {isTriggerOrder ? null : (
          <LabelValue label="Value" value={valueDisplay} emphasize valueColor={accentColor} />
        )}
        <LabelValue label="Order ID" value={String(order.oid)} />
      </YStack>

      {onCancel ? (
        <XStack justifyContent="flex-end">
          <Button.Gray
            level="sm"
            fontSize="$2"
            borderRadius="$10"
            borderColor={cancelColors.border}
            color={cancelColors.text}
            backgroundColor={cancelColors.background}
            borderWidth={1}
            disabled={disableCancel}
            onPress={() => {
              onCancel(order);
            }}
            pressStyle={{ opacity: 0.7 }}
          >
            {isCanceling ? 'Canceling...' : cancelLabel}
          </Button.Gray>
        </XStack>
      ) : null}
    </CardContainer>
  );
}
