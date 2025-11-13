import { ListItem } from '@/components/global/ListItem';
import { ListSection } from '@/components/global/ListSection';
import { useTelemetry } from '@/core/composition';
import { ArrowLeft } from '@tamagui/lucide-icons';
import { useRouter } from 'expo-router';
import { Pressable } from 'react-native';
import { ScrollView, Text, XStack, YStack } from 'tamagui';
import { toast } from 'sonner-native';

export default function TelemetryTest() {
  const router = useRouter();
  const { trackEvent, captureError, captureWarning, trackScreen, withSpan } = useTelemetry();

  // Test: Track a type-safe event
  const testTrackEvent = async () => {
    try {
      await trackEvent('order_submitted', {
        market: 'BTC',
        side: 'buy',
        orderType: 'limit',
        leverage: 10,
        size: 1.5,
      });
      toast.success('Event Tracked', {
        description: 'order_submitted event sent to telemetry',
      });
    } catch (error) {
      toast.error('Event tracking failed');
    }
  };

  // Test: Track a screen view
  const testTrackScreen = async () => {
    try {
      await trackScreen('Trade', {
        market: 'BTC',
        tab: 'order',
      });
      toast.success('Screen Tracked', {
        description: 'Screen view sent to telemetry',
      });
    } catch (error) {
      toast.error('Screen tracking failed');
    }
  };

  // Test: Capture an error with context
  const testCaptureError = async () => {
    try {
      await captureError(new Error('Test error from Telemetry Screen'), {
        component: 'TelemetryTestScreen',
        action: 'test_capture_error',
        tags: { test: 'true' },
        extra: {
          timestamp: new Date().toISOString(),
        },
      });
      toast.success('Error Captured', {
        description: 'Test error sent to Sentry',
      });
    } catch (error) {
      toast.error('Error capture failed');
    }
  };

  // Test: Capture a warning
  const testCaptureWarning = async () => {
    try {
      await captureWarning('Test warning message from Telemetry Screen', {
        component: 'TelemetryTestScreen',
        action: 'test_capture_warning',
        extra: {
          severity: 'low',
        },
      });
      toast.success('Warning Captured', {
        description: 'Test warning sent to Sentry',
      });
    } catch (error) {
      toast.error('Warning capture failed');
    }
  };

  // Test: Performance tracking with span
  const testPerformanceSpan = async () => {
    try {
      await withSpan(
        'order_submission',
        async () => {
          // Simulate async operation
          await new Promise(resolve => setTimeout(resolve, 1000));
          return 'success';
        },
        {
          data: { market: 'BTC' },
          tags: { test: 'true' },
        },
      );
      toast.success('Performance Tracked', {
        description: 'order_submission span completed (1s)',
      });
    } catch (error) {
      toast.error('Performance tracking failed');
    }
  };

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
          Telemetry Test
        </Text>
      </XStack>

      {/* Content */}
      <ScrollView contentInsetAdjustmentBehavior="automatic" backgroundColor="$gray3">
        <YStack backgroundColor="$gray3">
          {/* Info Section */}
          <YStack paddingHorizontal="$4" paddingVertical="$4">
            <Text fontSize="$4" color="$color9" marginBottom="$2">
              Test the new type-safe telemetry API
            </Text>
            <Text fontSize="$3" color="$color8">
              All events are strictly typed to prevent event sprawl
            </Text>
          </YStack>

          {/* Event Tracking Tests */}
          <YStack>
            <ListSection label="Event Tracking (Segment + Sentry Breadcrumbs)">
              <ListItem
                title="Track Event: order_submitted"
                subTitle="Type-safe event with strict properties"
                showIosChevron={true}
                onPress={() => void testTrackEvent()}
              />
              <ListItem
                title="Track Screen: Trade"
                subTitle="Screen view tracking for analytics"
                showIosChevron={true}
                onPress={() => void testTrackScreen()}
              />
            </ListSection>
          </YStack>

          {/* Error Tracking Tests */}
          <YStack>
            <ListSection label="Error Tracking (Sentry)">
              <ListItem
                title="Capture Error"
                subTitle="Send test error with context to Sentry"
                showIosChevron={true}
                onPress={() => void testCaptureError()}
              />
              <ListItem
                title="Capture Warning"
                subTitle="Send test warning message to Sentry"
                showIosChevron={true}
                onPress={() => void testCaptureWarning()}
              />
            </ListSection>
          </YStack>

          {/* Performance Tracking Tests */}
          <YStack>
            <ListSection label="Performance Tracking (Sentry)">
              <ListItem
                title="Test Performance Span"
                subTitle="Track async operation with withSpan (1s)"
                showIosChevron={true}
                onPress={() => void testPerformanceSpan()}
              />
            </ListSection>
          </YStack>

          {/* Instructions */}
          <YStack paddingHorizontal="$4" paddingVertical="$4" marginTop="$2">
            <Text fontSize="$5" fontFamily="$interSemiBold" color="$color12" marginBottom="$3">
              Design Benefits
            </Text>
            <YStack gap="$2">
              <Text fontSize="$3" color="$color9">
                ✓ Type-safe: Only predefined events can be tracked
              </Text>
              <Text fontSize="$3" color="$color9">
                ✓ Autocomplete: TypeScript suggests valid event properties
              </Text>
              <Text fontSize="$3" color="$color9">
                ✓ Unified API: Single interface for Sentry + Segment (future)
              </Text>
              <Text fontSize="$3" color="$color9">
                ✓ Prevents event sprawl: No arbitrary string events
              </Text>
            </YStack>
          </YStack>

          {/* Verification */}
          <YStack paddingHorizontal="$4" paddingVertical="$4" marginTop="$2">
            <Text fontSize="$5" fontFamily="$interSemiBold" color="$color12" marginBottom="$3">
              How to Verify
            </Text>
            <YStack gap="$2">
              <Text fontSize="$3" color="$color9">
                • Errors: Check Issues tab in Sentry dashboard
              </Text>
              <Text fontSize="$3" color="$color9">
                • Events: Check breadcrumbs in error details
              </Text>
              <Text fontSize="$3" color="$color9">
                • Performance: Check Performance tab for spans
              </Text>
              <Text fontSize="$3" color="$color9">
                • User Context: Verify wallet address is set as user ID
              </Text>
            </YStack>
          </YStack>
        </YStack>
      </ScrollView>
    </YStack>
  );
}
