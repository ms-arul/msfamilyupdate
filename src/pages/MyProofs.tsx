import React, { useState, useEffect, useCallback, useRef } from 'react';
import { compressForProofs } from '../utils/imageCompressor';
import { downloadFile, getExtFromUrl } from '../utils/downloadHelper';
import { createPortal } from 'react-dom';
import HeaderActions from '../components/ui/HeaderActions';
import { CachedImage } from '../components/ui/CachedImage';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useFamily } from '../context/FamilyContext';
import { invalidateStorageCache, getUserStorageUsage } from '../utils/storageService';
import { useSubscription, FREE_STORAGE_LIMIT_BYTES } from '../context/SubscriptionContext';
import { supabase } from '../lib/supabase';
import { useLocation } from 'react-router-dom';
import { generateVision } from '../utils/aiService';

import { Capacitor } from '@capacitor/core';
import { suppressLockForFilePicker } from '../utils/appLockService';
import { registerBackButtonHandler } from '../utils/backButtonManager';
import { CapacitorPluginMlKitTextRecognition } from '@pantrist/capacitor-plugin-ml-kit-text-recognition';
import { Proof } from '../types/database';
import {
  FileBadge,
  CreditCard,
  CarFront,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  X,
  Copy,
  Download,
  Eye,
  CheckCircle2,
  UploadCloud,
  Loader2,
  Plus,
  Sparkles,
  Info,
  ZoomIn,
  ZoomOut,
  Search,
  Trash2,
  AlertTriangle,
  Pin,
  PinOff,
  Pencil,
  Save
} from 'lucide-react';

const proofCategories = [
  { id: 'all', labelKey: 'All Documents', icon: FileBadge },
  { id: 'identity', labelKey: 'Identity', icon: ShieldCheck },
  { id: 'financial', labelKey: 'Financial', icon: CreditCard },
  { id: 'vehicle', labelKey: 'Vehicle', icon: CarFront },
];

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result.split(',')[1]);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export default function MyProofs() {
  const { user } = useAuth();
  const { family } = useFamily();
  const { t } = useLanguage();
  const { isPremium, features, setShowUpgradeModal } = useSubscription();
  const location = useLocation();
  const [proofs, setProofs] = useState<Proof[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  // Lightbox State
  const [activeProof, setActiveProof] = useState<Proof | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // Details modal state
  const [detailsProof, setDetailsProof] = useState<Proof | null>(null);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<Proof | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Download state
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  // Toast state for download feedback
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Pinch-to-zoom state
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const imageContainerRef = useRef<HTMLDivElement | null>(null);
  const touchStateRef = useRef({
    isPinching: false,
    startDist: 0,
    startZoom: 1,
    lastTap: 0,
    isPanning: false,
    panStart: { x: 0, y: 0 },
    panOffsetStart: { x: 0, y: 0 },
  });

  // Edit modal state
  const [editProof, setEditProof] = useState<Proof | null>(null);
  const [editForm, setEditForm] = useState<{ title: string; documentNumber: string; category: string }>({ title: '', documentNumber: '', category: '' });
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  // Upload & OCR State
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');

  // New Proof Form State
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const backInputRef = useRef<HTMLInputElement | null>(null);
  const [newProofForm, setNewProofForm] = useState<{
    title: string;
    documentNumber: string;
    category: string;
    imageUrl: string;
    localImage: File | null;
    backImageUrl: string;
    backLocalImage: File | null;
  }>({
    title: '',
    documentNumber: '',
    category: 'identity',
    imageUrl: '',
    localImage: null,
    backImageUrl: '',
    backLocalImage: null,
  });

  // Fetch Proofs from Supabase
  const fetchProofs = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('my_proofs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === '42P01') {
          console.warn('Table my_proofs does not exist yet. Please run the SQL setup script.');
        } else {
          throw error;
        }
      }
      if (data) setProofs(data as Proof[]);
    } catch (err) {
      console.error('Error fetching proofs:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProofs();
  }, [fetchProofs]);

  useEffect(() => {
    if (showUploadModal) {
      return registerBackButtonHandler('my_proofs_upload_modal', 100, () => {
        setShowUploadModal(false);
        return true;
      });
    }
  }, [showUploadModal]);

  useEffect(() => {
    if (activeProof) {
      return registerBackButtonHandler('my_proofs_lightbox', 100, () => {
        closeLightbox();
        return true;
      });
    }
  }, [activeProof]);

  useEffect(() => {
    if (detailsProof) {
      return registerBackButtonHandler('my_proofs_details_modal', 100, () => {
        setDetailsProof(null);
        return true;
      });
    }
  }, [detailsProof]);

  // Sort: pinned first, then by created_at
  const sortedProofs = [...proofs].sort((a, b) => {
    const aPinned = a.is_pinned ? 1 : 0;
    const bPinned = b.is_pinned ? 1 : 0;
    if (bPinned !== aPinned) return bPinned - aPinned;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const filteredProofs = sortedProofs.filter(p => {
    const matchesCategory = activeCategory === 'all' || p.category === activeCategory;
    const matchesSearch = p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.document_number?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const openLightbox = (proof: Proof) => {
    setActiveProof(proof);
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = () => {
    setActiveProof(null);
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
    document.body.style.overflow = '';
  };

  const openDetails = (e: React.MouseEvent, proof: Proof) => {
    e.stopPropagation();
    setDetailsProof(proof);
  };

  const closeDetails = () => {
    setDetailsProof(null);
  };

  const copyToClipboard = async (e: React.MouseEvent | undefined, text: string, id: string) => {
    if (e) e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  // ─── PIN / UNPIN ───────────────────────────
  const togglePin = async (e: React.MouseEvent | undefined, proof: Proof) => {
    if (e) e.stopPropagation();
    const newPinned = !proof.is_pinned;

    // Optimistic update
    setProofs(prev => prev.map(p => p.id === proof.id ? { ...p, is_pinned: newPinned } : p));
    // Also update any open modals referencing this proof
    if (detailsProof?.id === proof.id) setDetailsProof(prev => prev ? { ...prev, is_pinned: newPinned } : null);
    if (activeProof?.id === proof.id) setActiveProof(prev => prev ? { ...prev, is_pinned: newPinned } : null);

    try {
      const { error } = await supabase
        .from('my_proofs')
        .update({ is_pinned: newPinned })
        .eq('id', proof.id)
        .eq('user_id', user?.id);

      if (error) {
        console.warn('Pin update failed (column may not exist yet):', error.message);
        // Revert if DB update fails
        setProofs(prev => prev.map(p => p.id === proof.id ? { ...p, is_pinned: !newPinned } : p));
      }
    } catch (err) {
      console.error('Pin error:', err);
    }
  };

  // ─── EDIT DETAILS ──────────────────────────
  const openEditModal = (e: React.MouseEvent | undefined, proof: Proof) => {
    if (e) e.stopPropagation();
    setEditProof(proof);
    setEditForm({
      title: proof.title || '',
      documentNumber: proof.document_number || '',
      category: proof.category || 'identity',
    });
  };

  const closeEditModal = () => {
    setEditProof(null);
    setEditForm({ title: '', documentNumber: '', category: '' });
  };

  const saveEditedDetails = async () => {
    if (!editProof || !editForm.title.trim() || !user) return;
    setIsSavingEdit(true);
    try {
      const updates = {
        title: editForm.title.trim(),
        document_number: editForm.documentNumber.trim(),
        category: editForm.category,
      };

      const { error } = await supabase
        .from('my_proofs')
        .update(updates)
        .eq('id', editProof.id)
        .eq('user_id', user.id);

      if (error) throw error;

      // Update local state
      const updatedProof = { ...editProof, ...updates };
      setProofs(prev => prev.map(p => p.id === editProof.id ? updatedProof : p));

      // Update any open modals
      if (detailsProof?.id === editProof.id) setDetailsProof(updatedProof);
      if (activeProof?.id === editProof.id) setActiveProof(updatedProof);

      closeEditModal();
    } catch (err: any) {
      console.error('Edit error:', err);
      alert('Failed to update: ' + err.message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Delete proof handler
  const confirmDelete = (e: React.MouseEvent | undefined, proof: Proof) => {
    if (e) e.stopPropagation();
    setDeleteTarget(proof);
  };

  const cancelDelete = () => {
    setDeleteTarget(null);
  };

  const executeDelete = async () => {
    if (!deleteTarget || !user) return;
    setIsDeleting(true);
    try {
      // Extract storage paths from public URLs
      const extractPath = (url: string | null) => {
        if (!url) return null;
        const marker = '/object/public/proofs/';
        const idx = url.indexOf(marker);
        if (idx !== -1) return url.substring(idx + marker.length);
        return null;
      };

      const frontPath = extractPath(deleteTarget.image_url);
      const backPath = extractPath(deleteTarget.back_image_url);

      // Delete images from storage
      const pathsToDelete = [frontPath, backPath].filter((path): path is string => !!path);
      if (pathsToDelete.length > 0) {
        const { error: storageError } = await supabase.storage
          .from('proofs')
          .remove(pathsToDelete);
        if (storageError) console.warn('Storage cleanup warning:', storageError.message);
      }

      // Delete record from database
      const { error: dbError } = await supabase
        .from('my_proofs')
        .delete()
        .eq('id', deleteTarget.id)
        .eq('user_id', user.id);

      if (dbError) throw dbError;

      // Update local state
      setProofs(prev => prev.filter(p => p.id !== deleteTarget.id));

      // Invalidate storage cache
      invalidateStorageCache(user.id, family?.id);

      // Close any open modals showing this proof
      if (activeProof?.id === deleteTarget.id) closeLightbox();
      if (detailsProof?.id === deleteTarget.id) closeDetails();

    } catch (err: any) {
      console.error('Delete error:', err);
      alert('Failed to delete document: ' + err.message);
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  // Show toast notification
  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Download proof image to device (works on web + Android)
  const downloadProofImage = async (proof: Proof) => {
    if (!proof?.image_url) return;
    setIsDownloading(true);
    try {
      // Download front image
      const frontExt = getExtFromUrl(proof.image_url);
      const frontResult = await downloadFile(proof.image_url, `${proof.title}_front.${frontExt}`);

      if (!frontResult.success) {
        showToast('error', frontResult.message);
        return;
      }

      // Download back image if exists
      if (proof.back_image_url) {
        await new Promise(r => setTimeout(r, 300));
        const backExt = getExtFromUrl(proof.back_image_url);
        const backResult = await downloadFile(proof.back_image_url, `${proof.title}_back.${backExt}`);
        if (!backResult.success) {
          showToast('error', backResult.message);
          return;
        }
      }

      showToast('success', proof.back_image_url ? 'Both images saved!' : 'Image saved successfully!');
    } catch (err: any) {
      console.error('Download error:', err);
      showToast('error', 'Download failed: ' + err.message);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement> | { target: { files: FileList | null } }) => {
    let file = e.target.files?.[0];
    if (!file) return;

    const isPdf = file.type === 'application/pdf';
    if (!file.type.startsWith('image/') && !isPdf) {
      alert('Please upload a valid image or PDF document.');
      return;
    }

    const maxSize = isPdf ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert(`File size exceeds the limit (${isPdf ? '10MB' : '5MB'}).`);
      return;
    }

    setIsUploading(true);
    setUploadProgress(isPdf ? 'Preparing PDF...' : 'Analyzing document...');
    setShowUploadModal(true);

    try {
      if (!isPdf) {
        try {
          file = await compressForProofs(file);
        } catch (cErr) {
          console.warn('[MyProofs] Compression skipped:', cErr);
        }
      }

      let extractedTitle = file.name ? file.name.replace(/\.[^/.]+$/, "") : (isPdf ? 'PDF Document' : 'Scanned Document');
      let extractedDocNum = 'N/A';
      let extractedCat = 'identity';

      const isNative = Capacitor.isNativePlatform();
      let geminiSuccess = false;

      if (isPdf) {
        let previewUrl = '';
        try { previewUrl = URL.createObjectURL(file); } catch { }
        setNewProofForm(prev => ({
          ...prev,
          title: extractedTitle,
          documentNumber: 'N/A',
          category: 'identity',
          localImage: file ?? null,
          imageUrl: previewUrl
        }));
        setUploadProgress('');
      } else {
        // Try AI vision extraction
        try {
          const base64Image = await fileToBase64(file);
          const responseText = await generateVision(
            'Extract data to JSON: {"title": "", "documentNumber": "", "category": "identity|financial|vehicle"}',
            base64Image,
            file.type || 'image/jpeg',
            {
              systemInstruction: "You are an expert document parser. Analyze the uploaded ID, bill, or proof. Extract the 'title', the 'documentNumber'. And categorize it into EXACTLY ONE of these: 'identity', 'financial', or 'vehicle'. Output ONLY valid JSON containing these three keys.",
              temperature: 0.1,
              responseFormatJson: true
            }
          );
          if (responseText) {
            const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            const extracted = JSON.parse(cleanJson);
            if (extracted.title) extractedTitle = extracted.title;
            if (extracted.documentNumber) extractedDocNum = extracted.documentNumber;
            if (extracted.category) extractedCat = extracted.category;
            geminiSuccess = true;
          }
        } catch (err) {
          console.warn('[MyProofs] AI document extraction skipped/failed:', err);
        }

        // Try ML Kit fallback safely on Native without throwing uncaught errors
        if (!geminiSuccess && isNative) {
          try {
            const base64Data = await fileToBase64(file);
            if (CapacitorPluginMlKitTextRecognition && typeof (CapacitorPluginMlKitTextRecognition as any).detectText === 'function') {
              const result = await (CapacitorPluginMlKitTextRecognition as any).detectText({ base64Image: base64Data });
              const text = result?.text || '';
              if (text && text.trim() !== '') {
                if (text.match(/\d{4}\s?\d{4}\s?\d{4}/)) {
                  extractedTitle = 'Aadhar Card';
                  extractedDocNum = text.match(/\d{4}\s?\d{4}\s?\d{4}/)?.[0] || 'N/A';
                } else if (text.match(/[A-Z]{5}[0-9]{4}[A-Z]{1}/)) {
                  extractedTitle = 'PAN Card';
                  extractedDocNum = text.match(/[A-Z]{5}[0-9]{4}[A-Z]{1}/)?.[0] || 'N/A';
                  extractedCat = 'financial';
                } else if (text.toLowerCase().includes('invoice') || text.toLowerCase().includes('bill')) {
                  extractedTitle = 'Invoice/Bill';
                  extractedCat = 'financial';
                } else if (text.toLowerCase().includes('vehicle') || text.toLowerCase().includes('registration')) {
                  extractedTitle = 'Vehicle RC';
                  extractedCat = 'vehicle';
                } else if (text.match(/[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}/)) {
                  extractedTitle = 'Vehicle Reg';
                  extractedCat = 'vehicle';
                  extractedDocNum = text.match(/[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}/)?.[0] || 'N/A';
                }
              }
            }
          } catch (mlKitErr) {
            console.warn('[MyProofs] ML Kit native OCR fallback skipped:', mlKitErr);
          }
        }

        let previewUrl = '';
        try {
          previewUrl = URL.createObjectURL(file);
        } catch { }

        setNewProofForm(prev => ({
          ...prev,
          title: extractedTitle,
          documentNumber: extractedDocNum,
          category: extractedCat,
          localImage: file ?? null,
          imageUrl: previewUrl
        }));
        setUploadProgress('');
      }

    } catch (err) {
      console.error('[MyProofs] File processing error:', err);
      let previewUrl = '';
      if (file) {
        try { previewUrl = URL.createObjectURL(file); } catch { }
      }
      setNewProofForm(prev => ({
        ...prev,
        title: (file && file.name) ? file.name.replace(/\.[^/.]+$/, "") : 'Scanned Document',
        localImage: file ?? null,
        imageUrl: previewUrl
      }));
      setUploadProgress('');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, []);

  const handleBackImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    try {
      file = await compressForProofs(file);
    } catch { }
    let previewUrl = '';
    try { previewUrl = URL.createObjectURL(file); } catch { }
    setNewProofForm(prev => ({
      ...prev,
      backLocalImage: file ?? null,
      backImageUrl: previewUrl,
    }));
    if (backInputRef.current) backInputRef.current.value = '';
  };

  // Helper: generate summary (Native: ML Kit heuristic, Web: AI)
  const generateSummaryFromBase64 = async (file: File): Promise<string[] | null> => {
    const isNative = Capacitor.isNativePlatform();

    try {
      const base64Data = await fileToBase64(file);
      const text = await generateVision(
        'Summarize into exactly 5 key bullet points as a JSON array: ["point1", "point2", ...]',
        base64Data,
        file.type || 'image/jpeg',
        {
          systemInstruction: "You are a document summarizer. Analyze the uploaded document. Provide exactly 5 concise key details as a JSON array of strings.",
          temperature: 0.1,
          responseFormatJson: true
        }
      );
      if (text) {
        const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(clean);
      }
    } catch (err) {
      console.warn('AI summary failed, falling back...', err);
    }

    if (isNative) {
      try {
        const base64Data = await fileToBase64(file);
        const result = await (CapacitorPluginMlKitTextRecognition as any).detectText({ base64Image: base64Data });
        const text = result.text || '';
        const lines = text.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 5).slice(0, 5);
        while (lines.length < 5) lines.push('Additional details unavailable');
        return lines;
      } catch {
        return Array(5).fill('Analysis unavailable');
      }
    }

    return Array(5).fill('Analysis unavailable');
  };

  const saveDocument = async () => {
    if (!newProofForm.title || !newProofForm.localImage || !user) return;

    try {
      const usage = await getUserStorageUsage(user.id);
      const uploadSize = newProofForm.localImage.size + (newProofForm.backLocalImage?.size || 0);
      const limit = features?.max_storage_bytes || FREE_STORAGE_LIMIT_BYTES;
      if (usage.usedBytes + uploadSize > limit) {
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

    setIsUploading(true);
    setUploadProgress('Uploading document...');

    try {
      // Upload front image or PDF
      const fileExt = newProofForm.localImage.name.split('.').pop();
      const fileName = `${Date.now()}_front_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `my_proofs/${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('proofs')
        .upload(filePath, newProofForm.localImage, {
          contentType: newProofForm.localImage.type,
          upsert: true
        });

      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('proofs').getPublicUrl(filePath);

      // Upload back image if provided
      let backPublicUrl: string | null = null;
      if (newProofForm.backLocalImage) {
        const backExt = newProofForm.backLocalImage.name.split('.').pop();
        const backName = `${Date.now()}_back_${Math.random().toString(36).substring(7)}.${backExt}`;
        const backPath = `my_proofs/${user.id}/${backName}`;

        const { error: backUploadError } = await supabase.storage
          .from('proofs')
          .upload(backPath, newProofForm.backLocalImage, {
            contentType: newProofForm.backLocalImage.type,
            upsert: true
          });

        if (!backUploadError) {
          const { data: backData } = supabase.storage.from('proofs').getPublicUrl(backPath);
          backPublicUrl = backData.publicUrl;
        }
      }

      // Generate local summary from the front image during upload (skip if PDF)
      let aiSummaryJson: string | null = null;
      const isPdf = newProofForm.localImage.type === 'application/pdf';
      if (!isPdf) {
        setUploadProgress('summarizing your document...');
        const summaryPoints = await generateSummaryFromBase64(newProofForm.localImage);
        aiSummaryJson = summaryPoints ? JSON.stringify(summaryPoints) : null;
      }

      // Save to database with summary, file type, and file size (with fallback in case columns are missing)
      let dbData: any = null;
      let dbError: any = null;

      const firstAttempt = await supabase
        .from('my_proofs')
        .insert({
          user_id: user.id,
          title: newProofForm.title,
          document_number: newProofForm.documentNumber,
          category: newProofForm.category,
          image_url: publicUrl,
          back_image_url: backPublicUrl,
          ai_summary: aiSummaryJson,
          file_type: newProofForm.localImage.type,
          file_size: newProofForm.localImage.size,
        })
        .select('*')
        .single();

      dbData = firstAttempt.data;
      dbError = firstAttempt.error;

      // Fallback: If DB insert fails because columns don't exist yet, retry without file_type and file_size
      if (dbError && (dbError.message?.includes('file_size') || dbError.message?.includes('file_type') || dbError.code === 'PGRST204')) {
        console.warn('Database my_proofs table does not have file_size or file_type columns. Retrying insert without them...', dbError.message);
        const secondAttempt = await supabase
          .from('my_proofs')
          .insert({
            user_id: user.id,
            title: newProofForm.title,
            document_number: newProofForm.documentNumber,
            category: newProofForm.category,
            image_url: publicUrl,
            back_image_url: backPublicUrl,
            ai_summary: aiSummaryJson,
          })
          .select('*')
          .single();

        dbData = secondAttempt.data;
        dbError = secondAttempt.error;
      }

      if (dbError) throw dbError;

      // Invalidate storage cache
      invalidateStorageCache(user.id, family?.id);

      if (dbData) {
        setProofs(prev => [dbData as Proof, ...prev]);
      }
      setShowUploadModal(false);
      setNewProofForm({ title: '', documentNumber: '', category: 'identity', imageUrl: '', localImage: null, backImageUrl: '', backLocalImage: null });

    } catch (err: any) {
      console.error('Upload error:', err);
      alert('Failed to save document: ' + err.message);
    } finally {
      setIsUploading(false);
      setUploadProgress('');
    }
  };
  // Handle Shared Data (from Android native Share Targets)
  useEffect(() => {
    const sharedData = location.state?.sharedData;
    if (sharedData?.imageUri || sharedData?.pdfUri) {
      const processSharedFile = async () => {
        try {
          const fileUri = sharedData.imageUri || sharedData.pdfUri;
          const isPdf = !!sharedData.pdfUri;
          const url = Capacitor.isNativePlatform() ? Capacitor.convertFileSrc(fileUri) : fileUri;
          const res = await fetch(url);
          const blob = await res.blob();
          const filename = isPdf ? "shared_proof.pdf" : "shared_proof.jpg";
          const fileType = isPdf ? "application/pdf" : (blob.type || "image/jpeg");
          const file = new File([blob], filename, { type: fileType });

          handleFileUpload({
            target: {
              files: {
                0: file,
                length: 1,
                item: (i: number) => file
              } as unknown as FileList
            }
          });
        } catch (e) {
          console.error("Shared proof error:", e);
        }
      };
      // clean up history to prevent re-triggering
      window.history.replaceState(null, '');
      processSharedFile();
    }
  }, [location.state, handleFileUpload]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeProof) return;
      if (e.key === 'Escape') closeLightbox();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeProof]);

  // ─── PINCH-TO-ZOOM & PAN TOUCH HANDLER ──────────────────────────────
  useEffect(() => {
    const el = imageContainerRef.current;
    if (!el || !activeProof) return;

    const ts = touchStateRef.current;

    const getDistance = (t1: Touch, t2: Touch) => {
      const dx = t1.clientX - t2.clientX;
      const dy = t1.clientY - t2.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        // Pinch start
        e.preventDefault();
        ts.isPinching = true;
        ts.startDist = getDistance(e.touches[0], e.touches[1]);
        ts.startZoom = zoomLevel;
        ts.isPanning = false;
      } else if (e.touches.length === 1) {
        // Double tap detection
        const now = Date.now();
        if (now - ts.lastTap < 300) {
          e.preventDefault();
          // Toggle between 1x and 2.5x
          if (zoomLevel > 1.2) {
            setZoomLevel(1);
            setPanOffset({ x: 0, y: 0 });
          } else {
            setZoomLevel(2.5);
          }
          ts.lastTap = 0;
          return;
        }
        ts.lastTap = now;

        // Pan start (only when zoomed)
        if (zoomLevel > 1) {
          ts.isPanning = true;
          ts.panStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
          ts.panOffsetStart = { ...panOffset };
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (ts.isPinching && e.touches.length === 2) {
        e.preventDefault();
        const currentDist = getDistance(e.touches[0], e.touches[1]);
        const scale = currentDist / ts.startDist;
        const newZoom = Math.min(4, Math.max(0.5, ts.startZoom * scale));
        setZoomLevel(newZoom);
        if (newZoom <= 1) setPanOffset({ x: 0, y: 0 });
      } else if (ts.isPanning && e.touches.length === 1 && zoomLevel > 1) {
        e.preventDefault();
        const dx = e.touches[0].clientX - ts.panStart.x;
        const dy = e.touches[0].clientY - ts.panStart.y;
        setPanOffset({
          x: ts.panOffsetStart.x + dx,
          y: ts.panOffsetStart.y + dy,
        });
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        ts.isPinching = false;
      }
      if (e.touches.length === 0) {
        ts.isPanning = false;
        // Snap back to 1x if zoomed out too far
        if (zoomLevel < 1) {
          setZoomLevel(1);
          setPanOffset({ x: 0, y: 0 });
        }
        // Reset pan when zoom is back to 1x
        if (zoomLevel <= 1) {
          setPanOffset({ x: 0, y: 0 });
        }
      }
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: false });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [activeProof, zoomLevel, panOffset]);

  return (
    <div className="w-full h-full p-2 md:p-4 overflow-y-auto pb-32">

      {/* Filters & Actions row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4 w-full md:w-auto overflow-hidden">
          {/* Categories */}
          <div className="flex overflow-x-auto gap-2 hide-scrollbar pb-1 md:pb-0">
            {proofCategories.map(cat => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-xs md:text-sm transition-all whitespace-nowrap shrink-0 border ${isActive
                    ? 'bg-primary-500 text-white border-primary-500 shadow-lg shadow-primary-500/20'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border-border shadow-sm'
                    }`}
                >
                  <Icon size={14} />
                  {t(cat.labelKey)}
                </button>
              );
            })}
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-64 shrink-0 mt-2 md:mt-0">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-slate-400" />
            </div>
            <input
              type="text"
              placeholder={t('Search proofs...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all shadow-sm"
            />
          </div>
        </div>

        {/* Actions Portaled to Top Header */}
        <HeaderActions>
          <div className="flex shrink-0">
            <button
              type="button"
              onClick={() => { suppressLockForFilePicker(); fileInputRef.current?.click(); }}
              className="relative w-10 h-10 sm:w-auto sm:px-3.5 sm:h-10 rounded-[14px] flex items-center justify-center gap-1.5 bg-gradient-to-r from-primary-500/25 via-purple-500/20 to-indigo-500/25 dark:from-primary-500/35 dark:via-purple-600/30 dark:to-indigo-600/35 backdrop-blur-xl border border-primary-400/40 dark:border-primary-400/50 text-primary-600 dark:text-primary-300 shadow-[0_2px_16px_rgba(124,58,237,0.3)] hover:shadow-[0_4px_24px_rgba(124,58,237,0.45)] hover:scale-[1.03] active:scale-95 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
              aria-label={t('Upload New')}
            >
              {/* Top specular highlight streak */}
              <span className="absolute top-0 left-2 right-2 h-px bg-gradient-to-r from-transparent via-white/80 dark:via-white/40 to-transparent pointer-events-none" />
              <UploadCloud size={18} strokeWidth={2.4} className="text-primary-500 dark:text-primary-300 drop-shadow-[0_1px_4px_rgba(124,58,237,0.4)]" />
              <span className="hidden sm:inline text-xs font-bold text-primary-600 dark:text-primary-200 tracking-tight">{t('Upload New')}</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={handleFileUpload}
            />
          </div>
        </HeaderActions>
      </div>

      {/* Grid of Documents */}
      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="animate-spin text-primary-500" size={40} />
        </div>
      ) : proofs.length === 0 ? (
        <div className="text-center py-16 md:py-24 bg-white/40 backdrop-blur-md rounded-[2rem] border border-dashed border-slate-300">
          <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <ShieldCheck size={40} className="text-slate-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-800">{t('No Documents Found')}</h3>
          <p className="text-slate-500 mt-2 text-sm max-w-xs mx-auto">{t('Upload your first proof to secure it in your digital locker.')}</p>
          <button
            onClick={() => { suppressLockForFilePicker(); fileInputRef.current?.click(); }}
            className="mt-8 inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary-50 text-primary-600 hover:bg-primary-100 hover:scale-110 transition-all cursor-pointer border border-primary-100"
          >
            <Plus size={24} />
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredProofs.map((proof, index) => (
              <motion.div
                layout
                key={proof.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                onClick={() => openLightbox(proof)}
                className={`glass-panel p-1 rounded-2xl cursor-pointer group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative ${proof.is_pinned ? 'ring-2 ring-amber-400/60 shadow-amber-100' : ''}`}
              >
                {/* Pin indicator badge */}
                {proof.is_pinned && (
                  <div className="absolute top-3 left-3 z-30 bg-amber-400 text-white p-1.5 rounded-lg shadow-lg shadow-amber-400/30">
                    <Pin size={12} className="fill-current" />
                  </div>
                )}

                <div className="relative aspect-[1.58] overflow-hidden rounded-[14px]">
                  {proof.image_url?.toLowerCase().endsWith('.pdf') || proof.file_type === 'application/pdf' ? (
                    <div className="w-full h-full bg-rose-50 dark:bg-red-950/20 flex flex-col items-center justify-center border border-rose-100 dark:border-rose-900/30">
                      <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform duration-300">
                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-rose-500">
                          <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
                          <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                          <path d="M10 9H8" />
                          <path d="M16 13H8" />
                          <path d="M16 17H8" />
                        </svg>
                      </div>
                      <span className="text-[10px] font-extrabold text-rose-600 dark:text-rose-400 tracking-wider uppercase">PDF DOCUMENT</span>
                    </div>
                  ) : (
                    <>
                      <div className="absolute inset-0 bg-slate-900/10 z-10 group-hover:bg-transparent transition-all" />
                      <CachedImage
                        url={proof.image_url}
                        alt={proof.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                      />
                    </>
                  )}
                  <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/40 backdrop-blur-[2px]">
                    <div className="flex items-center gap-2 text-white bg-black/40 px-4 py-2 rounded-full font-medium">
                      <Eye size={18} /> View Full
                    </div>
                  </div>
                </div>

                <div className="px-4 py-3 bg-white rounded-b-[14px]">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-slate-800 text-base truncate flex-1 mr-2">{proof.title}</h3>
                    <div className="flex items-center gap-0.5 shrink-0">
                      {/* Pin button */}
                      <button
                        onClick={(e) => togglePin(e, proof)}
                        className={`p-1.5 rounded-lg transition-colors ${proof.is_pinned
                          ? 'bg-amber-50 text-amber-500 hover:bg-amber-100'
                          : 'hover:bg-slate-100 text-slate-400 hover:text-amber-500'
                          }`}
                        title={proof.is_pinned ? 'Unpin' : 'Pin to Top'}
                      >
                        {proof.is_pinned ? <PinOff size={15} /> : <Pin size={15} />}
                      </button>
                      {/* Edit button */}
                      <button
                        onClick={(e) => openEditModal(e, proof)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-primary-500 transition-colors"
                        title="Edit Details"
                      >
                        <Pencil size={15} />
                      </button>
                      {/* Copy button */}
                      <button
                        onClick={(e) => copyToClipboard(e, proof.document_number, proof.id)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-primary-500 transition-colors"
                        title="Copy Document Number"
                      >
                        {copiedId === proof.id ? <CheckCircle2 size={15} className="text-success-500" /> : <Copy size={15} />}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-slate-500 tracking-wider bg-slate-100 px-2 py-0.5 rounded border border-slate-200 truncate">
                      {proof.document_number?.replace(/.(?=.{4})/g, 'x')}
                    </span>
                    <button
                      onClick={(e) => openDetails(e, proof)}
                      className="flex items-center gap-1.5 text-xs font-bold text-white bg-primary-500 hover:bg-primary-600 px-3 py-1.5 rounded-lg transition-all shrink-0 shadow-md shadow-primary-500/20 active:scale-95"
                    >
                      View Details
                    </button>
                    <button
                      onClick={(e) => confirmDelete(e, proof)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors shrink-0"
                      title="Delete Proof"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Upload/OCR Modal */}
      {createPortal(
        <AnimatePresence>
          {showUploadModal && (
            <div className="fixed inset-0 z-[9999] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 md:p-12">
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl relative"
              >
                <div className="sticky top-0 z-10 p-5 border-b border-slate-100 flex justify-between items-center bg-white/95 backdrop-blur-md rounded-t-3xl">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <UploadCloud size={20} className="text-primary-500" />
                    Upload Proof
                  </h3>
                  {!isUploading && (
                    <button onClick={() => setShowUploadModal(false)} className="p-2 hover:bg-slate-200 rounded-lg text-slate-500">
                      <X size={18} />
                    </button>
                  )}
                </div>

                <div className="p-5 space-y-4">
                  {isUploading && uploadProgress.includes('Analyzing') ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <div className="w-16 h-16 rounded-2xl bg-primary-100 flex items-center justify-center mb-4">
                        <Loader2 size={32} className="animate-spin text-primary-600" />
                      </div>
                      <h4 className="font-bold text-slate-800">Please wait, reading...</h4>
                      <p className="text-sm text-slate-500 mt-1">{uploadProgress}</p>
                    </div>
                  ) : (
                    <>
                      {/* Front & Back Preview Side by Side */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-[11px] font-bold text-slate-600 uppercase tracking-widest mb-2">Front Side</p>
                          <div className="aspect-[1.58] bg-slate-100 rounded-xl overflow-hidden border border-border relative group flex flex-col items-center justify-center">
                            {newProofForm.localImage?.type === 'application/pdf' ? (
                              <div className="flex flex-col items-center justify-center p-4">
                                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-rose-500 mb-1 animate-pulse">
                                  <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
                                  <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                                </svg>
                                <span className="text-[11px] font-bold text-slate-700 truncate max-w-[120px]">{newProofForm.localImage.name}</span>
                                <span className="text-[9px] text-slate-400 font-semibold">{(newProofForm.localImage.size / (1024 * 1024)).toFixed(2)} MB</span>
                                <button
                                  onClick={() => setNewProofForm(prev => ({ ...prev, localImage: null, imageUrl: '' }))}
                                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-rose-500 text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ) : newProofForm.imageUrl ? (
                              <>
                                <img src={newProofForm.imageUrl} className="w-full h-full object-cover" alt="Front" />
                                <button
                                  onClick={() => setNewProofForm(prev => ({ ...prev, localImage: null, imageUrl: '' }))}
                                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-rose-500 text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </>
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs">No file</div>
                            )}
                          </div>
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-slate-600 uppercase tracking-widest mb-2">Back Side</p>
                          <div
                            onClick={() => { if (!newProofForm.backImageUrl) { suppressLockForFilePicker(); backInputRef.current?.click(); } }}
                            className={`aspect-[1.58] bg-slate-50 rounded-xl overflow-hidden border-2 border-dashed border-slate-200 relative transition-all group ${!newProofForm.backImageUrl ? 'cursor-pointer hover:border-primary-300 hover:bg-primary-50/30' : ''}`}
                          >
                            {newProofForm.backImageUrl ? (
                              <>
                                <img src={newProofForm.backImageUrl} className="w-full h-full object-cover" alt="Back" />
                                <button
                                  onClick={(e) => { e.stopPropagation(); setNewProofForm(prev => ({ ...prev, backLocalImage: null, backImageUrl: '' })); }}
                                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-rose-500 text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </>
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-slate-400 group-hover:text-primary-500 transition-colors">
                                <Plus size={20} />
                                <span className="text-[10px] font-semibold">Add Back</span>
                              </div>
                            )}
                          </div>
                          <input type="file" ref={backInputRef} className="hidden" accept="image/*" onChange={handleBackImageUpload} />
                        </div>
                      </div>

                      {isUploading && (
                        <div className="flex items-center justify-center gap-2 p-3 bg-primary-50 rounded-xl text-sm font-semibold text-primary-700">
                          <Loader2 size={16} className="animate-spin" />
                          {uploadProgress}
                        </div>
                      )}

                      <div>
                        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Document Title</label>
                        <input
                          type="text"
                          value={newProofForm.title}
                          onChange={e => setNewProofForm({ ...newProofForm, title: e.target.value })}
                          className="w-full p-3 rounded-xl border border-slate-200 bg-white mt-1 focus:outline-none focus:border-primary-500 text-slate-900 font-medium placeholder:text-slate-400 shadow-sm"
                          placeholder="e.g. Aadhar Card"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Document ID Number</label>
                        <input
                          type="text"
                          value={newProofForm.documentNumber}
                          onChange={e => setNewProofForm({ ...newProofForm, documentNumber: e.target.value })}
                          className="w-full p-3 rounded-xl border border-slate-200 bg-white mt-1 focus:outline-none focus:border-primary-500 font-mono tracking-wider text-slate-900 font-bold placeholder:text-slate-400 shadow-sm"
                          placeholder="1234 5678"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Category</label>
                        <select
                          value={newProofForm.category}
                          onChange={e => setNewProofForm({ ...newProofForm, category: e.target.value })}
                          className="w-full p-3 rounded-xl border border-slate-200 bg-white mt-1 focus:outline-none focus:border-primary-500 text-slate-900 font-semibold shadow-sm"
                        >
                          <option value="identity">Identity</option>
                          <option value="financial">Financial (Bills, Pan)</option>
                          <option value="vehicle">Vehicle (RC, DL)</option>
                        </select>
                      </div>

                      <button
                        onClick={saveDocument}
                        disabled={isUploading || !newProofForm.title}
                        className="w-full bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white font-bold p-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary-500/20"
                      >
                        {isUploading ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                        {isUploading ? 'Saving...' : 'Save to Locker'}
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* FULL SCREEN LIGHTBOX - AMOLED & LIGHT THEME CAPABLE */}
      {createPortal(
        <AnimatePresence>
          {activeProof && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeLightbox}
              className="fixed inset-0 z-[9999] bg-white/95 dark:bg-black/98 backdrop-blur-xl flex flex-col md:items-center md:justify-center overflow-y-auto"
            >
              {/* Top bar optimized for mobile + desktop */}
              <div className="sticky md:fixed top-0 left-0 right-0 z-50 flex flex-col md:flex-row md:items-center justify-between px-3 md:px-6 pt-[calc(env(safe-area-inset-top,24px)+8px)] pb-3 md:py-4 bg-white/95 dark:bg-black/95 backdrop-blur-md border-b border-slate-100 dark:border-slate-900 gap-2 md:gap-0" onClick={e => e.stopPropagation()}>
                {/* Title & Document Number */}
                <div className="flex items-start justify-between w-full md:w-auto">
                  <div className="overflow-hidden pr-2">
                    <h2 className="text-[15px] md:text-xl font-extrabold text-slate-900 dark:text-white leading-tight truncate">{activeProof.title}</h2>
                    <div className="flex items-center gap-2 mt-0.5 md:mt-1">
                      <span className="font-mono text-[10px] md:text-xs bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-350 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-800 truncate">
                        {activeProof.document_number}
                      </span>
                      <button
                        onClick={(e) => copyToClipboard(e, activeProof.document_number, 'lightbox')}
                        className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-400 dark:text-slate-500 hover:text-primary-500 dark:hover:text-primary-400 transition-colors text-[10px] flex items-center gap-1 shrink-0"
                      >
                        {copiedId === 'lightbox' ? <CheckCircle2 size={12} className="text-success-500" /> : <Copy size={12} />}
                        <span className="font-medium hidden md:block">Copy</span>
                      </button>
                    </div>
                  </div>
                  {/* Mobile Close Button */}
                  <button
                    onClick={closeLightbox}
                    className="md:hidden p-2 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors shrink-0"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Zoom Controls & Desktop Close */}
                <div className="flex items-center justify-between md:justify-end gap-2 w-full md:w-auto mt-1 md:mt-0">
                  <div className="flex items-center bg-slate-100 dark:bg-slate-900 rounded-xl p-0.5 w-full md:w-auto justify-between md:justify-center">
                    <button
                      onClick={() => { setZoomLevel(z => { const nz = Math.max(0.5, z - 0.25); if (nz <= 1) setPanOffset({ x: 0, y: 0 }); return nz; }); }}
                      className="p-2 md:p-2 flex-1 md:flex-none flex justify-center rounded-lg hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm text-slate-600 dark:text-slate-350 transition-all font-medium"
                      title="Zoom Out"
                    >
                      <ZoomOut size={16} />
                    </button>
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 w-12 text-center">{Math.round(zoomLevel * 100)}%</span>
                    <button
                      onClick={() => setZoomLevel(z => Math.min(4, z + 0.25))}
                      className="p-2 md:p-2 flex-1 md:flex-none flex justify-center rounded-lg hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm text-slate-600 dark:text-slate-350 transition-all font-medium"
                      title="Zoom In"
                    >
                      <ZoomIn size={16} />
                    </button>
                  </div>
                  {/* Desktop Close Button */}
                  <button
                    onClick={closeLightbox}
                    className="hidden md:block p-2 md:p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-350 transition-colors ml-1 shrink-0"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Image / PDF area - Pinch-to-zoom enabled */}
              <div
                ref={imageContainerRef}
                className="flex-1 flex flex-col items-center p-4 pt-[calc(env(safe-area-inset-top,24px)+96px)] md:pt-28 pb-20 w-full overflow-auto"
                onClick={e => e.stopPropagation()}
                style={{ touchAction: zoomLevel > 1 ? 'none' : 'pan-y' }}
              >
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center w-full max-w-[56rem] my-auto"
                >
                  <div
                    style={{
                      transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
                      transformOrigin: 'center center',
                      transition: touchStateRef.current?.isPinching || touchStateRef.current?.isPanning
                        ? 'none'
                        : 'transform 0.2s ease-out',
                      willChange: 'transform',
                    }}
                    className="w-full flex flex-col items-center"
                  >
                    {activeProof.image_url?.toLowerCase().endsWith('.pdf') || activeProof.file_type === 'application/pdf' ? (
                      <div className="w-full max-w-2xl md:max-w-3xl bg-slate-50 dark:bg-slate-900 rounded-3xl p-3 border border-slate-200 dark:border-slate-800/80 flex flex-col gap-4 shadow-lg mb-4">
                        {/* Inline PDF Viewer Controls bar */}
                        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-white dark:bg-black/60 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-sm">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                            <span className="text-[10px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-widest">
                              In-App PDF Viewer
                            </span>
                          </div>

                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (Capacitor.isNativePlatform()) {
                                downloadProofImage(activeProof);
                              } else {
                                window.open(activeProof.image_url, '_blank');
                              }
                            }}
                            className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 dark:bg-rose-700 dark:hover:bg-rose-600 text-white px-4 py-2 rounded-xl font-bold transition-all text-xs shadow-md shadow-rose-600/10 active:scale-95 pointer-events-auto"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                            {Capacitor.isNativePlatform() ? 'Open PDF Natively' : 'Open PDF in New Tab'}
                          </button>
                        </div>

                        {/* Interactive Frame with Portrait aspect ratio to match standard A4/Letter PDFs */}
                        <div className="w-full aspect-[0.7] md:aspect-[0.707] min-h-[55vh] md:min-h-[75vh] rounded-2xl overflow-hidden bg-white dark:bg-slate-950 relative shadow-inner border border-slate-100 dark:border-slate-800">
                          <iframe
                            src={
                              Capacitor.isNativePlatform()
                                ? `https://docs.google.com/viewer?url=${encodeURIComponent(activeProof.image_url)}&embedded=true`
                                : `${activeProof.image_url}#toolbar=0&navpanes=0&view=FitH`
                            }
                            title={activeProof.title}
                            className="w-full h-full border-0 absolute inset-0 rounded-2xl bg-white dark:bg-slate-950"
                            allowFullScreen
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Front image */}
                        <div className="w-full max-w-2xl mx-auto rounded-2xl overflow-hidden shadow-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 mb-4">
                          <CachedImage
                            url={activeProof.image_url}
                            alt={`${activeProof.title} - Front`}
                            className="w-full max-h-[70vh] object-contain mx-auto select-none"
                            style={{ maxHeight: zoomLevel <= 1 ? '70vh' : 'none' }}
                            draggable={false}
                          />
                        </div>

                        {/* Back image if exists */}
                        {activeProof.back_image_url && (
                          <div className="w-full max-w-2xl mx-auto rounded-2xl overflow-hidden shadow-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
                            <CachedImage
                              url={activeProof.back_image_url}
                              alt={`${activeProof.title} - Back`}
                              className="w-full max-h-[70vh] object-contain mx-auto select-none"
                              style={{ maxHeight: zoomLevel <= 1 ? '70vh' : 'none' }}
                              draggable={false}
                            />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </motion.div>
              </div>

              {/* Bottom floating buttons - download + edit + delete (Icons Only) */}
              <div className="fixed bottom-6 right-4 md:bottom-8 md:right-8 z-50 flex flex-row gap-3 pointer-events-none">
                <button
                  onClick={(e) => { e.stopPropagation(); downloadProofImage(activeProof); }}
                  disabled={isDownloading}
                  className="pointer-events-auto flex items-center justify-center bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white w-11 h-11 md:w-14 md:h-14 rounded-full transition-all shadow-2xl shadow-slate-900/40 active:scale-95"
                  title="Download"
                >
                  {isDownloading ? <Loader2 size={18} className="animate-spin md:w-[22px] md:h-[22px]" /> : <Download size={18} className="md:w-[22px] md:h-[22px]" />}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); openEditModal(e, activeProof); }}
                  className="pointer-events-auto flex items-center justify-center bg-primary-500 hover:bg-primary-600 text-white w-11 h-11 md:w-14 md:h-14 rounded-full transition-all shadow-2xl shadow-primary-500/40 active:scale-95"
                  title="Edit"
                >
                  <Pencil size={18} className="md:w-[22px] md:h-[22px]" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); confirmDelete(e, activeProof); }}
                  className="pointer-events-auto flex items-center justify-center bg-red-500 hover:bg-red-600 text-white w-11 h-11 md:w-14 md:h-14 rounded-full transition-all shadow-2xl shadow-red-500/40 active:scale-95"
                  title="Delete"
                >
                  <Trash2 size={18} className="md:w-[22px] md:h-[22px]" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* AI Details Modal */}
      {createPortal(
        <AnimatePresence>
          {detailsProof && (
            <div className="fixed inset-0 z-[9999] bg-slate-900/40 backdrop-blur-sm flex items-end md:items-center justify-center" onClick={closeDetails}>
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 40 }}
                onClick={e => e.stopPropagation()}
                className="bg-white w-full max-w-md rounded-t-3xl md:rounded-3xl shadow-2xl max-h-[70vh] overflow-y-auto"
              >
                <div className="sticky top-0 bg-white/95 backdrop-blur-md p-5 border-b border-slate-100 flex justify-between items-center rounded-t-3xl z-10">
                  <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                    Document Details
                  </h3>
                  <div className="flex items-center gap-1">
                    {/* Pin in details modal */}
                    <button
                      onClick={(e) => togglePin(e, detailsProof)}
                      className={`p-2 rounded-xl transition-colors ${detailsProof.is_pinned
                        ? 'bg-amber-50 text-amber-500 hover:bg-amber-100'
                        : 'hover:bg-slate-100 text-slate-400 hover:text-amber-500'
                        }`}
                      title={detailsProof.is_pinned ? 'Unpin' : 'Pin to Top'}
                    >
                      {detailsProof.is_pinned ? <PinOff size={16} /> : <Pin size={16} />}
                    </button>
                    {/* Edit in details modal */}
                    <button
                      onClick={(e) => { closeDetails(); openEditModal(e, detailsProof); }}
                      className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-primary-500 transition-colors"
                      title="Edit Details"
                    >
                      <Pencil size={16} />
                    </button>
                    <button onClick={closeDetails} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400">
                      <X size={18} />
                    </button>
                  </div>
                </div>

                <div className="p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] md:pb-5 space-y-4">
                  {/* Document Info */}
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="w-14 h-14 rounded-xl border border-slate-200 shrink-0 flex items-center justify-center bg-slate-50 overflow-hidden">
                      {detailsProof.image_url?.toLowerCase().endsWith('.pdf') || detailsProof.file_type === 'application/pdf' ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-rose-500">
                          <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" />
                        </svg>
                      ) : (
                        <CachedImage url={detailsProof.image_url} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="overflow-hidden">
                      <p className="font-bold text-slate-800 truncate">{detailsProof.title}</p>
                      <p className="font-mono text-xs text-slate-500 tracking-wider">{detailsProof.document_number}</p>
                    </div>
                  </div>

                  {/* AI Summary Points */}
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">AI Summary</p>
                    {detailsProof.ai_summary ? (
                      <ul className="space-y-2.5">
                        {JSON.parse(detailsProof.ai_summary).map((point: string, i: number) => (
                          <li key={i} className="flex items-start gap-3 text-sm text-slate-700">
                            <span className="shrink-0 w-6 h-6 rounded-lg bg-primary-50 text-primary-600 font-bold text-xs flex items-center justify-center mt-0.5 border border-primary-100">{i + 1}</span>
                            <span className="leading-relaxed">{point}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-center py-6 text-slate-400 text-sm">
                        <Info size={24} className="mx-auto mb-2 text-slate-300" />
                        <p>No summary available for this document.</p>
                        <p className="text-xs mt-1">Re-upload to auto-generate.</p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons in Details Modal */}
                  <div className="flex gap-3">
                    <button
                      onClick={(e) => { closeDetails(); openEditModal(e, detailsProof); }}
                      className="flex-1 flex items-center justify-center gap-2 bg-primary-50 hover:bg-primary-100 text-primary-600 font-bold py-3 rounded-xl transition-all border border-primary-100 active:scale-[0.98]"
                    >
                      <Pencil size={16} />
                      Edit Details
                    </button>
                    <button
                      onClick={(e) => { closeDetails(); confirmDelete(e, detailsProof); }}
                      className="flex-1 flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold py-3 rounded-xl transition-all border border-red-100 active:scale-[0.98]"
                    >
                      <Trash2 size={16} />
                      Delete
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Edit Details Modal */}
      {createPortal(
        <AnimatePresence>
          {editProof && (
            <div className="fixed inset-0 z-[99999] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={closeEditModal}>
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 10 }}
                transition={{ type: 'spring', duration: 0.3 }}
                onClick={e => e.stopPropagation()}
                className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
              >
                {/* Header */}
                <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                    <Pencil size={18} className="text-primary-500" />
                    Edit Details
                  </h3>
                  <button onClick={closeEditModal} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400">
                    <X size={18} />
                  </button>
                </div>

                {/* Preview */}
                <div className="px-5 pt-4">
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 mb-4">
                    <div className="w-12 h-12 rounded-lg border border-slate-200 shrink-0 flex items-center justify-center bg-slate-50 overflow-hidden">
                      {editProof.image_url?.toLowerCase().endsWith('.pdf') || editProof.file_type === 'application/pdf' ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-rose-500">
                          <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" />
                        </svg>
                      ) : (
                        <CachedImage url={editProof.image_url} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="overflow-hidden">
                      <p className="font-bold text-sm text-slate-800 truncate">{editProof.title}</p>
                      <p className="font-mono text-[10px] text-slate-400 tracking-wider">{editProof.document_number}</p>
                    </div>
                  </div>
                </div>

                {/* Form */}
                <div className="px-5 pb-5 space-y-4">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Document Title</label>
                    <input
                      type="text"
                      value={editForm.title}
                      onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                      className="w-full p-3 rounded-xl border border-slate-200 bg-white mt-1 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 text-slate-900 font-medium placeholder:text-slate-400 shadow-sm"
                      placeholder="e.g. Aadhar Card"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Document ID Number</label>
                    <input
                      type="text"
                      value={editForm.documentNumber}
                      onChange={e => setEditForm({ ...editForm, documentNumber: e.target.value })}
                      className="w-full p-3 rounded-xl border border-slate-200 bg-white mt-1 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 font-mono tracking-wider text-slate-900 font-bold placeholder:text-slate-400 shadow-sm"
                      placeholder="1234 5678"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Category</label>
                    <select
                      value={editForm.category}
                      onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                      className="w-full p-3 rounded-xl border border-slate-200 bg-white mt-1 focus:outline-none focus:border-primary-500 text-slate-900 font-semibold shadow-sm"
                    >
                      <option value="identity">Identity</option>
                      <option value="financial">Financial (Bills, Pan)</option>
                      <option value="vehicle">Vehicle (RC, DL)</option>
                    </select>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={closeEditModal}
                      disabled={isSavingEdit}
                      className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all active:scale-[0.98] text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveEditedDetails}
                      disabled={isSavingEdit || !editForm.title.trim()}
                      className="flex-1 py-3 rounded-xl font-bold text-white bg-primary-500 hover:bg-primary-600 transition-all shadow-lg shadow-primary-500/20 active:scale-[0.98] flex items-center justify-center gap-2 text-sm disabled:opacity-60"
                    >
                      {isSavingEdit ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save size={16} />
                          Save Changes
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      {createPortal(
        <AnimatePresence>
          {deleteTarget && (
            <div className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={cancelDelete}>
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 10 }}
                transition={{ type: 'spring', duration: 0.3 }}
                onClick={e => e.stopPropagation()}
                className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden"
              >
                {/* Header */}
                <div className="p-6 pb-4 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4 border border-red-100">
                    <AlertTriangle size={32} className="text-red-500" />
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-900">Delete Document?</h3>
                  <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                    Are you sure you want to delete <span className="font-bold text-slate-700">"{deleteTarget.title}"</span>? This will permanently remove the document and its images.
                  </p>
                </div>

                {/* Preview */}
                <div className="px-6 pb-4">
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="w-12 h-12 rounded-lg overflow-hidden border border-slate-200 shrink-0">
                      <CachedImage url={deleteTarget.image_url} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="overflow-hidden">
                      <p className="font-bold text-sm text-slate-800 truncate">{deleteTarget.title}</p>
                      <p className="font-mono text-[10px] text-slate-400 tracking-wider">{deleteTarget.document_number}</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 p-6 pt-2">
                  <button
                    onClick={cancelDelete}
                    disabled={isDeleting}
                    className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all active:scale-[0.98] text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={executeDelete}
                    disabled={isDeleting}
                    className="flex-1 py-3 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 active:scale-[0.98] flex items-center justify-center gap-2 text-sm disabled:opacity-60"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 size={16} />
                        Delete
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Toast Notification */}
      {createPortal(
        <AnimatePresence>
          {toast && (
            <motion.div
              key="toast"
              initial={{ opacity: 0, scale: 0.8, x: '-50%', y: '-50%' }}
              animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
              exit={{ opacity: 0, scale: 0.8, x: '-50%', y: '-50%' }}
              className="fixed top-1/2 left-1/2 z-[99999] bg-white/80 dark:bg-[#12121f]/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 text-slate-800 dark:text-slate-100 px-6 py-4 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col items-center gap-3 text-center min-w-[200px] max-w-[80vw]"
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${toast.type === 'success' ? 'bg-emerald-500/10' : 'bg-red-500/10'
                }`}>
                {toast.type === 'success' ? (
                  <CheckCircle2 size={24} className="text-emerald-500" />
                ) : (
                  <AlertTriangle size={24} className="text-red-500" />
                )}
              </div>
              <p className="text-base font-bold leading-tight">{toast.message}</p>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
