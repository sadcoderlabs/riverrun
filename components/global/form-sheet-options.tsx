import { router } from 'expo-router';
import { Platform } from 'react-native';
import { CloseButton } from './close-button';
import { ModalHeaderGrabber } from './modal-header-grabber';

export const formSheetOptions = (title: string) => ({
  presentation: 'formSheet' as const,
  title,
  headerShadowVisible: false,
  headerShown: true,
  sheetGrabberVisible: true,
  sheetCornerRadius: 20,
  headerRight: () => <CloseButton onPress={() => router.dismiss()} />,
  sheetAllowedDetents: Platform.OS === 'android' ? [0.6, 1] : ('fitToContents' as const),
  animation: 'slide_from_bottom' as const,
  ...(Platform.OS === 'android' && { header: () => <ModalHeaderGrabber title={title} /> }),
});
