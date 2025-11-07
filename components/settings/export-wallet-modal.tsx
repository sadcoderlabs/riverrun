import { Modal, Pressable, StyleSheet, Linking } from 'react-native';
import { Button, Text, XStack, YStack } from 'tamagui';
import { Download } from '@tamagui/lucide-icons';

interface ExportWalletModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ExportWalletModal({ open, onOpenChange }: ExportWalletModalProps) {
  const handleOpenInBrowser = () => {
    Linking.openURL('https://go-export.perp.com');
    onOpenChange(false);
  };

  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      onRequestClose={() => onOpenChange(false)}
      statusBarTranslucent
    >
      <Pressable style={styles.overlay} onPress={() => onOpenChange(false)}>
        <Pressable style={styles.contentContainer} onPress={e => e.stopPropagation()}>
          <YStack
            flex={1}
            backgroundColor="$background"
            borderTopLeftRadius="$6"
            borderTopRightRadius="$6"
            overflow="hidden"
          >
            {/* Handle bar */}
            <XStack justifyContent="center" paddingVertical="$2">
              <YStack
                opacity={0.5}
                backgroundColor="$gray9"
                height={3}
                width={32}
                borderRadius="$6"
              />
            </XStack>

            {/* Content */}
            <YStack flex={1} paddingHorizontal="$4" paddingTop="$2" paddingBottom="$5" gap="$5">
              {/* Header */}
              <XStack justifyContent="space-between" alignItems="center">
                <Text fontSize="$6" fontFamily="$interSemiBold">
                  Export Private Key
                </Text>
                <Pressable onPress={() => onOpenChange(false)}>
                  <Text fontSize="$6" color="$color9">
                    ✕
                  </Text>
                </Pressable>
              </XStack>

              {/* Spacer to push content down */}
              <YStack flex={1} justifyContent="center" gap="$5">
                {/* Icon */}
                <XStack justifyContent="center">
                  <YStack
                    backgroundColor="$gray4"
                    padding="$5"
                    borderRadius="$10"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Download size={56} color="$accent9" />
                  </YStack>
                </XStack>

                {/* Description */}
                <YStack gap="$2" paddingHorizontal="$2">
                  <Text fontSize="$4" color="$color9" textAlign="center" lineHeight="$5">
                    Export your private key securely by opening it in a browser.
                  </Text>
                </YStack>
              </YStack>

              {/* Button */}
              <Button
                size="$5"
                backgroundColor="$accent9"
                onPress={handleOpenInBrowser}
                pressStyle={{ opacity: 0.8 }}
              >
                <Text fontSize="$5" fontFamily="$interSemiBold" color="$gray1">
                  Open in Browser
                </Text>
              </Button>
            </YStack>
          </YStack>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  contentContainer: {
    height: '45%',
    width: '100%',
  },
});
