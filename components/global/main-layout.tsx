import { ReactNode } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { styled, YStack } from 'tamagui';
import { NavBar } from './nav-bar';
import { TopBar } from './top-bar';

interface MainLayoutProps {
  children: ReactNode;
  noBottomPadding?: boolean;
  noHeader?: boolean;
  showTopBar?: boolean;
}

const MainContainer = styled(YStack, {
  flex: 1,
});

export function MainLayout({
  children,
  noBottomPadding = false,
  noHeader = false,
  showTopBar = false,
}: MainLayoutProps) {
  const insets = useSafeAreaInsets();

  // Calculate the top padding based on whether we have a header or top bar
  const topPadding = noHeader ? insets.top : showTopBar ? 56 + insets.top : 0;

  return (
    <MainContainer
      style={{
        paddingTop: topPadding,
        paddingBottom: noBottomPadding ? 0 : 60 + insets.bottom, // Height of the NavBar + bottom inset
      }}
    >
      {showTopBar && <TopBar />}
      {children}
      <NavBar />
    </MainContainer>
  );
}
