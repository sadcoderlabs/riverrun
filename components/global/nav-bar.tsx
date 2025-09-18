import { Home, TrendingUp } from '@tamagui/lucide-icons';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatePresence, styled, Text, XStack, YStack } from 'tamagui';

const NavBarContainer = styled(XStack, {
  backgroundColor: '$background',
  borderTopWidth: 1,
  borderTopColor: '$borderColor',
  height: 60,
  width: '100%',
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  justifyContent: 'space-around',
  alignItems: 'center',
  paddingHorizontal: '$4',
  paddingBottom: '$2',
  shadowColor: '$shadowColor',
  shadowOffset: { width: 0, height: -2 },
  shadowOpacity: 0.1,
  shadowRadius: 3,
  elevation: 5,
});

const NavItem = styled(YStack, {
  alignItems: 'center',
  justifyContent: 'center',
  paddingVertical: '$2',
  flex: 1,
  variants: {
    active: {
      true: {
        color: '$accent9',
      },
      false: {
        color: '$color',
      },
    },
  } as const,
});

const NavText = styled(Text, {
  fontSize: '$2',
  marginTop: '$1',
  fontFamily: '$interMedium',
  variants: {
    active: {
      true: {
        color: '$accent9',
      },
      false: {
        color: '$color',
      },
    },
  } as const,
});

export function NavBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const isHomeActive =
    pathname === '/' ||
    pathname === '/index' ||
    pathname === '/(main)' ||
    pathname === '/(main)/index';
  const isTradeActive = pathname.includes('/trade');

  const navigateToHome = () => {
    router.navigate('/(main)');
  };

  const navigateToTrade = () => {
    router.navigate('/(main)/trade/BTC-USD/(tab)/trade');
  };

  return (
    <NavBarContainer
      style={{
        paddingBottom: insets.bottom > 0 ? insets.bottom : '$2',
        height: 60 + (insets.bottom > 0 ? insets.bottom : 0),
      }}
    >
      <AnimatePresence>
        <NavItem
          active={isHomeActive}
          onPress={navigateToHome}
          animation="bouncy"
          pressStyle={{ scale: 0.9 }}
        >
          <Home size={24} color={isHomeActive ? '#00C097' : '#797b86'} />
          <NavText active={isHomeActive}>Home</NavText>
        </NavItem>

        <NavItem
          active={isTradeActive}
          onPress={navigateToTrade}
          animation="bouncy"
          pressStyle={{ scale: 0.9 }}
        >
          <TrendingUp size={24} color={isTradeActive ? '#00C097' : '#797b86'} />
          <NavText active={isTradeActive}>Trade</NavText>
        </NavItem>
      </AnimatePresence>
    </NavBarContainer>
  );
}
