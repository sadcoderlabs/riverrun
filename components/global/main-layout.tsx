import { ReactNode } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { styled, YStack } from 'tamagui';

interface MainLayoutProps {
  children: ReactNode;
  noBottomPadding?: boolean;
  noHeader?: boolean;
}

const MainContainer = styled(YStack, {
  flex: 1,
});

export function MainLayout({
  children,
  noBottomPadding = false,
  noHeader = false,
}: MainLayoutProps) {
  const insets = useSafeAreaInsets();

  return (
    <MainContainer
      style={{
        paddingTop: noHeader ? insets.top : 0, // Add top padding when there's no header
        paddingBottom: noBottomPadding ? 0 : 60 + insets.bottom, // Height of the NavBar + bottom inset
      }}
    >
      {children}
    </MainContainer>
  );
}
