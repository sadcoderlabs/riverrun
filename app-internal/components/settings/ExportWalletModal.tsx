import { Download } from '@tamagui/lucide-icons';
import { Linking } from 'react-native';
import { Sheet, XStack, YStack } from 'tamagui';
import { Button } from '../global/Button';
import { CustomHeader } from '../global/CustomHeader';
import { Text } from '../global/Text';

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
    <Sheet
      modal
      native
      open={open}
      onOpenChange={(isOpen: boolean) => {
        if (!isOpen) onOpenChange(false);
      }}
      snapPoints={[50]}
      position={0}
      dismissOnSnapToBottom
      dismissOnOverlayPress
      zIndex={100000}
    >
      <Sheet.Overlay
        enterStyle={{ opacity: 0 }}
        exitStyle={{ opacity: 0 }}
        backgroundColor="rgba(0,0,0,0.6)"
      />
      <Sheet.Frame
        padding="$2"
        backgroundColor="$background"
        borderTopLeftRadius="$6"
        borderTopRightRadius="$6"
      >
        {/* Handle bar */}
        <YStack paddingTop="$2" paddingBottom="$2">
          <YStack
            height={5}
            width={40}
            backgroundColor="$gray9"
            opacity={0.5}
            alignSelf="center"
            borderRadius="$12"
          />
        </YStack>

        {/* Header */}
        <CustomHeader
          title="Export Private Key"
          onBackPress={() => onOpenChange(false)}
          showBackButton={false}
        />

        {/* Content */}
        <YStack flex={1} paddingHorizontal="$4" paddingTop="$4" paddingBottom="$5" gap="$5">
          {/* Spacer to push content down */}
          <YStack flex={1} justifyContent="center" gap="$5">
            {/* Icon */}
            <XStack justifyContent="center">
              <YStack
                backgroundColor="$color3"
                padding="$5"
                borderRadius="$12"
                alignItems="center"
                justifyContent="center"
              >
                <Download size={32} color="$accent9" />
              </YStack>
            </XStack>

            {/* Description */}
            <YStack gap="$2" paddingHorizontal="$2">
              <Text.Footnote color="$color10" textAlign="center">
                For security, we&#39;ll open a secure page in your browser to export your key.
              </Text.Footnote>
            </YStack>
          </YStack>

          {/* Button */}
          <Button.Filled level="lg" onPress={handleOpenInBrowser}>
            Open in Browser
          </Button.Filled>
        </YStack>
      </Sheet.Frame>
    </Sheet>
  );
}
