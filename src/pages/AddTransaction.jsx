import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IndianRupee,
  Calendar,
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
  User,
} from 'lucide-react';

// ============================================================================
// Types & Interfaces


const expenseCategories = [
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

const incomeCategories = [
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
const CategoryButton = React.memo(
  ({
    category,
    isSelected,
    onClick,
  }) => {
    const Icon = category.icon;
    return (
      <button
        type="button"
        onClick={onClick}
        className={`flex flex-col items-center justify-center gap-2 p-3 md:p-4 rounded-[1.125rem] transition-all duration-300 border ${isSelected
            ? 'bg-primary-50 border-primary-200 text-primary-700 shadow-[0_4px_12px_rgba(139,92,246,0.15)] transform scale-[1.02]'
            : 'bg-white/60 border-slate-200/60 text-slate-500 hover:text-slate-700 hover:bg-slate-100 shadow-sm'
          }`}
        aria-label={`Category ${category.name}`}
        aria-pressed={isSelected}
      >
        <Icon size={20} className={isSelected ? 'text-primary-600' : 'opacity-70'} />
        <span className="text-[10px] md:text-xs font-semibold text-center w-full truncate">
          {category.name}
        </span>
      </button>
    );
  }
);
CategoryButton.displayName = 'CategoryButton';

const SuccessScreen = () => (
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
      <h3 className="text-3xl font-bold text-slate-900 mb-2">Record Added!</h3>
      <p className="text-slate-500">Redirecting to dashboard...</p>
    </motion.div>
  </div>
);

// ============================================================================
// Main Component
// ============================================================================
export default function AddTransaction() {
  const { addTransaction, refetch } = useFinance();
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const abortControllerRef = useRef(null);

  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [proofImage, setProofImage] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [ocrError, setOcrError] = useState(null);
  const [amountError, setAmountError] = useState(null);

  const categories = useMemo(
    () => (type === 'expense' ? expenseCategories : incomeCategories),
    [type]
  );

  // New state for selecting family members
  const [familyMembers, setFamilyMembers] = useState([]);
  const [selectedMemberId, setSelectedMemberId] = useState('');

  useEffect(() => {
    async function fetchProfiles() {
      try {
        const { data, error } = await supabase.from('profiles').select('id, name');
        if (error) throw error;
        if (data) setFamilyMembers(data);
      } catch (err) {
        console.error('Error fetching family profiles:', err);
      }
    }
    fetchProfiles();
  }, []);

  useEffect(() => {
    if (user?.id && !selectedMemberId && familyMembers.length > 0) {
      // Auto-select the logged in user as default if they exist in profiles
      const me = familyMembers.find(m => m.id === user.id);
      if (me) setSelectedMemberId(me.id);
      else setSelectedMemberId(user.id);
    } else if (user?.id && !selectedMemberId && familyMembers.length === 0) {
      setSelectedMemberId(user.id);
    }
  }, [user, familyMembers, selectedMemberId]);

  // Reset category when type changes (avoid mismatched default)
  useEffect(() => {
    setCategory(type === 'expense' ? 'Food' : 'Salary');
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
      abortControllerRef.current?.abort();
    };
  }, []);

  const fileToBase64 = useCallback((file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }, []);

  const handleImageUpload = useCallback(
    async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setOcrError('Image too large (max 5MB)');
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        setOcrError('Please upload an image file');
        return;
      }

      setProofImage(file);
      setProofPreview(URL.createObjectURL(file));
      setIsOcrProcessing(true);
      setOcrError(null);

      // Cancel any previous ongoing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (!apiKey) {
          throw new Error('Missing Gemini API key. Please set VITE_GEMINI_API_KEY');
        }

        const base64Image = await fileToBase64(file);

        const requestBody = {
          system_instruction: {
            parts: [
              {
                text: 'You are a highly precise Indian financial receipt parser. Your only job is to analyze payment screenshots (like Google Pay, PhonePe, Paytm, or paper receipts) and perfectly extract the absolute Total Amount paid and the transaction Date. Always output valid JSON only. Never include markdown formatting.',
              },
            ],
          },
          contents: [
            {
              parts: [
                {
                  text: 'Extract the data into this JSON format exactly: { "amount": "200.00", "date": "16 April 2026" }. Find the final total paid. Exclude ALL currency symbols (like ₹, $, Rs) from the amount. We ONLY want the numerical value (e.g. 200 or 200.00).',
                },
                {
                  inline_data: {
                    mime_type: file.type || 'image/jpeg',
                    data: base64Image,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            response_mime_type: 'application/json',
            temperature: 0.1,
          },
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

        if (!response.ok) throw new Error(`AI Vision API failed (${response.status})`);

        const data = await response.json();
        const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!responseText) throw new Error('No data extracted from image');

        const rawJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const jsonResult = JSON.parse(rawJson);

        if (jsonResult.amount && !isNaN(parseFloat(jsonResult.amount))) {
          setAmount(jsonResult.amount);
          setAmountError(null);
        }

        if (jsonResult.date) {
          setNotes((prev) =>
            prev ? `${prev} | AI Scan: ${jsonResult.date}` : `AI Scan: ${jsonResult.date}`
          );
        } else if (!notes.includes('AI Scanned')) {
          setNotes((prev) => (prev ? `${prev} | AI Scanned` : 'AI Scanned'));
        }
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.error('AI Extraction Error:', err);
        setOcrError(err.message || 'OCR scan failed');
        setNotes((prev) => (prev ? `${prev} | AI Scan Failed` : 'AI Scan Failed'));
      } finally {
        setIsOcrProcessing(false);
        abortControllerRef.current = null;
      }
    },
    [fileToBase64, notes]
  );

  const validateForm = useCallback(() => {
    if (!amount || parseFloat(amount) <= 0) {
      setAmountError('Please enter a valid amount greater than zero');
      return false;
    }
    setAmountError(null);
    return true;
  }, [amount]);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!validateForm()) return;
      if (!user?.id) {
        console.error('User not authenticated');
        return;
      }

      setIsSubmitting(true);
      let uploadedProofUrl = null;

      if (proofImage) {
        try {
          const fileExt = proofImage.name.split('.').pop();
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
          const filePath = `${user.id}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('proofs')
            .upload(filePath, proofImage);

          if (uploadError) throw uploadError;

          const {
            data: { publicUrl },
          } = supabase.storage.from('proofs').getPublicUrl(filePath);
          uploadedProofUrl = publicUrl;
        } catch (err) {
          console.error('Proof upload failed:', err);
          // Continue without proof – don't block transaction creation
        }
      }

      if (type === 'transfer') {
        // Dual entry bookkeeping for family transfers executed instantly from frontend payload!
        // 1. Subtract from Sender (Current User)
        await addTransaction({
          type: 'expense',
          amount: parseFloat(amount),
          category: 'Transfer',
          date,
          notes: notes.trim() ? notes.trim() : `Sent money`,
          memberId: user.id, // Current user
          proofUrl: uploadedProofUrl,
        });

        // 2. Add to Receiver automatically!
        await addTransaction({
          type: 'income',
          amount: parseFloat(amount),
          category: 'Transfer',
          date,
          notes: notes.trim() ? notes.trim() : `Received from ${user.name || 'family'}`,
          memberId: selectedMemberId, // Receiver!
          proofUrl: uploadedProofUrl,
        });

        // Trigger a UI refresh immediately
        if (refetch) refetch();
      } else {
        // Standard single transaction
        await addTransaction({
          type,
          amount: parseFloat(amount),
          category,
          date,
          notes: notes.trim() || undefined,
          memberId: selectedMemberId,
          proofUrl: uploadedProofUrl,
        });
      }

      setIsSubmitting(false);
      setSubmitted(true);
      setTimeout(() => navigate('/'), 1200);
    },
    [amount, category, date, notes, proofImage, type, user, addTransaction, navigate, validateForm]
  );

  if (submitted) return <SuccessScreen />;

  return (
    <div className="w-full h-full max-w-2xl mx-auto py-2 md:py-4 flex flex-col">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative flex flex-col flex-1 h-full px-4 sm:px-2 pt-2"
      >

        {/* Header */}
        <div className="flex justify-end items-center mb-6 md:mb-8 relative z-10 shrink-0">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-3 md:px-4 rounded-xl bg-white text-secondary-400 hover:text-slate-900 hover:bg-slate-100 border border-secondary-500/40 flex items-center justify-center transition-all shadow-glow-secondary active:scale-95 group overflow-hidden relative"
            aria-label="Scan receipt with AI"
            title="Smart Scan Receipt"
          >
            <div className="absolute inset-0 bg-secondary-500/10 scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-300" />
            {isOcrProcessing ? (
              <Loader2 size={20} className="animate-spin md:mr-2" />
            ) : (
              <ScanLine size={20} className="md:mr-2" />
            )}
            <span className="hidden md:inline font-medium text-sm">Smart Scan</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            className="hidden"
            aria-label="Upload receipt image"
          />
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-3 relative z-10 w-full h-full justify-between">
          {/* OCR Preview & Error */}
          <AnimatePresence>
            {proofPreview && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="relative rounded-2xl border border-slate-900/10 overflow-hidden bg-slate-50 p-2"
              >
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                  <div className="w-24 h-24 rounded-xl overflow-hidden shrink-0 border border-slate-900/5 relative">
                    <img src={proofPreview} alt="Receipt preview" className="w-full h-full object-cover" />
                    {isOcrProcessing && (
                      <div className="absolute inset-0 bg-slate-100 flex flex-col items-center justify-center backdrop-blur-sm">
                        <div className="w-full h-0.5 bg-secondary-400 translate-y-[-24px] animate-pulse-slow drop-shadow-[0_0_8px_rgba(34,211,238,1)]" />
                        <span className="text-[10px] font-bold text-slate-900 mt-2">OCR SCAN</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-1 text-center sm:text-left mt-2 sm:mt-0">
                    <p className="text-sm font-bold text-slate-700">Receipt Attached</p>
                    <p className="text-xs text-slate-500">
                      {isOcrProcessing
                        ? 'Scanning document for amounts... ⚙️'
                        : ocrError
                          ? `OCR failed: ${ocrError}`
                          : 'Proof will be securely stored.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setProofPreview(null);
                      setProofImage(null);
                      setAmount('');
                      setOcrError(null);
                    }}
                    className="btn-glass text-xs !bg-accent-500/10 !border-accent-500/20 !text-accent-400 mr-2 shrink-0"
                  >
                    Remove
                  </button>
                </div>
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
              Expense
            </button>
            <button
              type="button"
              className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 flex-1 py-3 px-2 rounded-xl text-sm font-bold transition-all duration-300 ${type === 'income'
                  ? 'bg-white text-emerald-600 shadow-[0_4px_12px_rgba(16,185,129,0.15)] border border-emerald-100'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                }`}
              onClick={() => { setType('income'); setCategory('Salary'); }}
              aria-pressed={type === 'income'}
            >
              <ArrowUpRight size={16} />
              Income
            </button>
            <button
              type="button"
              className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 flex-1 py-3 px-2 rounded-xl text-sm font-bold transition-all duration-300 ${type === 'transfer'
                  ? 'bg-white text-indigo-600 shadow-[0_4px_12px_rgba(79,70,229,0.15)] border border-indigo-100'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                }`}
              onClick={() => { setType('transfer'); setCategory('Transfer'); }}
              aria-pressed={type === 'transfer'}
            >
              <Send size={16} />
              Send
            </button>
          </div>

          {/* Amount Input */}
          <div className="flex flex-col shrink-0">
            <label htmlFor="amount" className="text-[11px] md:text-xs text-slate-500 font-bold uppercase tracking-[0.15em] ml-1">
              Amount
            </label>
            <div className="relative group">
              <div
                className={`absolute inset-0 rounded-xl blur-lg opacity-0 group-focus-within:opacity-100 transition-opacity duration-700 pointer-events-none ${type === 'expense' ? 'bg-rose-500/10' : 'bg-emerald-500/10'
                  }`}
              />
              <div
                className={`absolute left-5 top-1/2 -translate-y-1/2 z-30 pointer-events-none transition-all duration-300 font-sans text-2xl md:text-3xl font-bold ${
                  type === 'expense' ? 'text-rose-500' : 'text-emerald-500'
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
                className={`input-field relative z-20 !text-3xl md:!text-4xl font-extrabold !py-3 md:!py-4 !pl-14 bg-white/80 focus:bg-white font-sans tracking-tight border-slate-200 shadow-sm ${isOcrProcessing ? 'animate-pulse' : ''
                  } ${amountError ? 'border-rose-500 ring-rose-500/20' : ''}`}
                style={{ color: amount ? (type === 'expense' ? '#e11d48' : '#059669') : '#94a3b8' }}
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
                Category
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 md:gap-3">
                {categories.map((cat) => (
                  <CategoryButton
                    key={cat.name}
                    category={cat}
                    isSelected={category === cat.name}
                    onClick={() => setCategory(cat.name)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Date & Notes (Now just 2 columns) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 shrink-0">
            <div className="flex flex-col">
              <label htmlFor="date" className="text-[10px] md:text-xs text-slate-500 font-bold uppercase tracking-[0.15em] ml-1 mb-1">
                Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" size={18} />
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
                Notes
              </label>
              <div className="relative">
                <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" size={18} />
                <input
                  id="notes"
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional details..."
                  className="input-field !pl-10 !py-2.5 placeholder-slate-400 bg-white/80 focus:bg-white border-slate-200 shadow-sm"
                />
              </div>
            </div>
          </div>

          {/* Member Selection - Visual Grid */}
          <div className="flex flex-col shrink-0 mt-2 mb-2">
            <label className="text-[10px] md:text-xs text-slate-500 font-bold uppercase tracking-[0.15em] ml-1 mb-2">
              {type === 'transfer' ? 'Send To (Recipient)' : 'Assign Record To'}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 md:gap-3">
              {familyMembers
                .filter((m) => type !== 'transfer' || m.id !== user?.id)
                .map((m) => {
                  const isSelected = selectedMemberId === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedMemberId(m.id)}
                      className={`flex flex-col items-center justify-center gap-2 p-3 rounded-[1.125rem] transition-all duration-300 border ${isSelected
                          ? type === 'transfer' 
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-[0_4px_12px_rgba(79,70,229,0.15)] transform scale-[1.02]'
                            : 'bg-primary-50 border-primary-200 text-primary-700 shadow-[0_4px_12px_rgba(139,92,246,0.15)] transform scale-[1.02]'
                          : 'bg-white/60 border-slate-200/60 text-slate-500 hover:text-slate-700 hover:bg-slate-100 shadow-sm'
                        }`}
                      aria-pressed={isSelected}
                    >
                      <User size={20} className={isSelected ? (type === 'transfer' ? 'text-indigo-600' : 'text-primary-600') : 'opacity-70'} />
                      <span className="text-[10px] md:text-xs font-semibold text-center w-full truncate">
                        {m.name || 'Member'}
                      </span>
                    </button>
                  );
              })}
              {familyMembers.length === 0 && user && type !== 'transfer' && (
                <button
                  type="button"
                  onClick={() => setSelectedMemberId(user.id)}
                  className={`flex flex-col items-center justify-center gap-2 p-3 rounded-[1.125rem] transition-all duration-300 border ${selectedMemberId === user.id
                      ? 'bg-primary-50 border-primary-200 text-primary-700 shadow-[0_4px_12px_rgba(139,92,246,0.15)] transform scale-[1.02]'
                      : 'bg-white/60 border-slate-200/60 text-slate-500 hover:text-slate-700 hover:bg-slate-100 shadow-sm'
                    }`}
                >
                  <User size={20} className={selectedMemberId === user.id ? 'text-primary-600' : 'opacity-70'} />
                  <span className="text-[10px] md:text-xs font-semibold text-center w-full truncate">
                    {user.name || 'Myself'}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="mt-auto shrink-0 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full !py-3 !text-sm md:!text-sm max-w-2xl mx-auto flex items-center justify-center hover:scale-[1.01] active:scale-[0.99] disabled:opacity-70"
            >
              <span className="flex items-center justify-center gap-2">
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> Uploading & Saving...
                  </>
                ) : (
                  <>
                    <Send size={18} /> Confirm Record
                  </>
                )}
              </span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}