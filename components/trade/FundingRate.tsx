import { useActiveAssetCtx } from '@/lib/hyperliquid/hooks/useActiveAssetCtx';
import { useMarketsStore } from '@/lib/riverrun/market';
import { Info } from '@tamagui/lucide-icons';
import { useEffect, useMemo, useState } from 'react';
import { Button, Popover, Text, XStack, YStack } from 'tamagui';

/**
 * FundingRate component - displays the current funding rate for the selected market
 *
 * Positioned above the OrderBook to provide key market information
 * Shows hourly funding rate with countdown to next payment
 */
export function FundingRate() {
  const { selectedMarket } = useMarketsStore();
  const coin = selectedMarket?.coin || 'BTC';

  // Popover state
  const [fundingPopoverOpen, setFundingPopoverOpen] = useState(false);

  // Countdown state
  const [timeUntilNextFunding, setTimeUntilNextFunding] = useState('');

  // Subscribe to real-time asset context data
  const { data: assetCtx } = useActiveAssetCtx({ coin });

  // Calculate funding rate from real-time WebSocket data
  const fundingRate = useMemo(() => {
    if (!assetCtx) {
      return 0;
    }

    const funding = parseFloat(assetCtx.ctx.funding);
    // Convert funding to percentage (funding is already a decimal, multiply by 100)
    return funding * 100;
  }, [assetCtx]);

  // Determine if funding rate is positive or negative
  const isFundingPositive = fundingRate >= 0;

  // Countdown timer to next hour
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const nextHour = new Date(now);
      nextHour.setHours(now.getHours() + 1, 0, 0, 0);

      const diff = nextHour.getTime() - now.getTime();
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);

      setTimeUntilNextFunding(
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
      );
    };

    // Update immediately
    updateCountdown();

    // Update every second
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <YStack
      paddingHorizontal="$1.5"
      paddingTop="$0"
      paddingBottom="$1.5"
      paddingLeft="$3.5"
      justifyContent="center"
      alignItems="flex-start"
      backgroundColor="$background"
      gap="$0.5"
    >
      {/* First line: Funding label with info icon */}
      <XStack alignItems="center" gap="$1">
        <Text fontFamily="$interRegular" fontSize="$2" color="$gray10">
          Funding
        </Text>
        <Popover
          size="$5"
          allowFlip
          placement="bottom"
          open={fundingPopoverOpen}
          onOpenChange={setFundingPopoverOpen}
        >
          <Popover.Trigger asChild>
            <Button
              size="$1"
              chromeless
              circular
              padding="$0.5"
              onPress={() => setFundingPopoverOpen(!fundingPopoverOpen)}
              pressStyle={{ opacity: 0.7 }}
            >
              <Info size={12} color="$gray10" />
            </Button>
          </Popover.Trigger>

          <Popover.Content
            borderWidth={1}
            borderColor="$borderColor"
            backgroundColor="$background"
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
            <Popover.Arrow
              borderWidth={1}
              borderColor="$borderColor"
              backgroundColor="$background"
            />
            <YStack padding="$2" gap="$1" maxWidth={240}>
              <Text fontSize="$3" fontFamily="$interSemiBold" color="$color">
                Funding Rate
              </Text>
              <Text fontSize="$2" lineHeight="$2" color="$gray11">
                The hourly rate at which longs pay shorts (if negative, shorts pay longs).
              </Text>
              <Text fontSize="$2" lineHeight="$2" color="$gray11" marginTop="$1">
                There are no fees associated with funding, which is a peer-to-peer transfer between
                users to push prices towards the spot price.
              </Text>
            </YStack>
          </Popover.Content>
        </Popover>
      </XStack>

      {/* Second line: Rate / Countdown */}
      <XStack alignItems="center" gap="$1">
        <Text
          fontFamily="$interSemiBold"
          fontSize="$3"
          color={isFundingPositive ? '$green9' : '$red9'}
        >
          {fundingRate.toFixed(4)}%
        </Text>
        <Text fontFamily="$interRegular" fontSize="$3" color="$gray10">
          /
        </Text>
        <Text fontFamily="$interMedium" fontSize="$3" color="$color">
          {timeUntilNextFunding}
        </Text>
      </XStack>
    </YStack>
  );
}
