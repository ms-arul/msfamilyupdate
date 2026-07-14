import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Database,
  Trash2,
  Eye,
  Info,
  Loader2,
  AlertCircle,
  CheckCircle,
  FileText,
  FileImage,
  Sparkles,
  Search,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useFamily } from '../context/FamilyContext';
import { useSubscription } from '../context/SubscriptionContext';
import { useLanguage } from '../context/LanguageContext';
import { getUserStorageUsage, formatBytes, invalidateStorageCache } from '../utils/storageService';

// Animation spring configuration
const SPRING_SOFT = { type: 'spring', stiffness: 380, damping: 30 } as const;

// Glass styles
const glass = {
  card: 'bg-white/[0.72] dark:bg-white/[0.045] backdrop-blur-2xl border border-white/80 dark:border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_32px_rgba(0,0,0,0.45)]',
  inner: 'bg-white/50 dark:bg-white/[0.03] backdrop-blur-xl border border-white/60 dark:border-white/[0.06]',
};

interface StorageFile {
  name: string;
  size: number;
  updated_at: string;
  publicUrl: string;
  type: 'document' | 'receipt';
}

export default function ManageStorage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { family } = useFamily();
  const { planId, features, isPremium } = useSubscription();

  const [activeTab, setActiveTab] = useState<'all' | 'documents' | 'receipts'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Storage usage states
  const [usage, setUsage] = useState<{ usedBytes: number; limitBytes: number; percentage: number } | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(true);

  // Files lists
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  
  // Modals & Action states
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StorageFile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Load storage usage info
  const loadStorageUsage = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoadingUsage(true);
      const data = await getUserStorageUsage(user.id, true); // forceRefresh
      setUsage({
        usedBytes: data.usedBytes,
        limitBytes: data.limitBytes,
        percentage: data.percentage
      });
    } catch (err) {
      console.error('Failed to load storage usage:', err);
    } finally {
      setLoadingUsage(false);
    }
  }, [user?.id]);

  // Load files from storage bucket 'proofs'
  const loadFiles = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoadingFiles(true);
      const loadedFiles: StorageFile[] = [];

      // 1. Fetch transaction receipts (path: userId/)
      const { data: receiptFiles, error: receiptError } = await supabase.storage
        .from('proofs')
        .list(user.id, { limit: 1000, sortBy: { column: 'name', order: 'desc' } });

      if (!receiptError && receiptFiles) {
        receiptFiles.forEach((file) => {
          if (file.name !== '.emptyFolderPlaceholder' && file.metadata?.size) {
            const path = `${user.id}/${file.name}`;
            const publicUrl = supabase.storage.from('proofs').getPublicUrl(path).data.publicUrl;
            loadedFiles.push({
              name: file.name,
              size: file.metadata.size,
              updated_at: file.updated_at || file.created_at || new Date().toISOString(),
              publicUrl,
              type: 'receipt'
            });
          }
        });
      }

      // 2. Fetch documents (path: my_proofs/userId/)
      const { data: docFiles, error: docError } = await supabase.storage
        .from('proofs')
        .list(`my_proofs/${user.id}`, { limit: 1000, sortBy: { column: 'name', order: 'desc' } });

      if (!docError && docFiles) {
        docFiles.forEach((file) => {
          if (file.name !== '.emptyFolderPlaceholder' && file.metadata?.size) {
            const path = `my_proofs/${user.id}/${file.name}`;
            const publicUrl = supabase.storage.from('proofs').getPublicUrl(path).data.publicUrl;
            loadedFiles.push({
              name: file.name,
              size: file.metadata.size,
              updated_at: file.updated_at || file.created_at || new Date().toISOString(),
              publicUrl,
              type: 'document'
            });
          }
        });
      }

      // Sort files by date descending
      loadedFiles.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      setFiles(loadedFiles);

    } catch (err) {
      console.error('Failed to load storage files:', err);
    } finally {
      setLoadingFiles(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      loadStorageUsage();
      loadFiles();
    }
  }, [user?.id, loadStorageUsage, loadFiles]);

  // Handle file deletion
  const handleDeleteFile = async () => {
    if (!deleteTarget || !user?.id) return;
    setIsDeleting(true);
    try {
      const filePath = deleteTarget.type === 'receipt'
        ? `${user.id}/${deleteTarget.name}`
        : `my_proofs/${user.id}/${deleteTarget.name}`;

      // 1. Remove file from storage
      const { error: storageError } = await supabase.storage
        .from('proofs')
        .remove([filePath]);

      if (storageError) {
        console.warn('Storage removal warning (might already be deleted):', storageError.message);
      }

      // 2. Cleanup references in Database
      if (deleteTarget.type === 'receipt') {
        // Set transaction proof_url to null
        const { error: dbError } = await supabase
          .from('transactions')
          .update({ proof_url: null })
          .eq('member_id', user.id)
          .eq('proof_url', deleteTarget.publicUrl);

        if (dbError) throw dbError;
      } else {
        // Delete the custom document if this file matches the front image
        const { error: dbError1 } = await supabase
          .from('my_proofs')
          .delete()
          .eq('user_id', user.id)
          .eq('image_url', deleteTarget.publicUrl);

        if (dbError1) throw dbError1;

        // Update document to remove back image reference if this file matches the back image
        const { error: dbError2 } = await supabase
          .from('my_proofs')
          .update({ back_image_url: null })
          .eq('user_id', user.id)
          .eq('back_image_url', deleteTarget.publicUrl);

        if (dbError2) throw dbError2;
      }

      // 3. Clear cache and refresh state
      invalidateStorageCache(user.id, family?.id);
      setActionSuccess(t('File deleted successfully and space reclaimed.'));
      setDeleteTarget(null);
      
      await loadStorageUsage();
      await loadFiles();

      setTimeout(() => setActionSuccess(null), 3000);

    } catch (err: any) {
      console.error('Deletion error:', err);
      alert(err.message || t('Failed to delete file.'));
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter files
  const filteredFiles = files.filter((f) => {
    const matchesTab = activeTab === 'all' || f.type === activeTab.slice(0, -1);
    const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 relative z-10">
      
      {/* Glow Orbs */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-sky-500/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/settings')}
          className="w-10 h-10 rounded-xl glass-btn flex items-center justify-center text-slate-600 dark:text-slate-300"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Database size={20} className="text-primary-500" />
            {t('Manage Storage')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('Overview of cloud receipts, documents, and storage limits.')}</p>
        </div>
      </div>

      {/* Storage Progress Ring/Bar Card */}
      {usage && (
        <div className={`${glass.card} rounded-3xl p-5 sm:p-6 relative overflow-hidden`}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5">
            <div className="space-y-1">
              <span className="text-[9px] font-bold text-primary-500 uppercase tracking-widest block">{t('Storage Footprint')}</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-slate-800 dark:text-slate-100">
                  {formatBytes(usage.usedBytes)}
                </span>
                <span className="text-xs text-slate-400">
                  {t('of')} {formatBytes(usage.limitBytes)} {t('used')}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 leading-normal">
                {t('Storage limits are based on your subscription tier.')} {isPremium ? t('You have 5 GB Premium limit.') : t('Upgrade for 5 GB storage.')}
              </p>
            </div>

            {!isPremium && (
              <button
                onClick={() => navigate('/subscription')}
                className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-extrabold text-xs shadow-md shadow-amber-500/20 flex items-center gap-1.5 hover:opacity-95 transition-opacity shrink-0"
              >
                <Sparkles size={13} /> {t('Get 5 GB Storage')}
              </button>
            )}
          </div>

          <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800/80 overflow-hidden mt-6 border border-slate-200/10 dark:border-white/5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(usage.percentage, 100)}%` }}
              transition={{ duration: 0.8 }}
              className={`h-full rounded-full ${
                usage.percentage > 85 ? 'bg-rose-500' :
                usage.percentage > 60 ? 'bg-amber-500' :
                'bg-primary-500'
              }`}
            />
          </div>
          
          <div className="flex justify-between text-[9px] text-slate-400 mt-2 font-bold uppercase">
            <span>0%</span>
            <span>{usage.percentage}% {t('Full')}</span>
            <span>100%</span>
          </div>
        </div>
      )}

      {/* Success banner */}
      <AnimatePresence>
        {actionSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-semibold flex items-center gap-2 shadow-sm"
          >
            <CheckCircle size={15} />
            <span>{actionSuccess}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* File Browser Grid */}
      <div className="space-y-4">
        
        {/* Navigation & Search filter */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          
          {/* Tabs */}
          <div className="flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl">
            {(['all', 'documents', 'receipts'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-xl font-extrabold text-xs capitalize transition-all ${
                  activeTab === tab
                    ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-400 bg-transparent'
                }`}
              >
                {t(tab)}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-60">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('Search files...')}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-2xl py-2 pl-9 pr-3 text-xs font-semibold focus:outline-none"
            />
          </div>

        </div>

        {/* Files display */}
        {loadingFiles ? (
          <div className="py-20 flex flex-col justify-center items-center gap-3">
            <Loader2 className="animate-spin text-primary-500" size={28} />
            <span className="text-xs text-slate-400">{t('Scanning cloud directories...')}</span>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="py-16 text-center glass-panel rounded-3xl">
            <Info size={32} className="mx-auto text-slate-400 mb-2.5" />
            <p className="text-xs text-slate-400 font-bold">{t('No files found matches filters.')}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{t('Files uploaded as transaction proofs or My Proofs documents will appear here.')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filteredFiles.map((file) => (
              <motion.div
                key={file.publicUrl}
                layout
                transition={SPRING_SOFT}
                className={`${glass.card} rounded-3xl overflow-hidden group relative flex flex-col`}
              >
                {/* Image Thumbnail */}
                <div className="aspect-[4/3] bg-slate-100 dark:bg-slate-950/40 relative overflow-hidden flex items-center justify-center border-b border-slate-200/50 dark:border-white/5">
                  {file.name.toLowerCase().endsWith('.pdf') ? (
                    <div className="flex flex-col items-center gap-2 text-primary-500">
                      <FileText size={36} />
                      <span className="text-[10px] font-black uppercase">PDF Document</span>
                    </div>
                  ) : (
                    <img
                      src={file.publicUrl}
                      alt={file.name}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  )}
                  
                  {/* Overlay Actions on Hover */}
                  <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    {!file.name.toLowerCase().endsWith('.pdf') && (
                      <button
                        onClick={() => setPreviewImage(file.publicUrl)}
                        className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md text-white flex items-center justify-center transition-colors"
                        title={t('Preview')}
                      >
                        <Eye size={18} />
                      </button>
                    )}
                    <button
                      onClick={() => setDeleteTarget(file)}
                      className="w-10 h-10 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 backdrop-blur-md text-rose-500 border border-rose-500/30 flex items-center justify-center transition-colors"
                      title={t('Delete')}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                {/* Info block */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      {file.type === 'document' ? (
                        <FileText size={12} className="text-indigo-500 shrink-0" />
                      ) : (
                        <FileImage size={12} className="text-sky-500 shrink-0" />
                      )}
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                        {t(file.type)}
                      </span>
                    </div>
                    <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200 line-clamp-1 truncate" title={file.name}>
                      {file.name}
                    </p>
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-slate-400 border-t border-slate-200/50 dark:border-white/5 pt-2">
                    <span>{formatBytes(file.size)}</span>
                    <span>{new Date(file.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

      </div>

      {/* ── Lightbox Preview Modal ── */}
      <AnimatePresence>
        {previewImage && (
          <div className="fixed inset-0 z-[99999] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative max-w-full max-h-full"
            >
              <button
                onClick={() => setPreviewImage(null)}
                className="absolute -top-12 right-0 p-2 text-white hover:text-slate-300 transition-colors"
              >
                Close (Esc)
              </button>
              <img src={previewImage} alt="Fullscreen preview" className="max-w-[90vw] max-h-[85vh] object-contain rounded-2xl shadow-2xl" />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Delete Confirmation Modal ── */}
      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteTarget(null)}
              className="absolute inset-0 bg-slate-900/60 dark:bg-black/85 backdrop-blur-md"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 rounded-3xl p-6 shadow-2xl z-10 text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto mb-4 text-rose-500">
                <Trash2 size={24} />
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">
                {t('Confirm Delete File')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                {t('Are you sure you want to permanently delete this file? This will remove all database linkages and cannot be undone.')}
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteTarget(null)}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] text-slate-600 dark:text-slate-300 font-bold text-xs transition-colors disabled:opacity-40"
                >
                  {t('Cancel')}
                </button>
                <button
                  onClick={handleDeleteFile}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-rose-500/20 disabled:opacity-40"
                >
                  {isDeleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  {t('Delete Permanently')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
