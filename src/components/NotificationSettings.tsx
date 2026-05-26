import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, ChevronDown, ChevronUp, Settings2, Sunrise, Sun, Sunset, Moon } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import {
  DEFAULT_SLOTS, getNotifEnabled, setNotifEnabled,
  getSlotSettings, setSlotSettings, getCustomTimes,
  setCustomTimes, rescheduleNotifications, CustomTime,
} from '../utils/notificationService';

type SlotKey = 'morning' | 'afternoon' | 'evening' | 'night';

export default function NotificationSettings() {
  const { t } = useLanguage();
  const [enabled, setEnabled] = useState<boolean>(getNotifEnabled());
  const [slots, setSlots] = useState<Record<string, boolean>>(getSlotSettings());
  const [customTimes, setCustomTimesState] = useState<Record<string, CustomTime>>(getCustomTimes());
  const [expanded, setExpanded] = useState<boolean>(false);

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
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
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

  const slotKeys = Object.keys(DEFAULT_SLOTS) as SlotKey[];

  // Icon + color config per slot (replaces emojis)
  const SLOT_ICONS = {
    morning:   { Icon: Sunrise, bg: 'bg-amber-50',  text: 'text-amber-500',  border: 'border-amber-100' },
    afternoon: { Icon: Sun,     bg: 'bg-orange-50', text: 'text-orange-500', border: 'border-orange-100' },
    evening:   { Icon: Sunset,  bg: 'bg-rose-50',   text: 'text-rose-500',   border: 'border-rose-100' },
    night:     { Icon: Moon,    bg: 'bg-indigo-50',  text: 'text-indigo-500', border: 'border-indigo-100' },
  };

  return (
    <div className="glass-panel overflow-hidden mb-4">
      {/* Header */}
      <div
        onClick={() => setExpanded(e => !e)}
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            enabled ? 'bg-primary-50 text-primary-500' : 'bg-slate-100 text-slate-400'
          }`}>
            <Settings2 size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">{t('Smart Reminders')}</h3>
            <p className="text-[11px] text-slate-500">
              {enabled ? t('Active — auto reminders for expenses') : t('Disabled')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Master toggle */}
          <button
            onClick={(e) => { e.stopPropagation(); handleMasterToggle(); }}
            className={`w-11 h-6 rounded-full flex items-center px-0.5 transition-colors duration-300 ${
              enabled ? 'bg-primary-500 justify-end' : 'bg-slate-300 dark:bg-slate-600 justify-start'
            }`}
          >
            <motion.div
              layout
              className="w-5 h-5 bg-[#ffffff] rounded-full shadow-sm"
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </button>
          {expanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </div>
      </div>

      {/* Expandable settings */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-slate-100 pt-3">
              {slotKeys.map((key) => {
                const slot = DEFAULT_SLOTS[key];
                const isOn = slots[key];
                const custom = customTimes[key] || {};
                const startH = custom.startHour ?? slot.startHour;
                const endH = custom.endHour ?? slot.endHour;

                return (
                  <div
                    key={key}
                    className={`rounded-xl border p-3 transition-all ${
                      isOn && enabled
                        ? 'border-primary-100 dark:border-primary-500/20 bg-primary-50/30 dark:bg-primary-500/10'
                        : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        {(() => {
                          const iconCfg = SLOT_ICONS[key] || SLOT_ICONS.morning;
                          const SlotIcon = iconCfg.Icon;
                          return (
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconCfg.bg} ${iconCfg.border} border`}>
                              <SlotIcon size={18} className={iconCfg.text} />
                            </div>
                          );
                        })()}
                        <div>
                          <p className="text-sm font-bold text-slate-800">{t(slot.label)}</p>
                          <p className="text-[10px] text-slate-500">{slot.categories.map(c => t(c)).join(', ')}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleSlotToggle(key)}
                        disabled={!enabled}
                        className={`w-9 h-5 rounded-full flex items-center px-0.5 transition-colors duration-300 ${
                          isOn && enabled ? 'bg-primary-400 justify-end' : 'bg-slate-300 dark:bg-slate-600 justify-start'
                        } disabled:opacity-40`}
                      >
                        <motion.div
                          layout
                          className="w-4 h-4 bg-[#ffffff] rounded-full shadow-sm"
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                      </button>
                    </div>

                    {/* Time customization */}
                    {isOn && enabled && (
                      <div className="flex items-center gap-2 mt-2">
                        <Clock size={12} className="text-slate-400 shrink-0" />
                        <select
                          value={startH}
                          onChange={(e) => handleTimeChange(key, 'startHour', e.target.value)}
                          className="text-xs bg-slate-50 dark:bg-[#1a1a2e] border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:border-primary-400"
                        >
                          {Array.from({ length: 24 }, (_, i) => (
                            <option key={i} value={i}>
                              {i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`}
                            </option>
                          ))}
                        </select>
                        <span className="text-xs text-slate-400">{t('to')}</span>
                        <select
                          value={endH}
                          onChange={(e) => handleTimeChange(key, 'endHour', e.target.value)}
                          className="text-xs bg-slate-50 dark:bg-[#1a1a2e] border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:border-primary-400"
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
              <p className="text-[10px] text-slate-400 text-center pt-1">
                {t('Max 1 notification per time slot to prevent spam. Notifications work even when the app is closed.')}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
