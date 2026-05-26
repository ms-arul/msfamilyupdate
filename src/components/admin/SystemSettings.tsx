import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, Save, Shield, Download, RefreshCw, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { downloadBase64File } from '../../utils/downloadHelper';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface GlobalSettings {
  maintenanceMode?: boolean;
  defaultSavings?: number;
}

const SystemSettings: React.FC = () => {
  const { t } = useLanguage();
  const { user } = useAuth();

  // Local state for settings
  const [maintenanceMode, setMaintenanceMode] = useState<boolean>(false);
  const [defaultSavings, setDefaultSavings] = useState<number>(1000);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string>('');

  // Load configuration from admin profile row
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('phone')
          .eq('role', 'admin')
          .limit(1)
          .maybeSingle();

        if (error) throw error;

        if (data && data.phone) {
          try {
            const settings = JSON.parse(data.phone) as GlobalSettings;
            if (settings) {
              if (typeof settings.maintenanceMode === 'boolean') {
                setMaintenanceMode(settings.maintenanceMode);
              }
              if (settings.defaultSavings !== undefined) {
                setDefaultSavings(Number(settings.defaultSavings));
              }
            }
          } catch (jsonErr) {
            console.error('Failed to parse settings JSON from phone column:', jsonErr);
          }
        }
      } catch (err) {
        console.error('Failed to load global settings:', err);
      }
    };

    loadSettings();
  }, []);

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const settingsObj: GlobalSettings = {
        maintenanceMode,
        defaultSavings,
      };

      const { error } = await supabase
        .from('profiles')
        .update({ phone: JSON.stringify(settingsObj) })
        .eq('id', user.id);

      if (error) throw error;

      setSaveMessage('Settings updated successfully.');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (err) {
      console.error('Failed to save global settings:', err);
      setSaveMessage('Failed to save settings.');
      setTimeout(() => setSaveMessage(''), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      // Fetch all transactions
      const { data: txData, error } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;

      if (!txData || txData.length === 0) {
        setSaveMessage('No data to export.');
        setTimeout(() => setSaveMessage(''), 3000);
        return;
      }

      // Generate PDF
      const doc = new jsPDF();
      doc.text('System Audit Export - All Transactions', 14, 20);

      autoTable(doc, {
        startY: 30,
        head: [['Date', 'Type', 'Category', 'Amount', 'Member ID']],
        body: txData.map(tx => [
          tx.date || '',
          tx.type || '',
          tx.category || '',
          String(tx.amount || 0),
          tx.member_id || 'System'
        ]),
        headStyles: { fillColor: [79, 70, 229] },
        styles: { fontSize: 8 }
      });

      const pdfDataUri = doc.output('datauristring');
      await downloadBase64File(pdfDataUri, `system_audit_${Date.now()}.pdf`);

      setSaveMessage('Data exported to PDF successfully.');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (err) {
      console.error(err);
      setSaveMessage('Failed to export data.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <Settings className="text-primary-500" />
          {t('Global System Settings')}
        </h2>
      </div>

      <div className="bg-white dark:bg-[#1a1a2e] border border-slate-200 dark:border-slate-700/50 rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
          <Shield size={18} className="text-slate-500" /> Security & Access
        </h3>

        <div className="flex items-center justify-between py-2">
          <div>
            <div className="font-bold text-slate-900 dark:text-white">Maintenance Mode</div>
            <div className="text-sm text-slate-500">Block access to non-admin users.</div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={maintenanceMode}
              onChange={(e) => setMaintenanceMode(e.target.checked)}
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 dark:peer-focus:ring-red-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-red-500"></div>
          </label>
        </div>

        {maintenanceMode && (
          <div className="mt-3 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl flex items-start gap-3">
            <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={18} />
            <p className="text-sm text-red-600 dark:text-red-400 font-medium">
              Maintenance mode is currently active. Only administrators can access the app. Non-admin users will be blocked in real-time.
            </p>
          </div>
        )}

        <h3 className="text-lg font-bold text-slate-800 dark:text-white mt-8 mb-4 border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
          <Settings size={18} className="text-slate-500" /> Preferences
        </h3>

        <div className="py-2">
          <label className="block font-bold text-slate-900 dark:text-white mb-1">Default Daily Savings Amount (₹)</label>
          <p className="text-sm text-slate-500 mb-3">Set the baseline goal for all new accounts.</p>
          <input
            type="number"
            value={defaultSavings}
            onChange={(e) => setDefaultSavings(Number(e.target.value))}
            className="w-full max-w-xs pl-4 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary-500 outline-none"
          />
        </div>

        <div className="mt-8 flex flex-wrap gap-2">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white font-semibold text-sm rounded-xl shadow-md transition-all disabled:opacity-50 whitespace-nowrap"
          >
            {isSaving ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>

          <button
            onClick={handleExportData}
            disabled={isExporting}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 dark:bg-white dark:text-slate-900 text-white font-semibold text-sm rounded-xl shadow-md transition-all disabled:opacity-50 whitespace-nowrap"
          >
            {isExporting ? <RefreshCw size={15} className="animate-spin" /> : <Download size={15} />}
            {isExporting ? 'Exporting...' : 'Export Audit (PDF)'}
          </button>
        </div>

        {saveMessage && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="mt-4 text-sm font-bold text-emerald-500"
          >
            {saveMessage}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default SystemSettings;
