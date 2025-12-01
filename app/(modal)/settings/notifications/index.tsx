import { useScreenTracking } from '@/app-internal';
import { CustomHeader } from '@/app-internal/components/global';
import { Button } from '@/app-internal/components/global/Button';
import { ListItem } from '@/app-internal/components/global/ListItem';
import { ListSection } from '@/app-internal/components/global/ListSection';
import { useNotificationStatus } from '@/app-internal/features/notification/hooks/useNotificationStatus';
import { AlertTriangle } from '@tamagui/lucide-icons';
import { useState } from 'react';
import { RefreshControl } from 'react-native';
import { PortalProvider, ScrollView, Spinner, Switch, Text, View, YStack } from 'tamagui';

export default function NotificationsSettings() {
  useScreenTracking('NotificationsSettings');

  const {
    systemPermission,
    backendEnabled,
    isLoading,
    isReady,
    toggleBackendEnabled,
    openSystemSettings,
    requestSystemPermission,
    refetch,
  } = useNotificationStatus();

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  const isSystemPermissionGranted = systemPermission === 'granted';
  const isSystemPermissionDenied = systemPermission === 'denied';

  const getSystemPermissionLabel = () => {
    switch (systemPermission) {
      case 'granted':
        return 'Allowed';
      case 'denied':
        return 'Not Allowed';
      default:
        return 'Not Determined';
    }
  };

  const handleSystemPermissionAction = async () => {
    if (systemPermission === 'undetermined') {
      await requestSystemPermission();
    } else {
      openSystemSettings();
    }
  };

  return (
    <PortalProvider>
      <YStack flex={1} backgroundColor="$background">
        <CustomHeader title="Notifications" />

        {!isReady ? (
          <View flex={1} alignItems="center" justifyContent="center">
            <Spinner size="large" />
            <Text marginTop="$4" color="$color04">
              Loading notification settings...
            </Text>
          </View>
        ) : (
          <ScrollView
            flex={1}
            contentInsetAdjustmentBehavior="automatic"
            backgroundColor="$gray3"
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
          >
            <YStack backgroundColor="$gray3">
              {/* System Permission Section */}
              <ListSection label="System Permission">
                <ListItem
                  title="Push Notifications"
                  subTitle={getSystemPermissionLabel()}
                  iconAfter={
                    !isSystemPermissionGranted ? (
                      <Button.Tinted level="sm" onPress={handleSystemPermissionAction}>
                        {systemPermission === 'undetermined' ? 'Enable' : 'Settings'}
                      </Button.Tinted>
                    ) : undefined
                  }
                />
              </ListSection>

              {/* Permission Denied Warning */}
              {isSystemPermissionDenied && (
                <View mx="$4" mb="$4">
                  <YStack
                    gap="$2"
                    padding="$4"
                    backgroundColor="$yellow3"
                    borderRadius="$4"
                    borderWidth={1}
                    borderColor="$yellow6"
                  >
                    <View flexDirection="row" alignItems="center" gap="$2">
                      <AlertTriangle size={18} color="$yellow11" />
                      <Text fontFamily="$interMedium" fontSize="$4" color="$yellow11">
                        Notifications Disabled
                      </Text>
                    </View>
                    <Text fontSize="$3" color="$yellow11">
                      To receive push notifications, you need to enable them in your device
                      settings.
                    </Text>
                    <Button.Tinted
                      level="sm"
                      onPress={openSystemSettings}
                      marginTop="$2"
                      alignSelf="flex-start"
                    >
                      Open Settings
                    </Button.Tinted>
                  </YStack>
                </View>
              )}

              {/* Backend Notification Settings */}
              <ListSection label="Notification Settings">
                <ListItem
                  title="Enable Notifications"
                  subTitle={
                    !isSystemPermissionGranted
                      ? 'Enable system permission first'
                      : backendEnabled
                        ? 'You will receive notifications'
                        : 'Notifications are disabled'
                  }
                  iconAfter={
                    isLoading ? (
                      <View marginRight="$2">
                        <Spinner size="small" />
                      </View>
                    ) : (
                      <Switch
                        size="$3"
                        checked={backendEnabled}
                        onCheckedChange={toggleBackendEnabled}
                        disabled={!isSystemPermissionGranted}
                        opacity={!isSystemPermissionGranted ? 0.5 : 1}
                      >
                        <Switch.Thumb animation="quick" />
                      </Switch>
                    )
                  }
                />
              </ListSection>

              {/* Future: Granular Notification Types
              <ListSection label="Notification Types">
                <ListItem
                  title="Order Filled"
                  subTitle="When your orders are filled"
                  iconAfter={<Switch ... />}
                />
                <ListItem
                  title="Order Canceled"
                  subTitle="When your orders are canceled"
                  iconAfter={<Switch ... />}
                />
              </ListSection>
              */}
            </YStack>
          </ScrollView>
        )}
      </YStack>
    </PortalProvider>
  );
}
