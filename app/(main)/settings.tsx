import { clearAgentSigner } from '@/lib/hyperliquid/agent';
import { useAppKit, useAppKitAccount } from '@reown/appkit-ethers-react-native';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { Button, Text, YStack } from 'tamagui';

type RevokeStatus = {
  type: 'success' | 'error';
  message: string;
};

export default function Index() {
  const { open } = useAppKit();
  const { address } = useAppKitAccount();
  const [revoking, setRevoking] = useState(false);
  const [status, setStatus] = useState<RevokeStatus | null>(null);

  const performRevoke = useCallback(async () => {
    if (!address) {
      return;
    }

    setRevoking(true);
    setStatus(null);

    try {
      await clearAgentSigner(address);
      setStatus({
        type: 'success',
        message: 'Agent revoked locally. You will be asked to approve again next time.',
      });
    } catch (error) {
      setStatus({
        type: 'error',
        message: 'Failed to revoke agent. Please try again.',
      });
    } finally {
      setRevoking(false);
    }
  }, [address]);

  const handleRevokePress = useCallback(() => {
    if (!address) {
      setStatus({
        type: 'error',
        message: 'Connect your wallet before revoking the agent.',
      });
      return;
    }

    Alert.alert(
      'Revoke agent?',
      'This removes the stored agent key on this device. You will need to approve again later.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            void performRevoke();
          },
        },
      ],
    );
  }, [address, performRevoke]);

  return (
    <YStack flex={1} justifyContent="center" alignItems="center" padding="$4" gap="$3">
      <Text fontSize="$6" fontFamily="$interSemiBold">
        Settings
      </Text>
      {status ? (
        <Text color={status.type === 'success' ? '$green10' : '$red10'} textAlign="center">
          {status.message}
        </Text>
      ) : undefined}
      <Button onPress={handleRevokePress} disabled={!address || revoking} variant="outlined">
        {revoking ? 'Revoking...' : 'Revoke Agent'}
      </Button>
      <Button onPress={() => open()}>Disconnect Wallet</Button>
    </YStack>
  );
}
