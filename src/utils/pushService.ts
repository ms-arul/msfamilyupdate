import { supabase } from '../lib/supabase';

/**
 * Send a push notification to all devices registered for a specific user.
 * @param userId - The target user's ID
 * @param title  - Notification title
 * @param body   - Notification body message
 * @param priority - Optional 'high' for call notifications
 * @param dataPayload - Custom data payload keys
 */
export async function sendPushToUser(
  userId: string,
  title?: string,
  body?: string,
  priority?: string,
  dataPayload?: Record<string, any>
): Promise<void> {
  if (!userId || (!title && !body && !dataPayload)) return;

  try {
    // Fetch all FCM tokens for the target user
    const { data: tokens, error } = await supabase
      .from('fcm_tokens')
      .select('token')
      .eq('user_id', userId);

    if (error) {
      console.warn('[Push] Failed to fetch FCM tokens:', error.message);
      return;
    }

    if (!tokens || tokens.length === 0) {
      return; // Silent — no tokens, no spam
    }

    const staleTokens: string[] = [];

    // Send notification to each registered device
    const results = await Promise.allSettled(
      tokens.map(async ({ token }) => {
        try {
          const payload: Record<string, any> = { token };
          if (title) payload.title = title;
          if (body) payload.body = body;
          if (priority) payload.priority = priority;
          if (dataPayload) payload.data = dataPayload;

          const { data, error: invokeError } = await supabase.functions.invoke('send-notification', {
            body: payload
          });

          if (invokeError) {
            // Token is invalid/expired — mark for cleanup
            staleTokens.push(token);
            return { success: false };
          }

          return { success: true, messageId: data?.messageId };
        } catch (e) {
          staleTokens.push(token);
          return { success: false };
        }
      })
    );

    // Auto-cleanup invalid tokens from DB
    if (staleTokens.length > 0) {
      try {
        await supabase
          .from('fcm_tokens')
          .delete()
          .in('token', staleTokens);
        console.log(`[Push] Cleaned up ${staleTokens.length} invalid tokens`);
      } catch (e) {
        console.warn('[Push] Token cleanup failed:', e);
      }
    }

    const successCount = results.filter(
      r => r.status === 'fulfilled' && (r as PromiseFulfilledResult<{ success: boolean }>).value?.success
    ).length;
    if (successCount > 0) {
      console.log(`[Push] Sent to ${successCount}/${tokens.length} devices for user ${userId}`);
    }
  } catch (err: any) {
    console.warn('[Push] Send error:', err.message);
  }
}

/**
 * Send a push notification to ALL family members (excluding the sender).
 * @param senderId - The sender's user ID (will be excluded)
 * @param title    - Notification title
 * @param body     - Notification body message
 */
export async function sendPushToAllFamily(
  senderId: string,
  title: string,
  body: string
): Promise<void> {
  try {
    // Get all unique tokens (excluding sender)
    const { data: tokenRows, error } = await supabase
      .from('fcm_tokens')
      .select('user_id, token')
      .neq('user_id', senderId);

    if (error || !tokenRows?.length) return;

    const staleTokens: string[] = [];

    const results = await Promise.allSettled(
      tokenRows.map(async ({ token }) => {
        try {
          const { error: invokeError } = await supabase.functions.invoke('send-notification', {
            body: { token, title, body }
          });
          
          if (invokeError) {
            staleTokens.push(token);
            return false;
          }
          return true;
        } catch {
          staleTokens.push(token);
          return false;
        }
      })
    );

    // Auto-cleanup invalid tokens
    if (staleTokens.length > 0) {
      try {
        await supabase.from('fcm_tokens').delete().in('token', staleTokens);
        console.log(`[Push] Cleaned up ${staleTokens.length} stale broadcast tokens`);
      } catch (e) {}
    }

    const sent = results.filter(
      r => r.status === 'fulfilled' && (r as PromiseFulfilledResult<boolean>).value
    ).length;
    if (sent > 0) {
      console.log(`[Push] Broadcast sent to ${sent}/${tokenRows.length} family devices`);
    }
  } catch (err: any) {
    console.warn('[Push] Broadcast error:', err.message);
  }
}
