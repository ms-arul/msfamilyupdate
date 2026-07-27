import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { compressForReceipts } from '../utils/imageCompressor';
import { useFinance } from '../context/FinanceContext';
import { useFamily } from '../context/FamilyContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { invalidateStorageCache, getUserStorageUsage } from '../utils/storageService';
import { generateVision } from '../utils/aiService';

import { useSubscription, FREE_STORAGE_LIMIT_BYTES } from '../context/SubscriptionContext';
import { Capacitor } from '@capacitor/core';
import { suppressLockForFilePicker } from '../utils/appLockService';
import { CapacitorPluginMlKitTextRecognition } from '@pantrist/capacitor-plugin-ml-kit-text-recognition';
import { sendPushToUser } from '../utils/pushService';
import {
  Calendar as CalendarIcon,
  FileText,
  Send,
  CheckCircle,
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
  ArrowDownRight,
  ArrowUpRight,
  ScanLine,
  Loader2,
  AlertCircle,
  User as UserIcon,
  Eye,
  X,
  UploadCloud,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { TransactionType } from '../types/finance';

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

interface SuccessScreenProps {
  t: (key: string) => string;
}

interface FamilyMember {
  id: string;
  name: string;
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
// Subcomponents (memoized)
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

const SuccessScreen: React.FC<SuccessScreenProps> = ({ t }) => (
  <div className="flex items-center justify-center min-h-[60vh] px-4">
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', bounce: 0.5 }}
      className="text-center"
    >
      <div className="atx-success-ring mx-auto mb-6">
        <CheckCircle size={44} className="text-emerald-500" />
      </div>
      <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-2">{t('Record Added!')}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400">{t('Redirecting to dashboard...')}</p>
    </motion.div>
  </div>
);

// ============================================================================
// Main Component
// ============================================================================
export default function AddTransaction() {
  const { addTransaction, refetch } = useFinance();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { isPremium, features, setShowUpgradeModal } = useSubscription();
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [type, setType] = useState<TransactionType | 'transfer'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [showCalendarModal, setShowCalendarModal] = useState(false);

  // Inline calendar state
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    return d.getMonth();
  });
  const [calendarYear, setCalendarYear] = useState(() => {
    const d = new Date();
    return d.getFullYear();
  });

  // Keep calendar in sync when date changes externally (e.g., from SMS parser)
  useEffect(() => {
    if (date) {
      const [y, m] = date.split('-').map(Number);
      if (y && m) {
        setCalendarYear(y);
        setCalendarMonth(m - 1);
      }
    }
  }, [date]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(calendarYear, calendarMonth, 1);
    const lastDay = new Date(calendarYear, calendarMonth + 1, 0);
    const startDayOfWeek = firstDay.getDay(); // 0=Sun
    const daysInMonth = lastDay.getDate();

    // Previous month fill
    const prevMonthLastDay = new Date(calendarYear, calendarMonth, 0).getDate();
    const days: { day: number; month: number; year: number; isCurrentMonth: boolean }[] = [];

    // Start from Monday: adjust startDayOfWeek (0=Sun -> 6, 1=Mon -> 0, etc.)
    const adjustedStart = (startDayOfWeek + 6) % 7;

    for (let i = adjustedStart - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i;
      const m = calendarMonth === 0 ? 11 : calendarMonth - 1;
      const y = calendarMonth === 0 ? calendarYear - 1 : calendarYear;
      days.push({ day: d, month: m, year: y, isCurrentMonth: false });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      days.push({ day: d, month: calendarMonth, year: calendarYear, isCurrentMonth: true });
    }

    // Next month fill to complete 6 rows max (42 cells) or at least fill the last row
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      const nextMonth = calendarMonth === 11 ? 0 : calendarMonth + 1;
      const nextYear = calendarMonth === 11 ? calendarYear + 1 : calendarYear;
      for (let d = 1; d <= remaining; d++) {
        days.push({ day: d, month: nextMonth, year: nextYear, isCurrentMonth: false });
      }
    }

    return days;
  }, [calendarMonth, calendarYear]);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const handleCalendarDayClick = useCallback((day: { day: number; month: number; year: number }) => {
    const m = String(day.month + 1).padStart(2, '0');
    const d = String(day.day).padStart(2, '0');
    setDate(`${day.year}-${m}-${d}`);
  }, []);

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
  const [notes, setNotes] = useState('');
  const [proofImage, setProofImage] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);
  const [showLightbox, setShowLightbox] = useState(false);

  const categories = useMemo(() => (type === 'expense' ? expenseCategories : incomeCategories), [type]);

  // New state for selecting family members — FAMILY SCOPED (BUG 1 FIX)
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState('');

  // BUG 1 FIX: Get family-scoped members from FamilyContext
  const { members: familyContextMembers, family } = useFamily();

  useEffect(() => {
    // BUG 1 FIX: Only show members from the CURRENT family, not all profiles
    if (familyContextMembers.length > 0) {
      const members: FamilyMember[] = familyContextMembers.map((m: any) => ({
        id: m.user_id,
        name: m.profile?.name || 'Member',
      }));
      setFamilyMembers(members);
    } else if (user?.id) {
      // Fallback: if no family context, show only current user
      setFamilyMembers([{ id: user.id, name: user.name || 'Me' }]);
    }
  }, [familyContextMembers, user]);

  // Set default member selection based on type
  useEffect(() => {
    if (!user?.id) return;

    if (type === 'transfer') {
      const otherMembers = familyMembers.filter((m) => m.id !== user.id);
      if (otherMembers.length > 0) {
        const isCurrentReceiverValid = otherMembers.some((m) => m.id === selectedMemberId);
        if (!isCurrentReceiverValid) {
          setSelectedMemberId(otherMembers[0].id);
        }
      }
    } else {
      setSelectedMemberId(user.id);
    }
  }, [type, familyMembers, user, selectedMemberId]);

  // Reset category when type changes (avoid mismatched default)
  useEffect(() => {
    if (type !== 'transfer') {
      setCategory(type === 'expense' ? 'Food' : 'Salary');
    }
  }, [type]);

  // Cleanup object URL on unmount or when proofPreview changes
  useEffect(() => {
    return () => {
      if (proofPreview) URL.revokeObjectURL(proofPreview);
    };
  }, [proofPreview]);

  // Cancel ongoing OCR request on unmount
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
            setAmountError(null);
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
        // Fallback NATIVE: Google ML Kit
        const base64Data = await fileToBase64(file);
        const result = await CapacitorPluginMlKitTextRecognition.detectText({
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
          setAmountError(null);
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

  // File input handler (calls runSmartScan)
  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    let file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setOcrError('Please upload an image file');
      return;
    }

    file = await compressForReceipts(file);
    setProofImage(file);
    setProofPreview(URL.createObjectURL(file));
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
    setProofImage(file);
    setProofPreview(URL.createObjectURL(file));
    setOcrError(null);
  }, []);

  // Handle Shared Intent Data
  useEffect(() => {
    const sharedData = (location.state as any)?.sharedData;
    if (sharedData) {
      if (sharedData.text && !notes) {
        setNotes(sharedData.text);
      }
      if ((sharedData.imageUri || sharedData.pdfUri) && !proofImage) {
        const fileUri = sharedData.imageUri || sharedData.pdfUri;
        const isPdf = !!sharedData.pdfUri;
        const url = Capacitor.isNativePlatform() ? Capacitor.convertFileSrc(fileUri) : fileUri;
        fetch(url)
          .then((res) => res.blob())
          .then((blob) => {
            const filename = isPdf ? 'shared_upload.pdf' : 'shared_upload.jpg';
            const fileType = isPdf ? 'application/pdf' : (blob.type || 'image/jpeg');
            const file = new File([blob], filename, { type: fileType });
            setProofImage(file);
            setProofPreview(URL.createObjectURL(file));
            runSmartScan(file);
          })
          .catch((err) => console.error('Failed to load shared file: ', err));
      }
      window.history.replaceState(null, '');
    }
  }, [location.state, runSmartScan, notes, proofImage]);

  const validateForm = useCallback(() => {
    if (!amount || parseFloat(amount) <= 0) {
      setAmountError('Please enter a valid amount greater than zero');
      return false;
    }
    setAmountError(null);
    return true;
  }, [amount]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!validateForm()) return;
      if (!user?.id) {
        console.error('User not authenticated');
        return;
      }

      setIsSubmitting(true);
      let uploadedProofUrl: string | null = null;

      if (proofImage) {
        try {
          const usage = await getUserStorageUsage(user.id);
          const limit = features?.max_storage_bytes || FREE_STORAGE_LIMIT_BYTES;
          if (usage.usedBytes + proofImage.size > limit) {
            setIsSubmitting(false);
            if (!isPremium) {
              setShowUpgradeModal(true);
            } else {
              alert(t('Premium storage limit reached (maximum 5 GB allowed).'));
            }
            return;
          }
        } catch (err) {
          console.warn('Storage validation failed, proceeding:', err);
        }

        try {
          const fileExt = proofImage.name.split('.').pop();
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
          const filePath = `${user.id}/${fileName}`;

          const { error: uploadError } = await supabase.storage.from('proofs').upload(filePath, proofImage);

          if (uploadError) throw uploadError;

          const {
            data: { publicUrl },
          } = supabase.storage.from('proofs').getPublicUrl(filePath);
          uploadedProofUrl = publicUrl;
        } catch (err) {
          console.error('Proof upload failed:', err);
        }
      }

      if (type === 'transfer') {
        // Dual entry bookkeeping
        await addTransaction({
          type: 'expense',
          amount: parseFloat(amount),
          category: 'Transfer',
          date,
          notes: notes.trim() ? notes.trim() : 'Sent money',
          memberId: user.id,
          proofUrl: uploadedProofUrl,
        });

        await addTransaction({
          type: 'income',
          amount: parseFloat(amount),
          category: 'Transfer',
          date,
          notes: notes.trim() ? notes.trim() : `Received from ${user.name || 'family'}`,
          memberId: selectedMemberId,
          proofUrl: uploadedProofUrl,
        });

        if (selectedMemberId && selectedMemberId !== user.id) {
          await sendPushToUser(
            selectedMemberId,
            'பணம் வந்துவிட்டது! 💸',
            `${user.name || 'குடும்ப உறுப்பினர்'} உங்களுக்கு ₹${parseFloat(amount).toLocaleString()} அனுப்பியுள்ளார்.`
          );
        }

        if (refetch) refetch();
      } else {
        // Standard single transaction
        await addTransaction({
          type,
          amount: parseFloat(amount),
          category,
          date,
          notes: notes.trim() || '',
          memberId: selectedMemberId,
          proofUrl: uploadedProofUrl,
        });
      }

      // Invalidate storage cache if receipt uploaded
      if (proofImage && user?.id) {
        invalidateStorageCache(user.id, family?.id);
      }

      setIsSubmitting(false);
      setSubmitted(true);
      setTimeout(() => navigate('/'), 1200);
    },
    [amount, category, date, notes, proofImage, type, user, addTransaction, navigate, validateForm, selectedMemberId, refetch, family]
  );

  // Focus ring class based on type
  const focusRingClass = type === 'expense' ? 'atx-focus-rose' : type === 'income' ? 'atx-focus-emerald' : 'atx-focus-indigo';

  if (submitted) return <SuccessScreen t={t} />;

  return (
    <div className="w-full h-full max-w-2xl mx-auto md:py-4 flex flex-col relative overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative flex flex-col flex-1 h-full w-full overflow-hidden"
      >
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

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col relative z-10 w-full h-full overflow-hidden">
          {/* Scrollable Content Container */}
          <div className="flex-1 overflow-y-auto custom-scrollbar px-4 sm:px-2 pt-2 pb-48 flex flex-col gap-4">

            {/* ── Receipt Preview ── */}
            <AnimatePresence>
              {proofPreview && (
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
                      if (proofImage?.type !== 'application/pdf') {
                        setShowLightbox(true);
                      }
                    }}
                  >
                    <div className="absolute inset-0 bg-slate-900/5 z-10 group-hover:bg-transparent transition-all duration-300" />
                    {proofImage?.type === 'application/pdf' ? (
                      <div className="w-full h-full bg-slate-50/80 dark:bg-slate-900/50 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                        <FileText size={48} className="text-primary-500" />
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate max-w-[200px]">{proofImage.name}</span>
                      </div>
                    ) : (
                      <>
                        <img
                          src={proofPreview}
                          alt="Receipt preview"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                        />
                        <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-slate-900/30 backdrop-blur-[3px]">
                          <div className="flex items-center gap-2 text-white bg-black/30 backdrop-blur-md px-4 py-2 rounded-full font-semibold text-sm border border-white/15">
                            <Eye size={16} /> {t('View Full')}
                          </div>
                        </div>
                      </>
                    )}

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
                      ) : amount ? (
                        <span className="atx-badge atx-badge--green">
                          <CheckCircle size={12} /> {t('Smart Scanned')}
                        </span>
                      ) : null}
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
                      <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate">{t('Receipt Attached')}</h3>
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
                        setProofPreview(null);
                        setProofImage(null);
                        setAmount('');
                        setOcrError(null);
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
              {showLightbox && proofPreview && (
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
                    src={proofPreview}
                    alt="Full receipt"
                    className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── OCR Error (standalone) ── */}
            {ocrError && !proofPreview && (
              <div className="atx-error-alert">
                <AlertCircle size={16} />
                <span>{ocrError}</span>
              </div>
            )}

            {/* ── Type Toggle ── */}
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
                onClick={() => {
                  setType('income');
                  setCategory('Salary');
                }}
                aria-pressed={type === 'income'}
              >
                <ArrowUpRight size={16} />
                {t('Income')}
              </button>
              <button
                type="button"
                className={`atx-type-btn ${type === 'transfer' ? 'atx-type-btn--transfer' : ''}`}
                onClick={() => {
                  setType('transfer');
                  setCategory('Transfer');
                }}
                aria-pressed={type === 'transfer'}
              >
                <Send size={16} />
                {t('Send')}
              </button>
            </div>

            {/* ── Amount Input ── */}
            <div className="flex flex-col shrink-0">
              <div className="flex justify-between items-center mb-1.5 pr-1">
                <label htmlFor="amount" className="atx-label">
                  {t('Amount')}
                </label>
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
                  className={`absolute inset-0 rounded-[20px] blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-700 pointer-events-none ${type === 'expense' ? 'bg-rose-500/8' : type === 'income' ? 'bg-emerald-500/8' : 'bg-indigo-500/8'
                    }`}
                />
                {/* Currency prefix */}
                <div
                  className={`absolute left-5 top-1/2 -translate-y-1/2 z-30 pointer-events-none transition-all duration-300 font-sans text-2xl md:text-3xl font-bold ${type === 'expense' ? 'text-rose-500 dark:text-rose-400' : type === 'income' ? 'text-emerald-500 dark:text-emerald-400' : 'text-indigo-500 dark:text-indigo-400'
                    }`}
                >
                  ₹
                </div>
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
                    fontSize: 'clamp(24px, 5.5vw, 36px)'
                  }}
                  required
                  aria-invalid={!!amountError}
                  aria-describedby={amountError ? 'amount-error' : undefined}
                />
              </div>
              {amountError && (
                <p id="amount-error" className="text-xs text-red-500 dark:text-red-400 mt-1.5 ml-1 font-medium">
                  {amountError}
                </p>
              )}
            </div>

            {/* ── Categories (Hidden for Transfer) ── */}
            {type !== 'transfer' && (
              <div className="flex flex-col shrink-0">
                <label className="atx-label">
                  {t('Category')}
                </label>
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
                <label className="atx-label">
                  {t('Date')}
                </label>

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
                        {new Date(date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="text-[11px] font-bold text-primary-500 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/30 px-3 py-1.5 rounded-xl border border-primary-100/50 dark:border-primary-900/20 group-hover:bg-primary-100/70 dark:group-hover:bg-primary-900/50 transition-all duration-300">
                    {t('Change')}
                  </div>
                </div>

                {/* Calendar Modal Dialog Box */}
                <AnimatePresence>
                  {showCalendarModal && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                      {/* Backdrop */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowCalendarModal(false)}
                        className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm"
                      />

                      {/* Modal Content */}
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 15 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 15 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                        className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/50 dark:border-slate-800/80 p-5 overflow-hidden z-10"
                      >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base flex items-center gap-2">
                            <CalendarIcon size={18} className="text-primary-500" />
                            {t('Choose Date')}
                          </h3>
                          <button
                            type="button"
                            onClick={() => setShowCalendarModal(false)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            <X size={18} />
                          </button>
                        </div>

                        {/* Calendar */}
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
                <label htmlFor="notes" className="atx-label">
                  {t('Notes')}
                </label>
                <div className="relative">
                  <FileText
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none z-10"
                    size={17}
                  />
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

            {/* ── Member Selection (Transfer only) ── */}
            {type === 'transfer' && (
              <div className="flex flex-col shrink-0 mt-1 mb-1">
                <label className="atx-label">
                  {t('Send To (Recipient)')}
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5 sm:gap-3">
                  {familyMembers
                    .filter((m) => m.id !== user?.id)
                    .map((m) => {
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
                            {t(m.name || 'Member')}
                          </span>
                        </button>
                      );
                    })}
                </div>
              </div>
            )}
          </div>

          {/* ── Sticky Submit Button ── */}
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
                    <>
                      <Loader2 size={18} className="animate-spin" /> {t('Saving...')}
                    </>
                  ) : (
                    <>
                      <Send size={18} /> {t('Confirm Record')}
                    </>
                  )}
                </span>
              </button>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
