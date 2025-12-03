import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { toast } from 'sonner-native';
import { Sheet, YStack } from 'tamagui';
import { useTelemetry } from '../../features/telemetry/hooks/useTelemetry';
import { Button } from '../global/Button';
import { Heading } from '../global/Heading';
import { Input } from '../global/Input';
import { Text } from '../global/Text';

interface LoginFeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function LoginFeedbackModal({ open, onOpenChange }: LoginFeedbackModalProps) {
  const { trackEvent } = useTelemetry();
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setFeedback('');
    }
  }, [open]);

  const isValid = feedback.trim().length > 0;

  const handleSubmit = async () => {
    if (!isValid || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await trackEvent('login_alternative_requested', {
        feedback: feedback.trim(),
      });
      toast.success('Thanks for your feedback!');
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet
      modal
      native
      open={open}
      onOpenChange={(isOpen: boolean) => {
        if (!isOpen) onOpenChange(false);
      }}
      snapPoints={[65]}
      position={0}
      dismissOnSnapToBottom
      dismissOnOverlayPress
      zIndex={100000}
    >
      <Sheet.Overlay
        enterStyle={{ opacity: 0 }}
        exitStyle={{ opacity: 0 }}
        backgroundColor="rgba(0,0,0,0.6)"
      />
      <Sheet.Frame backgroundColor="$background" borderTopLeftRadius="$6" borderTopRightRadius="$6">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          {/* Handle bar */}
          <YStack paddingTop="$2" paddingBottom="$3">
            <YStack
              height={5}
              width={40}
              backgroundColor="$gray9"
              opacity={0.5}
              alignSelf="center"
              borderRadius="$12"
            />
          </YStack>

          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Title */}
            <Heading.H6 color="$color12" marginBottom="$3">
              Suggest a Login Method
            </Heading.H6>

            {/* Description */}
            <Text.Footnote color="$color10" marginBottom="$4">
              Let us know which login method you&apos;d prefer. Your feedback helps us improve!
            </Text.Footnote>

            {/* Input */}
            <YStack
              backgroundColor="$gray3"
              borderRadius="$4"
              paddingHorizontal="$3"
              paddingVertical="$2"
              marginBottom="$4"
            >
              <Input
                placeholder="Enter your suggestion..."
                value={feedback}
                onChangeText={setFeedback}
                multiline
                numberOfLines={3}
                style={{ textAlignVertical: 'top' }}
                minHeight={80}
              />
            </YStack>

            {/* Submit Button */}
            <Button.Filled level="lg" onPress={handleSubmit} disabled={!isValid || isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </Button.Filled>
          </ScrollView>
        </KeyboardAvoidingView>
      </Sheet.Frame>
    </Sheet>
  );
}
