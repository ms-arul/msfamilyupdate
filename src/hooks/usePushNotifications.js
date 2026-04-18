import { useEffect, useState } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export function usePushNotifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [fcmToken, setFcmToken] = useState(null);

  useEffect(() => {
    // Push notifications only work on actual Native devices, not web
    if (!Capacitor.isNativePlatform()) return;

    let isMounted = true;

    const registerPush = async () => {
      try {
        // Request permissions
        let permStatus = await PushNotifications.checkPermissions();
        
        if (permStatus.receive === 'prompt') {
          permStatus = await PushNotifications.requestPermissions();
        }

        if (permStatus.receive !== 'granted') {
          console.log('User denied push permission');
          return;
        }

        // Register with Apple/Google to receive token
        await PushNotifications.register();
      } catch (error) {
        console.error('Error registering push notifications:', error);
      }
    };

    const addListeners = async () => {
      // Registration successful
      await PushNotifications.addListener('registration', async (token) => {
        if (!isMounted) return;
        setFcmToken(token.value);
        console.log('Push registration success, token:', token.value);
        
        // Save the token to Supabase (using the existing `expo_push_token` column since the edge function targets it)
        // or a dedicated `fcm_token` column. We will use `expo_push_token` to minimize schema changes.
        if (user) {
          try {
            await supabase
              .from('profiles')
              .update({ expo_push_token: token.value })
              .eq('id', user.id);
          } catch (err) {
            console.error('Failed to save push token to DB:', err);
          }
        }
      });

      // Registration failed
      await PushNotifications.addListener('registrationError', (error) => {
        console.error('Push registration error:', error);
      });

      // Show notification if received while app is in foreground
      await PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('Push received in foreground:', notification);
        // You could trigger a custom toast here if you want
        // or rely on the Realtime listener in Notifications.jsx
      });

      // Handle notification click (Deep linking)
      await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('Push action performed:', notification);
        
        const data = notification.notification.data;
        
        // Example: data = { screen: 'Notifications' }
        if (data?.screen === 'Notifications') {
          navigate('/notifications');
        } else {
          // Default behavior on tap is to go to notifications or dashboard
          navigate('/notifications');
        }
      });
    };

    registerPush();
    addListeners();

    return () => {
      isMounted = false;
      if (Capacitor.isNativePlatform()) {
        PushNotifications.removeAllListeners();
      }
    };
  }, [user, navigate]);

  return { fcmToken };
}
