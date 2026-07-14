<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 12</div>
    <h1>Firebase Push &amp; Reminder SOP</h1>
    <div class="chapter-subtitle">Notification Broker Services, Retries, and Token Expirations</div>
</div>

## SOP-NOTIF-01: FCM Token Sync &amp; Maintenance

### 1. Purpose
Maintains FCM tokens to ensure push notifications are delivered reliably to mobile clients.

### 2. Step-by-Step Procedure
1. **Token Refresh:** When a user launches the app, compare the client device token with the `fcm_tokens` record:
   ```sql
   SELECT token FROM public.fcm_tokens WHERE user_id = 'USER_UUID' AND device_id = 'DEVICE_UUID';
   ```
2. **Invalid Token Cleanup:** Remove inactive tokens (e.g., those returning `UNREGISTERED` errors from FCM API calls):
   ```sql
   DELETE FROM public.fcm_tokens WHERE last_used < now() - INTERVAL '60 days';
   ```
3. **Queue Sweeper:** Run cron checks to identify and retry failed notification queue tasks.
