import { useNotificationSetup, useReferral } from '@/app-internal';
import { Bell, TicketPercent } from '@tamagui/lucide-icons';
import { useCallback, useRef } from 'react';
import { Dimensions, FlatList, StyleSheet, ViewToken } from 'react-native';
import Modal from 'react-native-modal';
import { XStack, YStack } from 'tamagui';
import { useWelcomeScreens } from '../../features/welcome/hooks/useWelcomeScreens';
import { Button } from '../global';
import { Heading } from '../global/Heading';
import { Text } from '../global/Text';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DIALOG_WIDTH = SCREEN_WIDTH - 32;
const DIALOG_PADDING = 24;
const CONTENT_WIDTH = DIALOG_WIDTH - DIALOG_PADDING * 2;

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
 * Welcome dialog shown to new users on first sign-in.
 * Displays swipable pages with dot indicators and CTA buttons.
 */
export function WelcomeDialog() {
  const { shouldShow, currentPage, totalPages, setCurrentPage, nextPage, dismiss } =
    useWelcomeScreens();
  const { setReferrer } = useReferral();
  const { enableNotifications } = useNotificationSetup();

  const flatListRef = useRef<FlatList>(null);

  const handleViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setCurrentPage(viewableItems[0].index);
      }
    },
    [setCurrentPage],
  );

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const handleOk = useCallback(async () => {
    const currentPageId = WELCOME_PAGES[currentPage]?.id;

    // Handle page-specific actions
    if (currentPageId === 'referral') {
      // Trigger referral workflow (shows confirmation dialog)
      await setReferrer();
    } else if (currentPageId === 'notification') {
      // Trigger notification setup
      // - Android: auto-opted in, no action needed
      // - iOS: request permission or open settings
      await enableNotifications();
    }

    // Advance to next page or dismiss
    const hasMore = nextPage();
    if (hasMore) {
      flatListRef.current?.scrollToIndex({
        index: currentPage + 1,
        animated: true,
      });
    }
  }, [nextPage, currentPage, setReferrer, enableNotifications]);

  const handleSetupLater = useCallback(() => {
    const hasMore = nextPage();
    if (hasMore) {
      flatListRef.current?.scrollToIndex({
        index: currentPage + 1,
        animated: true,
      });
    }
  }, [nextPage, currentPage]);

  const handleSkipAll = useCallback(() => {
    dismiss();
  }, [dismiss]);

  const renderPage = useCallback(
    ({ item }: { item: WelcomePage }) => (
      <YStack
        width={CONTENT_WIDTH}
        gap="$2"
        alignItems="center"
        justifyContent="center"
        paddingVertical="$4"
      >
        {/* Icon */}
        <YStack
          width={96}
          height={96}
          borderRadius={48}
          backgroundColor="$accent3"
          alignItems="center"
          justifyContent="center"
        >
          {item.icon}
        </YStack>

        {/* Title */}
        <Heading.H5 color="$color12" textAlign="center" marginTop="$2">
          {item.title}
        </Heading.H5>

        {/* Description */}
        <Text.Subhead color="$color11" textAlign="center" paddingHorizontal="$2">
          {item.description}
        </Text.Subhead>
        {item.note && (
          <Text.Caption color="$color11" textAlign="center" paddingHorizontal="$2">
            {item.note}
          </Text.Caption>
        )}
      </YStack>
    ),
    [],
  );

  if (!shouldShow) {
    return null;
  }

  return (
    <Modal
      isVisible={shouldShow}
      onBackdropPress={dismiss}
      onBackButtonPress={dismiss}
      animationIn="fadeIn"
      animationOut="fadeOut"
      animationInTiming={200}
      animationOutTiming={200}
      backdropOpacity={0.6}
      backdropTransitionInTiming={200}
      backdropTransitionOutTiming={200}
      useNativeDriver={true}
      style={styles.modal}
    >
      <YStack
        width={DIALOG_WIDTH}
        backgroundColor="$background"
        borderRadius="$6"
        padding={DIALOG_PADDING}
        alignItems="center"
      >
        {/* Swipable Content */}
        <FlatList
          ref={flatListRef}
          data={WELCOME_PAGES}
          renderItem={renderPage}
          keyExtractor={item => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={handleViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          scrollEventThrottle={16}
          style={{ width: CONTENT_WIDTH }}
          getItemLayout={(_, index) => ({
            length: CONTENT_WIDTH,
            offset: CONTENT_WIDTH * index,
            index,
          })}
        />

        {/* Dot Indicators */}
        <XStack gap="$2" marginTop="$3" marginBottom="$5">
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

        {/* CTA Buttons */}
        <YStack width="100%" gap="$3">
          <Button.Filled level="lg" width="100%" onPress={handleOk}>
            OK
          </Button.Filled>

          <Button.Gray level="lg" width="100%" onPress={handleSetupLater}>
            Set up later
          </Button.Gray>
        </YStack>

        {/* Skip All */}
        <Button
          marginTop="$3"
          onPress={handleSkipAll}
          color="$color10"
          fontSize="$2"
          fontFamily="$interRegular"
        >
          Skip All
        </Button>
      </YStack>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: {
    margin: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
