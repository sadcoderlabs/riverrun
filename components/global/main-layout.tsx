import { ReactNode } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { styled, YStack } from 'tamagui';

interface MainLayoutProps {
  children: ReactNode;
  noBottomPadding?: boolean;
}

const MainContainer = styled(YStack, {
  flex: 1,
});

export function MainLayout({ children, noBottomPadding = false }: MainLayoutProps) {
  const insets = useSafeAreaInsets();

  return (
    <MainContainer
      style={{
        paddingBottom: noBottomPadding ? 0 : 60 + insets.bottom, // Height of the NavBar + bottom inset
      }}
    >
      {children}
    </MainContainer>
  );
}
