import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { compressForReceipts } from '../utils/imageCompressor';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
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
        className={`flex flex-col items-center justify-center gap-2 py-3 px-2 rounded-[1.125rem] w-full transition-all duration-300 border ${isSelected
            ? 'bg-primary-50 border-primary-200 text-primary-700 shadow-[0_4px_12px_rgba(139,92,246,0.15)] transform scale-[1.02]'
            : 'bg-white/60 border-slate-200/60 text-slate-500 hover:text-slate-700 hover:bg-slate-100 shadow-sm'
          }`}
        aria-label={`Category ${category.name}`}
        aria-pressed={isSelected}
      >
        <Icon size={20} className={isSelected ? 'text-primary-600' : 'opacity-70'} />
        <span className="text-[10px] sm:text-[11px] md:text-xs font-bold text-center whitespace-nowrap tracking-tight">
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
      <div className="w-20 h-20 mx-auto rounded-full bg-success-500/20 flex items-center justify-center mb-6 shadow-[0_0_40px_-10px_rgba(16,185,129,0.5)]">
        <CheckCircle size={48} className="text-success-400" />
      </div>
      <h3 className="text-3xl font-bold text-slate-900 mb-2">{t('Record Added!')}</h3>
      <p className="text-slate-500">{t('Redirecting to dashboard...')}</p>
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
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [type, setType] = useState<TransactionType | 'transfer'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
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

  // New state for selecting family members
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState('');

  useEffect(() => {
    async function fetchProfiles() {
      try {
        const { data, error } = await supabase.from('profiles').select('id, name');
        if (error) throw error;
        if (data) setFamilyMembers(data as FamilyMember[]);
      } catch (err) {
        console.error('Error fetching family profiles:', err);
      }
    }
    fetchProfiles();
  }, []);

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
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

      // Try Gemini AI first
      if (apiKey) {
        try {
          const base64Image = await fileToBase64(file);
          const requestBody = {
            system_instruction: {
              parts: [
                {
                  text: 'You are a highly precise Indian financial receipt parser. Analyze payment screenshots (Google Pay, PhonePe, Paytm, paper receipts) and perfectly extract the absolute Total Amount paid and the transaction Date. Output ONLY valid JSON.',
                },
              ],
            },
            contents: [
              {
                parts: [
                  {
                    text: 'Extract data to JSON: { "amount": "200.00", "date": "16 April 2026" }. Exclude currency symbols from amount.',
                  },
                  { inline_data: { mime_type: file.type || 'image/jpeg', data: base64Image } },
                ],
              },
            ],
            generationConfig: { response_mime_type: 'application/json', temperature: 0.1 },
          };

          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(requestBody),
              signal: controller.signal,
            }
          );

          if (response.ok) {
            const data = await response.json();
            const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
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
          }
        } catch (geminiErr: any) {
          if (geminiErr.name === 'AbortError') throw geminiErr;
          console.warn('Gemini extraction failed, falling back...', geminiErr);
        }
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

        const dateRegex = /\b(\d{1,4})[\/\-\.\s]([a-zA-Z]{3,}|\d{1,2})[\/\-\.\s](\d{1,4})\b/g;
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
      if (sharedData.imageUri && !proofImage) {
        const url = Capacitor.isNativePlatform() ? Capacitor.convertFileSrc(sharedData.imageUri) : sharedData.imageUri;
        fetch(url)
          .then((res) => res.blob())
          .then((blob) => {
            const file = new File([blob], 'shared_upload.jpg', { type: blob.type || 'image/jpeg' });
            setProofImage(file);
            setProofPreview(URL.createObjectURL(file));
            runSmartScan(file);
          })
          .catch((err) => console.error('Failed to load shared image: ', err));
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
            `${user.name || 'குடும்ப உறுப்பினர்'} உங்களுக்கு ₹${parseFloat(amount).toLocaleString()} அனுப்பியுள்ளார்.`,
            'high'
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

      setIsSubmitting(false);
      setSubmitted(true);
      setTimeout(() => navigate('/'), 1200);
    },
    [amount, category, date, notes, proofImage, type, user, addTransaction, navigate, validateForm, selectedMemberId, refetch]
  );

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
          <div className="flex-1 overflow-y-auto custom-scrollbar px-4 sm:px-2 pt-2 pb-48 flex flex-col gap-3">
            {/* OCR Preview & Error */}
            <AnimatePresence>
              {proofPreview && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                  className="glass-panel p-1 rounded-2xl group hover:shadow-xl transition-all duration-300 relative shrink-0"
                >
                  <div
                    className="relative aspect-[1.58] overflow-hidden rounded-[14px] cursor-pointer"
                    onClick={() => setShowLightbox(true)}
                  >
                    <div className="absolute inset-0 bg-slate-900/10 z-10 group-hover:bg-transparent transition-all" />
                    <img
                      src={proofPreview}
                      alt="Receipt preview"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                    />
                    <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/40 backdrop-blur-[2px]">
                      <div className="flex items-center gap-2 text-white bg-black/40 px-4 py-2 rounded-full font-medium text-sm">
                        <Eye size={18} /> {t('View Full')}
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="absolute bottom-3 left-3 z-30">
                      {isOcrProcessing ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-white bg-amber-500/90 backdrop-blur-md border border-white/20 px-3 py-1 rounded-full shadow-lg">
                          <Loader2 size={12} className="animate-spin" /> {t('Extracting...')}
                        </span>
                      ) : ocrError ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-white bg-red-500/90 backdrop-blur-md border border-white/20 px-3 py-1 rounded-full shadow-lg">
                          <AlertCircle size={12} /> {t('Scan Failed')}
                        </span>
                      ) : amount ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-white bg-emerald-500/90 backdrop-blur-md border border-white/20 px-3 py-1 rounded-full shadow-lg">
                          <CheckCircle size={12} /> {t('Smart Scanned')}
                        </span>
                      ) : null}
                    </div>

                    {/* Scanning progress bar */}
                    {isOcrProcessing && (
                      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-slate-100 overflow-hidden z-30">
                        <div
                          className="h-full bg-gradient-to-r from-primary-400 via-secondary-400 to-primary-400 animate-[pulse_1s_ease-in-out_infinite]"
                          style={{ width: '100%' }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Footer — Receipt info + Remove */}
                  <div className="px-3 py-2.5 bg-white rounded-b-[14px] flex justify-between items-center">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-800 text-sm truncate">{t('Receipt Attached')}</h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">
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
                      className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors shrink-0 ml-2"
                      aria-label="Remove receipt"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Fullscreen Lightbox */}
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

            {ocrError && !proofPreview && (
              <div className="p-3 rounded-xl bg-accent-500/10 border border-accent-500/20 flex items-center gap-2 text-sm text-accent-400">
                <AlertCircle size={16} />
                <span>{ocrError}</span>
              </div>
            )}

            {/* Type Toggle */}
            <div className="flex p-1 bg-slate-100/80 rounded-[1.25rem] border border-slate-200/50 shadow-inner backdrop-blur-sm gap-1 shrink-0">
              <button
                type="button"
                className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 flex-1 py-3 px-2 rounded-xl text-sm font-bold transition-all duration-300 ${type === 'expense'
                    ? 'bg-white text-rose-600 shadow-[0_4px_12px_rgba(225,29,72,0.15)] border border-rose-100'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                  }`}
                onClick={() => setType('expense')}
                aria-pressed={type === 'expense'}
              >
                <ArrowDownRight size={18} />
                {t('Expense')}
              </button>
              <button
                type="button"
                className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 flex-1 py-3 px-2 rounded-xl text-sm font-bold transition-all duration-300 ${type === 'income'
                    ? 'bg-white text-emerald-600 shadow-[0_4px_12px_rgba(16,185,129,0.15)] border border-emerald-100'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                  }`}
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
                className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 flex-1 py-3 px-2 rounded-xl text-sm font-bold transition-all duration-300 ${type === 'transfer'
                    ? 'bg-white text-indigo-600 shadow-[0_4px_12px_rgba(79,70,229,0.15)] border border-indigo-100'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                  }`}
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

            {/* Amount Input */}
            <div className="flex flex-col shrink-0">
              <div className="flex justify-between items-center mb-1 pr-1">
                <label htmlFor="amount" className="text-[11px] md:text-xs text-slate-500 font-bold uppercase tracking-[0.15em] ml-1">
                  {t('Amount')}
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      suppressLockForFilePicker();
                      uploadInputRef.current?.click();
                    }}
                    className="flex items-center gap-1.5 text-[10px] md:text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg transition-colors border border-slate-200 shadow-sm active:scale-95"
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
                    className="flex items-center gap-1.5 text-[10px] md:text-[11px] font-bold text-secondary-600 bg-secondary-50 hover:bg-secondary-100 px-2.5 py-1.5 rounded-lg transition-colors border border-secondary-200 shadow-sm active:scale-95"
                  >
                    {isOcrProcessing ? <Loader2 size={14} className="animate-spin" /> : <ScanLine size={14} />}
                    <span className="hidden sm:inline">{t('Smart Scan')}</span>
                    <span className="sm:hidden">{t('Scan')}</span>
                  </button>
                </div>
              </div>
              <div className="relative group">
                <div
                  className={`absolute inset-0 rounded-xl blur-lg opacity-0 group-focus-within:opacity-100 transition-opacity duration-700 pointer-events-none ${type === 'expense' ? 'bg-rose-500/10' : 'bg-emerald-500/10'
                    }`}
                />
                <div
                  className={`absolute left-5 top-1/2 -translate-y-1/2 z-30 pointer-events-none transition-all duration-300 font-sans text-2xl md:text-3xl font-bold ${type === 'expense' ? 'text-rose-500' : 'text-emerald-500'
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
                  className={`input-field relative z-20 font-extrabold !py-3 md:!py-4 !pl-14 bg-white/80 focus:bg-white font-sans tracking-tight border-slate-200 shadow-sm ${isOcrProcessing ? 'animate-pulse' : ''
                    } ${amountError ? 'border-rose-500 ring-rose-500/20' : ''}`}
                  style={{ 
                    color: amount ? (type === 'expense' ? '#e11d48' : '#059669') : '#94a3b8',
                    fontSize: 'clamp(24px, 5.5vw, 36px)'
                  }}
                  required
                  aria-invalid={!!amountError}
                  aria-describedby={amountError ? 'amount-error' : undefined}
                />
              </div>
              {amountError && (
                <p id="amount-error" className="text-xs text-accent-400 mt-1 ml-1">
                  {amountError}
                </p>
              )}
            </div>

            {/* Categories (Hidden for Transfer) */}
            {type !== 'transfer' && (
              <div className="flex flex-col shrink-0">
                <label className="text-[10px] md:text-xs text-slate-500 font-bold uppercase tracking-[0.15em] ml-1 mb-1">
                  {t('Category')}
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3">
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

            {/* Date & Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 shrink-0">
              <div className="flex flex-col">
                <label htmlFor="date" className="text-[10px] md:text-xs text-slate-500 font-bold uppercase tracking-[0.15em] ml-1 mb-1">
                  {t('Date')}
                </label>
                <div className="relative">
                  <CalendarIcon
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none"
                    size={18}
                  />
                  <input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="input-field !pl-10 !py-2.5 bg-white/80 focus:bg-white border-slate-200 shadow-sm"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col">
                <label htmlFor="notes" className="text-[10px] md:text-xs text-slate-500 font-bold uppercase tracking-[0.15em] ml-1 mb-1">
                  {t('Notes')}
                </label>
                <div className="relative">
                  <FileText
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none"
                    size={18}
                  />
                  <input
                    id="notes"
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t('Optional details...')}
                    className="input-field !pl-10 !py-2.5 placeholder-slate-400 bg-white/80 focus:bg-white border-slate-200 shadow-sm"
                  />
                </div>
              </div>
            </div>

            {/* Member Selection - Visual Grid (Only for Send Money / Transfer) */}
            {type === 'transfer' && (
              <div className="flex flex-col shrink-0 mt-2 mb-2">
                <label className="text-[10px] md:text-xs text-slate-500 font-bold uppercase tracking-[0.15em] ml-1 mb-2">
                  {t('Send To (Recipient)')}
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-3">
                  {familyMembers
                    .filter((m) => m.id !== user?.id)
                    .map((m) => {
                      const isSelected = selectedMemberId === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setSelectedMemberId(m.id)}
                          className="flex flex-col items-center justify-center gap-2 py-3 px-2 rounded-[1.125rem] w-full transition-all duration-300 border bg-white/60 border-slate-200/60 text-slate-500 hover:text-slate-700 hover:bg-slate-100 shadow-sm"
                          aria-pressed={isSelected}
                          style={
                            isSelected
                              ? {
                                backgroundColor: 'rgba(79,70,229,0.12)',
                                borderColor: 'rgba(79,70,229,0.25)',
                                color: '#4f46e5',
                                transform: 'scale(1.02)',
                              }
                              : {}
                          }
                        >
                          <UserIcon size={20} className={isSelected ? 'text-indigo-600' : 'opacity-70'} />
                          <span className="text-[10px] sm:text-[11px] md:text-xs font-bold text-center whitespace-nowrap tracking-tight">
                            {t(m.name || 'Member')}
                          </span>
                        </button>
                      );
                    })}
                </div>
              </div>
            )}
          </div>

          {/* Sticky/Floating Bottom Button — sits above the bottom nav bar */}
          <div
            className="fixed sm:absolute left-0 right-0 p-4 pb-3 z-50 pointer-events-none flex justify-center"
            style={{ bottom: 'calc(4.75rem + env(safe-area-inset-bottom, 0px))' }}
          >
            <div className="w-full max-w-md pointer-events-auto">
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full !py-3.5 !text-base !shadow-none flex items-center justify-center hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70 disabled:hover:scale-100"
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
