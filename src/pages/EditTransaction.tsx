import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { compressForReceipts } from '../utils/imageCompressor';
import { useFinance } from '../context/FinanceContext';
import { useFamily } from '../context/FamilyContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { invalidateStorageCache, getUserStorageUsage } from '../utils/storageService';
import { useSubscription, FREE_STORAGE_LIMIT_BYTES } from '../context/SubscriptionContext';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { generateVision } from '../utils/aiService';

import { Capacitor } from '@capacitor/core';
import { suppressLockForFilePicker } from '../utils/appLockService';
import { CapacitorPluginMlKitTextRecognition } from '@pantrist/capacitor-plugin-ml-kit-text-recognition';
import {
  ArrowLeft,
  Save,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  ArrowDownRight,
  ArrowUpRight,
  Send,
  FileText,
  UploadCloud,
  ScanLine,
  Calendar as CalendarIcon,
  X,
  ChevronLeft,
  ChevronRight,
  Clock,
  History,
  Trash2,
  Coffee,
  Plane,
  Gamepad2,
  ShoppingBag,
  Pill,
  BookOpen,
  ShoppingCart,
  Paperclip,
  Briefcase,
  Laptop,
  Gift,
  TrendingUp,
  Trophy,
  User as UserIcon,
  Eye,
  AlertCircle
} from 'lucide-react';
import { Transaction, TransactionType } from '../types/finance';

// ============================================================================
// Types & Interfaces
// ============================================================================
interface CategoryItem {
  name: string;
  icon: React.ComponentType<any>;
}

interface CategoryButtonProps {
  category: CategoryItem;
  isSelected: boolean;
  onClick: () => void;
  t: (key: string) => string;
}

const expenseCategories: CategoryItem[] = [
  { name: 'Food', icon: Coffee },
  { name: 'Travel', icon: Plane },
  { name: 'Bills', icon: FileText },
  { name: 'Entertainment', icon: Gamepad2 },
  { name: 'Shopping', icon: ShoppingBag },
  { name: 'Health', icon: Pill },
  { name: 'Education', icon: BookOpen },
  { name: 'Groceries', icon: ShoppingCart },
  { name: 'Other', icon: Paperclip },
];

const incomeCategories: CategoryItem[] = [
  { name: 'Salary', icon: Briefcase },
  { name: 'Freelance', icon: Laptop },
  { name: 'Gift', icon: Gift },
  { name: 'Investment', icon: TrendingUp },
  { name: 'Bonus', icon: Trophy },
  { name: 'Other', icon: Paperclip },
];

// ============================================================================
// Memoized Subcomponents
// ============================================================================
const CategoryButton = React.memo<CategoryButtonProps>(
  ({ category, isSelected, onClick, t }) => {
    const Icon = category.icon;
    return (
      <button
        type="button"
        onClick={onClick}
        className={`atx-chip ${isSelected ? 'atx-chip--selected' : ''}`}
        aria-label={`Category ${category.name}`}
        aria-pressed={isSelected}
      >
        <Icon size={20} className={isSelected ? 'text-primary-600 dark:text-primary-400' : 'text-slate-400 dark:text-slate-500'} />
        <span className="text-[10px] sm:text-[11px] md:text-xs font-bold text-center whitespace-nowrap tracking-tight text-slate-700 dark:text-slate-300">
          {t(category.name)}
        </span>
      </button>
    );
  }
);
CategoryButton.displayName = 'CategoryButton';

// ============================================================================
// Main Component
// ============================================================================
export default function EditTransaction() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { transactions, updateTransaction, deleteTransaction } = useFinance();
  const { members, family } = useFamily();
  const { isPremium, features, setShowUpgradeModal } = useSubscription();

  // Ref refs for inputs/controllers
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // ── Find the transaction ─────────────────────────────────────────────────
  const transaction = useMemo(() => {
    return transactions.find(tx => tx.id === id) || (location.state as Transaction | undefined);
  }, [transactions, id, location.state]);

  // ── Form state ───────────────────────────────────────────────────────────
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [newProofFile, setNewProofFile] = useState<File | null>(null);
  const [newProofPreview, setNewProofPreview] = useState<string | null>(null);

  // ── UI/OCR state ─────────────────────────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [amountError, setAmountError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showAuditHistory, setShowAuditHistory] = useState(false);
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [showLightbox, setShowLightbox] = useState(false);

  // ── Populate form from transaction ───────────────────────────────────────
  useEffect(() => {
    if (transaction) {
      setType(transaction.type);
      setAmount(String(transaction.amount));
      setCategory(transaction.category);
      setDate(transaction.date);
      setNotes(transaction.notes || '');
      setSelectedMemberId(transaction.memberId);
      setProofUrl(transaction.proofUrl || null);
    }
  }, [transaction]);

  // ── Calendar state ───────────────────────────────────────────────────────
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const selectedDate = date ? new Date(date) : today;
  const [calendarMonth, setCalendarMonth] = useState(selectedDate.getMonth());
  const [calendarYear, setCalendarYear] = useState(selectedDate.getFullYear());

  // Sync calendar on date change
  useEffect(() => {
    if (date) {
      const [y, m] = date.split('-').map(Number);
      if (y && m) {
        setCalendarYear(y);
        setCalendarMonth(m - 1);
      }
    }
  }, [date]);

  const navigateCalendar = useCallback((direction: -1 | 1) => {
    setCalendarMonth(prev => {
      const newMonth = prev + direction;
      if (newMonth < 0) {
        setCalendarYear(y => y - 1);
        return 11;
      }
      if (newMonth > 11) {
        setCalendarYear(y => y + 1);
        return 0;
      }
      return newMonth;
    });
  }, []);

  const goToToday = useCallback(() => {
    const now = new Date();
    setCalendarMonth(now.getMonth());
    setCalendarYear(now.getFullYear());
    setDate(now.toISOString().split('T')[0]);
  }, []);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(calendarYear, calendarMonth, 1);
    const startWeekday = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(calendarYear, calendarMonth, 0).getDate();
    const days: Array<{ day: number; month: number; year: number; isCurrentMonth: boolean }> = [];
    
    const prevMonth = calendarMonth === 0 ? 11 : calendarMonth - 1;
    const prevYear = calendarMonth === 0 ? calendarYear - 1 : calendarYear;
    for (let i = startWeekday - 1; i >= 0; i--) {
      days.push({ day: daysInPrevMonth - i, month: prevMonth, year: prevYear, isCurrentMonth: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      days.push({ day: d, month: calendarMonth, year: calendarYear, isCurrentMonth: true });
    }
    const nextMonth = calendarMonth === 11 ? 0 : calendarMonth + 1;
    const nextYear = calendarMonth === 11 ? calendarYear + 1 : calendarYear;
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      days.push({ day: d, month: nextMonth, year: nextYear, isCurrentMonth: false });
    }
    return days;
  }, [calendarMonth, calendarYear]);

  const handleCalendarDayClick = useCallback((dayObj: { day: number; month: number; year: number }) => {
    const m = String(dayObj.month + 1).padStart(2, '0');
    const d = String(dayObj.day).padStart(2, '0');
    setDate(`${dayObj.year}-${m}-${d}`);
  }, []);

  // ── Categories ───────────────────────────────────────────────────────────
  const categories = useMemo(() => (type === 'expense' ? expenseCategories : incomeCategories), [type]);

  // Reset category if type mismatch
  useEffect(() => {
    if (transaction && type !== transaction.type && type !== ('transfer' as any)) {
      setCategory(type === 'expense' ? 'Food' : 'Salary');
    }
  }, [type, transaction]);

  // ── Family members ───────────────────────────────────────────────────────
  const familyMembers = useMemo(() => {
    if (members && members.length > 0) {
      return members.map((m: any) => ({
        id: m.user_id,
        name: m.profile?.name || 'Member',
      }));
    }
    if (user) {
      return [{ id: user.id, name: user.name || 'Me' }];
    }
    return [];
  }, [members, user]);

  // ── Cleanup object URL & cancel OCR on unmount ──────────────────────────
  useEffect(() => {
    return () => {
      if (newProofPreview) URL.revokeObjectURL(newProofPreview);
    };
  }, [newProofPreview]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  const fileToBase64 = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }, []);

  // ── Smart Scan: Reusable OCR function ──────────────────────────────────
  const runSmartScan = useCallback(async (file: File) => {
    if (!file) return;
    setIsOcrProcessing(true);
    setOcrError(null);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      let extractedText = '';
      const isNative = Capacitor.isNativePlatform();
      let geminiSuccess = false;

      // Try AI first (OpenRouter primary, Gemini fallback)
      try {
        const base64Image = await fileToBase64(file);
        const responseText = await generateVision(
          'Extract data to JSON: { "amount": "200.00", "date": "16 April 2026" }. Exclude currency symbols from amount.',
          base64Image,
          file.type || 'image/jpeg',
          {
            systemInstruction: 'You are a highly precise Indian financial receipt parser. Analyze payment screenshots (Google Pay, PhonePe, Paytm, paper receipts) and perfectly extract the absolute Total Amount paid and the transaction Date. Output ONLY valid JSON.',
            temperature: 0.1,
            responseFormatJson: true,
            signal: controller.signal
          }
        );

        if (responseText) {
          const rawJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
          const jsonResult = JSON.parse(rawJson);

          if (jsonResult.amount && !isNaN(parseFloat(jsonResult.amount))) {
            setAmount(jsonResult.amount);
            setAmountError('');
            geminiSuccess = true;
          }
          if (jsonResult.date) {
            setNotes((prev) => (prev ? `${prev} | AI Scan: ${jsonResult.date}` : `AI Scan: ${jsonResult.date}`));
          } else if (geminiSuccess) {
            setNotes((prev) => (prev ? `${prev} | AI Scanned` : 'AI Scanned'));
          }
        }
      } catch (geminiErr: any) {
        if (geminiErr.name === 'AbortError') throw geminiErr;
        console.warn('AI receipt extraction failed, falling back...', geminiErr);
      }

      if (!geminiSuccess && isNative) {
        const base64Data = await fileToBase64(file);
        const result = await (CapacitorPluginMlKitTextRecognition as any).detectText({
          base64Image: base64Data,
        });
        extractedText = result.text || '';

        if (!extractedText || extractedText.trim() === '') {
          throw new Error('No text detected by ML Kit.');
        }

        let maxAmount = 0;
        const amountRegex = /(?:rs\.?|₹|inr|total)?\s*([\d,]+\.\d{2}|[\d,]+)/gi;
        const matches = [...extractedText.matchAll(amountRegex)];
        matches.forEach((match) => {
          const numStr = match[1].replace(/,/g, '');
          const val = parseFloat(numStr);
          if (!isNaN(val) && val > maxAmount && val < 1000000) {
            maxAmount = val;
          }
        });

        if (maxAmount > 0) {
          setAmount(maxAmount.toFixed(2));
          setAmountError('');
        } else {
          throw new Error('Amount not found by ML Kit.');
        }

        const dateRegex = /\b(\d{1,4})[/\-.\s]([a-zA-Z]{3,}|\d{1,2})[/\-.\s](\d{1,4})\b/g;
        const dateMatches = [...extractedText.matchAll(dateRegex)];
        let foundDate = null;
        if (dateMatches.length > 0) {
          const dStr = dateMatches[0][0];
          const parsedDate = new Date(dStr);
          if (!isNaN(parsedDate.getTime()) && parsedDate.getFullYear() > 2000) {
            foundDate = parsedDate.toISOString().split('T')[0];
          } else {
            foundDate = dStr.replace(/\./g, '-');
          }
        }

        if (foundDate) {
          setNotes((prev) => (prev ? `${prev} | Scan: ${foundDate}` : `Scan: ${foundDate}`));
        } else {
          setNotes((prev) => {
            if (prev && prev.includes('Scanned')) return prev;
            return prev ? `${prev} | Scanned` : 'Scanned';
          });
        }
      } else if (!geminiSuccess && !isNative) {
        throw new Error('AI extraction failed.');
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('OCR Extraction Error:', err);
      setOcrError(err.message || 'OCR scan failed');
      setNotes((prev) => (prev ? `${prev} | Scan Failed` : 'Scan Failed'));
    } finally {
      setIsOcrProcessing(false);
      abortControllerRef.current = null;
    }
  }, [fileToBase64]);

  // File picker upload handlers
  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    let file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setOcrError('Please upload an image file');
      return;
    }

    file = await compressForReceipts(file);
    setNewProofFile(file);
    setNewProofPreview(URL.createObjectURL(file));
    runSmartScan(file);
  }, [runSmartScan]);

  const handleSimpleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    let file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setOcrError('Please upload an image file');
      return;
    }

    file = await compressForReceipts(file);
    setNewProofFile(file);
    setNewProofPreview(URL.createObjectURL(file));
    setOcrError(null);
  }, []);

  const removeNewReceipt = () => {
    setNewProofFile(null);
    if (newProofPreview) URL.revokeObjectURL(newProofPreview);
    setNewProofPreview(null);
  };

  const removeExistingReceipt = () => {
    setProofUrl(null);
  };

  // ── Fetch audit history ──────────────────────────────────────────────────
  const fetchAuditLog = useCallback(async () => {
    if (!id) return;
    setAuditLoading(true);
    try {
      const { data, error } = await supabase
        .from('transaction_audit_log')
        .select(`
          *,
          editor:profiles!transaction_audit_log_edited_by_fkey(name)
        `)
        .eq('transaction_id', id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setAuditLog(data || []);
    } catch (err) {
      console.error('Error fetching audit log:', err);
    } finally {
      setAuditLoading(false);
    }
  }, [id]);

  // ── Validate ─────────────────────────────────────────────────────────────
  const validateForm = (): boolean => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      setAmountError(t('Enter a valid amount'));
      return false;
    }
    if (amt > 10_000_000) {
      setAmountError(t('Amount exceeds ₹1 Crore limit'));
      return false;
    }
    setAmountError('');
    return true;
  };

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || isSubmitting || !id) return;

    setIsSubmitting(true);
    try {
      let finalProofUrl = proofUrl;

      // Upload new receipt if provided
      if (newProofFile && user) {
        try {
          const usage = await getUserStorageUsage(user.id);
          const limit = features?.max_storage_bytes || FREE_STORAGE_LIMIT_BYTES;
          if (usage.usedBytes + newProofFile.size > limit) {
            setIsSubmitting(false);
            if (!isPremium) {
              setShowUpgradeModal(true);
            } else {
              alert(t('Premium storage limit reached (maximum 5 GB allowed).'));
            }
            return;
          }
        } catch (err) {
          console.warn('Storage check failed, proceeding:', err);
        }
        const fileName = `${user.id}/${Date.now()}_receipt.jpg`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('proofs')
          .upload(fileName, newProofFile, { cacheControl: '31536000', upsert: false });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('proofs')
          .getPublicUrl(uploadData.path);

        finalProofUrl = urlData.publicUrl;

        // Delete old receipt if it exists and was replaced
        if (transaction?.proofUrl && transaction.proofUrl !== finalProofUrl) {
          try {
            const oldPath = transaction.proofUrl.split('/proofs/')[1];
            if (oldPath) {
              await supabase.storage.from('proofs').remove([oldPath]);
            }
          } catch (delErr) {
            console.warn('Failed to delete old receipt:', delErr);
          }
        }
      }

      // Invalidate storage cache since we uploaded a new file
      if (newProofFile && user) {
        invalidateStorageCache(user.id, family?.id);
      }

      await updateTransaction(id, {
        amount: parseFloat(amount),
        category,
        type,
        date,
        notes,
        memberId: selectedMemberId || user?.id,
        proofUrl: finalProofUrl,
      });

      setShowSuccess(true);
      setTimeout(() => {
        navigate(-1);
      }, 800);
    } catch (err) {
      console.error('Error updating transaction:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Delete handler ───────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!id) return;
    setIsSubmitting(true);
    try {
      if (transaction?.proofUrl) {
        try {
          const oldPath = transaction.proofUrl.split('/proofs/')[1];
          if (oldPath) {
            await supabase.storage.from('proofs').remove([oldPath]);
          }
        } catch (delErr) {
          console.warn('Failed to delete receipt during transaction deletion:', delErr);
        }
      }

      await deleteTransaction(id);

      if (user?.id) {
        invalidateStorageCache(user.id, family?.id);
      }

      navigate(-1);
    } catch (err) {
      console.error('Error deleting transaction:', err);
    } finally {
      setIsSubmitting(false);
      setShowDeleteConfirm(false);
    }
  };

  // ── Not found ────────────────────────────────────────────────────────────
  if (!transaction && !location.state) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center p-6">
        <AlertTriangle size={48} className="text-amber-400 mb-4" />
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">{t('Transaction not found')}</h2>
        <p className="text-sm text-slate-500 mb-4">{t('This transaction may have been deleted.')}</p>
        <button onClick={() => navigate(-1)} className="px-4 py-2 rounded-xl bg-primary-500 text-white font-bold text-sm">
          {t('Go Back')}
        </button>
      </div>
    );
  }

  const focusRingClass = type === 'expense' ? 'atx-focus-rose' : type === 'income' ? 'atx-focus-emerald' : 'atx-focus-indigo';

  return (
    <div className="w-full h-full max-w-2xl mx-auto md:py-4 flex flex-col relative overflow-hidden">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageUpload}
        accept="image/*"
        className="hidden"
        aria-label="Upload receipt image"
      />

      <input
        type="file"
        ref={uploadInputRef}
        onChange={handleSimpleUpload}
        accept="image/*"
        className="hidden"
        aria-label="Upload receipt image without scanning"
      />

      {/* Success overlay */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm"
          >
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 text-center shadow-2xl border border-slate-100 dark:border-slate-800">
              <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={32} className="text-emerald-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">{t('Updated!')}</h3>
              <p className="text-sm text-slate-500 mt-1">{t('Transaction saved successfully.')}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative flex flex-col flex-1 h-full w-full overflow-hidden"
      >
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col relative z-10 w-full h-full overflow-hidden">
          {/* Scrollable Content Container */}
          <div className="flex-1 overflow-y-auto custom-scrollbar px-4 sm:px-2 pt-2 pb-48 flex flex-col gap-4">
            
            {/* Header / Nav Actions */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="p-2 rounded-xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50 text-slate-600 dark:text-slate-300 hover:bg-white/90 dark:hover:bg-slate-800/90 transition-all shadow-sm"
                >
                  <ArrowLeft size={18} />
                </button>
                <div>
                  <h1 className="text-lg font-black text-slate-800 dark:text-slate-100">{t('Edit Transaction')}</h1>
                  {transaction?.editCount ? (
                    <p className="text-[10px] text-slate-400 font-medium">{t('Edited')} {transaction.editCount}x</p>
                  ) : null}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Audit History Button */}
                <button
                  type="button"
                  onClick={() => { setShowAuditHistory(true); fetchAuditLog(); }}
                  className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 border border-indigo-100 dark:border-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all shadow-sm"
                >
                  <History size={16} />
                </button>
                {/* Delete Button */}
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 border border-rose-100 dark:border-rose-900/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-all shadow-sm"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {/* ── Receipt Preview ── */}
            <AnimatePresence>
              {(newProofPreview || proofUrl) && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: 'spring', damping: 22, stiffness: 300 }}
                  className="atx-receipt-card group shrink-0"
                >
                  <div
                    className="relative aspect-[1.58] overflow-hidden cursor-pointer"
                    onClick={() => {
                      setShowLightbox(true);
                    }}
                  >
                    <div className="absolute inset-0 bg-slate-900/5 z-10 group-hover:bg-transparent transition-all duration-300" />
                    <img
                      src={newProofPreview || proofUrl || ''}
                      alt="Receipt preview"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                    />
                    <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-slate-900/30 backdrop-blur-[3px]">
                      <div className="flex items-center gap-2 text-white bg-black/30 backdrop-blur-md px-4 py-2 rounded-full font-semibold text-sm border border-white/15">
                        <Eye size={16} /> {t('View Full')}
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="absolute bottom-3 left-3 z-30">
                      {isOcrProcessing ? (
                        <span className="atx-badge atx-badge--amber">
                          <Loader2 size={12} className="animate-spin" /> {t('Extracting...')}
                        </span>
                      ) : ocrError ? (
                        <span className="atx-badge atx-badge--red">
                          <AlertCircle size={12} /> {t('Scan Failed')}
                        </span>
                      ) : newProofPreview ? (
                        <span className="atx-badge atx-badge--green">
                          <CheckCircle2 size={12} /> {t('New Receipt Attached')}
                        </span>
                      ) : (
                        <span className="atx-badge atx-badge--indigo">
                          <CheckCircle2 size={12} /> {t('Current Receipt')}
                        </span>
                      )}
                    </div>

                    {/* Scanning progress bar */}
                    {isOcrProcessing && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100/50 overflow-hidden z-30 rounded-b-sm">
                        <div
                          className="h-full bg-gradient-to-r from-primary-400 via-secondary-400 to-primary-400 animate-[pulse_1s_ease-in-out_infinite]"
                          style={{ width: '100%' }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Footer — Receipt info + Remove */}
                  <div className="atx-receipt-footer">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate">
                        {newProofPreview ? t('New Receipt Attached') : t('Current Receipt')}
                      </h3>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                        {isOcrProcessing
                          ? t('AI is extracting amount & date...')
                          : ocrError
                            ? ocrError
                            : t('Tap to view full image')}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeNewReceipt();
                        removeExistingReceipt();
                      }}
                      className="atx-remove-btn ml-2"
                      aria-label="Remove receipt"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Fullscreen Lightbox ── */}
            <AnimatePresence>
              {showLightbox && (newProofPreview || proofUrl) && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4"
                  onClick={() => setShowLightbox(false)}
                >
                  <button
                    type="button"
                    onClick={() => setShowLightbox(false)}
                    className="absolute top-5 right-5 z-50 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/20"
                    aria-label="Close lightbox"
                  >
                    <X size={22} />
                  </button>
                  <motion.img
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    src={newProofPreview || proofUrl || ''}
                    alt="Full receipt"
                    className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Standalone OCR Error */}
            {ocrError && !newProofPreview && !proofUrl && (
              <div className="atx-error-alert shrink-0">
                <AlertCircle size={16} />
                <span>{ocrError}</span>
              </div>
            )}

            {/* ── Type Selector ── */}
            <div className="atx-type-track shrink-0">
              <button
                type="button"
                className={`atx-type-btn ${type === 'expense' ? 'atx-type-btn--expense' : ''}`}
                onClick={() => setType('expense')}
                aria-pressed={type === 'expense'}
              >
                <ArrowDownRight size={18} />
                {t('Expense')}
              </button>
              <button
                type="button"
                className={`atx-type-btn ${type === 'income' ? 'atx-type-btn--income' : ''}`}
                onClick={() => setType('income')}
                aria-pressed={type === 'income'}
              >
                <ArrowUpRight size={16} />
                {t('Income')}
              </button>
              <button
                type="button"
                className={`atx-type-btn ${type === ('transfer' as any) ? 'atx-type-btn--transfer' : ''}`}
                onClick={() => setType('transfer' as any)}
                aria-pressed={type === ('transfer' as any)}
              >
                <Send size={16} />
                {t('Send')}
              </button>
            </div>

            {/* ── Amount Input ── */}
            <div className="flex flex-col shrink-0">
              <div className="flex justify-between items-center mb-1.5 pr-1">
                <label htmlFor="amount" className="atx-label">{t('Amount')}</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      suppressLockForFilePicker();
                      uploadInputRef.current?.click();
                    }}
                    className="atx-action-btn atx-action-btn--upload"
                  >
                    <UploadCloud size={14} />
                    <span className="hidden sm:inline">{t('Upload Proof')}</span>
                    <span className="sm:hidden">{t('Upload')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      suppressLockForFilePicker();
                      fileInputRef.current?.click();
                    }}
                    className="atx-action-btn atx-action-btn--scan"
                  >
                    {isOcrProcessing ? <Loader2 size={14} className="animate-spin" /> : <ScanLine size={14} />}
                    <span className="hidden sm:inline">{t('Smart Scan')}</span>
                    <span className="sm:hidden">{t('Scan')}</span>
                  </button>
                </div>
              </div>
              <div className="relative group">
                {/* Focus glow */}
                <div
                  className={`absolute inset-0 rounded-[20px] blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-700 pointer-events-none ${
                    type === 'expense' ? 'bg-rose-500/8' : type === 'income' ? 'bg-emerald-500/8' : 'bg-indigo-500/8'
                  }`}
                />
                {/* Currency prefix */}
                <div
                  className={`absolute left-5 top-1/2 -translate-y-1/2 z-30 pointer-events-none transition-all duration-300 font-sans text-2xl md:text-3xl font-bold ${
                    type === 'expense' ? 'text-rose-500 dark:text-rose-400' : type === 'income' ? 'text-emerald-500 dark:text-emerald-400' : 'text-indigo-500 dark:text-indigo-400'
                  }`}
                >₹</div>
                <input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className={`atx-amount-input relative z-20 ${focusRingClass} ${isOcrProcessing ? 'animate-pulse' : ''} ${amountError ? 'atx-error' : ''}`}
                  style={{
                    color: amount ? (type === 'expense' ? '#e11d48' : type === 'income' ? '#059669' : '#4f46e5') : undefined,
                    fontSize: 'clamp(24px, 5.5vw, 36px)',
                  }}
                  required
                  aria-invalid={!!amountError}
                />
              </div>
              {amountError && (
                <p className="text-xs text-red-500 dark:text-red-400 mt-1.5 ml-1 font-medium">{amountError}</p>
              )}
            </div>

            {/* ── Categories ── */}
            {type !== ('transfer' as any) && (
              <div className="flex flex-col shrink-0">
                <label className="atx-label">{t('Category')}</label>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2.5 sm:gap-3">
                  {categories.map((cat) => (
                    <CategoryButton
                      key={cat.name}
                      category={cat}
                      isSelected={category === cat.name}
                      onClick={() => setCategory(cat.name)}
                      t={t}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ── Date & Notes ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 shrink-0">
              <div className="flex flex-col justify-end">
                <label className="atx-label">{t('Date')}</label>
                
                {/* Single line date display with Change option */}
                <div 
                  onClick={() => setShowCalendarModal(true)}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/80 backdrop-blur-md cursor-pointer hover:bg-white/80 dark:hover:bg-slate-800/50 transition-all duration-300 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-primary-50 dark:bg-primary-950/40 text-primary-500 dark:text-primary-400 group-hover:scale-105 transition-transform duration-300">
                      <CalendarIcon size={18} />
                    </div>
                    <div>
                      <div className="text-[10px] sm:text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        {t('Selected Date')}
                      </div>
                      <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                        {date ? new Date(date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        }) : t('Select date')}
                      </div>
                    </div>
                  </div>
                  <div className="text-[11px] font-bold text-primary-500 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/30 px-3 py-1.5 rounded-xl border border-primary-100/50 dark:border-primary-900/20 group-hover:bg-primary-100/70 dark:group-hover:bg-primary-900/50 transition-all duration-300">
                    {t('Change')}
                  </div>
                </div>

                {/* Calendar Modal */}
                <AnimatePresence>
                  {showCalendarModal && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowCalendarModal(false)}
                        className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm"
                      />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 15 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 15 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                        className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/50 dark:border-slate-800/80 p-5 overflow-hidden z-10"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base flex items-center gap-2">
                            <CalendarIcon size={18} className="text-primary-500" />
                            {t('Choose Date')}
                          </h3>
                          <button type="button" onClick={() => setShowCalendarModal(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                            <X size={18} />
                          </button>
                        </div>
                        <div className="atx-calendar">
                          <div className="atx-calendar-header">
                            <span className="atx-calendar-title">
                              {new Date(calendarYear, calendarMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                            </span>
                            <div className="atx-calendar-nav">
                              <button type="button" className="atx-calendar-nav-btn" onClick={() => navigateCalendar(-1)} aria-label="Previous month">
                                <ChevronLeft size={14} />
                              </button>
                              <button type="button" className="atx-calendar-nav-btn" onClick={() => navigateCalendar(1)} aria-label="Next month">
                                <ChevronRight size={14} />
                              </button>
                            </div>
                          </div>
                          <div className="atx-calendar-weekdays">
                            {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => (
                              <span key={d} className="atx-calendar-weekday">{d}</span>
                            ))}
                          </div>
                          <div className="atx-calendar-grid">
                            {calendarDays.map((dayObj, i) => {
                              const dateStr = `${dayObj.year}-${String(dayObj.month + 1).padStart(2, '0')}-${String(dayObj.day).padStart(2, '0')}`;
                              const isSelected = dateStr === date;
                              const isToday = dateStr === todayStr;
                              const isOther = !dayObj.isCurrentMonth;
                              return (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => {
                                    handleCalendarDayClick(dayObj);
                                    setShowCalendarModal(false);
                                  }}
                                  className={`atx-calendar-day${isOther ? ' atx-calendar-day--other' : ''}${isToday && !isSelected ? ' atx-calendar-day--today' : ''}${isSelected ? ' atx-calendar-day--selected' : ''}`}
                                >
                                  {dayObj.day}
                                </button>
                              );
                            })}
                          </div>
                          {date !== todayStr && (
                            <button
                              type="button"
                              className="atx-calendar-today-btn"
                              onClick={() => {
                                goToToday();
                                setShowCalendarModal(false);
                              }}
                            >
                              <CalendarIcon size={12} /> {t('Today')}
                            </button>
                          )}
                        </div>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex flex-col justify-end">
                <label htmlFor="notes" className="atx-label">{t('Notes')}</label>
                <div className="relative">
                  <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none z-10" size={17} />
                  <input
                    id="notes"
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t('Optional details...')}
                    className="atx-glass-input"
                  />
                </div>
              </div>
            </div>

            {/* ── Member Selection (Assignee) ── */}
            {familyMembers.length > 1 && (
              <div className="flex flex-col shrink-0 mt-1 mb-1">
                <label className="atx-label">{t('Assigned To')}</label>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5 sm:gap-3">
                  {familyMembers.map((m) => {
                    const isSelected = selectedMemberId === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedMemberId(m.id)}
                        className={`atx-chip ${isSelected ? 'atx-chip--selected atx-chip--indigo' : ''}`}
                        aria-pressed={isSelected}
                      >
                        <UserIcon size={20} className={isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'} />
                        <span className="text-[10px] sm:text-[11px] md:text-xs font-bold text-center whitespace-nowrap tracking-tight text-slate-700 dark:text-slate-300">
                          {t(m.name)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Source Badge */}
            {transaction?.source && transaction.source !== 'manual' && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/30 w-max shrink-0">
                <Clock size={12} className="text-indigo-400" />
                <span className="text-[10px] font-bold text-indigo-500">{t('Source')}: {transaction.source.toUpperCase()}</span>
                {transaction.bankName && <span className="text-[10px] text-slate-400">• {transaction.bankName}</span>}
              </div>
            )}
          </div>

          {/* Sticky Submit Button */}
          <div
            className="fixed sm:absolute left-0 right-0 p-4 pb-3 z-50 pointer-events-none flex justify-center"
            style={{ bottom: 'calc(4.75rem + env(safe-area-inset-bottom, 0px))' }}
          >
            <div className="w-full max-w-md pointer-events-auto">
              <button
                type="submit"
                disabled={isSubmitting}
                className="atx-submit-btn"
              >
                <span className="flex items-center justify-center gap-2">
                  {isSubmitting ? (
                    <><Loader2 size={18} className="animate-spin" /> {t('Saving...')}</>
                  ) : (
                    <><Save size={18} /> {t('Save Changes')}</>
                  )}
                </span>
              </button>
            </div>
          </div>
        </form>
      </motion.div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 w-full max-w-xs shadow-2xl text-center border border-slate-100 dark:border-slate-800"
            >
              <div className="w-16 h-16 rounded-full bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center mx-auto mb-4 border border-rose-100 dark:border-rose-900/30">
                <Trash2 size={28} className="text-rose-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">{t('Delete?')}</h3>
              <p className="text-sm text-slate-500 mb-6 px-2">{t('This action cannot be undone.')}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-805 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  {t('Cancel')}
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isSubmitting}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-rose-500 hover:bg-rose-600 shadow-lg shadow-rose-500/20 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 size={16} className="animate-spin mx-auto" /> : t('Delete')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Audit History Modal */}
      <AnimatePresence>
        {showAuditHistory && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 w-full max-w-md shadow-2xl border border-slate-100 dark:border-slate-800 max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <History size={18} className="text-indigo-500" />
                  {t('Edit History')}
                </h3>
                <button onClick={() => setShowAuditHistory(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <X size={18} />
                </button>
              </div>

              {auditLoading ? (
                <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-slate-400" /></div>
              ) : auditLog.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">{t('No edit history yet.')}</div>
              ) : (
                <div className="space-y-3">
                  {auditLog.map((entry) => (
                    <div key={entry.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                          entry.action === 'created' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400' :
                          entry.action === 'deleted' ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400' :
                          'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400'
                        }`}>
                          {entry.action}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(entry.created_at).toLocaleString()}
                        </span>
                      </div>
                      {entry.editor && (
                        <p className="text-xs text-slate-500 mb-1">{t('By')}: {entry.editor.name}</p>
                      )}
                      {entry.changes && Object.keys(entry.changes).length > 0 && (
                        <div className="mt-2 space-y-1">
                          {Object.entries(entry.changes).map(([key, val]) => (
                            <div key={key} className="text-[10px] flex items-center gap-1.5">
                              <span className="font-bold text-slate-500">{key}:</span>
                              <span className="text-rose-400 line-through">{String(entry.previous_values?.[key] ?? '')}</span>
                              <span className="text-slate-400">→</span>
                              <span className="text-emerald-500 font-medium">{String(val)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
