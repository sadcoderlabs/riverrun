import { Ban } from '@tamagui/lucide-icons';
import React, { useState } from 'react';
import { Separator, Text, useTheme, XStack, YStack } from 'tamagui';
import { CardContainer } from '../global/card-container';

type Tab = 'positions' | 'history';

export function AccountInfo() {
  const [activeTab, setActiveTab] = useState<Tab>('positions');
  const theme = useTheme();

  const handleTabPress = (tab: Tab) => {
    setActiveTab(tab);
  };

  return (
    <CardContainer padding="$0">
      <XStack>
        <TabButton
          label="Positions"
          isActive={activeTab === 'positions'}
          onPress={() => handleTabPress('positions')}
        />
        <TabButton
          label="History"
          isActive={activeTab === 'history'}
          onPress={() => handleTabPress('history')}
        />
      </XStack>
      <Separator />
      <YStack
        height={200}
        justifyContent="center"
        alignItems="center"
        padding="$4"
        bg="$background02"
      >
        <YStack alignItems="center" gap="$2">
          <Ban size={24} color={theme.color8} />
          <Text color="$color9" fontFamily="$interMedium" fontSize="$3" textAlign="center">
            {activeTab === 'positions' ? 'no open positions yet' : 'no transaction history yet'}
          </Text>
        </YStack>
      </YStack>
    </CardContainer>
  );
}

interface TabButtonProps {
  label: string;
  isActive: boolean;
  onPress: () => void;
}

function TabButton({ label, isActive, onPress }: TabButtonProps) {
  return (
    <XStack
      flex={1}
      height={48}
      alignItems="center"
      justifyContent="center"
      borderBottomWidth={2}
      borderBottomColor={isActive ? '$accent9' : 'transparent'}
      pressStyle={{ opacity: 0.7 }}
      onPress={onPress}
    >
      <Text
        fontFamily={isActive ? '$interSemiBold' : '$interRegular'}
        color={isActive ? '$accent9' : '$color9'}
      >
        {label}
      </Text>
    </XStack>
  );
}
