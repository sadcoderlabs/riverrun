import type { AgentClientContext } from '@/lib/hyperliquid/agent';
import { useCallback, useMemo, useState } from 'react';
import { ButtonProps, Text } from 'tamagui';
import { Button } from '../global/button';

import { useApprovalGate } from './ApprovalGateProvider';

interface GateButtonProps extends Omit<ButtonProps, 'onPress'> {
  title?: string;
  loadingTitle?: string;
  loading?: boolean;
  buttonSize?: 'sm' | 'md' | 'lg';
  onPressApproved: (context: AgentClientContext) => Promise<void> | void;
}

export function GateButton({
  title,
  loadingTitle = 'Processing...',
  loading = false,
  buttonSize = 'md',
  onPressApproved,
  disabled,
  children,
  ...buttonProps
}: GateButtonProps) {
  const { requiresAgentApproval, isCheckingApproval, withAgentApproval } = useApprovalGate();
  const [isRunning, setIsRunning] = useState(false);

  const busy = loading || isRunning || isCheckingApproval;
  const effectiveDisabled = disabled || busy;

  const buttonVisuals = useMemo(() => {
    if (effectiveDisabled && !busy) {
      return {
        backgroundColor: '$gray6',
        borderColor: '$gray7',
        textColor: '$color12',
      } as const;
    }

    if (requiresAgentApproval === false) {
      return {
        backgroundColor: '$accent9',
        borderColor: '$accent9',
        textColor: '$color1',
      } as const;
    }

    if (requiresAgentApproval === true) {
      return {
        backgroundColor: '$gray6',
        borderColor: '$gray7',
        textColor: '$color12',
      } as const;
    }

    return {
      backgroundColor: '$accent9',
      borderColor: '$accent9',
      textColor: '$color1',
    } as const;
  }, [busy, effectiveDisabled, requiresAgentApproval]);

  const label = busy ? loadingTitle : (title ?? 'Submit');

  const handlePress = useCallback(() => {
    if (effectiveDisabled) {
      return;
    }

    setIsRunning(true);
    void withAgentApproval(async context => {
      await Promise.resolve(onPressApproved(context));
    })
      .catch(error => {
        if (error instanceof Error) {
          console.error('GateButton action failed', error);
        }
      })
      .finally(() => {
        setIsRunning(false);
      });
  }, [effectiveDisabled, onPressApproved, withAgentApproval]);

  return (
    <Button
      {...buttonProps}
      level={buttonSize}
      disabled={effectiveDisabled}
      backgroundColor={buttonVisuals.backgroundColor}
      borderColor={buttonVisuals.borderColor}
      borderWidth={1}
      pressStyle={{ opacity: 0.8 }}
      onPress={handlePress}
    >
      {children ?? (
        <Text
          fontFamily="$interSemiBold"
          fontSize={buttonSize === 'sm' ? '$2' : '$3'}
          color={buttonVisuals.textColor}
        >
          {label}
        </Text>
      )}
    </Button>
  );
}
