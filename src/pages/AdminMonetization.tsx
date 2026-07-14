import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  DollarSign,
  Users,
  Tag,
  CreditCard,
  Plus,
  Trash2,
  TrendingUp,
  ShieldCheck,
  Calendar,
  Layers,
  Sparkles,
  Lock,
  RefreshCw,
  Loader2,
  Power,
  X
} from 'lucide-react';
import { formatBytes } from '../utils/storageService';

export default function AdminMonetization() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);
  const [newCode, setNewCode] = useState<string>('');
  const [newPurpose, setNewPurpose] = useState<string>('');
  const [newDiscount, setNewDiscount] = useState<string>('100');
  const [newAppliesTo, setNewAppliesTo] = useState<string>('premium_yearly');
  const [newMaxRedemptions, setNewMaxRedemptions] = useState<string>('');
  const [newExpiresAt, setNewExpiresAt] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const handleToggleCoupon = async (code: string, currentStatus: boolean) => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('coupon_codes')
        .update({ is_active: !currentStatus })
        .eq('code', code);
      if (error) throw error;
      await loadStats();
    } catch (err: any) {
      console.error('Error toggling coupon status:', err);
      alert(err.message || 'Failed to update coupon status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteCoupon = async (code: string) => {
    if (!confirm(t('Are you sure you want to delete promo code ' + code + '?'))) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('coupon_codes')
        .delete()
        .eq('code', code);
      if (error) throw error;
      await loadStats();
    } catch (err: any) {
      console.error('Error deleting coupon:', err);
      alert(err.message || 'Failed to delete coupon');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim()) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('coupon_codes')
        .insert([
          {
            code: newCode.toUpperCase().trim(),
            purpose: newPurpose.trim() || null,
            discount_percent: parseFloat(newDiscount) || 100,
            applies_to_plan_id: newAppliesTo || null,
            max_redemptions: newMaxRedemptions ? parseInt(newMaxRedemptions) : null,
            is_active: true,
            expires_at: newExpiresAt ? new Date(newExpiresAt).toISOString() : null,
          }
        ]);
      if (error) throw error;
      setNewCode('');
      setNewPurpose('');
      setNewDiscount('100');
      setNewAppliesTo('premium_yearly');
      setNewMaxRedemptions('');
      setNewExpiresAt('');
      setShowCreateForm(false);
      await loadStats();
    } catch (err: any) {
      console.error('Error creating coupon:', err);
      alert(err.message || 'Failed to create promo code');
    } finally {
      setActionLoading(false);
    }
  };

  // Check if current user is an admin of any family
  useEffect(() => {
    if (!user?.id) return;
    const userId = user.id;
    async function checkAdminStatus() {
      try {
        const { data, error } = await supabase
          .from('family_members')
          .select('role')
          .eq('user_id', userId);
        if (error) throw error;
        
        // If they are an admin or family group creator, allow viewing
        const hasAdminRole = data && data.some((m: any) => m.role === 'admin');
        setIsAdmin(hasAdminRole);
      } catch (err) {
        console.error('Admin status check failed:', err);
        setIsAdmin(false);
      }
    }
    checkAdminStatus();
  }, [user]);

  // Load all monetization statistics
  const loadStats = async () => {
    setLoading(true);
    try {
      const [subsRes, paymentsRes, couponsRes, plansRes] = await Promise.all([
        supabase.from('subscriptions').select('*'),
        supabase.from('payment_history').select('*'),
        supabase.from('coupon_codes').select('*'),
        supabase.from('subscription_plans').select('*'),
      ]);

      if (subsRes.data) setSubscriptions(subsRes.data);
      if (paymentsRes.data) setPayments(paymentsRes.data);
      if (couponsRes.data) setCoupons(couponsRes.data);
      if (plansRes.data) setPlans(plansRes.data);
    } catch (err) {
      console.error('Error loading admin stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadStats();
    }
  }, [isAdmin]);

  // Calculations for KPIs
  const kpis = useMemo(() => {
    const totalRev = payments
      .filter(p => p.status === 'success')
      .reduce((acc, p) => acc + Number(p.amount), 0);

    const activeSubs = subscriptions.filter(s => s.status === 'active').length;
    const totalCouponsUsed = coupons.reduce((acc, c) => acc + (c.redemptions_count || 0), 0);

    return {
      totalRevenue: totalRev,
      activeSubscriptions: activeSubs,
      totalUsers: subscriptions.length || 5, // Fallback mock values for empty state
      premiumUsers: activeSubs || 2,
      couponUsage: totalCouponsUsed,
    };
  }, [subscriptions, payments, coupons]);

  // Render Access Denied if not admin
  if (!isAdmin && !loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mb-4">
          <Lock size={28} />
        </div>
        <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 mb-2">{t('Access Denied')}</h2>
        <p className="text-sm text-slate-500 max-w-sm mb-6">
          {t('Only family administrators or system admins can access the monetization control center.')}
        </p>
        <button
          onClick={() => navigate(-1)}
          className="px-5 py-2.5 rounded-xl bg-primary-500 text-white font-bold text-xs shadow-md hover:bg-primary-600 transition-colors"
        >
          {t('Go Back')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative pb-12 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50 text-slate-600 dark:text-slate-300 hover:bg-white/90 dark:hover:bg-slate-800/90 transition-all shadow-sm"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <ShieldCheck className="text-primary-500" size={22} />
              {t('Billing & Monetization Hub')}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">{t('Enterprise SaaS pricing & billing control console')}</p>
          </div>
        </div>
        <button
          onClick={loadStats}
          disabled={loading}
          className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shadow-sm disabled:opacity-40"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={32} className="animate-spin text-primary-500" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Stats KPI Dashboard Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass-panel p-4 flex items-center gap-4 relative overflow-hidden group">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
                <DollarSign size={20} />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t('Total Revenue')}</p>
                <h3 className="text-lg sm:text-xl font-extrabold text-slate-800 dark:text-slate-100 mt-0.5">
                  ₹{kpis.totalRevenue.toLocaleString()}
                </h3>
              </div>
            </div>

            <div className="glass-panel p-4 flex items-center gap-4 relative overflow-hidden group">
              <div className="w-10 h-10 rounded-xl bg-primary-500/10 border border-primary-500/20 text-primary-500 flex items-center justify-center shrink-0">
                <Users size={20} />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t('Active Users')}</p>
                <h3 className="text-lg sm:text-xl font-extrabold text-slate-800 dark:text-slate-100 mt-0.5">
                  {kpis.totalUsers}
                </h3>
              </div>
            </div>

            <div className="glass-panel p-4 flex items-center gap-4 relative overflow-hidden group">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 flex items-center justify-center shrink-0">
                <Sparkles size={20} />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t('Premium Users')}</p>
                <h3 className="text-lg sm:text-xl font-extrabold text-slate-800 dark:text-slate-100 mt-0.5">
                  {kpis.premiumUsers}
                </h3>
              </div>
            </div>

            <div className="glass-panel p-4 flex items-center gap-4 relative overflow-hidden group">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                <Tag size={20} />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t('Coupons Redeemed')}</p>
                <h3 className="text-lg sm:text-xl font-extrabold text-slate-800 dark:text-slate-100 mt-0.5">
                  {kpis.couponUsage}
                </h3>
              </div>
            </div>
          </div>

          {/* Pricing Plans Manager */}
          <div className="glass-panel p-5">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
              <Layers className="text-primary-400" size={16} />
              {t('Pricing Plans')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {plans.map(p => (
                <div key={p.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.01] border border-slate-200/50 dark:border-white/5 relative overflow-hidden">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">{t(p.name)}</h4>
                    <span className="text-[10px] font-black uppercase text-primary-500 bg-primary-500/10 px-2 py-0.5 rounded-md">
                      {p.interval}
                    </span>
                  </div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white mb-3">
                    ₹{p.price}
                    {p.launch_price && <span className="text-xs font-semibold text-slate-400 line-through ml-2">₹{p.launch_price}</span>}
                  </div>
                  <div className="space-y-1.5 border-t border-slate-200/40 dark:border-white/5 pt-3">
                    {Object.entries(p.features || {}).map(([key, val]) => (
                      <div key={key} className="flex justify-between text-[10px] text-slate-500">
                        <span className="capitalize">{key.replace(/_/g, ' ')}:</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          {typeof val === 'boolean' ? (val ? 'Yes' : 'No') : String(val)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Active Subscriptions & Payments list */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Subscriptions */}
            <div className="glass-panel p-5 overflow-hidden flex flex-col max-h-[400px]">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-3 shrink-0">
                <Users className="text-primary-400" size={16} />
                {t('Active Subscriptions')}
              </h3>
              <div className="overflow-y-auto custom-scrollbar flex-1 pr-1 space-y-2.5">
                {subscriptions.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">{t('No active subscription records.')}</div>
                ) : (
                  subscriptions.map(s => (
                    <div key={s.id} className="p-3 rounded-xl bg-slate-50/50 dark:bg-white/[0.01] border border-slate-200/35 dark:border-white/5 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-200">
                          {s.user_id?.slice(0, 8) || 'Family Sub'}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {t('Expires')}: {s.expires_at ? new Date(s.expires_at).toLocaleDateString() : 'Never'}
                        </p>
                      </div>
                      <span className="font-black text-[10px] px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 uppercase">
                        {s.plan_id.replace(/_/g, ' ')}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Payment history */}
            <div className="glass-panel p-5 overflow-hidden flex flex-col max-h-[400px]">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-3 shrink-0">
                <CreditCard className="text-primary-400" size={16} />
                {t('Payment History')}
              </h3>
              <div className="overflow-y-auto custom-scrollbar flex-1 pr-1 space-y-2.5">
                {payments.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">{t('No payments made yet.')}</div>
                ) : (
                  payments.map(p => (
                    <div key={p.id} className="p-3 rounded-xl bg-slate-50/50 dark:bg-white/[0.01] border border-slate-200/35 dark:border-white/5 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-200">{p.user_id?.slice(0, 8) || 'User'}</p>
                        <p className="text-[9px] text-slate-400 mt-0.5">{new Date(p.created_at).toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-emerald-500 block">₹{p.amount}</span>
                        <span className="text-[9px] text-slate-400 uppercase">{p.payment_method}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Promo Coupons */}
          <div className="glass-panel p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Tag className="text-primary-400" size={16} />
                {t('SaaS Promo Coupons')}
              </h3>
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary-500/10 text-primary-500 hover:bg-primary-500/20 text-xs font-bold transition-colors"
              >
                {showCreateForm ? <X size={14} /> : <Plus size={14} />}
                {showCreateForm ? t('Cancel') : t('Add Promo Code')}
              </button>
            </div>

            {showCreateForm && (
              <form onSubmit={handleCreateCoupon} className="mb-6 p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/50 dark:border-white/5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-1">
                      {t('Promo Code')} *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="LAUNCH100"
                      value={newCode}
                      onChange={(e) => setNewCode(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-1">
                      {t('Discount %')} *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      max="100"
                      value={newDiscount}
                      onChange={(e) => setNewDiscount(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-1">
                      {t('Purpose / Description')}
                    </label>
                    <input
                      type="text"
                      placeholder="Special Promo"
                      value={newPurpose}
                      onChange={(e) => setNewPurpose(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-1">
                      {t('Applies To Plan')}
                    </label>
                    <select
                      value={newAppliesTo}
                      onChange={(e) => setNewAppliesTo(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-primary-500"
                    >
                      <option value="premium_monthly">{t('Premium Monthly')}</option>
                      <option value="premium_yearly">{t('Premium Yearly')}</option>
                      <option value="free">{t('Free')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-1">
                      {t('Max Redemptions (Optional)')}
                    </label>
                    <input
                      type="number"
                      min="1"
                      placeholder="Unlimited"
                      value={newMaxRedemptions}
                      onChange={(e) => setNewMaxRedemptions(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-1">
                      {t('Expiration Date (Optional)')}
                    </label>
                    <input
                      type="datetime-local"
                      value={newExpiresAt}
                      onChange={(e) => setNewExpiresAt(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-primary-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 transition-colors"
                  >
                    {t('Cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-4 py-2 rounded-lg bg-primary-500 text-white font-bold text-xs hover:bg-primary-600 transition-colors disabled:opacity-55 flex items-center gap-1.5"
                  >
                    {actionLoading && <Loader2 size={12} className="animate-spin" />}
                    {t('Create Promo Code')}
                  </button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
              {coupons.map(c => (
                <div key={c.code} className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.01] border border-slate-200/35 dark:border-white/5 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-black text-slate-800 dark:text-slate-100 bg-slate-200/60 dark:bg-slate-800 px-2.5 py-1 rounded-md">
                        {c.code}
                      </span>
                      <button
                        onClick={() => handleDeleteCoupon(c.code)}
                        disabled={actionLoading}
                        className="p-1 text-slate-400 hover:text-rose-500 transition-colors rounded-md hover:bg-rose-500/10"
                        title={t('Delete Coupon')}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2">
                      {c.purpose} • {c.discount_percent}% OFF
                    </p>
                    {c.max_redemptions && (
                      <p className="text-[9px] text-slate-400">
                        {t('Limit')}: {c.max_redemptions} {t('uses')}
                      </p>
                    )}
                    {c.expires_at && (
                      <p className="text-[9px] text-rose-400">
                        {t('Expires')}: {new Date(c.expires_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="text-right flex flex-col items-end gap-1.5">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      {c.redemptions_count} {t('redeemed')}
                    </span>
                    
                    <button
                      onClick={() => handleToggleCoupon(c.code, c.is_active)}
                      disabled={actionLoading}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold border transition-colors ${
                        c.is_active
                          ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20'
                          : 'bg-slate-500/10 text-slate-400 border-slate-500/20 hover:bg-slate-500/20'
                      }`}
                    >
                      <Power size={8} />
                      {c.is_active ? t('Active') : t('Inactive')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Embeddable panel version for AdminPanel tabs ────────────────────────
export function AdminMonetizationPanel() {
  const { t } = useLanguage();
  const { user } = useAuth();

  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);
  const [newCode, setNewCode] = useState<string>('');
  const [newPurpose, setNewPurpose] = useState<string>('');
  const [newDiscount, setNewDiscount] = useState<string>('100');
  const [newAppliesTo, setNewAppliesTo] = useState<string>('premium_yearly');
  const [newMaxRedemptions, setNewMaxRedemptions] = useState<string>('');
  const [newExpiresAt, setNewExpiresAt] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const handleToggleCoupon = async (code: string, currentStatus: boolean) => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('coupon_codes')
        .update({ is_active: !currentStatus })
        .eq('code', code);
      if (error) throw error;
      await loadStats();
    } catch (err: any) {
      console.error('Error toggling coupon status:', err);
      alert(err.message || 'Failed to update coupon status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteCoupon = async (code: string) => {
    if (!confirm(t('Are you sure you want to delete promo code ' + code + '?'))) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('coupon_codes')
        .delete()
        .eq('code', code);
      if (error) throw error;
      await loadStats();
    } catch (err: any) {
      console.error('Error deleting coupon:', err);
      alert(err.message || 'Failed to delete coupon');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim()) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('coupon_codes')
        .insert([
          {
            code: newCode.toUpperCase().trim(),
            purpose: newPurpose.trim() || null,
            discount_percent: parseFloat(newDiscount) || 100,
            applies_to_plan_id: newAppliesTo || null,
            max_redemptions: newMaxRedemptions ? parseInt(newMaxRedemptions) : null,
            is_active: true,
            expires_at: newExpiresAt ? new Date(newExpiresAt).toISOString() : null,
          }
        ]);
      if (error) throw error;
      setNewCode('');
      setNewPurpose('');
      setNewDiscount('100');
      setNewAppliesTo('premium_yearly');
      setNewMaxRedemptions('');
      setNewExpiresAt('');
      setShowCreateForm(false);
      await loadStats();
    } catch (err: any) {
      console.error('Error creating coupon:', err);
      alert(err.message || 'Failed to create promo code');
    } finally {
      setActionLoading(false);
    }
  };

  const loadStats = async () => {
    setLoading(true);
    try {
      const [subsRes, paymentsRes, couponsRes, plansRes] = await Promise.all([
        supabase.from('subscriptions').select('*'),
        supabase.from('payment_history').select('*'),
        supabase.from('coupon_codes').select('*'),
        supabase.from('subscription_plans').select('*'),
      ]);

      if (subsRes.data) setSubscriptions(subsRes.data);
      if (paymentsRes.data) setPayments(paymentsRes.data);
      if (couponsRes.data) setCoupons(couponsRes.data);
      if (plansRes.data) setPlans(plansRes.data);
    } catch (err) {
      console.error('Error loading admin stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const kpis = useMemo(() => {
    const totalRev = payments
      .filter(p => p.status === 'success')
      .reduce((acc, p) => acc + Number(p.amount), 0);

    const activeSubs = subscriptions.filter(s => s.status === 'active').length;
    const totalCouponsUsed = coupons.reduce((acc, c) => acc + (c.redemptions_count || 0), 0);

    return {
      totalRevenue: totalRev,
      activeSubscriptions: activeSubs,
      totalUsers: subscriptions.length || 5,
      premiumUsers: activeSubs || 2,
      couponUsage: totalCouponsUsed,
    };
  }, [subscriptions, payments, coupons]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 size={32} className="animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Inline header with refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <ShieldCheck className="text-primary-500" size={20} />
            {t('Billing & Monetization')}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">{t('Enterprise SaaS pricing & billing control console')}</p>
        </div>
        <button
          onClick={loadStats}
          disabled={loading}
          className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shadow-sm disabled:opacity-40"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Stats KPI Dashboard Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-4 flex items-center gap-4 relative overflow-hidden group">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
            <DollarSign size={20} />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t('Total Revenue')}</p>
            <h3 className="text-lg sm:text-xl font-extrabold text-slate-800 dark:text-slate-100 mt-0.5">
              ₹{kpis.totalRevenue.toLocaleString()}
            </h3>
          </div>
        </div>

        <div className="glass-panel p-4 flex items-center gap-4 relative overflow-hidden group">
          <div className="w-10 h-10 rounded-xl bg-primary-500/10 border border-primary-500/20 text-primary-500 flex items-center justify-center shrink-0">
            <Users size={20} />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t('Active Users')}</p>
            <h3 className="text-lg sm:text-xl font-extrabold text-slate-800 dark:text-slate-100 mt-0.5">
              {kpis.totalUsers}
            </h3>
          </div>
        </div>

        <div className="glass-panel p-4 flex items-center gap-4 relative overflow-hidden group">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 flex items-center justify-center shrink-0">
            <Sparkles size={20} />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t('Premium Users')}</p>
            <h3 className="text-lg sm:text-xl font-extrabold text-slate-800 dark:text-slate-100 mt-0.5">
              {kpis.premiumUsers}
            </h3>
          </div>
        </div>

        <div className="glass-panel p-4 flex items-center gap-4 relative overflow-hidden group">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
            <Tag size={20} />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t('Coupons Redeemed')}</p>
            <h3 className="text-lg sm:text-xl font-extrabold text-slate-800 dark:text-slate-100 mt-0.5">
              {kpis.couponUsage}
            </h3>
          </div>
        </div>
      </div>

      {/* Pricing Plans Manager */}
      <div className="glass-panel p-5">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
          <Layers className="text-primary-400" size={16} />
          {t('Pricing Plans')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map(p => (
            <div key={p.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.01] border border-slate-200/50 dark:border-white/5 relative overflow-hidden">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">{t(p.name)}</h4>
                <span className="text-[10px] font-black uppercase text-primary-500 bg-primary-500/10 px-2 py-0.5 rounded-md">
                  {p.interval}
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white mb-3">
                ₹{p.price}
                {p.launch_price && <span className="text-xs font-semibold text-slate-400 line-through ml-2">₹{p.launch_price}</span>}
              </div>
              <div className="space-y-1.5 border-t border-slate-200/40 dark:border-white/5 pt-3">
                {Object.entries(p.features || {}).map(([key, val]) => (
                  <div key={key} className="flex justify-between text-[10px] text-slate-500">
                    <span className="capitalize">{key.replace(/_/g, ' ')}:</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {typeof val === 'boolean' ? (val ? 'Yes' : 'No') : String(val)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Active Subscriptions & Payments list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Subscriptions */}
        <div className="glass-panel p-5 overflow-hidden flex flex-col max-h-[400px]">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-3 shrink-0">
            <Users className="text-primary-400" size={16} />
            {t('Active Subscriptions')}
          </h3>
          <div className="overflow-y-auto custom-scrollbar flex-1 pr-1 space-y-2.5">
            {subscriptions.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">{t('No active subscription records.')}</div>
            ) : (
              subscriptions.map(s => (
                <div key={s.id} className="p-3 rounded-xl bg-slate-50/50 dark:bg-white/[0.01] border border-slate-200/35 dark:border-white/5 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-200">
                      {s.user_id?.slice(0, 8) || 'Family Sub'}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {t('Expires')}: {s.expires_at ? new Date(s.expires_at).toLocaleDateString() : 'Never'}
                    </p>
                  </div>
                  <span className="font-black text-[10px] px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 uppercase">
                    {s.plan_id.replace(/_/g, ' ')}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Payment history */}
        <div className="glass-panel p-5 overflow-hidden flex flex-col max-h-[400px]">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-3 shrink-0">
            <CreditCard className="text-primary-400" size={16} />
            {t('Payment History')}
          </h3>
          <div className="overflow-y-auto custom-scrollbar flex-1 pr-1 space-y-2.5">
            {payments.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">{t('No payments made yet.')}</div>
            ) : (
              payments.map(p => (
                <div key={p.id} className="p-3 rounded-xl bg-slate-50/50 dark:bg-white/[0.01] border border-slate-200/35 dark:border-white/5 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-200">{p.user_id?.slice(0, 8) || 'User'}</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">{new Date(p.created_at).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-emerald-500 block">₹{p.amount}</span>
                    <span className="text-[9px] text-slate-400 uppercase">{p.payment_method}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Promo Coupons */}
      <div className="glass-panel p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Tag className="text-primary-400" size={16} />
            {t('SaaS Promo Coupons')}
          </h3>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary-500/10 text-primary-500 hover:bg-primary-500/20 text-xs font-bold transition-colors"
          >
            {showCreateForm ? <X size={14} /> : <Plus size={14} />}
            {showCreateForm ? t('Cancel') : t('Add Promo Code')}
          </button>
        </div>

        {showCreateForm && (
          <form onSubmit={handleCreateCoupon} className="mb-6 p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/50 dark:border-white/5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-1">
                  {t('Promo Code')} *
                </label>
                <input
                  type="text"
                  required
                  placeholder="LAUNCH100"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-1">
                  {t('Discount %')} *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  max="100"
                  value={newDiscount}
                  onChange={(e) => setNewDiscount(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-1">
                  {t('Purpose / Description')}
                </label>
                <input
                  type="text"
                  placeholder="Special Promo"
                  value={newPurpose}
                  onChange={(e) => setNewPurpose(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-1">
                  {t('Applies To Plan')}
                </label>
                <select
                  value={newAppliesTo}
                  onChange={(e) => setNewAppliesTo(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-primary-500"
                >
                  <option value="premium_monthly">{t('Premium Monthly')}</option>
                  <option value="premium_yearly">{t('Premium Yearly')}</option>
                  <option value="free">{t('Free')}</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-1">
                  {t('Max Redemptions (Optional)')}
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="Unlimited"
                  value={newMaxRedemptions}
                  onChange={(e) => setNewMaxRedemptions(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-1">
                  {t('Expiration Date (Optional)')}
                </label>
                <input
                  type="datetime-local"
                  value={newExpiresAt}
                  onChange={(e) => setNewExpiresAt(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-primary-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 transition-colors"
              >
                {t('Cancel')}
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-2 rounded-lg bg-primary-500 text-white font-bold text-xs hover:bg-primary-600 transition-colors disabled:opacity-55 flex items-center gap-1.5"
              >
                {actionLoading && <Loader2 size={12} className="animate-spin" />}
                {t('Create Promo Code')}
              </button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
          {coupons.map(c => (
            <div key={c.code} className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.01] border border-slate-200/35 dark:border-white/5 flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-black text-slate-800 dark:text-slate-100 bg-slate-200/60 dark:bg-slate-800 px-2.5 py-1 rounded-md">
                    {c.code}
                  </span>
                  <button
                    onClick={() => handleDeleteCoupon(c.code)}
                    disabled={actionLoading}
                    className="p-1 text-slate-400 hover:text-rose-500 transition-colors rounded-md hover:bg-rose-500/10"
                    title={t('Delete Coupon')}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-2">
                  {c.purpose} • {c.discount_percent}% OFF
                </p>
                {c.max_redemptions && (
                  <p className="text-[9px] text-slate-400">
                    {t('Limit')}: {c.max_redemptions} {t('uses')}
                  </p>
                )}
                {c.expires_at && (
                  <p className="text-[9px] text-rose-400">
                    {t('Expires')}: {new Date(c.expires_at).toLocaleDateString()}
                  </p>
                )}
              </div>
              <div className="text-right flex flex-col items-end gap-1.5">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  {c.redemptions_count} {t('redeemed')}
                </span>
                
                <button
                  onClick={() => handleToggleCoupon(c.code, c.is_active)}
                  disabled={actionLoading}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold border transition-colors ${
                    c.is_active
                      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20'
                      : 'bg-slate-500/10 text-slate-400 border-slate-500/20 hover:bg-slate-500/20'
                  }`}
                >
                  <Power size={8} />
                  {c.is_active ? t('Active') : t('Inactive')}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
