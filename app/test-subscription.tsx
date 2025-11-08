/**
 * Test page for unified subscription system
 *
 * This page demonstrates and validates the new subscription system.
 * You can navigate to /test-subscription to see it in action.
 *
 * Tests:
 * 1. Multiple components sharing same subscription (RefCount)
 * 2. HTTP + WebSocket hybrid strategy (allMids)
 * 3. Pure WebSocket subscription (orderBook)
 * 4. App Lifecycle management (check console when locking/unlocking phone)
 */

import { useSubscription } from '@/lib/hyperliquid/subscription';
import { ArrowLeft } from '@tamagui/lucide-icons';
import { useRouter } from 'expo-router';
import { Pressable } from 'react-native';
import { ScrollView, Text, View, XStack, YStack } from 'tamagui';

// Test Component 1: allMids subscription
function AllMidsTest1() {
  const { data, isLoading, error } = useSubscription('allMids');

  return (
    <View padding="$3" backgroundColor="$background02" borderRadius="$3">
      <Text fontFamily="$interSemiBold" fontSize="$4" marginBottom="$2">
        AllMids Test #1 (RefCount = 1)
      </Text>
      {isLoading && <Text color="$color9">Loading...</Text>}
      {error && <Text color="$red10">Error: {error.message}</Text>}
      {data && (
        <YStack gap="$1">
          <Text fontSize="$2">BTC: ${data.mids.BTC}</Text>
          <Text fontSize="$2">ETH: ${data.mids.ETH}</Text>
          <Text fontSize="$2">SOL: ${data.mids.SOL}</Text>
        </YStack>
      )}
    </View>
  );
}

// Test Component 2: Same allMids subscription (should share)
function AllMidsTest2() {
  const { data, isLoading } = useSubscription('allMids');

  return (
    <View padding="$3" backgroundColor="$background02" borderRadius="$3">
      <Text fontFamily="$interSemiBold" fontSize="$4" marginBottom="$2">
        AllMids Test #2 (RefCount = 2)
      </Text>
      {isLoading && <Text color="$color9">Loading...</Text>}
      {data && (
        <YStack gap="$1">
          <Text fontSize="$2">Total coins: {Object.keys(data.mids).length}</Text>
          <Text fontSize="$2" color="$color9">
            (This should share the same subscription as Test #1)
          </Text>
        </YStack>
      )}
    </View>
  );
}

// Test Component 3: OrderBook subscription
function OrderBookTest() {
  const { data: orderBook, isLoading, error } = useSubscription('orderBook', {
    coin: 'BTC',
    nSigFigs: 2,
  });

  return (
    <View padding="$3" backgroundColor="$background02" borderRadius="$3">
      <Text fontFamily="$interSemiBold" fontSize="$4" marginBottom="$2">
        OrderBook Test (BTC, 2 sig figs)
      </Text>
      {isLoading && <Text color="$color9">Loading...</Text>}
      {error && <Text color="$red10">Error: {error.message}</Text>}
      {orderBook && (
        <YStack gap="$1">
          <Text fontSize="$2">Coin: {orderBook.coin}</Text>
          <Text fontSize="$2">Best Bid: {orderBook.bids[0]?.px}</Text>
          <Text fontSize="$2">Best Ask: {orderBook.asks[0]?.px}</Text>
          <Text fontSize="$2">Spread: {orderBook.asks[0]?.sz}</Text>
        </YStack>
      )}
    </View>
  );
}

export default function TestSubscriptionPage() {
  const router = useRouter();

  return (
    <YStack flex={1} backgroundColor="$background">
      {/* Header */}
      <XStack
        alignItems="center"
        gap="$3"
        paddingHorizontal="$4"
        paddingVertical="$3"
        borderBottomWidth={1}
        borderBottomColor="$borderColor"
      >
        <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
          <ArrowLeft size={24} color="$color" />
        </Pressable>
        <Text fontFamily="$interSemiBold" fontSize="$6">
          Subscription System Test
        </Text>
      </XStack>

      {/* Content */}
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <YStack gap="$4">
          {/* Instructions */}
          <View padding="$3" backgroundColor="$background02" borderRadius="$3" borderWidth={1} borderColor="$accent9">
            <Text fontFamily="$interSemiBold" fontSize="$3" marginBottom="$2" color="$accent9">
              📝 Test Instructions
            </Text>
            <YStack gap="$1">
              <Text fontSize="$2">1. Check console logs for subscription messages</Text>
              <Text fontSize="$2">2. Test #1 and #2 should share one subscription</Text>
              <Text fontSize="$2">3. Lock/unlock phone to test App Lifecycle</Text>
              <Text fontSize="$2">4. Navigate away and back to test cleanup</Text>
            </YStack>
          </View>

          {/* Test Components */}
          <AllMidsTest1 />
          <AllMidsTest2 />
          <OrderBookTest />

          {/* Expected Console Output */}
          <View padding="$3" backgroundColor="$gray3" borderRadius="$3">
            <Text fontFamily="$interSemiBold" fontSize="$3" marginBottom="$2">
              📊 Expected Console Output
            </Text>
            <YStack gap="$1">
              <Text fontSize="$2" fontFamily="$interRegular">
                ✨ Creating new subscription for allMids:global
              </Text>
              <Text fontSize="$2" fontFamily="$interRegular">
                🔄 Reusing subscription for allMids:global (refCount: 2)
              </Text>
              <Text fontSize="$2" fontFamily="$interRegular">
                ✨ Creating new subscription for orderBook:BTC-2
              </Text>
              <Text fontSize="$2" fontFamily="$interRegular" color="$color9">
                (When you lock phone)
              </Text>
              <Text fontSize="$2" fontFamily="$interRegular">
                ⏸️  Pausing all subscriptions
              </Text>
              <Text fontSize="$2" fontFamily="$interRegular" color="$color9">
                (When you unlock phone)
              </Text>
              <Text fontSize="$2" fontFamily="$interRegular">
                ▶️  Resuming all subscriptions
              </Text>
            </YStack>
          </View>
        </YStack>
      </ScrollView>
    </YStack>
  );
}
