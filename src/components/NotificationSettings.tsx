import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  ChevronDown,
  ChevronUp,
  Settings2,
  Sunrise,
  Sun,
  Sunset,
  Moon,
  Volume2,
  VolumeX,
  ShieldAlert,
  Sliders,
  DollarSign,
  PieChart,
  HardDrive,
  Trash2,
  Check
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import {
  DEFAULT_SLOTS,
  getNotifEnabled,
  setNotifEnabled,
  getSlotSettings,
  setSlotSettings,
  getCustomTimes,
  setCustomTimes,
  rescheduleNotifications,
  getDndSettings,
  setDndSettings,
  getLowPriorityQueue,
  clearLowPriorityQueue,
  CustomTime,
  DndSettings,
  LowPriorityEvent
} from '../utils/notificationService';

type SlotKey = 'morning' | 'afternoon' | 'evening' | 'night';

export default function NotificationSettings() {
  const { t } = useLanguage();
  const [enabled, setEnabled] = useState<boolean>(getNotifEnabled());
  const [slots, setSlots] = useState<Record<string, boolean>>(getSlotSettings());
  const [customTimes, setCustomTimesState] = useState<Record<string, CustomTime>>(getCustomTimes());
  const [dnd, setDnd] = useState<DndSettings>(getDndSettings());
  const [expanded, setExpanded] = useState<boolean>(false);
  const [lowPriorityQueue, setLowPriorityQueue] = useState<LowPriorityEvent[]>([]);

  // Category preferences stored locally
  const [prefExpenses, setPrefExpenses] = useState<boolean>(() => localStorage.getItem('notif_pref_expenses') !== 'false');
  const [prefIncome, setPrefIncome] = useState<boolean>(() => localStorage.getItem('notif_pref_income') !== 'false');
  const [prefStorage, setPrefStorage] = useState<boolean>(() => localStorage.getItem('notif_pref_storage') !== 'false');
  const [prefDailySummary, setPrefDailySummary] = useState<boolean>(() => localStorage.getItem('notif_pref_daily_summary') !== 'false');

  useEffect(() => {
    setLowPriorityQueue(getLowPriorityQueue());
  }, []);

  const handleMasterToggle = useCallback(() => {
    const next = !enabled;
    setEnabled(next);
    setNotifEnabled(next);
    rescheduleNotifications();
  }, [enabled]);

  const handleSlotToggle = useCallback((key: string) => {
    setSlots(prev => {
      const next = { ...prev, [key]: !prev[key] };
      setSlotSettings(next);
      rescheduleNotifications();
      return next;
    });
  }, []);

  const handleTimeChange = useCallback((slotKey: string, field: 'startHour' | 'endHour', value: string) => {
    setCustomTimesState(prev => {
      const next = {
        ...prev,
        [slotKey]: { ...(prev[slotKey] || {}), [field]: parseInt(value, 10) },
      };
      setCustomTimes(next);
      rescheduleNotifications();
      return next;
    });
  }, []);

  const handleDndToggle = useCallback(() => {
    setDnd(prev => {
      const next = { ...prev, enabled: !prev.enabled };
      setDndSettings(next);
      rescheduleNotifications();
      return next;
    });
  }, []);

  const handleDndHourChange = useCallback((field: 'startHour' | 'endHour', value: string) => {
    setDnd(prev => {
      const next = { ...prev, [field]: parseInt(value, 10) };
      setDndSettings(next);
      rescheduleNotifications();
      return next;
    });
  }, []);

  const toggleCategory = useCallback((category: string, currentVal: boolean) => {
    const nextVal = !currentVal;
    localStorage.setItem(`notif_pref_${category}`, String(nextVal));
    if (category === 'expenses') setPrefExpenses(nextVal);
    else if (category === 'income') setPrefIncome(nextVal);
    else if (category === 'storage') setPrefStorage(nextVal);
    else if (category === 'daily_summary') setPrefDailySummary(nextVal);
  }, []);

  const handleClearQueue = useCallback(() => {
    clearLowPriorityQueue();
    setLowPriorityQueue([]);
  }, []);

  const slotKeys = Object.keys(DEFAULT_SLOTS) as SlotKey[];

  const SLOT_ICONS = {
    morning:   { Icon: Sunrise, bg: 'bg-amber-50 dark:bg-amber-950/20',  text: 'text-amber-500',  border: 'border-amber-100 dark:border-amber-900/30' },
    afternoon: { Icon: Sun,     bg: 'bg-orange-50 dark:bg-orange-950/20', text: 'text-orange-500', border: 'border-orange-100 dark:border-orange-900/30' },
    evening:   { Icon: Sunset,  bg: 'bg-rose-50 dark:bg-rose-950/20',   text: 'text-rose-500',   border: 'border-rose-100 dark:border-rose-900/30' },
    night:     { Icon: Moon,    bg: 'bg-indigo-50 dark:bg-indigo-950/20',  text: 'text-indigo-500', border: 'border-indigo-100 dark:border-indigo-900/30' },
  };

  const hourOptions = Array.from({ length: 24 }, (_, i) => {
    const label = i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`;
    return <option key={i} value={i}>{label}</option>;
  });

  return (
    <div className="glass-panel overflow-hidden mb-4">
      {/* Main Header */}
      <div
        onClick={() => setExpanded(e => !e)}
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            enabled ? 'bg-primary-500/10 text-primary-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
          }`}>
            <Settings2 size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">{t('Smart Reminders')}</h3>
            <p className="text-[11px] text-slate-500">
              {enabled ? t('Active — auto alerts for family spends') : t('Disabled')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Master toggle */}
          <button
            onClick={(e) => { e.stopPropagation(); handleMasterToggle(); }}
            className={`w-11 h-6 rounded-full flex items-center px-0.5 transition-colors duration-300 ${
              enabled ? 'bg-primary-500 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
            }`}
          >
            <motion.div
              layout
              className="w-5 h-5 bg-white rounded-full shadow-sm"
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </button>
          {expanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </div>
      </div>

      {/* Expandable Settings Panel */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-5 space-y-4 border-t border-slate-200/20 dark:border-white/5 pt-4">
              
              {/* DND (Quiet Hours) Section */}
              <div className="rounded-xl border border-slate-200/40 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01] p-3.5">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-lg ${dnd.enabled && enabled ? 'bg-indigo-500/10 text-indigo-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                      {dnd.enabled ? <VolumeX size={15} /> : <Volume2 size={15} />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{t('Quiet Hours (DND)')}</p>
                      <p className="text-[9px] text-slate-500">{t('Mute non-critical alerts during sleep')}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleDndToggle}
                    disabled={!enabled}
                    className={`w-9 h-5 rounded-full flex items-center px-0.5 transition-colors duration-300 ${
                      dnd.enabled && enabled ? 'bg-indigo-500 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                    } disabled:opacity-40`}
                  >
                    <motion.div
                      layout
                      className="w-4 h-4 bg-white rounded-full shadow-sm"
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  </button>
                </div>

                {dnd.enabled && enabled && (
                  <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-slate-200/10 dark:border-white/5">
                    <Clock size={12} className="text-slate-400 shrink-0" />
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{t('From')}</span>
                    <select
                      value={dnd.startHour}
                      onChange={(e) => handleDndHourChange('startHour', e.target.value)}
                      className="text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:border-primary-400"
                    >
                      {hourOptions}
                    </select>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{t('To')}</span>
                    <select
                      value={dnd.endHour}
                      onChange={(e) => handleDndHourChange('endHour', e.target.value)}
                      className="text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:border-primary-400"
                    >
                      {hourOptions}
                    </select>
                  </div>
                )}
              </div>

              {/* Alert Categories Toggles */}
              <div className="space-y-2">
                <p className="text-[9px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest px-1">{t('Mute Categories')}</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => toggleCategory('expenses', prefExpenses)}
                    disabled={!enabled}
                    className={`p-3 rounded-xl border flex items-center gap-2.5 transition-all text-left ${
                      prefExpenses && enabled
                        ? 'border-emerald-500/20 bg-emerald-500/5 text-slate-800 dark:text-slate-200'
                        : 'border-slate-200/40 dark:border-white/5 bg-transparent text-slate-400'
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg ${prefExpenses && enabled ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-100 dark:bg-slate-850'}`}>
                      <DollarSign size={13} />
                    </div>
                    <div>
                      <p className="text-xs font-bold">{t('Expenses')}</p>
                      <p className="text-[8px] text-slate-400 truncate">{prefExpenses && enabled ? t('Active') : t('Muted')}</p>
                    </div>
                  </button>
                  <button
                    onClick={() => toggleCategory('income', prefIncome)}
                    disabled={!enabled}
                    className={`p-3 rounded-xl border flex items-center gap-2.5 transition-all text-left ${
                      prefIncome && enabled
                        ? 'border-primary-500/20 bg-primary-500/5 text-slate-800 dark:text-slate-200'
                        : 'border-slate-200/40 dark:border-white/5 bg-transparent text-slate-400'
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg ${prefIncome && enabled ? 'bg-primary-500/10 text-primary-400' : 'bg-slate-100 dark:bg-slate-850'}`}>
                      <PieChart size={13} />
                    </div>
                    <div>
                      <p className="text-xs font-bold">{t('Income')}</p>
                      <p className="text-[8px] text-slate-400 truncate">{prefIncome && enabled ? t('Active') : t('Muted')}</p>
                    </div>
                  </button>
                  <button
                    onClick={() => toggleCategory('storage', prefStorage)}
                    disabled={!enabled}
                    className={`p-3 rounded-xl border flex items-center gap-2.5 transition-all text-left ${
                      prefStorage && enabled
                        ? 'border-amber-500/20 bg-amber-500/5 text-slate-800 dark:text-slate-200'
                        : 'border-slate-200/40 dark:border-white/5 bg-transparent text-slate-400'
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg ${prefStorage && enabled ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-100 dark:bg-slate-850'}`}>
                      <HardDrive size={13} />
                    </div>
                    <div>
                      <p className="text-xs font-bold">{t('Storage')}</p>
                      <p className="text-[8px] text-slate-400 truncate">{prefStorage && enabled ? t('Active') : t('Muted')}</p>
                    </div>
                  </button>
                  <button
                    onClick={() => toggleCategory('daily_summary', prefDailySummary)}
                    disabled={!enabled}
                    className={`p-3 rounded-xl border flex items-center gap-2.5 transition-all text-left ${
                      prefDailySummary && enabled
                        ? 'border-indigo-500/20 bg-indigo-500/5 text-slate-800 dark:text-slate-200'
                        : 'border-slate-200/40 dark:border-white/5 bg-transparent text-slate-400'
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg ${prefDailySummary && enabled ? 'bg-indigo-500/10 text-indigo-400' : 'bg-slate-100 dark:bg-slate-850'}`}>
                      <Sliders size={13} />
                    </div>
                    <div>
                      <p className="text-xs font-bold">{t('Daily Summary')}</p>
                      <p className="text-[8px] text-slate-400 truncate">{prefDailySummary && enabled ? t('Active') : t('Muted')}</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Time Slots Section */}
              <div className="space-y-2">
                <p className="text-[9px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest px-1">{t('Scheduled Reminders')}</p>
                <div className="space-y-2.5">
                  {slotKeys.map((key) => {
                    const slot = DEFAULT_SLOTS[key];
                    const isOn = slots[key];
                    const custom = customTimes[key] || {};
                    const startH = custom.startHour ?? slot.startHour;
                    const endH = custom.endHour ?? slot.endHour;

                    return (
                      <div
                        key={key}
                        className={`rounded-xl border p-3.5 transition-all ${
                          isOn && enabled
                            ? 'border-primary-500/25 bg-primary-500/[0.02] dark:bg-primary-500/[0.04]'
                            : 'border-slate-200/30 dark:border-white/5 bg-slate-50/20 opacity-60'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2.5">
                            {(() => {
                              const iconCfg = SLOT_ICONS[key] || SLOT_ICONS.morning;
                              const SlotIcon = iconCfg.Icon;
                              return (
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${iconCfg.bg} ${iconCfg.border} border`}>
                                  <SlotIcon size={16} className={iconCfg.text} />
                                </div>
                              );
                            })()}
                            <div>
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{t(slot.label)}</p>
                              <p className="text-[9px] text-slate-400 mt-0.5">{slot.categories.map(c => t(c)).join(', ')}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleSlotToggle(key)}
                            disabled={!enabled}
                            className={`w-9 h-5 rounded-full flex items-center px-0.5 transition-colors duration-300 ${
                              isOn && enabled ? 'bg-primary-500 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                            } disabled:opacity-40`}
                          >
                            <motion.div
                              layout
                              className="w-4 h-4 bg-white rounded-full shadow-sm"
                              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                            />
                          </button>
                        </div>

                        {isOn && enabled && (
                          <div className="flex items-center gap-2 mt-2.5 pt-2 border-t border-slate-200/10 dark:border-white/5">
                            <Clock size={11} className="text-slate-400 shrink-0" />
                            <select
                              value={startH}
                              onChange={(e) => handleTimeChange(key, 'startHour', e.target.value)}
                              className="text-[11px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-0.5 font-medium text-slate-700 dark:text-slate-300 focus:outline-none"
                            >
                              {Array.from({ length: 24 }, (_, i) => (
                                <option key={i} value={i}>
                                  {i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`}
                                </option>
                              ))}
                            </select>
                            <span className="text-[10px] text-slate-400">{t('to')}</span>
                            <select
                              value={endH}
                              onChange={(e) => handleTimeChange(key, 'endHour', e.target.value)}
                              className="text-[11px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-0.5 font-medium text-slate-700 dark:text-slate-300 focus:outline-none"
                            >
                              {Array.from({ length: 24 }, (_, i) => (
                                <option key={i} value={i}>
                                  {i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Low Priority Notification Queue (Batched) */}
              {lowPriorityQueue.length > 0 && (
                <div className="rounded-xl border border-dashed border-slate-200 dark:border-white/10 p-3.5 bg-slate-50/30 dark:bg-white/[0.01]">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{t('Queued (Batched) Alerts')}</span>
                    <button
                      onClick={handleClearQueue}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      title="Clear Queue"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div className="max-h-24 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                    {lowPriorityQueue.map((item, i) => (
                      <div key={i} className="text-[10px] text-slate-600 dark:text-slate-300 flex justify-between gap-2 p-1.5 rounded-lg bg-white/50 dark:bg-slate-900 border border-slate-200/30 dark:border-white/5">
                        <span className="truncate flex-1">{item.message}</span>
                        <span className="text-[8px] text-slate-400 shrink-0">{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-[9px] text-slate-400 text-center pt-1 leading-relaxed">
                {t('Low priority notifications are batched and delivered at 7 PM to prevent interruption.')}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
