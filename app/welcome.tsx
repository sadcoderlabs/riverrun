import {
  useNotificationSetup,
  useReferral,
  useScreenTracking,
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
 */
export default function WelcomeScreen() {
  useScreenTracking('Welcome');
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { address } = useWallet();
  const { setReferrer } = useReferral();
  const { setupNotificationsWithBackend, setupComplete, isLoading } = useNotificationSetup();
  const markSeen = useWelcomeStore(state => state.markSeen);

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
      // Trigger referral workflow (shows confirmation dialog)
      await setReferrer();
      goToNextPage();
    } else if (currentPageId === 'notification') {
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
  }, [currentPage, setReferrer, setupNotificationsWithBackend, address, goToNextPage]);

  /**
   * Watch for setupComplete - triggered when user returns from settings
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
    goToNextPage();
  }, [goToNextPage]);

  /**
   * Handle "Skip All" - complete welcome immediately
   */
  const handleSkipAll = useCallback(() => {
    completeWelcome();
  }, [completeWelcome]);

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
