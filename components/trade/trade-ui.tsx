import { ChevronDown } from '@tamagui/lucide-icons';
import { usePathname, useRouter } from 'expo-router';
import { useState } from 'react';
import { Adapt, Button, Select, Sheet, Slider, Text, XStack, YStack } from 'tamagui';

interface TradeUIProps {
  marketId?: string;
}

export function TradeUI({ marketId }: TradeUIProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Mock market data (similar to what's in the index.tsx)
  const marketData = {
    id: marketId || 'BTC-USD',
    price: 28450.75,
    priceChange: 2.34,
    fundingRate: 0.0012,
    annualizedFunding: 10.95,
  };

  // State for the order form
  const [collateralMode, setCollateralMode] = useState('Cross');
  const [leverage, setLeverage] = useState('5x');
  const [orderType, setOrderType] = useState('Market');
  const [sizeUnit, setSizeUnit] = useState('USDC');
  const [orderSide, setOrderSide] = useState<'Long' | 'Short' | null>(null);
  const [sizePercentage, setSizePercentage] = useState(0);

  // Calculate order details
  const accountBalance = 1000; // Mock account balance
  const tradableAmount = accountBalance * (sizePercentage / 100);
  const margin = tradableAmount / Number(leverage.replace('x', ''));
  const liquidationPrice =
    orderSide === 'Long'
      ? marketData.price * 0.8 // Simplified calculation for demo
      : marketData.price * 1.2;

  // Determine which tab is active based on the current path
  // For Trade tab, it should be active by default when not on other tabs
  const isPositionsActive = pathname.includes('/positions');
  const isOrdersActive = pathname.includes('/orders');
  const isHistoryActive = pathname.includes('/history');
  const isTradeActive = !isPositionsActive && !isOrdersActive && !isHistoryActive;

  // Navigate to the appropriate tab
  const navigateToTab = (tab: string) => {
    if (!marketId) return;

    switch (tab) {
      case 'trade':
        router.push(`/(main)/trade/${marketId}/(tab)`);
        break;
      case 'positions':
        router.push(`/(main)/trade/${marketId}/(tab)/positions`);
        break;
      case 'orders':
        router.push(`/(main)/trade/${marketId}/(tab)/orders`);
        break;
      case 'history':
        router.push(`/(main)/trade/${marketId}/(tab)/history`);
        break;
    }
  };

  // Format number with 2 decimal places
  const formatNumber = (num: number) => {
    return num.toFixed(2);
  };

  // Convert order size between USDC and asset based on current unit
  const convertOrderSize = (amount: number): string => {
    if (amount === 0) return '0.00';

    const assetSymbol = marketData.id.split('-')[0];

    if (sizeUnit === 'USDC') {
      // Convert from USDC to asset (e.g., BTC, ETH)
      const assetAmount = amount / marketData.price;
      return `≈ ${assetAmount.toFixed(4)} ${assetSymbol}`;
    } else {
      // When unit is asset, just show the USDC value directly
      return `${formatNumber(amount)} USDC`;
    }
  };

  return (
    <YStack flex={1} padding="$0">
      {/* Tab Navigation */}
      <XStack borderBottomWidth={1} borderBottomColor="$borderColor">
        <TabItem label="Trade" isActive={isTradeActive} onPress={() => navigateToTab('trade')} />
        <TabItem
          label="Positions"
          isActive={isPositionsActive}
          onPress={() => navigateToTab('positions')}
        />
        <TabItem label="Orders" isActive={isOrdersActive} onPress={() => navigateToTab('orders')} />
        <TabItem
          label="History"
          isActive={isHistoryActive}
          onPress={() => navigateToTab('history')}
        />
      </XStack>

      {/* Trade UI Content */}
      <YStack flex={1} padding="$4" gap="$4">
        {/* First Stack: 2x3 Grid */}
        <YStack gap="$3">
          <XStack gap="$3">
            {/* Collateral Mode Selector */}
            <SelectBox
              value={collateralMode}
              onValueChange={setCollateralMode}
              items={[
                { value: 'Cross', label: 'Cross' },
                { value: 'Isolated', label: 'Isolated' },
              ]}
              placeholder="Cross"
              flex={1}
            />

            {/* Leverage Selector */}
            <SelectBox
              value={leverage}
              onValueChange={setLeverage}
              items={[
                { value: '1x', label: '1x' },
                { value: '2x', label: '2x' },
                { value: '3x', label: '3x' },
                { value: '5x', label: '5x' },
                { value: '10x', label: '10x' },
                { value: '20x', label: '20x' },
              ]}
              placeholder="5x"
              flex={1}
            />
          </XStack>

          <XStack gap="$3">
            {/* Long Button */}
            <Button
              flex={1}
              backgroundColor={orderSide === 'Long' ? '$green9' : 'transparent'}
              borderColor={orderSide === 'Long' ? 'transparent' : '$green9'}
              borderWidth={1}
              paddingVertical="$1"
              onPress={() => setOrderSide('Long')}
              borderRadius="$4"
              opacity={orderSide === 'Long' ? 1 : 0.4}
            >
              <Text
                fontFamily="$interSemiBold"
                fontSize="$3"
                color={orderSide === 'Long' ? '$green1' : '$green9'}
                textAlign="center"
              >
                Long
              </Text>
            </Button>

            {/* Short Button */}
            <Button
              flex={1}
              backgroundColor={orderSide === 'Short' ? '$red9' : 'transparent'}
              borderColor={orderSide === 'Short' ? 'transparent' : '$red9'}
              borderWidth={1}
              paddingVertical="$1"
              onPress={() => setOrderSide('Short')}
              borderRadius="$4"
              opacity={orderSide === 'Short' ? 1 : 0.4}
            >
              <Text
                fontFamily="$interSemiBold"
                fontSize="$3"
                color={orderSide === 'Short' ? '$red1' : '$red9'}
                textAlign="center"
              >
                Short
              </Text>
            </Button>
          </XStack>

          <XStack gap="$3">
            {/* Order Type Selector */}
            <SelectBox
              value={orderType}
              onValueChange={setOrderType}
              items={[
                { value: 'Market', label: 'Market' },
                { value: 'Limit', label: 'Limit' },
              ]}
              placeholder="Market"
              flex={1}
            />

            {/* Size Unit Selector */}
            <SelectBox
              value={sizeUnit}
              onValueChange={setSizeUnit}
              items={[
                { value: 'USDC', label: 'USDC' },
                { value: marketData.id.split('-')[0], label: marketData.id.split('-')[0] },
              ]}
              placeholder="USDC"
              flex={1}
            />
          </XStack>
        </YStack>

        {/* Second Stack: Size Slider */}
        <YStack gap="$2">
          <Text fontSize="$3" color="$color" textAlign="center">
            {sizePercentage === 0 ? '0' : Math.round(sizePercentage)}%{' '}
            {sizePercentage > 0 ? convertOrderSize(tradableAmount) : ''}
          </Text>
          <Slider
            defaultValue={[0]}
            max={100}
            step={1}
            onValueChange={values => setSizePercentage(values[0])}
          >
            <Slider.Track backgroundColor="$accent1">
              <Slider.TrackActive backgroundColor="$accent9" />
            </Slider.Track>
            <Slider.Thumb
              index={0}
              size="$1"
              backgroundColor="$accent1"
              borderWidth={1}
              borderColor="$accent9"
              circular
            />
          </Slider>
        </YStack>

        {/* Third Stack: Order Information */}
        <YStack backgroundColor="$gray3" padding="$4" borderRadius="$4" gap="$3">
          <XStack justifyContent="space-between">
            <Text color="$color" fontSize="$4">
              Tradable
            </Text>
            <Text color="$color" fontSize="$4" fontFamily="$interSemiBold">
              {formatNumber(accountBalance)} USDC
            </Text>
          </XStack>

          <XStack justifyContent="space-between">
            <Text color="$color" fontSize="$4">
              Margin
            </Text>
            <Text color="$color" fontSize="$4" fontFamily="$interSemiBold">
              {formatNumber(margin)} USDC
            </Text>
          </XStack>

          <XStack justifyContent="space-between">
            <Text color="$color" fontSize="$4">
              Liq. Price
            </Text>
            <Text color="$color" fontSize="$4" fontFamily="$interSemiBold">
              {orderSide ? `${formatNumber(liquidationPrice)} USDC` : '--'}
            </Text>
          </XStack>
        </YStack>

        {/* Fourth Stack: Place Order Button */}
        <Button
          backgroundColor="$accent9"
          paddingVertical="$1"
          borderRadius="$4"
          marginTop="auto"
          disabled={!orderSide}
          opacity={orderSide ? 1 : 0.7}
        >
          <Text fontFamily="$interSemiBold" color="$color1" fontSize="$4" textAlign="center">
            Place Order
          </Text>
        </Button>
      </YStack>
    </YStack>
  );
}

// Tab Item Component
interface TabItemProps {
  label: string;
  isActive: boolean;
  onPress: () => void;
}

function TabItem({ label, isActive, onPress }: TabItemProps) {
  return (
    <XStack
      flex={1}
      paddingVertical="$3"
      justifyContent="center"
      alignItems="center"
      onPress={onPress}
      pressStyle={{ opacity: 0.7 }}
      borderBottomWidth={isActive ? 2 : 0}
      borderBottomColor={isActive ? '$accent9' : 'transparent'}
    >
      <Text
        fontFamily={isActive ? '$interSemiBold' : '$interRegular'}
        fontSize="$4"
        color={isActive ? '$accent9' : '$color'}
      >
        {label}
      </Text>
    </XStack>
  );
}

// SelectBox Component for dropdown selectors
interface SelectBoxProps {
  value: string;
  onValueChange: (value: string) => void;
  items: { value: string; label: string }[];
  placeholder: string;
  flex?: number;
}

function SelectBox({ value, onValueChange, items, placeholder, flex }: SelectBoxProps) {
  return (
    <Select value={value} onValueChange={onValueChange} defaultValue={items[0]?.value}>
      <Select.Trigger flex={flex} backgroundColor="$gray3" borderRadius="$4" paddingVertical="$3">
        <Select.Value placeholder={placeholder} />
        <ChevronDown size="$1" color="$color" />
      </Select.Trigger>

      <Adapt when="sm" platform="touch">
        <Sheet modal dismissOnSnapToBottom>
          <Sheet.Frame padding="$4">
            <Sheet.ScrollView>
              <Adapt.Contents />
            </Sheet.ScrollView>
          </Sheet.Frame>
          <Sheet.Overlay />
        </Sheet>
      </Adapt>

      <Select.Content zIndex={200000}>
        <Select.ScrollUpButton
          alignItems="center"
          justifyContent="center"
          position="relative"
          width="100%"
          height="$3"
        >
          <ChevronDown size="$1" color="$color" style={{ transform: [{ rotate: '180deg' }] }} />
        </Select.ScrollUpButton>

        <Select.Viewport minWidth={200}>
          <Select.Group>
            {items.map(item => (
              <Select.Item key={item.value} index={0} value={item.value}>
                <Select.ItemText>{item.label}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Group>
        </Select.Viewport>

        <Select.ScrollDownButton
          alignItems="center"
          justifyContent="center"
          position="relative"
          width="100%"
          height="$3"
        >
          <ChevronDown size="$1" color="$color" />
        </Select.ScrollDownButton>
      </Select.Content>
    </Select>
  );
}
