import { supabase } from '../lib/supabase';

interface StorageUsageData {
  usedBytes: number;
  limitBytes: number;
  percentage: number;
  timestamp: number;
}

const STORAGE_CACHE_KEY_PREFIX = 'msfamily_storage_cache_';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes TTL

// Limits specified in requirements:
// 10 GB per user
export const USER_STORAGE_LIMIT_BYTES = 10 * 1024 * 1024 * 1024;
// 100 GB per family
export const FAMILY_STORAGE_LIMIT_BYTES = 100 * 1024 * 1024 * 1024;

/**
 * Calculates storage usage for a specific user by scanning their directories
 * in the 'transaction-proofs' and 'proofs' buckets.
 */
export async function calculateUserStorageBytes(userId: string): Promise<number> {
  let totalBytes = 0;

  try {
    // 1. Scan proofs bucket for receipts (path: userId/)
    const { data: txFiles, error: txError } = await supabase.storage
      .from('proofs')
      .list(userId, { limit: 1000 });

    if (!txError && txFiles) {
      for (const file of txFiles) {
        if (file.metadata?.size) {
          totalBytes += file.metadata.size;
        }
      }
    }

    // 2. Scan proofs bucket (path: my_proofs/userId/)
    const { data: proofFiles, error: proofError } = await supabase.storage
      .from('proofs')
      .list(`my_proofs/${userId}`, { limit: 1000 });

    if (!proofError && proofFiles) {
      for (const file of proofFiles) {
        if (file.metadata?.size) {
          totalBytes += file.metadata.size;
        }
      }
    }
  } catch (err) {
    console.error(`Error calculating storage for user ${userId}:`, err);
  }

  return totalBytes;
}

/**
 * Gets cached storage usage for a user, or fetches and caches it if missing/expired.
 */
export async function getUserStorageUsage(userId: string, forceRefresh = false): Promise<StorageUsageData> {
  const cacheKey = `${STORAGE_CACHE_KEY_PREFIX}user_${userId}`;
  
  if (!forceRefresh) {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as StorageUsageData;
        if (Date.now() - parsed.timestamp < CACHE_TTL_MS) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to read storage cache from localStorage:', e);
    }
  }

  // Fetch fresh data
  const usedBytes = await calculateUserStorageBytes(userId);
  
  let limitBytes = 1 * 1024 * 1024 * 1024; // 1 GB default (free)
  try {
    const { data: subData } = await supabase
      .from('subscriptions')
      .select('plan_id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();

    let activePlan = subData?.plan_id || 'free';

    if (activePlan === 'free') {
      const { data: memberData } = await supabase
        .from('family_members')
        .select('family_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (memberData?.family_id) {
        const { data: famSub } = await supabase
          .from('subscriptions')
          .select('plan_id')
          .eq('family_id', memberData.family_id)
          .eq('status', 'active')
          .maybeSingle();

        if (famSub?.plan_id) {
          activePlan = famSub.plan_id;
        }
      }
    }

    if (activePlan !== 'free') {
      limitBytes = 5 * 1024 * 1024 * 1024; // 5 GB (premium)
    }
  } catch (err) {
    console.warn('Failed to query subscription plan in storageService, fallback to 1GB:', err);
  }

  const percentage = Number(((usedBytes / limitBytes) * 100).toFixed(2));
  
  const data: StorageUsageData = {
    usedBytes,
    limitBytes,
    percentage,
    timestamp: Date.now(),
  };

  try {
    localStorage.setItem(cacheKey, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save storage cache to localStorage:', e);
  }

  return data;
}

/**
 * Gets storage usage for an entire family by summing the storage of all its members.
 */
export async function getFamilyStorageUsage(
  memberUserIds: string[],
  familyId: string,
  forceRefresh = false
): Promise<StorageUsageData> {
  const cacheKey = `${STORAGE_CACHE_KEY_PREFIX}family_${familyId}`;

  if (!forceRefresh) {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as StorageUsageData;
        if (Date.now() - parsed.timestamp < CACHE_TTL_MS) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to read family storage cache:', e);
    }
  }

  // Calculate combined storage for all members
  let totalBytes = 0;
  // Fetch sizes in parallel
  const sizePromises = memberUserIds.map(uid => calculateUserStorageBytes(uid));
  const sizes = await Promise.all(sizePromises);
  totalBytes = sizes.reduce((sum, size) => sum + size, 0);

  const percentage = Number(((totalBytes / FAMILY_STORAGE_LIMIT_BYTES) * 100).toFixed(2));
  
  const data: StorageUsageData = {
    usedBytes: totalBytes,
    limitBytes: FAMILY_STORAGE_LIMIT_BYTES,
    percentage,
    timestamp: Date.now(),
  };

  try {
    localStorage.setItem(cacheKey, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save family storage cache:', e);
  }

  return data;
}

/**
 * Invalidates the storage cache for a user and their family.
 */
export function invalidateStorageCache(userId: string, familyId?: string | null): void {
  try {
    localStorage.removeItem(`${STORAGE_CACHE_KEY_PREFIX}user_${userId}`);
    if (familyId) {
      localStorage.removeItem(`${STORAGE_CACHE_KEY_PREFIX}family_${familyId}`);
    }
  } catch (e) {
    console.warn('Failed to invalidate storage cache:', e);
  }
}

/**
 * Helper to format bytes to human readable format (e.g. MB, GB).
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
