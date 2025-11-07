import { ReactNode } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { styled, YStack } from 'tamagui';

interface CleanLayoutProps {
  children: ReactNode;
}

const CleanContainer = styled(YStack, {
  flex: 1,
  backgroundColor: '$gray3',
});

/**
 * CleanLayout component that provides a minimal layout without header or navigation bar
 * Useful for screens that need a clean, full-screen experience
 */
export function CleanLayout({ children }: CleanLayoutProps) {
  const insets = useSafeAreaInsets();

  return (
    <CleanContainer
      style={{
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}
    >
      {children}
    </CleanContainer>
  );
}
