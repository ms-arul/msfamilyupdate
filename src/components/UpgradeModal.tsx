import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import {
  X,
  CheckCircle,
  Sparkles,
  CreditCard,
  Tag,
  Loader2,
  AlertCircle,
  TrendingUp,
  Zap,
  HelpCircle,
} from 'lucide-react';
import { useSubscription } from '../context/SubscriptionContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useFamily } from '../context/FamilyContext';
import { registerBackButtonHandler } from '../utils/backButtonManager';

export default function UpgradeModal() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { family, isAdmin } = useFamily();
  const { 
    showUpgradeModal, 
    setShowUpgradeModal, 
    redeemCoupon, 
    createRazorpayOrder, 
    verifyRazorpayPayment, 
    planId 
  } = useSubscription();

  useEffect(() => {
    if (showUpgradeModal) {
      return registerBackButtonHandler('upgrade_modal', 100, () => {
        setShowUpgradeModal(false);
        return true;
      });
    }
  }, [showUpgradeModal, setShowUpgradeModal]);

  const [planType, setPlanType] = useState<'personal' | 'family'>('family');
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('yearly');
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponSuccess, setCouponSuccess] = useState<string | null>(null);
  const [isRedeeming, setIsRedeeming] = useState(false);

  const [isPaying, setIsPaying] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentReceipt, setPaymentReceipt] = useState<{
    status: 'success' | 'failed';
    paymentId?: string;
    orderId?: string;
    amount: number;
    planName: string;
    date: string;
    errorMessage?: string;
  } | null>(null);

  // Dynamically load Razorpay checkout script
  useEffect(() => {
    if (showUpgradeModal) {
      if (document.getElementById('razorpay-checkout-script')) return;

      const script = document.createElement('script');
      script.id = 'razorpay-checkout-script';
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, [showUpgradeModal]);

  const handleClose = useCallback(() => {
    setShowUpgradeModal(false);
    // Reset state
    setCouponCode('');
    setCouponError(null);
    setCouponSuccess(null);
    setPaymentError(null);
    setPaymentSuccess(false);
    setIsPaying(false);
  }, [setShowUpgradeModal]);

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
        setPaymentSuccess(true);
        setTimeout(() => {
          handleClose();
        }, 1500);
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
      
      // 1. Create Razorpay order on the backend
      const orderRes = await createRazorpayOrder(targetPlan);
      if (!orderRes.success || !orderRes.orderId) {
        throw new Error(orderRes.message || 'Failed to initialize payment.');
      }

      // 2. Verify Razorpay library is loaded
      if (!(window as any).Razorpay) {
        throw new Error('Payment gateway library is loading. Please try again in a few seconds.');
      }

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: orderRes.amount,
        currency: "INR",
        name: "MS Family Premium",
        description: planType === 'family' ? "Family Premium Subscription" : "Personal Premium Subscription",
        image: window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
          ? ""
          : `${window.location.origin}/mslogo.png`,
        order_id: orderRes.orderId,
        handler: async function (response: any) {
          try {
            setIsPaying(true);
            setPaymentError(null);
            
            // 3. Verify Razorpay signature on backend
            const verifyRes = await verifyRazorpayPayment(
              response.razorpay_payment_id,
              response.razorpay_order_id,
              response.razorpay_signature,
              targetPlan
            );

            if (verifyRes.success) {
              setPaymentSuccess(true);
              setPaymentReceipt({
                status: 'success',
                paymentId: response.razorpay_payment_id,
                orderId: response.razorpay_order_id,
                amount: orderRes.amount ? orderRes.amount / 100 : 0,
                planName: planType === 'family' ? (billingInterval === 'yearly' ? 'Family Premium Yearly' : 'Family Premium Monthly') : (billingInterval === 'yearly' ? 'Personal Premium Yearly' : 'Personal Premium Monthly'),
                date: new Date().toLocaleString(),
              });
              setTimeout(() => {
                handleClose();
              }, 1500);
            } else {
              setPaymentError(verifyRes.message);
              setPaymentReceipt({
                status: 'failed',
                amount: orderRes.amount ? orderRes.amount / 100 : 0,
                planName: planType === 'family' ? (billingInterval === 'yearly' ? 'Family Premium Yearly' : 'Family Premium Monthly') : (billingInterval === 'yearly' ? 'Personal Premium Yearly' : 'Personal Premium Monthly'),
                date: new Date().toLocaleString(),
                errorMessage: verifyRes.message || 'Signature verification failed.',
              });
            }
          } catch (err: any) {
            setPaymentError(err.message || 'Payment verification failed.');
            setPaymentReceipt({
              status: 'failed',
              amount: orderRes.amount ? orderRes.amount / 100 : 0,
              planName: planType === 'family' ? (billingInterval === 'yearly' ? 'Family Premium Yearly' : 'Family Premium Monthly') : (billingInterval === 'yearly' ? 'Personal Premium Yearly' : 'Personal Premium Monthly'),
              date: new Date().toLocaleString(),
              errorMessage: err.message || 'Payment verification failed.',
            });
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
        setPaymentReceipt({
          status: 'failed',
          amount: orderRes.amount ? orderRes.amount / 100 : 0,
          planName: planType === 'family' ? (billingInterval === 'yearly' ? 'Family Premium Yearly' : 'Family Premium Monthly') : (billingInterval === 'yearly' ? 'Personal Premium Yearly' : 'Personal Premium Monthly'),
          date: new Date().toLocaleString(),
          errorMessage: resp.error?.description || 'Payment failed.',
        });
        setIsPaying(false);
      });
      rzp.open();

    } catch (err: any) {
      setPaymentError(err.message || 'Payment processing failed.');
      setPaymentReceipt({
        status: 'failed',
        amount: 0,
        planName: planType === 'family' ? (billingInterval === 'yearly' ? 'Family Premium Yearly' : 'Family Premium Monthly') : (billingInterval === 'yearly' ? 'Personal Premium Yearly' : 'Personal Premium Monthly'),
        date: new Date().toLocaleString(),
        errorMessage: err.message || 'Payment processing failed.',
      });
      setIsPaying(false);
    }
  };

  // Render portaled Payment Receipt Modal at the top level so it persists even after closing the upgrade checkout overlay
  const renderReceiptModal = () => {
    return createPortal(
      <AnimatePresence>
        {paymentReceipt && (
          <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPaymentReceipt(null)}
              className="absolute inset-0 bg-slate-900/60 dark:bg-black/85 backdrop-blur-md"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 rounded-3xl p-6 shadow-2xl z-10 overflow-hidden text-center"
            >
              {/* Visual indicator header */}
              <div className="mb-6">
                {paymentReceipt.status === 'success' ? (
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3 text-emerald-500 animate-bounce">
                    <CheckCircle size={36} />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto mb-3 text-rose-500 animate-pulse">
                    <AlertCircle size={36} />
                  </div>
                )}
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  {paymentReceipt.status === 'success' ? t('Payment Successful!') : t('Payment Failed')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {paymentReceipt.status === 'success' 
                    ? t('Thank you! Your premium subscription is now active.') 
                    : t('Your transaction could not be completed.')}
                </p>
              </div>

              {/* Receipt Details Card */}
              <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200/50 dark:border-white/5 rounded-2xl p-4 space-y-3 mb-6 text-xs text-left">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200/50 dark:border-white/5">
                  <span className="text-slate-400">{t('Product')}</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{t(paymentReceipt.planName)}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-200/50 dark:border-white/5">
                  <span className="text-slate-400">{t('Paid Amount')}</span>
                  <span className="font-extrabold text-primary-500 text-sm">₹{paymentReceipt.amount}</span>
                </div>
                {paymentReceipt.paymentId && (
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200/50 dark:border-white/5">
                    <span className="text-slate-400">{t('Payment ID')}</span>
                    <span className="font-mono text-[10px] font-bold text-slate-700 dark:text-slate-350">{paymentReceipt.paymentId}</span>
                  </div>
                )}
                {paymentReceipt.orderId && (
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200/50 dark:border-white/5">
                    <span className="text-slate-400">{t('Order ID')}</span>
                    <span className="font-mono text-[10px] font-bold text-slate-700 dark:text-slate-350">{paymentReceipt.orderId}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pb-2 border-b border-slate-200/50 dark:border-white/5">
                  <span className="text-slate-400">{t('Date & Time')}</span>
                  <span className="font-bold text-slate-700 dark:text-slate-350">{paymentReceipt.date}</span>
                </div>
                {paymentReceipt.errorMessage && (
                  <div className="pt-1 text-rose-500 font-semibold text-[10px] leading-relaxed">
                    <span className="text-slate-400 block mb-0.5">{t('Reason for Failure:')}</span>
                    {t(paymentReceipt.errorMessage)}
                  </div>
                )}
              </div>

              {/* Close Button */}
              <button
                onClick={() => setPaymentReceipt(null)}
                className="w-full py-3 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 active:scale-[0.98] font-bold text-xs transition-all shadow-md"
              >
                {t('Close Receipt')}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>,
      document.body
    );
  };

  if (!showUpgradeModal) {
    return renderReceiptModal();
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="absolute inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md"
        />

        {/* Modal container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl border border-slate-200/50 dark:border-slate-800/80 overflow-hidden z-10 max-h-[90vh] flex flex-col"
        >
          {/* Top glow sphere */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-primary-500/15 to-transparent rounded-full blur-3xl pointer-events-none" />

          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-5 right-5 z-20 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>

          {/* Success screen */}
          {paymentSuccess ? (
            <div className="p-8 text-center flex flex-col items-center justify-center flex-1 min-h-[400px]">
              <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center mb-6 border border-emerald-100 dark:border-emerald-900/30">
                <CheckCircle size={32} className="text-emerald-500" />
              </div>
              <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mb-2">{t('Subscription Active!')}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
                {t('Thank you for supporting MS Family! Your Premium features are now unlocked.')}
              </p>
            </div>
          ) : (
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="text-primary-500" size={18} />
                <span className="text-[10px] text-primary-500 font-bold uppercase tracking-wider">{t('MS Family Premium')}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 mb-1 leading-snug">
                {t('Unlock Financial Superpowers')}
              </h2>
              <p className="text-xs text-slate-500 mb-6">{t('Choose a plan to support family financial collaboration.')}</p>

              {/* Plan Type Tabs */}
              <div className="flex p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl mb-5">
                <button
                  type="button"
                  onClick={() => setPlanType('personal')}
                  className={`flex-1 py-2.5 rounded-xl font-extrabold text-xs transition-all ${
                    planType === 'personal'
                      ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-sm border border-slate-200/50 dark:border-slate-800/50'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 bg-transparent border border-transparent'
                  }`}
                >
                  {t('Personal Premium')}
                </button>
                <button
                  type="button"
                  onClick={() => setPlanType('family')}
                  className={`flex-1 py-2.5 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 relative ${
                    planType === 'family'
                      ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-sm border border-slate-200/50 dark:border-slate-800/50'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 bg-transparent border border-transparent'
                  }`}
                >
                  {t('Family Premium')}
                  <span className="px-1.5 py-0.5 rounded-md bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[8px] font-black uppercase tracking-wider shrink-0 shadow-sm">
                    {t('Popular')}
                  </span>
                </button>
              </div>

              {/* Billing Cycle Selector */}
              <div className="space-y-3 mb-6">
                <div
                  onClick={() => setBillingInterval('yearly')}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
                    billingInterval === 'yearly'
                      ? 'border-primary-500 bg-primary-500/[0.03] dark:bg-primary-500/[0.05]'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-transparent'
                  }`}
                >
                  <span className="absolute -top-2.5 right-4 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-primary-500 to-indigo-500 text-white font-black text-[9px] uppercase tracking-wider">
                    {planType === 'family' ? t('Save 15%') : t('Save 8%')}
                  </span>
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">{t('Yearly Membership')}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">{t('Billed annually, best value')}</p>
                    </div>
                    <div className="text-right">
                      {planType === 'personal' ? (
                        <>
                          <span className="text-xs text-slate-400 line-through mr-1.5">₹108</span>
                          <span className="text-lg font-black text-primary-500">₹99</span>
                        </>
                      ) : (
                        <>
                          <span className="text-xs text-slate-400 line-through mr-1.5">₹348</span>
                          <span className="text-lg font-black text-primary-500">₹299</span>
                        </>
                      )}
                      <span className="text-[10px] text-slate-400">/{t('year')}</span>
                    </div>
                  </div>
                </div>

                <div
                  onClick={() => setBillingInterval('monthly')}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                    billingInterval === 'monthly'
                      ? 'border-primary-500 bg-primary-500/[0.03] dark:bg-primary-500/[0.05]'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-transparent'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">{t('Monthly Membership')}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">{t('Flexibility to cancel anytime')}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-black text-slate-800 dark:text-slate-100">
                        {planType === 'personal' ? '₹9' : '₹29'}
                      </span>
                      <span className="text-[10px] text-slate-400">/{t('month')}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Subtitle Message Banner */}
              <div className="mb-6 p-4 rounded-2xl bg-primary-500/[0.03] dark:bg-primary-500/[0.05] border border-primary-500/10">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 text-center leading-relaxed">
                  {planType === 'personal'
                    ? t('Best for individual users.')
                    : t('One subscription protects and manages your entire family.')}
                </p>
              </div>

              {/* Coupon Form */}
              <form onSubmit={handleRedeem} className="mb-6 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/20 border border-slate-200/50 dark:border-slate-800/80">
                <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5">{t('Have a Coupon Code?')}</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder={t('Enter promo code')}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl py-2 pl-9 pr-3 text-xs font-semibold focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isRedeeming || !couponCode.trim()}
                    className="px-4 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs hover:opacity-90 transition-opacity flex items-center justify-center shrink-0 disabled:opacity-40"
                  >
                    {isRedeeming ? <Loader2 size={14} className="animate-spin" /> : t('Apply')}
                  </button>
                </div>
                {couponError && (
                  <p className="text-[10px] text-rose-500 font-medium mt-1.5 flex items-center gap-1">
                    <AlertCircle size={10} /> {couponError}
                  </p>
                )}
                {couponSuccess && (
                  <p className="text-[10px] text-emerald-500 font-medium mt-1.5 flex items-center gap-1">
                    <CheckCircle size={10} /> {couponSuccess}
                  </p>
                )}
              </form>

              {/* Feature list */}
              <div className="space-y-2.5 mb-6 px-1">
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-2">{t('What is included')}</p>
                {(planType === 'personal'
                  ? [
                      'Premium access for 1 user',
                      'Cloud Sync & Backup',
                      'Smart Bill Management',
                      'Advanced Financial Analytics & PDF/Excel Export',
                      'AI-Powered Smart Insights & Notifications',
                      'Ad-Free Premium Glass Dashboard Experience',
                      'Priority Support (24h response SLA)'
                    ]
                  : [
                      'Unlimited family members',
                      'One subscription for the entire family',
                      'Premium features for every member',
                      'Cloud Sync',
                      'Smart Bill Management',
                      'Live Family Tracking',
                      'Premium Reports',
                      'Priority Support'
                    ]
                ).map((feat, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                    <Zap size={12} className="text-amber-500 shrink-0" />
                    <span>{t(feat)}</span>
                  </div>
                ))}
              </div>

              {/* Payment validations & error warnings */}
              {paymentError && (
                <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[11px] font-medium flex items-center gap-2">
                  <AlertCircle size={14} />
                  <span>{paymentError}</span>
                </div>
              )}

              {planType === 'family' && !family && (
                <div className="p-3 mb-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[11px] font-medium flex items-center gap-2">
                  <AlertCircle size={14} />
                  <span>{t('Please create or join a family group first to upgrade to Family Premium.')}</span>
                </div>
              )}

              {planType === 'family' && family && !isAdmin && (
                <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[11px] font-medium flex items-center gap-2">
                  <AlertCircle size={14} />
                  <span>{t('Only family admins can purchase or manage Family Premium.')}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handlePay}
                disabled={isPaying || (planType === 'family' && (!family || !isAdmin))}
                className="w-full py-3.5 rounded-2xl bg-primary-500 hover:bg-primary-600 text-white font-bold text-sm shadow-lg shadow-primary-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
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
          )}
        </motion.div>
      </div>
      {renderReceiptModal()}
    </AnimatePresence>
  );
}
