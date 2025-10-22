import { Toast, useToastState } from '@tamagui/toast';

export const CurrentToast = () => {
  const currentToast = useToastState();

  // don't show any toast if no toast is present or it's handled natively
  if (!currentToast || currentToast.isHandledNatively) {
    return null;
  }

  return (
    <Toast
      key={currentToast.id}
      duration={currentToast.duration}
      viewportName={currentToast.viewportName}
    >
      <Toast.Title>{currentToast.title}</Toast.Title>
      {currentToast.message && <Toast.Description>{currentToast.message}</Toast.Description>}
    </Toast>
  );
};
