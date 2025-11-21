import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
  handleSuccess: (notificationId: string) => {
    console.log('Notification handled successfully:', notificationId);
  },
  handleError: (notificationId: string, error: Error) => {
    console.log('Notification handling failed:', notificationId, error);
  },
});

interface NotificationContextType {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
  registerForPushNotifications: () => Promise<void>;
  sendLocalNotification: (
    title: string,
    body: string,
    data?: any
  ) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] =
    useState<Notifications.Notification | null>(null);

  useEffect(() => {
    registerForPushNotifications();

    // Listen for notifications received while the app is foregrounded
    const foregroundSubscription =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log('Notification received:', notification);
        setNotification(notification);
      });

    // Listen for notification responses (user taps on notification)
    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log('Notification response:', response);
        // Handle navigation or other actions when user taps notification
      });

    return () => {
      foregroundSubscription.remove();
      responseSubscription.remove();
    };
  }, []);

  const registerForPushNotifications = async () => {
    try {
      // Configure Android channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#1f3c88',
          showBadge: true,
        });
      }

      // Request permissions
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Notification permission not granted');
        return;
      }

      console.log('Notification permission granted');

      // Get token (this will work in development builds)
      try {
        const token = await Notifications.getExpoPushTokenAsync();
        setExpoPushToken(token.data);
        console.log('Expo push token:', token.data);
      } catch (tokenError) {
        console.log(
          'Cannot get push token in Expo Go. Use development build for push notifications.'
        );
      }
    } catch (error) {
      console.error('Notification setup failed:', error);
    }
  };

  const sendLocalNotification = async (
    title: string,
    body: string,
    data?: any
  ) => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data || {
            timestamp: Date.now(),
            type: 'local',
          },
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null, // Show immediately
      });
      console.log('Local notification sent:', title);
    } catch (error) {
      console.error('Failed to send local notification:', error);
    }
  };

  const value: NotificationContextType = {
    expoPushToken,
    notification,
    registerForPushNotifications,
    sendLocalNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      'useNotifications must be used within a NotificationProvider'
    );
  }
  return context;
}
