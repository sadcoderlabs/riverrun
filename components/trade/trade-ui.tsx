import AdaptiveSelect from '@/components/global/adaptive-select';
import { ChevronDown } from '@tamagui/lucide-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';
import { Button, Slider, Text, XStack, YStack } from 'tamagui';

interface TradeUIProps {
  marketId?: string;
}

export function TradeUI({ marketId }: TradeUIProps) {
  const router = useRouter();

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
  const [orderSide, setOrderSide] = useState<'Long' | 'Short'>('Long');
  const [sizePercentage, setSizePercentage] = useState(0);

  // Calculate order details
  const accountBalance = 1000; // Mock account balance
  const margin = accountBalance * (sizePercentage / 100); // Margin is the amount user is willing to risk
  const leverageFactor = Number(leverage.replace('x', ''));
  const orderSize = margin * leverageFactor; // Total position size including leverage
  const liquidationPrice =
    orderSide === 'Long'
      ? marketData.price * 0.8 // Simplified calculation for demo
      : marketData.price * 1.2;

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

  // ordersize calculation
  const calcOrderSize = (marginAmount: number): string => {
    if (marginAmount === 0) return '0.00';

    const assetSymbol = marketData.id.split('-')[0];
    const leverageFactor = Number(leverage.replace('x', ''));
    const totalOrderSize = marginAmount * leverageFactor;
    const assetAmount = totalOrderSize / marketData.price;

    return `≈ ${assetAmount.toFixed(4)} ${assetSymbol} (${formatNumber(marginAmount)} USDC margin × ${leverage} = ${formatNumber(totalOrderSize)} USDC position)`;
  };

  return (
    <YStack flex={1} padding="$0">
      {/* Tab Navigation */}
      <XStack borderBottomWidth={1} borderBottomColor="$borderColor">
        <TabItem label="Trade" isActive={true} onPress={() => navigateToTab('trade')} />
        <TabItem label="Positions" isActive={false} onPress={() => navigateToTab('positions')} />
        <TabItem label="Orders" isActive={false} onPress={() => navigateToTab('orders')} />
        <TabItem label="History" isActive={false} onPress={() => navigateToTab('history')} />
      </XStack>

      {/* Trade UI Content */}
      <YStack flex={1} padding="$4" gap="$4">
        {/* First Stack: 2x3 Grid */}
        <YStack gap="$3">
          <XStack gap="$3">
            {/* Margin Type */}
            <SelectBox
              title="Margin Type"
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
              title="Leverage"
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
              title="Order Type"
              value={orderType}
              onValueChange={setOrderType}
              items={[
                { value: 'Market', label: 'Market' },
                { value: 'Limit', label: 'Limit' },
              ]}
              placeholder="Market"
              flex={1}
            />

            {/* Order Size Preference */}
            <SelectBox
              title="Order Size"
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
        <YStack gap="$2" py="$2">
          <XStack alignItems="center" justifyContent="space-between">
            <Text>{sizePercentage === 0 ? '0' : Math.round(sizePercentage)}% </Text>
            <Text fontSize="$3" color="$color" textAlign="center" paddingBottom="$2">
              {sizePercentage === 0
                ? `Available: ${formatNumber(accountBalance)} USDC`
                : `${formatNumber(accountBalance * (sizePercentage / 100))} USDC`}
            </Text>
          </XStack>
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
        <YStack backgroundColor="$gray3" padding="$2" borderRadius="$4" gap="$3">
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
              Order Size
            </Text>
            <Text color="$color" fontSize="$4" fontFamily="$interSemiBold">
              {formatNumber(orderSize)} USDC
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
          onPress={() => {
            // Show a native confirmation dialog
            Alert.alert(
              'Builder Fee Approval',
              'Please sign before continue',
              [
                {
                  text: 'Cancel',
                  style: 'cancel',
                },
                {
                  text: 'Accept',
                  onPress: () => {
                    // Handle acceptance here
                    console.log('User accepted the builder fee');
                  },
                  style: 'default',
                },
              ],
              { cancelable: false },
            );
          }}
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
  title: string;
  value: string;
  onValueChange: (value: string) => void;
  items: { value: string; label: string }[];
  placeholder: string;
  flex?: number;
}

function SelectBox({ title, value, onValueChange, items, placeholder, flex }: SelectBoxProps) {
  // Find the selected item's label to display
  const selectedItem = items.find(item => item.value === value);
  const displayText = selectedItem?.label || placeholder;

  return (
    <AdaptiveSelect value={value} onValueChange={onValueChange} title={title}>
      <AdaptiveSelect.Trigger>
        <XStack
          flex={flex}
          backgroundColor="$gray3"
          borderRadius="$4"
          paddingVertical="$3"
          paddingHorizontal="$3"
          borderColor="$gray8"
          borderWidth={1}
          alignItems="center"
          justifyContent="space-between"
        >
          <Text color="$color" fontSize="$3" fontFamily="$interRegular">
            {displayText}
          </Text>
          <ChevronDown size="$1" color="$color" />
        </XStack>
      </AdaptiveSelect.Trigger>

      {items.map((item, index) => (
        <AdaptiveSelect.Item key={item.value} value={item.value} index={index}>
          {item.label}
        </AdaptiveSelect.Item>
      ))}
    </AdaptiveSelect>
  );
}
