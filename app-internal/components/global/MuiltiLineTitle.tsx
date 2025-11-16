import { Platform } from 'react-native';
import { Text as TamaguiText, YStack } from 'tamagui';
import { Text } from './Text';

export default function MultiLineTitle({ title, subtitle }: { title?: string; subtitle?: string }) {
  return (
    <YStack alignItems={'center'} justifyContent="center">
      <Text
        fontFamily={Platform.OS === 'android' ? '$interMedium' : undefined}
        fontSize={Platform.OS === 'android' ? '$4' : '$3'}
        fontWeight={'600'}
      >
        {title}
      </Text>
      <TamaguiText fontSize={'$3'} mt={-3} color={'$color06'} fontFamily={'$skMono'}>
        {subtitle}
      </TamaguiText>
    </YStack>
  );
}
