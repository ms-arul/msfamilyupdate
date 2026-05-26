import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';
import { getLiveRates, calculateAssetMetrics, MetalRates } from '../utils/rateService';
import { compressForProofs } from '../utils/imageCompressor';
import { shouldSuppressLock } from '../utils/appLockService';
import { downloadBase64File } from '../utils/downloadHelper';
import { triggerInstantNotification, translateCategoryToTamil } from '../utils/notificationService';
import { sendPushToAllFamily } from '../utils/pushService';
import { SavingsAsset } from '../types/finance';

import {
  Wallet, RefreshCw, Plus, WifiOff, TrendingUp, TrendingDown,
  Activity, AlertCircle, Info, PieChart as PieChartIcon, ArrowUpRight,
  ArrowDownRight, X, Image as ImageIcon, CheckCircle2,
  Edit3, Trash2, Eye, Download, RotateCcw
} from 'lucide-react';

import {
  PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, Tooltip
} from 'recharts';
import { SafeChartContainer } from '../components/ui/SafeChartContainer';
import AnimatedNumber from '../components/ui/AnimatedNumber';
import {
  staggerContainer,
  staggerItem,
  modalBackdropVariants,
  modalContentVariants,
  modalTransition,
  tapScale,
  motionSafe
} from '../utils/animations';

// ============================================================================
// Constants & Config
// ============================================================================
const ASSET_TYPES = ['Gold', 'Silver', 'Other'] as const;

type AssetType = typeof ASSET_TYPES[number];

const CATEGORIES: Record<AssetType, string[]> = {
  Gold: ['24K (99.9%)', '22K (91.6%)', 'KDM', '18K', 'Gold Coins', 'Gold Bars'],
  Silver: ['Silver Bars', 'Silver Coins', 'Silver Jewelry', 'Sterling Silver'],
  Other: ['Daily Savings', 'Stocks', 'Mutual Funds', 'Crypto', 'Real Estate', 'Bonds', 'FD']
};

const COLORS: Record<AssetType, string> = {
  Gold: '#F59E0B',
  Silver: '#94A3B8',
  Other: '#3B82F6'
};

interface FormState {
  asset_type: AssetType;
  category: string;
  quantity: string;
  purchase_price: string;
  purchase_date: string;
  notes: string;
  image_uri: string | null;
}

const EMPTY_FORM: FormState = {
  asset_type: 'Gold',
  category: '22K (91.6%)',
  quantity: '',
  purchase_price: '',
  purchase_date: new Date().toISOString().split('T')[0],
  notes: '',
  image_uri: null
};

// ============================================================================
// Main Component
// ============================================================================
export default function Savings() {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [assets, setAssets] = useState<SavingsAsset[]>([]);
  const [marketData, setMarketData] = useState<MetalRates | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [offline, setOffline] = useState<boolean>(false);

  // Modal State
  const [showModal, setShowModal] = useState<boolean>(false);
  const [formData, setFormData] = useState<FormState>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; visible: boolean; icon: React.ComponentType<any> | null }>({ message: '', visible: false, icon: null });
  const [selectedAssetForInfo, setSelectedAssetForInfo] = useState<SavingsAsset | null>(null);
  const [viewingFullImage, setViewingFullImage] = useState<string | null>(null);

  // Daily Savings State
  const [dailyAmount, setDailyAmount] = useState<number>(() => {
    const val = localStorage.getItem('msfamily_daily_saving_amount');
    return val ? Number(val) : 1000;
  });
  const [isPaidToday, setIsPaidToday] = useState<boolean>(false);
  const [showDailySavingSettings, setShowDailySavingSettings] = useState<boolean>(false);
  const [hasNotifiedDaily, setHasNotifiedDaily] = useState<boolean>(false);

  // ==========================================================================
  // Fetching Logic
  // ==========================================================================
  const showToast = useCallback((msg: string, icon: React.ComponentType<any> | null = null) => {
    setToast({ message: msg, visible: true, icon });
    setTimeout(() => setToast({ message: '', visible: false, icon: null }), 2500);
  }, []);

  const fetchRates = async (force: boolean = false) => {
    try {
      setRefreshing(true);
      const data = await getLiveRates(force);
      setMarketData(data);
      if (data.source === 'cache') {
        setOffline(true);
        if (force) showToast(t('Using saved data'), Info);
      } else if (data.source === 'ai') {
        setOffline(true);
        if (force) showToast(t('Estimated values'), AlertCircle);
      } else {
        setOffline(false);
        if (force) showToast(t('Live market data'), CheckCircle2);
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to fetch live rates', AlertCircle);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchAssets = async () => {
    try {
      const { data, error } = await supabase
        .from('savings_assets')
        .select('*')
        .order('purchase_date', { ascending: false });

      if (error) throw error;
      setAssets((data as SavingsAsset[]) || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchRates();
      fetchAssets();
    }
    // Listen for online status to auto-refresh
    const handleOnline = () => fetchRates(true);
    window.addEventListener('online', handleOnline);

    // Listen for global app refresh
    const handleAppRefresh = () => {
      fetchRates(true);
      fetchAssets();
    };
    window.addEventListener('app:refresh', handleAppRefresh);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('app:refresh', handleAppRefresh);
    };
  }, [user]);

  // Check Daily Saving Status
  useEffect(() => {
    if (!assets || assets.length === 0) return;
    const todayStr = new Date().toISOString().split('T')[0];
    const paidToday = assets.some(a => a.category === 'Daily Savings' && a.purchase_date.startsWith(todayStr));
    setIsPaidToday(paidToday);

    if (!paidToday && !loading && !hasNotifiedDaily) {
      triggerInstantNotification(
        'தினசரி சேமிப்பு நினைவூட்டல்! 💰',
        `இன்றைய தினசரி சேமிப்புத் தொகை ₹${dailyAmount}-ஐ நீங்கள் இன்னும் சேமிக்கவில்லை. உடனே சேமிக்க கிளிக் செய்யவும்! ⏳`,
        '/savings'
      );
      setHasNotifiedDaily(true);
    }
  }, [assets, loading, dailyAmount, hasNotifiedDaily]);

  // ==========================================================================
  // Calculations
  // ==========================================================================
  const stats = useMemo(() => {
    if (!assets.length || !marketData) {
      return { totalInvested: 0, totalCurrent: 0, profitLoss: 0, profitPct: 0, distribution: [] as { name: string; value: number }[] };
    }

    let totalInvested = 0;
    let totalCurrent = 0;
    const typeMap: Record<string, number> = { Gold: 0, Silver: 0, Other: 0 };

    assets.forEach(asset => {
      const metrics = calculateAssetMetrics(asset, marketData);
      totalInvested += Number(asset.purchase_price);
      totalCurrent += metrics.currentValue;
      typeMap[asset.asset_type] = (typeMap[asset.asset_type] || 0) + metrics.currentValue;
    });

    const profitLoss = totalCurrent - totalInvested;
    const profitPct = totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;

    const distribution = Object.keys(typeMap)
      .map(name => ({ name, value: typeMap[name] }))
      .filter(d => d.value > 0);

    return { totalInvested, totalCurrent, profitLoss, profitPct, distribution };
  }, [assets, marketData]);

  // Generate simple growth data for the area chart based on purchase dates
  const growthData = useMemo(() => {
    if (!assets.length) return [];

    // Sort ascending by date
    const sorted = [...assets].sort((a, b) => new Date(a.purchase_date).getTime() - new Date(b.purchase_date).getTime());
    let accumulated = 0;
    const chartData: { date: string; invested: number; value: number }[] = [];

    sorted.forEach(asset => {
      accumulated += Number(asset.purchase_price);
      chartData.push({
        date: asset.purchase_date,
        invested: accumulated,
        // Mocking estimated growth curve since we only have current live rates, not historical
        value: accumulated * (1 + (stats.profitPct / 100) * (chartData.length / sorted.length))
      });
    });

    return chartData;
  }, [assets, stats.profitPct]);


  // ==========================================================================
  // Form Handling
  // ==========================================================================
  const handleOpenModal = (asset: SavingsAsset | null = null) => {
    if (asset) {
      setEditingId(asset.id);
      setFormData({
        asset_type: asset.asset_type as AssetType,
        category: asset.category,
        quantity: String(asset.quantity),
        purchase_price: String(asset.purchase_price),
        purchase_date: asset.purchase_date,
        notes: asset.notes || '',
        image_uri: asset.image_uri || null
      });
    } else {
      setEditingId(null);
      setFormData(EMPTY_FORM);
    }
    setShowModal(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      showToast(t('Processing image...'), Info);
      const compressed = await compressForProofs(file);
      // We will read the file as a data URL to store it locally
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setFormData(prev => ({ ...prev, image_uri: reader.result as string }));
          showToast(t('Image attached'), CheckCircle2);
        }
      };
      reader.readAsDataURL(compressed);
    } catch (err) {
      console.error(err);
      showToast(t('Failed to process image'), 'error' as any);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.quantity || !formData.purchase_price || !user) return;
    setIsSubmitting(true);

    try {
      const payload = {
        user_id: user.id,
        asset_type: formData.asset_type,
        category: formData.category,
        quantity: Number(formData.quantity),
        purchase_price: Number(formData.purchase_price),
        purchase_date: formData.purchase_date,
        notes: formData.notes.trim(),
        image_uri: formData.image_uri
      };

      if (editingId) {
        const { error } = await supabase.from('savings_assets').update(payload).eq('id', editingId);
        if (error) throw error;
        showToast(t('Asset updated!'));
      } else {
        const { error } = await supabase.from('savings_assets').insert([payload]);
        if (error) throw error;
        showToast(t('Asset added!'));

        triggerInstantNotification(
          'புதிய முதலீடு சேர்க்கப்பட்டது! 🎉',
          `வெற்றிகரமாக ${payload.quantity}${payload.asset_type !== 'Other' ? 'g' : ''} அளவிலான ${translateCategoryToTamil(payload.category)} சேமிப்பில் சேர்க்கப்பட்டது.`,
          '/savings'
        );
        sendPushToAllFamily(
          user.id,
          'புதிய முதலீடு! 🚀',
          `${user?.name || 'குடும்ப உறுப்பினர்'} புதிய முதலீட்டைச் செய்துள்ளார்: ${translateCategoryToTamil(payload.category)} 💰`
        );
      }

      setShowModal(false);
      fetchAssets(); // Refresh
    } catch (err) {
      console.error(err);
      showToast('Failed to save asset', 'error' as any);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('Are you sure you want to delete this asset?'))) return;
    try {
      const { error } = await supabase.from('savings_assets').delete().eq('id', id);
      if (error) throw error;
      setAssets(assets.filter(a => a.id !== id));
      showToast(t('Asset deleted'));
    } catch (err) {
      console.error(err);
      showToast(t('Failed to delete asset'), 'error' as any);
    }
  };

  const handleDownloadProof = async (base64Uri: string) => {
    showToast(t('Downloading...'), Info);
    const result = await downloadBase64File(base64Uri, `Investment_Proof_${Date.now()}.jpg`);
    if (result.success) {
      showToast(t(result.message), CheckCircle2);
    } else {
      showToast(t(result.message), AlertCircle);
    }
  };

  // Daily Saving Handlers
  const handleDailyAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setDailyAmount(val);
    localStorage.setItem('msfamily_daily_saving_amount', String(val));
  };

  const handleMarkDailyPaid = async () => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const payload = {
        user_id: user.id,
        asset_type: 'Other',
        category: 'Daily Savings',
        quantity: 1, // 1 unit
        purchase_price: dailyAmount,
        purchase_date: todayStr,
        notes: t('Daily Saving Goal'),
        image_uri: null
      };
      const { error } = await supabase.from('savings_assets').insert([payload]);
      if (error) throw error;

      showToast(t('Daily Saving Marked as Paid!'), CheckCircle2);
      fetchAssets(); // Refresh assets
    } catch (err) {
      console.error(err);
      showToast(t('Failed to log daily saving'), AlertCircle);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUndoDailyPaid = async () => {
    setIsSubmitting(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const todayAsset = assets.find(a => a.category === 'Daily Savings' && a.purchase_date.startsWith(todayStr));
      
      if (!todayAsset) return;

      const { error } = await supabase.from('savings_assets').delete().eq('id', todayAsset.id);
      if (error) throw error;

      showToast(t('Daily Saving Undone'), Info);
      fetchAssets(); // Refresh assets
    } catch (err) {
      console.error(err);
      showToast(t('Failed to undo daily saving'), AlertCircle);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==========================================================================
  // Renders
  // ==========================================================================
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <RefreshCw size={24} className="text-primary-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar relative bg-slate-50 dark:bg-[#0a0a14]">
      {/* Dynamic Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 right-0 w-[40vw] h-[40vw] bg-primary-500/10 blur-[100px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-0 left-0 w-[50vw] h-[50vw] bg-secondary-500/10 blur-[120px] rounded-full mix-blend-screen" />
      </div>

      <div className="relative z-10 px-3 py-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">

        {/* Top Control Bar: Consolidated Actions and Rates */}
        <div className="flex flex-col gap-4 pt-2">
          {/* Action Row */}
          <div className="flex items-center justify-between gap-3">
            {/* Left side empty or could have a small label */}
            <div className="hidden sm:block">
              <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                <Activity size={20} className="text-primary-500" />
                {t('Market Overview')}
              </h2>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 flex-1 sm:flex-none justify-end">
              {/* Status Indicator */}
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm">
                <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-bold">
                  {offline ? (
                    <span className="flex items-center gap-1.5 text-amber-500">
                      <WifiOff size={14} /> {t('Offline')}
                    </span>
                  ) : marketData ? (
                    <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                      <Activity size={14} /> {t('Live')}
                    </span>
                  ) : t('...')}
                </p>
              </div>

              {/* Refresh Button */}
              <button
                onClick={() => fetchRates(true)}
                disabled={refreshing}
                className="p-2.5 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-white/10 transition-all shadow-sm disabled:opacity-50"
                title={t('Refresh Live Rates')}
              >
                <RefreshCw size={18} className={refreshing ? 'animate-spin text-primary-500' : ''} />
              </button>

              {/* New Investment Button */}
              <button
                onClick={() => handleOpenModal()}
                className="btn-primary py-2.5 px-4 sm:px-6 rounded-2xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-primary-500/25 hover:shadow-xl transition-all"
              >
                <Plus size={18} /> <span className="hidden xs:inline">{t('New Investment')}</span>
                <span className="xs:hidden">{t('Add')}</span>
              </button>
            </div>
          </div>

          {/* Rates Row */}
          {marketData && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-1 scrollbar-hide"
            >
              <RateBadge label={t('Gold 24K')} value={marketData.gold24} unit="1g" color="amber" />
              <RateBadge label={t('Gold 22K')} value={marketData.gold22} unit="1g" color="yellow" />
              <RateBadge label={t('Silver')} value={marketData.silver} unit="1g" color="slate" />
            </motion.div>
          )}
        </div>

        {/* Source Status Card */}
        {marketData && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-4 rounded-2xl border border-primary-500/20 bg-gradient-to-r from-primary-500/10 to-transparent relative overflow-hidden">
            <div className="flex items-start gap-4 relative z-10">
              <div className="p-3 bg-primary-500/20 rounded-xl shrink-0">
                <Info size={24} className="text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <h3 className="text-slate-900 dark:text-white font-bold mb-1 flex items-center gap-2">
                  {t('Pricing Source')}
                  <span className={`text-[10px] uppercase px-2 py-0.5 rounded-full font-bold ${marketData.source === 'api' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' :
                    marketData.source === 'ai' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-emerald-400' :
                      'bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-400'
                    }`}>
                    {marketData.source.toUpperCase()}
                  </span>
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {marketData.source === 'api' ? t('Live spot rates fetched directly from global markets.') :
                    marketData.source === 'cache' ? t('Displaying historically cached rates to conserve resources.') :
                      t('Using AI estimated values due to network or service failure.')}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {t('Last updated:')} {marketData.lastUpdated ? new Date(marketData.lastUpdated).toLocaleTimeString() : ''}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* KPI Dashboard */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <StatCard
            title={t('Current Value')}
            amount={stats.totalCurrent}
            gradient="bg-emerald-500"
            textColor="text-emerald-500 dark:text-emerald-400"
            icon={Wallet}
          />
          <StatCard
            title={t('Total Invested')}
            amount={stats.totalInvested}
            gradient="bg-slate-500"
            textColor="text-slate-600 dark:text-slate-400"
            icon={PieChartIcon}
          />
          <StatCard
            title={t('Profit / Loss')}
            amount={Math.abs(stats.profitLoss)}
            prefix={stats.profitLoss >= 0 ? '+' : '-'}
            gradient={stats.profitLoss >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}
            textColor={stats.profitLoss >= 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}
            icon={stats.profitLoss >= 0 ? TrendingUp : TrendingDown}
            badge={`${stats.profitLoss >= 0 ? '+' : ''}${stats.profitPct.toFixed(2)}%`}
          />
        </div>

        {/* Charts & Graphs Row */}
        {assets.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
            {/* Pie Chart */}
            <div className="glass-panel p-3 sm:p-5 rounded-2xl lg:col-span-1 flex flex-col items-center justify-center overflow-hidden">
              <h3 className="text-slate-900 dark:text-white font-bold w-full text-left text-xs sm:text-base mb-2 truncate">{t('Asset Distribution')}</h3>
              <div className="h-[140px] sm:h-[200px] w-full relative">
                <SafeChartContainer width="100%" height="100%" minWidth={100} minHeight={140} data={stats.distribution}>
                  <PieChart>
                    <Pie data={stats.distribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius="55%" outerRadius="80%" paddingAngle={5}>
                      {stats.distribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[entry.name as AssetType]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `₹${Number(value).toLocaleString()}`} />
                  </PieChart>
                </SafeChartContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mt-2">
                {stats.distribution.map(d => (
                  <div key={d.name} className="flex items-center gap-1 sm:gap-1.5 text-[9px] sm:text-xs text-slate-500 dark:text-slate-300 font-medium">
                    <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full" style={{ backgroundColor: COLORS[d.name as AssetType] }} />
                    {t(d.name)}
                  </div>
                ))}
              </div>
            </div>

            {/* Growth Graph */}
            <div className="glass-panel p-3 sm:p-5 rounded-2xl lg:col-span-2 overflow-hidden">
              <h3 className="text-slate-900 dark:text-white font-bold text-xs sm:text-base mb-2 sm:mb-4 truncate">{t('Investment Growth')}</h3>
              <div className="h-[140px] sm:h-[200px] w-full relative">
                <SafeChartContainer width="100%" height="100%" minWidth={100} minHeight={140} data={growthData}>
                  <AreaChart data={growthData}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis hide domain={['dataMin', 'dataMax']} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: '#1e293b', borderRadius: '12px', backdropFilter: 'blur(8px)' }}
                      itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                      labelStyle={{ color: '#94a3b8' }}
                    />
                    <Area type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                  </AreaChart>
                </SafeChartContainer>
              </div>
            </div>
          </div>
        )}

        {/* ── Daily Savings Widget ── */}
        <div className="glass-panel p-5 sm:p-6 rounded-3xl border-2 border-primary-500/20 bg-gradient-to-br from-primary-500/10 via-transparent to-transparent relative overflow-hidden mb-6 group">
          
          {/* Decorative background circle */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary-500/20 rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>

          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 relative z-10">
            {/* Left/Top Content */}
            <div className="flex-1 flex flex-col items-center sm:items-start text-center sm:text-left w-full">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 bg-primary-500/20 rounded-xl">
                  <Wallet size={24} className="text-primary-500" />
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {t('Daily Saving Goal')}
                </h3>
              </div>

              {showDailySavingSettings ? (
                <div className="w-full bg-white/60 dark:bg-black/20 p-4 rounded-2xl border border-slate-200 dark:border-white/10 flex items-end gap-3 mt-4 backdrop-blur-sm">
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">{t('Daily Amount (₹)')}</label>
                    <input
                      type="number"
                      value={dailyAmount}
                      onChange={handleDailyAmountChange}
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1a1a2e] font-black text-slate-900 dark:text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/50 shadow-inner"
                    />
                  </div>
                  <button onClick={() => setShowDailySavingSettings(false)} className="btn-primary p-3 rounded-xl font-bold hover:scale-105 active:scale-95 transition-transform">
                    <CheckCircle2 size={24} />
                  </button>
                </div>
              ) : (
                <div className="mt-2">
                  <p className="text-slate-600 dark:text-slate-300 font-medium text-sm sm:text-base">
                    {t('Commit to saving')} <span className="text-lg font-black text-primary-600 dark:text-primary-400 mx-1">₹{dailyAmount}</span> {t('every day.')}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {t('Build your wealth consistently.')}
                  </p>
                </div>
              )}
            </div>

            {/* Right/Bottom Action Area */}
            <div className="flex flex-col items-center sm:items-end w-full sm:w-auto shrink-0 gap-3">
              <button
                onClick={() => setShowDailySavingSettings(!showDailySavingSettings)}
                className="absolute top-0 right-0 sm:static p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-white/10 rounded-full transition-all"
                title={t('Edit Goal')}
              >
                <Edit3 size={18} />
              </button>

              {!showDailySavingSettings && (
                isPaidToday ? (
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex flex-col items-center justify-center p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-2xl min-w-[200px]"
                  >
                    <CheckCircle2 size={32} className="mb-2 text-emerald-500" />
                    <span className="font-bold text-sm">{t('Goal Met Today! 🎉')}</span>
                    <button
                      onClick={handleUndoDailyPaid}
                      disabled={isSubmitting}
                      className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition-colors"
                    >
                      {isSubmitting ? <RefreshCw size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                      {t('Undo')}
                    </button>
                  </motion.div>
                ) : (
                  <button
                    onClick={handleMarkDailyPaid}
                    disabled={isSubmitting}
                    className="group relative overflow-hidden btn-primary py-4 px-8 rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-primary-500/30 hover:shadow-primary-500/40 transition-all hover:-translate-y-0.5 active:translate-y-0.5 w-full sm:w-auto min-w-[200px]"
                  >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                    {isSubmitting ? (
                      <RefreshCw size={24} className="animate-spin relative z-10" />
                    ) : (
                      <>
                        <CheckCircle2 size={24} className="relative z-10 group-hover:scale-110 transition-transform" /> 
                        <span className="relative z-10">{t('Mark as Saved')}</span>
                      </>
                    )}
                  </button>
                )
              )}
            </div>
          </div>
        </div>

        {/* DataTable */}
        <div className="glass-panel rounded-2xl overflow-hidden mb-8">
          <div className="overflow-x-auto sm:overflow-visible custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5">
                  <th className="p-3 sm:p-4 text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('Asset')}</th>
                  <th className="hidden sm:table-cell p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('Qty')}</th>
                  <th className="hidden sm:table-cell p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('Purchase Total')}</th>
                  <th className="p-3 sm:p-4 text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right sm:text-left">{t('Current Val')}</th>
                  <th className="hidden sm:table-cell p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('Profit/Loss')}</th>
                  <th className="p-3 sm:p-4 text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">{t('Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {assets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      {t('No investments added yet. Start tracking your savings!')}
                    </td>
                  </tr>
                ) : (
                  assets.map(asset => {
                    const metrics = marketData ? calculateAssetMetrics(asset, marketData) : { currentValue: asset.purchase_price, profitLoss: 0, profitPercentage: 0 };
                    const isProfit = metrics.profitLoss >= 0;
                    return (
                      <React.Fragment key={asset.id}>
                        <tr className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                          <td className="p-3 sm:p-4">
                            <div className="flex items-center gap-2 sm:gap-3">
                              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${COLORS[asset.asset_type as AssetType]}20`, color: COLORS[asset.asset_type as AssetType] }}>
                                {asset.asset_type === 'Gold' ? <Activity size={16} /> : asset.asset_type === 'Silver' ? <Wallet size={16} /> : <TrendingUp size={16} />}
                              </div>
                              <div className="min-w-0">
                                <p className="text-slate-900 dark:text-white font-bold text-xs sm:text-sm truncate">{t(asset.category)}</p>
                                <p className="text-[10px] sm:text-xs text-slate-500 truncate">{t(asset.asset_type)} • {new Date(asset.purchase_date).toLocaleDateString()}</p>
                              </div>
                            </div>
                          </td>
                          <td className="hidden sm:table-cell p-4">
                            <p className="text-slate-900 dark:text-white font-bold">{asset.quantity} {asset.asset_type !== 'Other' ? 'g' : t('Units')}</p>
                          </td>
                          <td className="hidden sm:table-cell p-4">
                            <p className="text-slate-500 dark:text-slate-300">₹{Number(asset.purchase_price).toLocaleString()}</p>
                          </td>
                          <td className="p-3 sm:p-4 text-right sm:text-left">
                            <p className="text-slate-900 dark:text-white font-black text-sm sm:text-base">₹{metrics.currentValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                            <div className="sm:hidden flex items-center justify-end gap-1 mt-0.5">
                              <span className={`text-[9px] font-bold ${isProfit ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {isProfit ? '+' : ''}{metrics.profitPercentage.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                          <td className="hidden sm:table-cell p-4">
                            <div className={`flex items-center gap-1 font-bold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {isProfit ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                              ₹{Math.abs(metrics.profitLoss).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                              <span className="text-[10px] opacity-70 ml-1">({metrics.profitPercentage.toFixed(1)}%)</span>
                            </div>
                          </td>
                          <td className="p-3 sm:p-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1 sm:gap-2">
                              <button
                                onClick={() => setSelectedAssetForInfo(asset)}
                                className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-500 hover:bg-primary-500 hover:text-white transition-all shadow-sm"
                              >
                                <Info size={16} />
                              </button>
                              <button onClick={() => handleOpenModal(asset)} className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><Edit3 size={16} /></button>
                              <button onClick={() => handleDelete(asset.id)} className="p-1.5 sm:p-2 text-slate-400 hover:text-rose-500 transition-colors"><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      {/* ── Add/Edit Modal ── */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            variants={modalBackdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-6"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              variants={modalContentVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={modalTransition}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-lg bg-white dark:bg-[#12121f] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {editingId ? t('Edit Investment') : t('New Investment')}
                </h2>
                <button onClick={() => setShowModal(false)} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500">
                  <X size={18} />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">

                {/* Type & Category */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">{t('Asset Type')}</label>
                    <select
                      value={formData.asset_type}
                      onChange={e => setFormData(p => ({ ...p, asset_type: e.target.value as AssetType, category: CATEGORIES[e.target.value as AssetType][0] }))}
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1a1a2e] text-slate-900 dark:text-white font-semibold focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                    >
                      {ASSET_TYPES.map(t_str => <option key={t_str} value={t_str}>{t(t_str)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">{t('Category')}</label>
                    <select
                      value={formData.category}
                      onChange={e => setFormData(p => ({ ...p, category: e.target.value }))}
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1a1a2e] text-slate-900 dark:text-white font-semibold focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                    >
                      {CATEGORIES[formData.asset_type].map(c => <option key={c} value={c}>{t(c)}</option>)}
                    </select>
                  </div>
                </div>

                {/* Quantity & Price */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">{t('Quantity')} ({formData.asset_type === 'Other' ? t('Units') : 'g'})</label>
                    <input
                      type="number" step="0.01" min="0" required
                      value={formData.quantity}
                      onChange={e => setFormData(p => ({ ...p, quantity: e.target.value }))}
                      placeholder="e.g. 10.5"
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1a1a2e] text-slate-900 dark:text-white font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">{t('Total Cost (₹)')}</label>
                    <input
                      type="number" min="0" required
                      value={formData.purchase_price}
                      onChange={e => setFormData(p => ({ ...p, purchase_price: e.target.value }))}
                      placeholder="e.g. 75000"
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1a1a2e] text-slate-900 dark:text-white font-semibold"
                    />
                  </div>
                </div>

                {/* Live Estimator Note */}
                {formData.quantity && marketData && formData.asset_type !== 'Other' && (
                  <div className="p-3 bg-primary-50 dark:bg-primary-500/10 rounded-xl border border-primary-100 dark:border-primary-500/20 text-xs text-primary-700 dark:text-primary-300">
                    <span className="font-bold">{t('Live API Value: ')}</span>
                    ₹{(Number(formData.quantity) * (
                      formData.asset_type === 'Silver' ? marketData.silver :
                        formData.category.includes('24K') ? marketData.gold24 : marketData.gold22
                    )).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                )}

                {/* Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">{t('Purchase Date')}</label>
                  <input
                    type="date" required
                    value={formData.purchase_date}
                    onChange={e => setFormData(p => ({ ...p, purchase_date: e.target.value }))}
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1a1a2e] text-slate-900 dark:text-white font-semibold"
                  />
                </div>

                {/* Bill / Proof */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">{t('Bill / Proof (Optional)')}</label>
                  {formData.image_uri ? (
                    <div className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm w-32 h-20 mx-auto">
                      <img
                        src={formData.image_uri}
                        alt="Proof"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setFormData(p => ({ ...p, image_uri: null }))}
                          className="p-2 rounded-xl bg-rose-500 text-white shadow-lg hover:bg-rose-600 transition-colors"
                          title={t('Remove Image')}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                      <div className="absolute top-2 left-2 bg-emerald-500 text-white p-1 rounded-lg">
                        <CheckCircle2 size={12} />
                      </div>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center w-full p-4 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer group">
                      <input type="file" accept="image/*" capture="environment" className="hidden"
                        onClick={() => {
                          if (typeof shouldSuppressLock === 'function') shouldSuppressLock();
                        }}
                        onChange={handleImageUpload}
                      />
                      <div className="flex items-center gap-2 text-slate-500 group-hover:text-primary-500 transition-colors">
                        <ImageIcon size={20} /> {t('Tap to Capture / Upload')}
                      </div>
                    </label>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                    placeholder={t('Bought from GRT Jewellers')}
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1a1a2e] text-slate-900 dark:text-white text-sm"
                    rows={2}
                  />
                </div>

                {/* Footer Buttons */}
                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-white/5">
                    {t('Cancel')}
                  </button>
                  <button type="submit" disabled={isSubmitting} className="flex-1 btn-primary p-3 rounded-xl font-bold flex items-center justify-center">
                    {isSubmitting ? <RefreshCw size={20} className="animate-spin" /> : t('Save Investment')}
                  </button>
                </div>

              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Asset Info Modal ── */}
      <AnimatePresence>
        {selectedAssetForInfo && (
          <motion.div
            variants={modalBackdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6"
            onClick={() => setSelectedAssetForInfo(null)}
          >
            <motion.div
              variants={modalContentVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={modalTransition}
              className="w-full max-w-md bg-white dark:bg-[#12121f] rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[70vh] flex flex-col"
            >
              <div className="p-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${COLORS[selectedAssetForInfo.asset_type as AssetType]}20`, color: COLORS[selectedAssetForInfo.asset_type as AssetType] }}>
                    {selectedAssetForInfo.asset_type === 'Gold' ? <Activity size={20} /> : selectedAssetForInfo.asset_type === 'Silver' ? <Wallet size={20} /> : <TrendingUp size={20} />}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">{t(selectedAssetForInfo.category)}</h2>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{t(selectedAssetForInfo.asset_type)}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedAssetForInfo(null)} className="p-2 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-500">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1" style={{ WebkitOverflowScrolling: 'touch' }}>
                {/* Main Metrics Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 dark:bg-white/[0.03] p-4 rounded-2xl border border-slate-100 dark:border-white/5">
                    <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">{t('Quantity')}</p>
                    <p className="text-base font-black text-slate-900 dark:text-white">{selectedAssetForInfo.quantity} {selectedAssetForInfo.asset_type !== 'Other' ? 'g' : t('Units')}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-white/[0.03] p-4 rounded-2xl border border-slate-100 dark:border-white/5">
                    <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">{t('Cost Price')}</p>
                    <p className="text-base font-black text-slate-900 dark:text-white">₹{Number(selectedAssetForInfo.purchase_price).toLocaleString()}</p>
                  </div>
                </div>

                {/* Performance Highlight */}
                {(() => {
                  const metrics = marketData ? calculateAssetMetrics(selectedAssetForInfo, marketData) : { currentValue: selectedAssetForInfo.purchase_price, profitLoss: 0, profitPercentage: 0 };
                  const isProfit = metrics.profitLoss >= 0;

                  return (
                    <div className={`p-4 rounded-2xl border ${isProfit ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'}`}>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">{t('Current Value')}</p>
                          <p className="text-2xl font-black text-slate-900 dark:text-white">₹{metrics.currentValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                        </div>
                        <div className={`p-3 rounded-xl ${isProfit ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                          {isProfit ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-slate-200/50 dark:border-white/5">
                        <div>
                          <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">{t('Profit / Loss')}</p>
                          <p className={`text-base font-black ${isProfit ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {isProfit ? '+' : '-'}₹{Math.abs(metrics.profitLoss).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">{t('Growth')}</p>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-black ${isProfit ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                            {isProfit ? '+' : ''}{metrics.profitPercentage.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Details */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 font-bold">{t('Purchase Date')}</span>
                    <span className="text-slate-900 dark:text-white font-bold">{new Date(selectedAssetForInfo.purchase_date).toLocaleDateString(undefined, { dateStyle: 'long' })}</span>
                  </div>

                  {selectedAssetForInfo.image_uri && (
                    <div className="pt-4 border-t border-slate-100 dark:border-white/5">
                      <p className="text-[10px] uppercase font-bold text-slate-400 mb-2 text-center">{t('Attached Proof')}</p>
                      <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-sm w-40 h-24 mx-auto group relative">
                        <img
                          src={selectedAssetForInfo.image_uri}
                          alt="Proof"
                          className="w-full h-full object-cover cursor-pointer hover:scale-110 transition-transform"
                          onClick={() => setViewingFullImage(selectedAssetForInfo.image_uri)}
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (selectedAssetForInfo.image_uri) {
                                handleDownloadProof(selectedAssetForInfo.image_uri);
                              }
                            }}
                            className="p-2 bg-white/20 hover:bg-primary-500 text-white rounded-full backdrop-blur-sm transition-all"
                            title={t('Download')}
                          >
                            <Download size={16} />
                          </button>
                          <button
                            onClick={() => setViewingFullImage(selectedAssetForInfo.image_uri)}
                            className="p-2 bg-white/20 hover:bg-primary-500 text-white rounded-full backdrop-blur-sm transition-all"
                            title={t('View Full')}
                          >
                            <Eye size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedAssetForInfo.notes && (
                    <div className="pt-4 border-t border-slate-100 dark:border-white/5">
                      <p className="text-[10px] uppercase font-bold text-slate-400 mb-2">{t('Personal Notes')}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400 italic bg-slate-50 dark:bg-white/[0.02] p-3 rounded-xl border border-slate-100 dark:border-white/5">
                        "{selectedAssetForInfo.notes}"
                      </p>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setSelectedAssetForInfo(null)}
                  className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black rounded-2xl shadow-xl active:scale-[0.98] transition-transform"
                >
                  {t('Close Details')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

        {/* ── Full Screen Image Viewer ── */}
        <AnimatePresence>
          {viewingFullImage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 md:p-12"
              onClick={() => setViewingFullImage(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative w-full max-w-4xl max-h-full flex items-center justify-center"
                onClick={e => e.stopPropagation()}
              >
                <img
                  src={viewingFullImage}
                  className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
                  alt="Full Preview"
                />
                <div className="absolute -top-12 right-0 md:-right-12 flex gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (viewingFullImage) {
                        handleDownloadProof(viewingFullImage);
                      }
                    }}
                    className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors backdrop-blur-md"
                    title={t('Download')}
                  >
                    <Download size={24} />
                  </button>
                  <button
                    onClick={() => setViewingFullImage(null)}
                    className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors backdrop-blur-md"
                    title={t('Close')}
                  >
                    <X size={24} />
                  </button>
                </div>
              </motion.div>
              <p className="mt-6 text-white/60 font-medium text-sm">{t('Tap anywhere to close')}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toast Notification */}
        <Toast message={toast.message} visible={toast.visible} icon={toast.icon} />
      </div>
    </div>
  );
}

// ─── Toast Notification ────────────────────────────────────
interface ToastProps {
  message: string;
  visible: boolean;
  icon: React.ComponentType<any> | null;
}
const Toast: React.FC<ToastProps> = ({ message, visible, icon: ToastIcon }) => (
  <AnimatePresence>
    {visible && (
      <motion.div
        key="toast"
        initial={{ opacity: 0, scale: 0.8, x: '-50%', y: '-50%' }}
        animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
        exit={{ opacity: 0, scale: 0.8, x: '-50%', y: '-50%' }}
        className="fixed top-1/2 left-1/2 z-[250] bg-white/80 dark:bg-[#12121f]/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 text-slate-800 dark:text-slate-100 px-6 py-4 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col items-center gap-3 text-center min-w-[200px] max-w-[80vw]"
      >
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
          {ToastIcon ? <ToastIcon size={24} className="text-emerald-500" /> : <CheckCircle2 size={24} className="text-emerald-500" />}
        </div>
        <p className="text-base font-bold leading-tight">{message}</p>
      </motion.div>
    )}
  </AnimatePresence>
);

// ============================================================================
// Subcomponents
// ============================================================================

interface StatCardProps {
  title: string;
  amount: number;
  gradient: string;
  textColor: string;
  icon: React.ComponentType<any>;
  prefix?: string;
  badge?: string;
}
const StatCard: React.FC<StatCardProps> = ({ title, amount, gradient, textColor, icon: Icon, prefix = '₹', badge }) => (
  <motion.div
    whileTap={{ scale: 0.97 }}
    className="glass-panel relative overflow-hidden flex flex-col justify-between cursor-default"
  >
    <div className={`absolute -right-6 -top-6 w-16 h-16 sm:w-24 sm:h-24 rounded-full blur-2xl opacity-25 ${gradient}`} />

    <div className="p-2.5 sm:p-5 flex flex-col gap-2 sm:gap-3 relative z-10 h-full">
      <div className="flex items-center justify-between">
        <div className={`p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl ${gradient} bg-opacity-20`}>
          <Icon className={`w-4 h-4 sm:w-[18px] sm:h-[18px] ${textColor || 'text-slate-700 dark:text-white'}`} />
        </div>
        {badge && (
          <span className="px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white text-[9px] sm:text-xs font-bold backdrop-blur-sm">
            {badge}
          </span>
        )}
      </div>
      <div className="mt-auto">
        <p className="text-slate-500 dark:text-slate-400 text-[9px] sm:text-xs font-bold uppercase tracking-wider mb-0.5 sm:mb-1 leading-tight break-words">{title}</p>
        <h3 className="text-base sm:text-2xl lg:text-3xl font-black font-sans leading-tight text-slate-900 dark:text-white break-words">
          <AnimatedNumber value={amount} prefix={prefix} />
        </h3>
      </div>
    </div>
  </motion.div>
);

interface RateBadgeProps {
  label: string;
  value: number | undefined;
  unit: string;
  color: 'amber' | 'yellow' | 'slate';
}
const RateBadge: React.FC<RateBadgeProps> = ({ label, value, unit, color }) => {
  const colorMap = {
    amber: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-500 border-amber-200 dark:border-amber-500/20',
    yellow: 'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border-yellow-200 dark:border-yellow-500/20',
    slate: 'bg-slate-50 dark:bg-slate-400/10 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-400/20'
  };

  return (
    <div className={`px-3 py-2 rounded-xl border flex flex-col ${colorMap[color]}`}>
      <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">{label}</span>
      <span className="font-bold">₹{value ? value.toLocaleString() : '---'} <span className="text-xs font-normal">/ {unit}</span></span>
    </div>
  );
};
