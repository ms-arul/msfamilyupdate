import { useEffect, useState, useRef } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export function usePushNotifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const registeredRef = useRef<boolean>(false);

  useEffect(() => {
    // Push notifications only work on actual Native devices, not web
    if (!Capacitor.isNativePlatform()) return;
    if (!user?.id) return;
    if (registeredRef.current) return;

    const init = async () => {
      try {
        const permStatus = await PushNotifications.checkPermissions();
        if (permStatus.receive === 'prompt') {
          const result = await PushNotifications.requestPermissions();
          if (result.receive !== 'granted') {
            console.warn('Push notification permission denied');
            return;
          }
        } else if (permStatus.receive !== 'granted') {
          console.warn('Push notification permission not granted');
          return;
        }

        // Register for push notifications
        await PushNotifications.register();
        registeredRef.current = true;

        // Listen for successful registration (FCM token received)
        await PushNotifications.addListener('registration', async (token) => {
          console.log('FCM Token received:', token.value);
          setFcmToken(token.value);

          if (user?.id) {
            // Store token in fcm_tokens table (upsert to prevent duplicates)
            try {
              const { error } = await supabase
                .from('fcm_tokens')
                .upsert(
                  { user_id: user.id, token: token.value },
                  { onConflict: 'user_id,token' }
                );
              if (error) {
                console.warn('Failed to store FCM token in fcm_tokens:', error.message);
              } else {
                console.log('FCM token stored in fcm_tokens successfully');
              }
            } catch (err) {
              console.error('FCM token storage error:', err);
            }
          }
        });

        // Listen for registration errors
        await PushNotifications.addListener('registrationError', (error) => {
          console.error('Push registration error:', error);
        });

        // Listen for incoming push notifications (foreground)
        await PushNotifications.addListener('pushNotificationReceived', async (notification) => {
          console.log('Push notification received:', notification);

          // Store in Supabase notifications table for in-app display
          if (user?.id) {
            try {
              await supabase.from('notifications').insert({
                user_id: user.id,
                title: notification.title || 'Notification',
                body: notification.body || '',
                type: notification.data?.type || 'push',
                is_read: false,
              });
            } catch (err) {
              console.warn('Failed to store push notification:', err);
            }
          }
        });

        // Listen for notification tap actions (background/killed → user taps)
        await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
          console.log('Push notification action:', action);
          const route = action.notification?.data?.route;
          if (route && navigate) {
            navigate(route);
          } else {
            navigate('/notifications');
          }
        });

      } catch (err) {
        console.warn('Push Notifications init failed:', err);
      }
    };

    init();

    return () => {
      PushNotifications.removeAllListeners();
    };
  }, [user?.id, navigate]);

  return { fcmToken };
}
