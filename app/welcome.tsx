import {
  useNotificationSetup,
  useReferral,
  useScreenTracking,
  useTelemetry,
  useWallet,
  useWelcomeStore,
} from '@/app-internal';
import { Button } from '@/app-internal/components/global/Button';
import { Heading } from '@/app-internal/components/global/Heading';
import { Text } from '@/app-internal/components/global/Text';
import { Bell, TicketPercent } from '@tamagui/lucide-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { XStack, YStack } from 'tamagui';

interface WelcomePage {
  id: string;
  title: string;
  description: string;
  note?: string;
  icon: React.ReactNode;
}

const WELCOME_PAGES: WelcomePage[] = [
  {
    id: 'referral',
    title: 'Get 4% Off Trading Fees',
    description: 'Use our referral code to save 4% on fees for your first $25M in volume.',
    note: '*Vaults and sub-accounts are excluded',
    icon: <TicketPercent size={48} color="$accent9" />,
  },
  {
    id: 'notification',
    title: 'Enable Notifications',
    description: 'Get alerts for price movements, order fills, and account updates.',
    icon: <Bell size={48} color="$accent9" />,
  },
];

/**
 * Welcome Screen
 *
 * Shown to new users on first sign-in to set up referral and notifications.
 * This is a full-screen route, not a modal overlay.
 *
 * ## Notification Setup Flow
 *
 * This screen handles a **two-layer notification system**:
 * 1. **System Permission**: iOS/Android device permission
 * 2. **Backend Registration**: Register device token with our backend
 *
 * ### Why the complexity?
 *
 * On iOS, if user previously denied notification permission, we can't show
 * the permission dialog again - we must redirect them to Settings. When they
 * return from Settings, we need to:
 * 1. Detect they're back (AppState listener in useNotificationSetup)
 * 2. Re-check if permission was granted
 * 3. If granted, register device with backend
 * 4. Then advance to home
 *
 * ### How it works:
 *
 * - `setupNotificationsWithBackend()` returns `true` if completed immediately
 * - If user is sent to Settings, it returns `false` and sets `isWaitingForSettings`
 * - The `useEffect` watching `setupComplete` triggers `goToNextPage()` when user returns
 *
 * ### Button behaviors:
 *
 * - **OK**: Runs full notification setup flow (permission + backend registration)
 * - **Set up later**: Skips notification setup, advances to next page
 * - **Skip All**: Completes welcome immediately, goes to home
 *
 * @see useNotificationSetup - Hook that handles the notification setup logic
 */
export default function WelcomeScreen() {
  useScreenTracking('Welcome');
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { address } = useWallet();
  const { setReferrer } = useReferral();
  const { setupNotificationsWithBackend, setupComplete, isLoading } = useNotificationSetup();
  const markSeen = useWelcomeStore(state => state.markSeen);
  const { trackEvent } = useTelemetry();

  const [currentPage, setCurrentPage] = useState(0);
  const totalPages = WELCOME_PAGES.length;
  const currentPageData = WELCOME_PAGES[currentPage];

  /**
   * Complete welcome flow and navigate to home
   */
  const completeWelcome = useCallback(() => {
    if (address) {
      markSeen(address);
    }
    router.replace('/(tabs)/home');
  }, [address, markSeen, router]);

  /**
   * Advance to next page or complete welcome
   */
  const goToNextPage = useCallback(() => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(prev => prev + 1);
    } else {
      completeWelcome();
    }
  }, [currentPage, totalPages, completeWelcome]);

  /**
   * Handle OK button press - trigger page-specific action then advance
   */
  const handleOk = useCallback(async () => {
    const currentPageId = WELCOME_PAGES[currentPage]?.id;

    // Handle page-specific actions
    if (currentPageId === 'referral') {
      // Track referral accepted
      trackEvent('welcome_referral_accepted', {});
      // Trigger referral workflow (shows confirmation dialog)
      await setReferrer();
      goToNextPage();
    } else if (currentPageId === 'notification') {
      // Track notification accepted
      trackEvent('welcome_notification_accepted', {
        platform: Platform.OS as 'ios' | 'android',
      });
      // Trigger notification setup with backend registration
      // Returns true if completed immediately, false if waiting for settings
      if (address) {
        const success = await setupNotificationsWithBackend(
          address,
          Platform.OS as 'ios' | 'android',
        );
        if (success) {
          goToNextPage();
        }
        // If !success, user was sent to settings - wait for setupComplete
      } else {
        // No wallet address, just skip notification setup
        goToNextPage();
      }
    }
  }, [currentPage, setReferrer, setupNotificationsWithBackend, address, goToNextPage, trackEvent]);

  /**
   * Watch for setupComplete - triggered when user returns from system Settings
   *
   * This is the "async continuation" of the notification setup flow.
   * When user is sent to Settings (because permission was denied), we can't
   * advance immediately. Instead:
   * 1. setupNotificationsWithBackend() returns false
   * 2. AppState listener in useNotificationSetup detects user return
   * 3. It re-checks permission and registers device if granted
   * 4. It sets setupComplete = true
   * 5. This useEffect fires and advances to next page
   */
  useEffect(() => {
    const currentPageId = WELCOME_PAGES[currentPage]?.id;
    if (setupComplete && currentPageId === 'notification') {
      goToNextPage();
    }
  }, [setupComplete, currentPage, goToNextPage]);

  /**
   * Handle "Set up later" - skip action and advance
   */
  const handleSetupLater = useCallback(() => {
    const currentPageId = WELCOME_PAGES[currentPage]?.id;

    // Track skip events
    if (currentPageId === 'referral') {
      trackEvent('welcome_referral_skipped', {});
    } else if (currentPageId === 'notification') {
      trackEvent('welcome_notification_skipped', {});
    }

    goToNextPage();
  }, [currentPage, goToNextPage, trackEvent]);

  /**
   * Handle "Skip All" - complete welcome immediately
   */
  const handleSkipAll = useCallback(() => {
    const currentPageId = WELCOME_PAGES[currentPage]?.id;

    // Track skip all event
    trackEvent('welcome_all_skipped', {
      skippedFrom: currentPageId as 'referral' | 'notification',
    });

    completeWelcome();
  }, [currentPage, completeWelcome, trackEvent]);

  return (
    <YStack
      flex={1}
      backgroundColor="$background"
      paddingTop={insets.top}
      paddingBottom={insets.bottom}
      paddingHorizontal="$6"
    >
      {/* Main Content - Centered */}
      <YStack flex={1} justifyContent="center" alignItems="center" padding="$4">
        {/* Icon */}
        <YStack
          width={96}
          height={96}
          borderRadius={48}
          backgroundColor="$accent3"
          alignItems="center"
          justifyContent="center"
        >
          {currentPageData.icon}
        </YStack>

        {/* Title */}
        <Heading.H5 color="$color12" textAlign="center" marginTop="$4">
          {currentPageData.title}
        </Heading.H5>

        {/* Description */}
        <Text.Subhead color="$color11" textAlign="center" marginTop="$2">
          {currentPageData.description}
        </Text.Subhead>
        {currentPageData.note && (
          <Text.Caption color="$color11" textAlign="center" marginTop="$1">
            {currentPageData.note}
          </Text.Caption>
        )}

        {/* Dot Indicators */}
        <XStack gap="$2" marginTop="$6">
          {Array.from({ length: totalPages }).map((_, index) => (
            <YStack
              key={index}
              width={8}
              height={8}
              borderRadius={4}
              backgroundColor={index === currentPage ? '$accent9' : '$gray6'}
            />
          ))}
        </XStack>
      </YStack>

      {/* CTA Buttons - Bottom */}
      <YStack gap="$3" paddingBottom="$4">
        <Button.Filled level="lg" width="100%" onPress={handleOk} disabled={isLoading}>
          {isLoading ? 'Setting up...' : 'OK'}
        </Button.Filled>

        <Button.Gray level="lg" width="100%" onPress={handleSetupLater} disabled={isLoading}>
          Set up later
        </Button.Gray>

        {/* Skip All */}
        <Button
          alignSelf="center"
          onPress={handleSkipAll}
          color="$color10"
          fontSize="$2"
          fontFamily="$interRegular"
        >
          Skip All
        </Button>
      </YStack>
    </YStack>
  );
}
