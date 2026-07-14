import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  CreditCard,
  Tag,
  Loader2,
  AlertCircle,
  CheckCircle,
  Calendar,
  Layers,
  History,
  Info,
  ShieldCheck,
  UserCheck,
  ChevronRight,
  TrendingUp,
  ArrowRight,
  ShieldAlert,
  Zap,
} from 'lucide-react';
import { useSubscription } from '../context/SubscriptionContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useFamily } from '../context/FamilyContext';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

// Spring animation configs
const SPRING_SOFT = { type: 'spring', stiffness: 380, damping: 30 } as const;

// Glass styles
const glass = {
  card: 'bg-white/[0.72] dark:bg-white/[0.045] backdrop-blur-2xl border border-white/80 dark:border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_32px_rgba(0,0,0,0.45)]',
  inner: 'bg-white/50 dark:bg-white/[0.03] backdrop-blur-xl border border-white/60 dark:border-white/[0.06]',
};

export default function SubscriptionPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { family, isAdmin } = useFamily();
  const navigate = useNavigate();

  const {
    planId,
    isPremium,
    expiresAt,
    loading: subLoading,
    redeemCoupon,
    createRazorpayOrder,
    verifyRazorpayPayment,
    refreshSubscription,
  } = useSubscription();

  // Local UI & billing selector states
  const [planType, setPlanType] = useState<'personal' | 'family'>('family');
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('yearly');

  // Coupon form states
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponSuccess, setCouponSuccess] = useState<string | null>(null);
  const [isRedeeming, setIsRedeeming] = useState(false);

  // Payment states
  const [isPaying, setIsPaying] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // History logs states
  const [payments, setPayments] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Dynamically load Razorpay checkout script
  useEffect(() => {
    if (document.getElementById('razorpay-checkout-script')) return;
    const script = document.createElement('script');
    script.id = 'razorpay-checkout-script';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  // Fetch payment logs from Supabase
  const fetchPaymentHistory = useCallback(async () => {
    try {
      setLoadingHistory(true);
      let query = supabase.from('payment_history').select('*');
      if (family?.id) {
        query = query.or(`family_id.eq.${family.id},user_id.eq.${user?.id}`);
      } else {
        query = query.eq('user_id', user?.id).is('family_id', null);
      }
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      setPayments(data || []);
    } catch (err) {
      console.error('Error fetching payment history:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, [user?.id, family?.id]);

  useEffect(() => {
    if (user?.id) {
      fetchPaymentHistory();
    }
  }, [user?.id, fetchPaymentHistory]);

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim() || isRedeeming) return;

    setIsRedeeming(true);
    setCouponError(null);
    setCouponSuccess(null);

    try {
      const res = await redeemCoupon(couponCode);
      if (res.success) {
        setCouponSuccess(res.message);
        setCouponCode('');
        await refreshSubscription();
        await fetchPaymentHistory();
      } else {
        setCouponError(res.message);
      }
    } catch (err: any) {
      setCouponError(err.message || 'Error validating coupon.');
    } finally {
      setIsRedeeming(false);
    }
  };

  const handlePay = async () => {
    setIsPaying(true);
    setPaymentError(null);

    try {
      const targetPlan = planType === 'personal'
        ? (billingInterval === 'monthly' ? 'personal_monthly' : 'personal_yearly')
        : (billingInterval === 'monthly' ? 'family_monthly' : 'family_yearly');

      // 1. Create Razorpay order on backend
      const orderRes = await createRazorpayOrder(targetPlan);
      if (!orderRes.success || !orderRes.orderId) {
        throw new Error(orderRes.message || 'Failed to initialize payment.');
      }

      // 2. Verify Razorpay library loaded
      if (!(window as any).Razorpay) {
        throw new Error('Payment gateway library is loading. Please try again in a few seconds.');
      }

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: orderRes.amount,
        currency: "INR",
        name: "MS Family Premium",
        description: planType === 'family' ? "Family Premium Subscription" : "Personal Premium Subscription",
        image: "/mslogo.png",
        order_id: orderRes.orderId,
        handler: async function (response: any) {
          try {
            setIsPaying(true);
            setPaymentError(null);

            // 3. Verify signature on backend
            const verifyRes = await verifyRazorpayPayment(
              response.razorpay_payment_id,
              response.razorpay_order_id,
              response.razorpay_signature,
              targetPlan
            );

            if (verifyRes.success) {
              setPaymentSuccess(true);
              await refreshSubscription();
              await fetchPaymentHistory();
              setTimeout(() => {
                setPaymentSuccess(false);
              }, 3000);
            } else {
              setPaymentError(verifyRes.message);
            }
          } catch (err: any) {
            setPaymentError(err.message || 'Payment verification failed.');
          } finally {
            setIsPaying(false);
          }
        },
        prefill: {
          email: user?.email || '',
        },
        theme: {
          color: '#6366f1',
        },
        modal: {
          ondismiss: function () {
            setIsPaying(false);
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (resp: any) {
        setPaymentError(resp.error?.description || 'Payment failed.');
        setIsPaying(false);
      });
      rzp.open();

    } catch (err: any) {
      setPaymentError(err.message || 'Payment processing failed.');
      setIsPaying(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 relative z-10 overflow-hidden">
      
      {/* Background Glows */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-primary-500/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-secondary-500/5 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2.5">
          <Sparkles className="text-primary-500 animate-pulse" size={24} />
          {t('Subscription Management')}
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {t('Manage your personal or family subscription plans, billing cycle, coupons, and payments history.')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column: Plan Status & Coupon Code */}
        <div className="md:col-span-1 space-y-6">
          
          {/* Active Plan Status Card */}
          <div className={`${glass.card} rounded-3xl p-5 relative overflow-hidden`}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary-500/10 to-transparent rounded-full blur-2xl" />
            
            <span className="text-[9px] font-bold text-primary-500 uppercase tracking-widest block mb-2">{t('Active Membership')}</span>
            
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-3 rounded-2xl ${isPremium ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-100 dark:bg-white/[0.04] text-slate-500'} shrink-0`}>
                {isPremium ? <ShieldCheck size={24} /> : <UserCheck size={24} />}
              </div>
              <div>
                <h3 className="font-extrabold text-slate-800 dark:text-slate-100 capitalize leading-tight">
                  {planId === 'personal_monthly' ? t('Personal Monthly') :
                   planId === 'personal_yearly' ? t('Personal Yearly') :
                   planId === 'family_monthly' ? t('Family Monthly') :
                   planId === 'family_yearly' ? t('Family Yearly') :
                   t('Free Tier')}
                </h3>
                <span className="text-[10px] text-slate-400 font-bold block mt-0.5 uppercase">
                  {isPremium ? t('Premium Status') : t('Limited Account')}
                </span>
              </div>
            </div>

            <div className="space-y-3.5 border-t border-slate-200/50 dark:border-white/5 pt-4">
              {expiresAt && (
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">{t('Renewal Date')}</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">{new Date(expiresAt).toLocaleDateString()}</span>
                </div>
              )}
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">{t('Price / Cycle')}</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {planId.includes('family') ? (planId.includes('yearly') ? '₹299/yr' : '₹29/mo') :
                   planId.includes('personal') ? (planId.includes('yearly') ? '₹99/yr' : '₹9/mo') :
                   '₹0'}
                </span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">{t('Billing Mode')}</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {planId.includes('family') ? t('Family Protected') :
                   planId.includes('personal') ? t('Personal Access') :
                   t('Individual')}
                </span>
              </div>
            </div>

            {paymentSuccess && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-bold text-center flex items-center justify-center gap-1.5"
              >
                <CheckCircle size={12} /> {t('Payment Verified Successfully!')}
              </motion.div>
            )}
          </div>

          {/* Coupon Code Panel */}
          <div className={`${glass.card} rounded-3xl p-5`}>
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-2">{t('Promo & Coupons')}</span>
            <p className="text-[10px] text-slate-400 mb-4">{t('Redeem a promo code to unlock premium subscriptions.')}</p>
            
            <form onSubmit={handleRedeem} className="space-y-3">
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder={t('Enter coupon code')}
                  className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 focus:border-primary-500 rounded-2xl py-2.5 pl-9 pr-3 text-xs font-semibold focus:outline-none transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={isRedeeming || !couponCode.trim()}
                className="w-full py-2.5 rounded-2xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs hover:opacity-90 transition-opacity flex items-center justify-center disabled:opacity-40"
              >
                {isRedeeming ? <Loader2 size={14} className="animate-spin" /> : t('Redeem Coupon')}
              </button>
            </form>

            {couponError && (
              <p className="text-[10px] text-rose-500 font-medium mt-2 flex items-center gap-1">
                <AlertCircle size={10} /> {couponError}
              </p>
            )}
            {couponSuccess && (
              <p className="text-[10px] text-emerald-500 font-medium mt-2 flex items-center gap-1">
                <CheckCircle size={10} /> {couponSuccess}
              </p>
            )}
          </div>

        </div>

        {/* Right Column: Upgrade Options (Full Page view) */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Upgrade Cards & Purchase Module */}
          <div className={`${glass.card} rounded-3xl p-5 sm:p-6 space-y-5`}>
            
            <div>
              <span className="text-[9px] font-bold text-primary-500 uppercase tracking-widest block mb-1">{t('Upgrade Portal')}</span>
              <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 leading-tight">
                {t('Subscribe & Unlock Premium Features')}
              </h2>
            </div>

            {/* Plan Type Selector */}
            <div className="flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl">
              <button
                type="button"
                onClick={() => setPlanType('personal')}
                className={`flex-1 py-2.5 rounded-xl font-extrabold text-xs transition-all ${
                  planType === 'personal'
                    ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 bg-transparent'
                }`}
              >
                {t('Personal Premium')}
              </button>
              <button
                type="button"
                onClick={() => setPlanType('family')}
                className={`flex-1 py-2.5 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 relative ${
                  planType === 'family'
                    ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 bg-transparent'
                }`}
              >
                {t('Family Premium')}
                <span className="px-1.5 py-0.5 rounded-md bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[8px] font-black uppercase tracking-wider shrink-0 shadow-sm">
                  {t('Popular')}
                </span>
              </button>
            </div>

            {/* Billing Interval Toggle Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Yearly Card */}
              <div
                onClick={() => setBillingInterval('yearly')}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
                  billingInterval === 'yearly'
                    ? 'border-primary-500 bg-primary-500/[0.03] dark:bg-primary-500/[0.05]'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-transparent'
                }`}
              >
                <span className="absolute -top-2.5 right-4 px-2 py-0.5 rounded-full bg-gradient-to-r from-primary-500 to-indigo-500 text-white font-black text-[8px] uppercase tracking-wider">
                  {planType === 'family' ? t('Save 15%') : t('Save 8%')}
                </span>
                <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100">{t('Yearly Membership')}</h4>
                <p className="text-[9px] text-slate-400 mt-0.5">{t('Billed annually')}</p>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-xl font-black text-primary-500">
                    {planType === 'personal' ? '₹99' : '₹299'}
                  </span>
                  <span className="text-[10px] text-slate-400">/{t('year')}</span>
                </div>
              </div>

              {/* Monthly Card */}
              <div
                onClick={() => setBillingInterval('monthly')}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                  billingInterval === 'monthly'
                    ? 'border-primary-500 bg-primary-500/[0.03] dark:bg-primary-500/[0.05]'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-transparent'
                }`}
              >
                <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100">{t('Monthly Membership')}</h4>
                <p className="text-[9px] text-slate-400 mt-0.5">{t('Pay as you go')}</p>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-xl font-black text-slate-800 dark:text-slate-100">
                    {planType === 'personal' ? '₹9' : '₹29'}
                  </span>
                  <span className="text-[10px] text-slate-400">/{t('month')}</span>
                </div>
              </div>

            </div>

            {/* Subtitle Message Banner */}
            <div className="p-3.5 rounded-2xl bg-primary-500/[0.03] dark:bg-primary-500/[0.05] border border-primary-500/10">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 text-center leading-relaxed">
                {planType === 'personal'
                  ? t('Best for individual users.')
                  : t('One subscription protects and manages your entire family.')}
              </p>
            </div>

            {/* Dynamic Features List Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-slate-200/50 dark:border-white/5 pt-4">
              {(planType === 'personal'
                ? [
                    'Premium access for 1 user',
                    'Cloud Sync & Backup',
                    'Smart Bill Management',
                    'Advanced Analytics & Exports',
                    'AI Smart Insights',
                    'Ad-Free Glass Interface',
                    'Priority Support'
                  ]
                : [
                    'Unlimited family members',
                    'One subscription for family',
                    'Premium access for all members',
                    'Cloud Sync',
                    'Smart Bill Management',
                    'Live Family Tracking',
                    'Premium Reports',
                    'Priority Support'
                  ]
              ).map((feat, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <Zap size={11} className="text-amber-500 shrink-0 animate-pulse" />
                  <span>{t(feat)}</span>
                </div>
              ))}
            </div>

            {/* Warnings and validation errors */}
            {paymentError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[11px] font-medium flex items-center gap-2">
                <AlertCircle size={14} />
                <span>{paymentError}</span>
              </div>
            )}

            {planType === 'family' && !family && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[11px] font-medium flex items-center gap-2">
                <AlertCircle size={14} />
                <span>{t('Please create or join a family group first to upgrade to Family Premium.')}</span>
              </div>
            )}

            {planType === 'family' && family && !isAdmin && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[11px] font-medium flex items-center gap-2">
                <AlertCircle size={14} />
                <span>{t('Only family admins can purchase or manage Family Premium.')}</span>
              </div>
            )}

            {/* Pay Action Button */}
            <button
              type="button"
              onClick={handlePay}
              disabled={isPaying || (planType === 'family' && (!family || !isAdmin))}
              className="w-full py-3.5 rounded-2xl bg-primary-500 hover:bg-primary-600 text-white font-extrabold text-sm shadow-md shadow-primary-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {isPaying ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>{t('Processing Simulated Payment...')}</span>
                </>
              ) : (
                <>
                  <CreditCard size={16} />
                  <span>{t('Pay')} {billingInterval === 'yearly' ? (planType === 'personal' ? '₹99' : '₹299') : (planType === 'personal' ? '₹9' : '₹29')} {t('Securely')}</span>
                </>
              )}
            </button>

          </div>

        </div>

      </div>

      {/* Payment History List */}
      <div className={`${glass.card} rounded-3xl p-5 sm:p-6 overflow-hidden`}>
        <div className="flex items-center justify-between gap-3 mb-4">
          <h3 className="font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2 text-sm uppercase tracking-widest">
            <History size={16} className="text-primary-500" />
            {t('Payment History')}
          </h3>
          <button
            onClick={fetchPaymentHistory}
            disabled={loadingHistory}
            className="p-2 rounded-xl glass-btn text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 transition-colors"
          >
            <History size={14} className={loadingHistory ? 'animate-spin' : ''} />
          </button>
        </div>

        {loadingHistory ? (
          <div className="py-12 flex justify-center items-center">
            <Loader2 className="animate-spin text-primary-500" size={24} />
          </div>
        ) : payments.length === 0 ? (
          <div className="py-10 text-center">
            <Info size={24} className="mx-auto text-slate-400 mb-2" />
            <p className="text-xs text-slate-400">{t('No payment records found.')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="text-slate-400 border-b border-slate-200/50 dark:border-white/5 pb-2">
                  <th className="pb-3 font-semibold">{t('Date')}</th>
                  <th className="pb-3 font-semibold">{t('Plan')}</th>
                  <th className="pb-3 font-semibold">{t('Reference')}</th>
                  <th className="pb-3 font-semibold">{t('Method')}</th>
                  <th className="pb-3 font-semibold text-right">{t('Amount')}</th>
                  <th className="pb-3 font-semibold text-right">{t('Status')}</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b border-slate-200/50 dark:border-white/5 hover:bg-slate-50/40 dark:hover:bg-white/[0.01] transition-colors">
                    <td className="py-3 text-slate-600 dark:text-slate-300">
                      {new Date(p.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 font-bold text-slate-800 dark:text-slate-200 capitalize">
                      {t(p.plan_id.replace(/_/g, ' '))}
                    </td>
                    <td className="py-3 text-slate-500 dark:text-slate-400 font-mono text-[10px]">
                      {p.payment_reference || '-'}
                    </td>
                    <td className="py-3 capitalize text-slate-600 dark:text-slate-300">
                      {p.payment_method}
                    </td>
                    <td className="py-3 text-right font-extrabold text-slate-800 dark:text-slate-100">
                      ₹{p.amount}
                    </td>
                    <td className="py-3 text-right">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                        p.status === 'success' ? 'bg-success-500/10 text-success-500' :
                        p.status === 'failed' ? 'bg-rose-500/10 text-rose-500' :
                        'bg-slate-100 dark:bg-white/[0.04] text-slate-500'
                      }`}>
                        {t(p.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

    </div>
  );
}
