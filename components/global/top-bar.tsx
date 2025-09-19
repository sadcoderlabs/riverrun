import { BellDot, CircleUserRound, Headset } from '@tamagui/lucide-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { styled, useTheme, XStack } from 'tamagui';

const TopBarContainer = styled(XStack, {
  backgroundColor: '$background',
  borderBottomWidth: 1,
  borderBottomColor: '$borderColor',
  width: '100%',
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingHorizontal: '$4',
  zIndex: 100,
  shadowColor: '$shadowColor',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 3,
  elevation: 3,
});

const IconButton = styled(XStack, {
  alignItems: 'center',
  justifyContent: 'center',
  padding: '$2',
  pressStyle: { opacity: 0.7 },
});

const RightIcons = styled(XStack, {
  alignItems: 'center',
  gap: '$3',
});

interface TopBarProps {
  onUserPress?: () => void;
  onHeadsetPress?: () => void;
  onBellPress?: () => void;
}

export function TopBar({ onUserPress, onHeadsetPress, onBellPress }: TopBarProps) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const router = useRouter();

  const handleUserPress = () => {
    if (onUserPress) {
      onUserPress();
    } else {
      // Default behavior: navigate to settings
      router.navigate('/(main)/settings');
    }
  };

  return (
    <TopBarContainer
      style={{
        paddingTop: insets.top,
        height: 56 + insets.top, // Standard height plus safe area
      }}
    >
      <IconButton onPress={handleUserPress}>
        <CircleUserRound size={32} color={theme.color9} />
      </IconButton>

      <RightIcons>
        <IconButton onPress={onHeadsetPress}>
          <Headset size={24} color={theme.color9} />
        </IconButton>
        <IconButton onPress={onBellPress}>
          <BellDot size={24} color={theme.color9} />
        </IconButton>
      </RightIcons>
    </TopBarContainer>
  );
}
