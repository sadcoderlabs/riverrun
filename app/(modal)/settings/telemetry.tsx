import { ListItem } from '@/components/global/ListItem';
import { ListSection } from '@/components/global/ListSection';
import {
  useTelemetry,
  createUserActionBreadcrumb,
  createTransactionBreadcrumb,
} from '@/core/composition';
import { ArrowLeft } from '@tamagui/lucide-icons';
import { useRouter } from 'expo-router';
import { Pressable } from 'react-native';
import { ScrollView, Text, XStack, YStack } from 'tamagui';
import { toast } from 'sonner-native';

export default function TelemetryTest() {
  const router = useRouter();
  const { captureError, addBreadcrumb, captureMessage } = useTelemetry();

  // Sentry test functions
  const testSentryError = () => {
    addBreadcrumb(createUserActionBreadcrumb('test_sentry_error', { source: 'telemetry' }));
    captureError(new Error('Test error from Riverrun Telemetry Screen'), {
      component: 'TelemetryTestScreen',
      action: 'test_sentry_error',
      tags: { test: 'true', environment: __DEV__ ? 'development' : 'production' },
    });
    toast.success('Sentry Error Test', {
      description: 'Test error sent to Sentry. Check your dashboard.',
    });
  };

  const testSentryBreadcrumb = () => {
    addBreadcrumb(createUserActionBreadcrumb('test_breadcrumb_1', { step: 1 }));
    addBreadcrumb(createTransactionBreadcrumb('test_transaction', { coin: 'BTC', size: 1.5 }));
    addBreadcrumb(createUserActionBreadcrumb('test_breadcrumb_2', { step: 2 }));
    toast.success('Breadcrumbs Added', {
      description: '3 test breadcrumbs added. Trigger an error to see them in context.',
    });
  };

  const testSentryMessage = () => {
    captureMessage('Test message from Riverrun Telemetry Screen', 'info', {
      component: 'TelemetryTestScreen',
      tags: { test: 'true' },
      data: {
        timestamp: new Date().toISOString(),
        userAgent: 'Riverrun Mobile',
      },
    });
    toast.success('Message Sent', {
      description: 'Test message sent to Sentry.',
    });
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
              Test Sentry integration by triggering different types of telemetry events.
            </Text>
            <Text fontSize="$3" color="$color8">
              All events will be tagged with test: true and sent to your Sentry project.
            </Text>
          </YStack>

          {/* Error Tracking Tests */}
          <YStack>
            <ListSection label="Error Tracking">
              <ListItem
                title="Test Error Tracking"
                subTitle="Send a test error with breadcrumbs and context"
                showIosChevron={true}
                onPress={testSentryError}
              />
              <ListItem
                title="Test Message Logging"
                subTitle="Send an info-level message to Sentry"
                showIosChevron={true}
                onPress={testSentryMessage}
              />
            </ListSection>
          </YStack>

          {/* Breadcrumbs Tests */}
          <YStack>
            <ListSection label="Breadcrumbs">
              <ListItem
                title="Add Test Breadcrumbs"
                subTitle="Add user action and transaction breadcrumbs"
                showIosChevron={true}
                onPress={testSentryBreadcrumb}
              />
            </ListSection>
          </YStack>

          {/* Instructions */}
          <YStack paddingHorizontal="$4" paddingVertical="$4" marginTop="$2">
            <Text fontSize="$5" fontFamily="$interSemiBold" color="$color12" marginBottom="$3">
              How to Verify
            </Text>
            <YStack gap="$2">
              <Text fontSize="$3" color="$color9">
                • Errors: Check Issues tab in Sentry dashboard
              </Text>
              <Text fontSize="$3" color="$color9">
                • Breadcrumbs: Trigger an error after adding breadcrumbs
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
