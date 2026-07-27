import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useFamily } from './FamilyContext';

export interface PlanFeatures {
  max_members: number;
  max_storage_bytes: number;
  ai_insights: boolean;
  advanced_analytics: boolean;
  data_export: boolean;
}

export interface Subscription {
  id: string;
  userId: string | null;
  familyId: string | null;
  planId: string;
  status: 'active' | 'expired' | 'canceled';
  startedAt: string;
  expiresAt: string | null;
  autoRenew: boolean;
  paymentReference: string | null;
  couponUsed: string | null;
}

export type PremiumState = 'free' | 'personal_premium' | 'family_premium' | 'expired' | 'trial' | 'grace_period';

export interface SubscriptionContextType {
  planId: string;
  status: string;
  paymentReference: string | null;
  premiumState: PremiumState;
  isPremium: boolean;
  expiresAt: string | null;
  features: PlanFeatures;
  loading: boolean;
  redeemCoupon: (code: string) => Promise<{ success: boolean; message: string }>;
  subscribeToPlan: (planId: string, paymentMethod: string, paymentRef: string) => Promise<{ success: boolean; message: string }>;
  createRazorpayOrder: (planId: string) => Promise<{ success: boolean; orderId?: string; amount?: number; message?: string }>;
  verifyRazorpayPayment: (paymentId: string, orderId: string, signature: string, planId: string) => Promise<{ success: boolean; message: string }>;
  refreshSubscription: () => Promise<void>;
  showUpgradeModal: boolean;
  setShowUpgradeModal: (show: boolean) => void;
}

// FREE PLAN LIMITS (Constants)
export const FREE_MEMBER_LIMIT = 5;
export const FREE_STORAGE_LIMIT_BYTES = 1 * 1024 * 1024 * 1024; // 1GB

const defaultFeatures: PlanFeatures = {
  max_members: FREE_MEMBER_LIMIT,
  max_storage_bytes: FREE_STORAGE_LIMIT_BYTES,
  ai_insights: false,
  advanced_analytics: false,
  data_export: false
};

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { family } = useFamily();
  
  const [planId, setPlanId] = useState<string>('free');
  const [status, setStatus] = useState<string>('active');
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [paymentReference, setPaymentReference] = useState<string | null>(null);
  const [features, setFeatures] = useState<PlanFeatures>(defaultFeatures);
  const [loading, setLoading] = useState<boolean>(true);

  const LOCAL_CACHE_KEY = 'msfamily_subscription_cache';

  // ── Load Subscription Details ────────────────────────────────────────────
  const fetchSubscription = useCallback(async () => {
    if (!user) {
      setPlanId('free');
      setStatus('active');
      setExpiresAt(null);
      setPaymentReference(null);
      setFeatures(defaultFeatures);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let activeData = null;

      if (family?.id) {
        const { data: famData, error: famError } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('family_id', family.id)
          .eq('status', 'active')
          .maybeSingle();

        if (famError) throw famError;

        if (famData && (!famData.expires_at || new Date(famData.expires_at) > new Date())) {
          activeData = famData;
        }
      }

      if (!activeData) {
        // Fall back to personal subscription
        const { data: userData, error: userError } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .is('family_id', null)
          .eq('status', 'active')
          .maybeSingle();

        if (userError) throw userError;

        if (userData && (!userData.expires_at || new Date(userData.expires_at) > new Date())) {
          activeData = userData;
        }
      }

      let activePlanId = 'free';
      let activeStatus = 'active';
      let activeExpiresAt: string | null = null;
      let activePayRef: string | null = null;
      let activeFeatures = defaultFeatures;

      if (activeData) {
        activePlanId = activeData.plan_id;
        activeStatus = activeData.status;
        activeExpiresAt = activeData.expires_at;
        activePayRef = activeData.payment_reference || null;

        // Fetch plan features definition
        const { data: planData } = await supabase
          .from('subscription_plans')
          .select('features')
          .eq('id', activeData.plan_id)
          .maybeSingle();

        if (planData?.features) {
          activeFeatures = planData.features as unknown as PlanFeatures;
        }
      }

      setPlanId(activePlanId);
      setStatus(activeStatus);
      setExpiresAt(activeExpiresAt);
      setPaymentReference(activePayRef);
      setFeatures(activeFeatures);

      // Write to localStorage cache
      localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify({
        planId: activePlanId,
        status: activeStatus,
        expiresAt: activeExpiresAt,
        paymentReference: activePayRef,
        features: activeFeatures,
        cachedAt: new Date().toISOString()
      }));

    } catch (err) {
      console.error('Error fetching subscription details, loading from cache:', err);
      // Attempt to load from cache
      try {
        const cached = localStorage.getItem(LOCAL_CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          setPlanId(parsed.planId);
          setStatus(parsed.status);
          setExpiresAt(parsed.expiresAt);
          setPaymentReference(parsed.paymentReference);
          setFeatures(parsed.features);
          setLoading(false);
          return;
        }
      } catch (cacheErr) {
        console.error('Failed to parse subscription cache:', cacheErr);
      }

      // Default fallback
      setPlanId('free');
      setStatus('active');
      setExpiresAt(null);
      setPaymentReference(null);
      setFeatures(defaultFeatures);
    } finally {
      setLoading(false);
    }
  }, [user, family?.id]);

  // Real-time listener for subscription changes
  useEffect(() => {
    fetchSubscription();

    const handleAuthRefreshed = () => {
      console.log('[SubscriptionContext] Auth session refreshed event received. Re-fetching subscription...');
      fetchSubscription();
    };
    window.addEventListener('msfamily_auth_refreshed', handleAuthRefreshed);

    if (!user) {
      return () => {
        window.removeEventListener('msfamily_auth_refreshed', handleAuthRefreshed);
      };
    }

    const channel = supabase
      .channel('realtime_subscriptions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions',
          filter: family?.id ? `family_id=eq.${family.id}` : `user_id=eq.${user.id}`,
        },
        () => {
          fetchSubscription();
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener('msfamily_auth_refreshed', handleAuthRefreshed);
      supabase.removeChannel(channel);
    };
  }, [user, family?.id, fetchSubscription]);

  // ── Coupon Validation & Redemption (Backend RPC) ─────────────────────────
  const redeemCoupon = useCallback(async (code: string): Promise<{ success: boolean; message: string }> => {
    if (!user) return { success: false, message: 'User not authenticated' };
    
    try {
      const { data, error } = await supabase.rpc('redeem_coupon_code', {
        p_coupon_code: code.trim(),
        p_family_id: family?.id || null,
        p_user_id: user.id
      });

      if (error) throw error;
      
      const res = data as any;
      if (res.success) {
        await fetchSubscription();
        return { success: true, message: res.message || 'Coupon redeemed!' };
      } else {
        return { success: false, message: res.message || 'Failed to validate coupon code.' };
      }
    } catch (err: any) {
      console.error('Coupon redemption error:', err);
      return { success: false, message: err.message || 'Network validation error.' };
    }
  }, [user, family?.id, fetchSubscription]);

  // ── Plan Subscription Activation (Backend RPC) ───────────────────────────
  const subscribeToPlan = useCallback(async (
    targetPlanId: string,
    paymentMethod: string,
    paymentRef: string
  ): Promise<{ success: boolean; message: string }> => {
    if (!user) return { success: false, message: 'User not authenticated' };

    try {
      const { data, error } = await supabase.rpc('subscribe_to_plan', {
        p_plan_id: targetPlanId,
        p_payment_method: paymentMethod,
        p_payment_ref: paymentRef,
        p_family_id: family?.id || null,
        p_user_id: user.id
      });

      if (error) throw error;

      const res = data as any;
      if (res.success) {
        await fetchSubscription();
        return { success: true, message: res.message || 'Subscription activated!' };
      } else {
        return { success: false, message: res.message || 'Subscription activation failed.' };
      }
    } catch (err: any) {
      console.error('Subscription purchase error:', err);
      return { success: false, message: err.message || 'Network processing error.' };
    }
  }, [user, family?.id, fetchSubscription]);

  // ── Razorpay Order Creation via Edge Function ───────────────────────────
  const createRazorpayOrder = useCallback(async (
    targetPlanId: string
  ): Promise<{ success: boolean; orderId?: string; amount?: number; message?: string }> => {
    try {
      const { data, error } = await supabase.functions.invoke('razorpay-portal/create-order', {
        body: {
          plan_id: targetPlanId,
          family_id: family?.id || null,
          user_id: user?.id || null
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return {
        success: true,
        orderId: data.order_id,
        amount: data.amount
      };
    } catch (err: any) {
      console.error('Razorpay order creation error:', err);
      return { success: false, message: err.message || 'Failed to create payment order.' };
    }
  }, [user, family]);

  // ── Razorpay Payment Verification via Edge Function ──────────────────────
  const verifyRazorpayPayment = useCallback(async (
    paymentId: string,
    orderId: string,
    signature: string,
    targetPlanId: string
  ): Promise<{ success: boolean; message: string }> => {
    if (!user) return { success: false, message: 'User not authenticated' };

    try {
      const { data, error } = await supabase.functions.invoke('razorpay-portal/verify-payment', {
        body: {
          razorpay_payment_id: paymentId,
          razorpay_order_id: orderId,
          razorpay_signature: signature,
          plan_id: targetPlanId,
          family_id: family?.id || null,
          user_id: user.id
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.success) {
        await fetchSubscription();
        return { success: true, message: 'Payment verified and subscription activated!' };
      } else {
        return { success: false, message: 'Payment verification failed.' };
      }
    } catch (err: any) {
      console.error('Razorpay verification error:', err);
      return { success: false, message: err.message || 'Payment verification failed.' };
    }
  }, [user, family?.id, fetchSubscription]);

  const [showUpgradeModal, setShowUpgradeModal] = useState<boolean>(false);

  // Auto-revalidate subscription when going online
  useEffect(() => {
    const handleOnline = () => {
      console.log('[Subscription] Network online, revalidating subscription...');
      fetchSubscription();
    };

    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [fetchSubscription]);

  const premiumState = useMemo<PremiumState>(() => {
    if (planId === 'free') return 'free';

    const now = new Date();
    const expiry = expiresAt ? new Date(expiresAt) : null;

    // Check if expired
    const isExpired = status === 'expired' || (expiry && now > expiry);

    if (isExpired) {
      // 3 days grace period
      if (expiry && (now.getTime() - expiry.getTime() < 3 * 24 * 60 * 60 * 1000)) {
        return 'grace_period';
      }
      return 'expired';
    }

    // Check for trial
    if (paymentReference === 'trial' || paymentReference === 'TRIAL') {
      return 'trial';
    }

    if (planId.startsWith('family_')) {
      return 'family_premium';
    }

    if (planId.startsWith('personal_') || planId.startsWith('premium_')) {
      return 'personal_premium';
    }

    return 'free';
  }, [planId, status, expiresAt, paymentReference]);

  const isPremium = useMemo(() => {
    return premiumState !== 'free' && premiumState !== 'expired';
  }, [premiumState]);

  const contextValue = useMemo<SubscriptionContextType>(() => ({
    planId,
    status,
    paymentReference,
    premiumState,
    isPremium,
    expiresAt,
    features,
    loading,
    redeemCoupon,
    subscribeToPlan,
    createRazorpayOrder,
    verifyRazorpayPayment,
    refreshSubscription: fetchSubscription,
    showUpgradeModal,
    setShowUpgradeModal
  }), [
    planId,
    status,
    paymentReference,
    premiumState,
    isPremium,
    expiresAt,
    features,
    loading,
    redeemCoupon,
    subscribeToPlan,
    createRazorpayOrder,
    verifyRazorpayPayment,
    fetchSubscription,
    showUpgradeModal
  ]);

  return (
    <SubscriptionContext.Provider value={contextValue}>
      {children}
    </SubscriptionContext.Provider>
  );
};
