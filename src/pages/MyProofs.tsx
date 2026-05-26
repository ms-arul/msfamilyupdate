import React, { useState, useEffect, useCallback, useRef } from 'react';
import { compressForProofs } from '../utils/imageCompressor';
import { downloadFile, getExtFromUrl } from '../utils/downloadHelper';
import { createPortal } from 'react-dom';
import HeaderActions from '../components/ui/HeaderActions';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';
import { useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { suppressLockForFilePicker } from '../utils/appLockService';
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

export default function MyProofs() {
  const { user } = useAuth();
  const { t } = useLanguage();
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

  // Handle Shared Data (from Android native Share Targets)
  useEffect(() => {
    const sharedData = location.state?.sharedData;
    if (sharedData?.imageUri) {
       const processSharedImage = async () => {
         try {
           const url = Capacitor.isNativePlatform() ? Capacitor.convertFileSrc(sharedData.imageUri) : sharedData.imageUri;
           const res = await fetch(url);
           const blob = await res.blob();
           const file = new File([blob], "shared_proof.jpg", { type: blob.type || "image/jpeg" });
           
           // We will handle this in a separate effect below where handleFileUpload is defined
           window.sharedFileBuffer = file;
         } catch (e) {
           console.error("Shared proof error:", e);
         }
       };
       // clean up history to prevent re-triggering
       window.history.replaceState(null, '');
       processSharedImage();
     }
  }, [location.state]);

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

  // OCR Processing
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement> | { target: { files: FileList | null } }) => {
    let file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file.');
      return;
    }

    setIsUploading(true);
    setUploadProgress('Compressing & analyzing...');
    setShowUploadModal(true);

    try {
      file = await compressForProofs(file);
      
      let extractedTitle = 'Scanned Document';
      let extractedDocNum = 'N/A';
      let extractedCat = 'identity';
      
      const isNative = Capacitor.isNativePlatform();
      let geminiSuccess = false;
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

      // Try Gemini AI first
      if (apiKey) {
        try {
          const base64Image = await fileToBase64(file);
          const requestBody = {
            system_instruction: {
              parts: [{ text: "You are an expert document parser. Analyze the uploaded ID, bill, or proof. Extract the 'title', the 'documentNumber'. And categorize it into EXACTLY ONE of these: 'identity', 'financial', or 'vehicle'. Output ONLY valid JSON containing these three keys." }]
            },
            contents: [{
              parts: [
                { text: 'Extract data to JSON: {"title": "", "documentNumber": "", "category": "identity|financial|vehicle"}' },
                { inline_data: { mime_type: file.type || 'image/jpeg', data: base64Image } },
              ]
            }],
            generationConfig: { response_mime_type: 'application/json', temperature: 0.1 },
          };

          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
            { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody) }
          );

          if (response.ok) {
            const data = await response.json();
            const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (responseText) {
              const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
              const extracted = JSON.parse(cleanJson);
              
              extractedTitle = extracted.title || 'Unknown Document';
              extractedDocNum = extracted.documentNumber || 'N/A';
              extractedCat = extracted.category || 'identity';
              geminiSuccess = true;
            }
          }
        } catch (geminiErr) {
          console.warn('Gemini extraction failed, falling back...', geminiErr);
        }
      }

      if (!geminiSuccess && isNative) {
        // --- Fallback NATIVE: Google ML Kit ---
        const base64Data = await fileToBase64(file);
        const result = await (CapacitorPluginMlKitTextRecognition as any).detectText({ base64Image: base64Data });
        const text = result.text || '';
        
        if (!text || text.trim() === '') {
          throw new Error('No text detected by ML Kit.');
        }

        // Simple heuristic parsing for Native
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
        } else {
           throw new Error('Could not categorize document via ML Kit.');
        }
      } else if (!geminiSuccess && !isNative) {
        throw new Error('AI extraction failed.');
      }

      setNewProofForm(prev => ({
        ...prev,
        title: extractedTitle,
        documentNumber: extractedDocNum,
        category: extractedCat,
        localImage: file ?? null,
        imageUrl: file ? URL.createObjectURL(file) : ''
      }));
      setUploadProgress('');

    } catch (err) {
      console.error('OCR Error:', err);
      setNewProofForm(prev => ({
        ...prev,
        localImage: file ?? null,
        imageUrl: file ? URL.createObjectURL(file) : ''
      }));
      setUploadProgress('');
      alert('OCR analysis failed. Please enter details manually.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleBackImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    file = await compressForProofs(file);
    setNewProofForm(prev => ({
      ...prev,
      backLocalImage: file ?? null,
      backImageUrl: file ? URL.createObjectURL(file) : '',
    }));
    if (backInputRef.current) backInputRef.current.value = '';
  };

  // Helper: generate summary (Native: ML Kit heuristic, Web: Gemini AI)
  const generateSummaryFromBase64 = async (file: File): Promise<string[] | null> => {
    const isNative = Capacitor.isNativePlatform();
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    
    if (apiKey) {
      try {
        const base64Data = await fileToBase64(file);
        const requestBody = {
          system_instruction: {
            parts: [{ text: "You are a document summarizer. Analyze the uploaded document. Provide exactly 5 concise key details as a JSON array of strings." }]
          },
          contents: [{
            parts: [
              { text: 'Summarize into exactly 5 key bullet points as a JSON array: ["point1", "point2", ...]' },
              { inline_data: { mime_type: file.type || 'image/jpeg', data: base64Data } },
            ]
          }],
          generationConfig: { response_mime_type: 'application/json', temperature: 0.1 },
        };
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody) }
        );
        if (response.ok) {
          const data = await response.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(clean);
          }
        }
      } catch (err) {
        console.warn('Gemini summary failed, falling back...', err);
      }
    }

    if (isNative) {
      try {
        const base64Data = await fileToBase64(file);
        const result = await (CapacitorPluginMlKitTextRecognition as any).detectText({ base64Image: base64Data });
        const text = result.text || '';
        const lines = text.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 5).slice(0, 5);
        while(lines.length < 5) lines.push('Additional details unavailable');
        return lines;
      } catch {
        return Array(5).fill('Analysis unavailable');
      }
    }
    
    return Array(5).fill('Analysis unavailable');
  };

  const saveDocument = async () => {
    if (!newProofForm.title || !newProofForm.localImage || !user) return;

    setIsUploading(true);
    setUploadProgress('Uploading images...');

    try {
      // Upload front image
      const fileExt = newProofForm.localImage.name.split('.').pop();
      const fileName = `${Date.now()}_front_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `my_proofs/${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('proofs')
        .upload(filePath, newProofForm.localImage);

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
          .upload(backPath, newProofForm.backLocalImage);

        if (!backUploadError) {
          const { data: backData } = supabase.storage.from('proofs').getPublicUrl(backPath);
          backPublicUrl = backData.publicUrl;
        }
      }

      // Generate local summary from the front image during upload
      setUploadProgress('summarizing your document...');
      const summaryPoints = await generateSummaryFromBase64(newProofForm.localImage);
      const aiSummaryJson = summaryPoints ? JSON.stringify(summaryPoints) : null;

      // Save to database with summary
      const { data: dbData, error: dbError } = await supabase
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

      if (dbError) throw dbError;

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

  useEffect(() => {
    if (window.sharedFileBuffer) {
      handleFileUpload({ target: { files: { 0: window.sharedFileBuffer, length: 1, item: (i: number) => window.sharedFileBuffer || null } as unknown as FileList } });
      delete window.sharedFileBuffer;
    }
  }, [handleFileUpload]);

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
              onClick={() => { suppressLockForFilePicker(); fileInputRef.current?.click(); }}
              className="glass-btn relative w-10 h-10 sm:w-auto sm:px-3 sm:h-10 rounded-[12px] flex items-center justify-center gap-1.5 text-slate-600 dark:text-slate-300 transition-all focus:outline-none focus:ring-2 focus:ring-primary-500/40"
            >
              <span className="absolute top-0 left-2 right-2 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent pointer-events-none" />
              <UploadCloud size={17} strokeWidth={2.3} />
              <span className="hidden sm:inline text-xs font-semibold">{t('Upload New')}</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
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
                  <div className="absolute inset-0 bg-slate-900/10 z-10 group-hover:bg-transparent transition-all" />
                  <img
                    src={proof.image_url}
                    alt={proof.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                  />
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
                          <div className="aspect-[1.58] bg-slate-100 rounded-xl overflow-hidden border border-border relative group">
                            {newProofForm.imageUrl ? (
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
                              <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs">No image</div>
                            )}
                          </div>
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-slate-600 uppercase tracking-widest mb-2">Back Side</p>
                          <div
                            onClick={() => { if(!newProofForm.backImageUrl) { suppressLockForFilePicker(); backInputRef.current?.click(); } }}
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

      {/* FULL SCREEN LIGHTBOX - LIGHT THEME */}
      {createPortal(
        <AnimatePresence>
          {activeProof && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeLightbox}
              className="fixed inset-0 z-[9999] bg-white/95 backdrop-blur-xl flex flex-col md:items-center md:justify-center overflow-y-auto"
            >
              {/* Top bar optimized for mobile + desktop */}
              <div className="sticky md:fixed top-0 left-0 right-0 z-50 flex flex-col md:flex-row md:items-center justify-between px-3 md:px-6 pt-[calc(env(safe-area-inset-top,24px)+8px)] pb-3 md:py-4 bg-white/95 backdrop-blur-md border-b border-slate-100 gap-2 md:gap-0" onClick={e => e.stopPropagation()}>
                {/* Title & Document Number */}
                <div className="flex items-start justify-between w-full md:w-auto">
                  <div className="overflow-hidden pr-2">
                    <h2 className="text-[15px] md:text-xl font-extrabold text-slate-900 leading-tight truncate">{activeProof.title}</h2>
                    <div className="flex items-center gap-2 mt-0.5 md:mt-1">
                      <span className="font-mono text-[10px] md:text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200 truncate">
                        {activeProof.document_number}
                      </span>
                      <button
                        onClick={(e) => copyToClipboard(e, activeProof.document_number, 'lightbox')}
                        className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-primary-500 transition-colors text-[10px] flex items-center gap-1 shrink-0"
                      >
                        {copiedId === 'lightbox' ? <CheckCircle2 size={12} className="text-success-500" /> : <Copy size={12} />}
                        <span className="font-medium hidden md:block">Copy</span>
                      </button>
                    </div>
                  </div>
                  {/* Mobile Close Button */}
                  <button
                    onClick={closeLightbox}
                    className="md:hidden p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors shrink-0"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Zoom Controls & Desktop Close */}
                <div className="flex items-center justify-between md:justify-end gap-2 w-full md:w-auto mt-1 md:mt-0">
                  <div className="flex items-center bg-slate-100 rounded-xl p-0.5 w-full md:w-auto justify-between md:justify-center">
                    <button
                      onClick={() => { setZoomLevel(z => { const nz = Math.max(0.5, z - 0.25); if (nz <= 1) setPanOffset({ x: 0, y: 0 }); return nz; }); }}
                      className="p-2 md:p-2 flex-1 md:flex-none flex justify-center rounded-lg hover:bg-white hover:shadow-sm text-slate-600 transition-all font-medium"
                      title="Zoom Out"
                    >
                      <ZoomOut size={16} />
                    </button>
                    <span className="text-xs font-bold text-slate-600 w-12 text-center">{Math.round(zoomLevel * 100)}%</span>
                    <button
                      onClick={() => setZoomLevel(z => Math.min(4, z + 0.25))}
                      className="p-2 md:p-2 flex-1 md:flex-none flex justify-center rounded-lg hover:bg-white hover:shadow-sm text-slate-600 transition-all font-medium"
                      title="Zoom In"
                    >
                      <ZoomIn size={16} />
                    </button>
                  </div>
                  {/* Desktop Close Button */}
                  <button
                    onClick={closeLightbox}
                    className="hidden md:block p-2 md:p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors ml-1 shrink-0"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Image area - Pinch-to-zoom enabled */}
              <div
                ref={imageContainerRef}
                className="flex-1 flex flex-col items-center p-4 pt-[calc(env(safe-area-inset-top,24px)+96px)] md:pt-28 pb-20 w-full overflow-auto"
                onClick={e => e.stopPropagation()}
                style={{ touchAction: zoomLevel > 1 ? 'none' : 'pan-y' }}
              >
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center w-full max-w-[56rem]"
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
                    {/* Front image */}
                    <div className="w-full rounded-2xl overflow-hidden shadow-xl border border-slate-200 bg-white mb-4">
                      <img
                        src={activeProof.image_url}
                        alt={`${activeProof.title} - Front`}
                        className="w-full object-contain select-none"
                        style={{ maxHeight: zoomLevel <= 1 ? '75vh' : 'none' }}
                        draggable={false}
                      />
                    </div>

                    {/* Back image if exists */}
                    {activeProof.back_image_url && (
                      <div className="w-full rounded-2xl overflow-hidden shadow-xl border border-slate-200 bg-white">
                        <img
                          src={activeProof.back_image_url}
                          alt={`${activeProof.title} - Back`}
                          className="w-full object-contain select-none"
                          style={{ maxHeight: zoomLevel <= 1 ? '75vh' : 'none' }}
                          draggable={false}
                        />
                      </div>
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
                    <div className="w-14 h-14 rounded-xl overflow-hidden border border-slate-200 shrink-0">
                      <img src={detailsProof.image_url} alt="" className="w-full h-full object-cover" />
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
                    <div className="w-12 h-12 rounded-lg overflow-hidden border border-slate-200 shrink-0">
                      <img src={editProof.image_url} alt="" className="w-full h-full object-cover" />
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
                      <img src={deleteTarget.image_url} alt="" className="w-full h-full object-cover" />
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
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                toast.type === 'success' ? 'bg-emerald-500/10' : 'bg-red-500/10'
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
