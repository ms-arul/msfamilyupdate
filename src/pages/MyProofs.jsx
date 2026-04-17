import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
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
  Search
} from 'lucide-react';

const proofCategories = [
  { id: 'all', label: 'All Documents', icon: FileBadge },
  { id: 'identity', label: 'Identity', icon: ShieldCheck },
  { id: 'financial', label: 'Financial', icon: CreditCard },
  { id: 'vehicle', label: 'Vehicle', icon: CarFront },
];

export default function MyProofs() {
  const { user } = useAuth();
  const [proofs, setProofs] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Lightbox State
  const [activeProof, setActiveProof] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Details modal state
  const [detailsProof, setDetailsProof] = useState(null);

  // Upload & OCR State
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  // New Proof Form State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const backInputRef = useRef(null);
  const [newProofForm, setNewProofForm] = useState({
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
      if (data) setProofs(data);
    } catch (err) {
      console.error('Error fetching proofs:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProofs();
  }, [fetchProofs]);

  const filteredProofs = proofs.filter(p => {
    const matchesCategory = activeCategory === 'all' || p.category === activeCategory;
    const matchesSearch = p.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.document_number?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const openLightbox = (proof) => {
    setActiveProof(proof);
    setZoomLevel(1);
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = () => {
    setActiveProof(null);
    setZoomLevel(1);
    document.body.style.overflow = 'auto';
  };

  const openDetails = (e, proof) => {
    e.stopPropagation();
    setDetailsProof(proof);
  };

  const closeDetails = () => {
    setDetailsProof(null);
  };

  const copyToClipboard = async (e, text, id) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  // OCR Processing
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file.');
      return;
    }

    setIsUploading(true);
    setUploadProgress('Analyzing documents...');
    setShowUploadModal(true); // Open modal early to show loading

    try {
      // 1. Analyze with Gemini
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error('Missing Gemini API key');

      const base64Image = await fileToBase64(file);
      const requestBody = {
        system_instruction: {
          parts: [{ text: "You are an expert document parser. Analyze the uploaded ID, bill, or proof. Extract the 'title' (e.g., Aadhar Card, PAN, Electricity Bill, DL), the 'documentNumber' (e.g., the ID number or bill number. Format nicely). And categorize it into EXACTLY ONE of these: 'identity', 'financial', or 'vehicle'. Output ONLY valid JSON containing these three keys." }]
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
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) throw new Error('Gemini OCR failed');

      const data = await response.json();
      const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      const extracted = JSON.parse(cleanJson);

      setNewProofForm(prev => ({
        ...prev,
        title: extracted.title || 'Unknown Document',
        documentNumber: extracted.documentNumber || 'N/A',
        category: extracted.category || 'identity',
        localImage: file,
        imageUrl: URL.createObjectURL(file)
      }));
      setUploadProgress('');

    } catch (err) {
      console.error('OCR Error:', err);
      setNewProofForm(prev => ({
        ...prev,
        localImage: file,
        imageUrl: URL.createObjectURL(file)
      }));
      setUploadProgress('');
      alert('AI analysis failed. Please enter details manually.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleBackImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    setNewProofForm(prev => ({
      ...prev,
      backLocalImage: file,
      backImageUrl: URL.createObjectURL(file),
    }));
    if (backInputRef.current) backInputRef.current.value = '';
  };

  // Helper: generate AI summary from a base64 image
  const generateSummaryFromBase64 = async (base64, mimeType) => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) return null;
    try {
      const requestBody = {
        system_instruction: {
          parts: [{ text: "You are a document summarizer. Analyze the uploaded document image. Provide exactly 5 concise key details as a JSON array of strings. Each string should be a single clear fact about the document (e.g., year, course, score, institution, holder name). If less info is available, still provide 5 points. Output ONLY a valid JSON array of exactly 5 strings. No markdown." }]
        },
        contents: [{
          parts: [
            { text: 'Summarize this document into exactly 5 key bullet points as a JSON array: ["point1", "point2", ...]' },
            { inline_data: { mime_type: mimeType || 'image/jpeg', data: base64 } },
          ]
        }],
        generationConfig: { response_mime_type: 'application/json', temperature: 0.1 },
      };
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody) }
      );
      if (!response.ok) return null;
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
      const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(clean);
    } catch { return null; }
  };

  const saveDocument = async () => {
    if (!newProofForm.title || !newProofForm.localImage) return;

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
      let backPublicUrl = null;
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

      // Generate AI summary from the front image during upload
      setUploadProgress('AI is summarizing your document...');
      const frontBase64 = await fileToBase64(newProofForm.localImage);
      const summaryPoints = await generateSummaryFromBase64(frontBase64, newProofForm.localImage.type);
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

      setProofs(prev => [dbData, ...prev]);
      setShowUploadModal(false);
      setNewProofForm({ title: '', documentNumber: '', category: 'identity', imageUrl: '', localImage: null, backImageUrl: '', backLocalImage: null });

    } catch (err) {
      console.error('Upload error:', err);
      alert('Failed to save document: ' + err.message);
    } finally {
      setIsUploading(false);
      setUploadProgress('');
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!activeProof) return;
      if (e.key === 'Escape') closeLightbox();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeProof]);

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
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-64 shrink-0">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search proofs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all shadow-sm"
            />
          </div>
        </div>

        <div className="flex shrink-0">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full md:w-auto flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-semibold shadow-xl shadow-slate-900/20 active:scale-95 transition-all text-sm"
          >
            <UploadCloud size={18} />
            <span>Upload New Proof</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleFileUpload}
          />
        </div>
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
          <h3 className="text-xl font-bold text-slate-800">No Documents Found</h3>
          <p className="text-slate-500 mt-2 text-sm max-w-xs mx-auto">Upload your first proof to secure it in your digital locker.</p>
          <button
            onClick={() => fileInputRef.current?.click()}
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
                className="glass-panel p-1 rounded-2xl cursor-pointer group hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
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
                    <button
                      onClick={(e) => copyToClipboard(e, proof.document_number, proof.id)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-primary-500 transition-colors shrink-0"
                      title="Copy Document Number"
                    >
                      {copiedId === proof.id ? <CheckCircle2 size={16} className="text-success-500" /> : <Copy size={16} />}
                    </button>
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
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Front Side</p>
                        <div className="aspect-[1.58] bg-slate-100 rounded-xl overflow-hidden border border-border relative">
                          {newProofForm.imageUrl ? (
                            <img src={newProofForm.imageUrl} className="w-full h-full object-cover" alt="Front" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs">No image</div>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Back Side</p>
                        <div
                          onClick={() => backInputRef.current?.click()}
                          className="aspect-[1.58] bg-slate-50 rounded-xl overflow-hidden border-2 border-dashed border-slate-200 relative cursor-pointer hover:border-primary-300 hover:bg-primary-50/30 transition-all group"
                        >
                          {newProofForm.backImageUrl ? (
                            <img src={newProofForm.backImageUrl} className="w-full h-full object-cover" alt="Back" />
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
                      <label className="text-xs font-bold text-slate-500 uppercase">Document Title</label>
                      <input
                        type="text"
                        value={newProofForm.title}
                        onChange={e => setNewProofForm({ ...newProofForm, title: e.target.value })}
                        className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 mt-1 focus:outline-none focus:border-primary-500"
                        placeholder="e.g. Aadhar Card"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase">Document ID Number</label>
                      <input
                        type="text"
                        value={newProofForm.documentNumber}
                        onChange={e => setNewProofForm({ ...newProofForm, documentNumber: e.target.value })}
                        className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 mt-1 focus:outline-none focus:border-primary-500 font-mono tracking-wider"
                        placeholder="1234 5678"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase">Category</label>
                      <select
                        value={newProofForm.category}
                        onChange={e => setNewProofForm({ ...newProofForm, category: e.target.value })}
                        className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 mt-1 focus:outline-none focus:border-primary-500"
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
              <div className="sticky md:fixed top-0 left-0 right-0 z-50 flex flex-col md:flex-row md:items-center justify-between px-3 md:px-6 py-2 md:py-4 bg-white/95 backdrop-blur-md border-b border-slate-100 gap-2 md:gap-0" onClick={e => e.stopPropagation()}>
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
                      onClick={() => setZoomLevel(z => Math.max(0.25, z - 0.25))}
                      className="p-2 md:p-2 flex-1 md:flex-none flex justify-center rounded-lg hover:bg-white hover:shadow-sm text-slate-600 transition-all font-medium"
                      title="Zoom Out"
                    >
                      <ZoomOut size={16} />
                    </button>
                    <span className="text-xs font-bold text-slate-600 w-12 text-center">{Math.round(zoomLevel * 100)}%</span>
                    <button
                      onClick={() => setZoomLevel(z => Math.min(3, z + 0.25))}
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

            {/* Image area */}
            <div className="flex-1 flex flex-col items-center p-4 pt-[6.5rem] md:pt-28 pb-20 w-full overflow-auto" onClick={e => e.stopPropagation()}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center w-full transition-all duration-200 ease-out"
                style={{
                  width: `${zoomLevel * 100}%`,
                  maxWidth: zoomLevel <= 1 ? '56rem' : `${56 * zoomLevel}rem`
                }}
              >
                {/* Front image */}
                <div className="w-full rounded-2xl overflow-hidden shadow-xl border border-slate-200 bg-white mb-4">
                  <img
                    src={activeProof.image_url}
                    alt={`${activeProof.title} - Front`}
                    className="w-full object-contain transition-all duration-200"
                    style={{ maxHeight: zoomLevel <= 1 ? '75vh' : 'none' }}
                  />
                </div>

                {/* Back image if exists */}
                {activeProof.back_image_url && (
                  <div className="w-full rounded-2xl overflow-hidden shadow-xl border border-slate-200 bg-white">
                    <img
                      src={activeProof.back_image_url}
                      alt={`${activeProof.title} - Back`}
                      className="w-full object-contain transition-all duration-200"
                      style={{ maxHeight: zoomLevel <= 1 ? '75vh' : 'none' }}
                    />
                  </div>
                )}
              </motion.div>
            </div>

            {/* Bottom bar - download only */}
            <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white/90 backdrop-blur-md border-t border-slate-100 flex justify-center" onClick={e => e.stopPropagation()}>
              <a
                href={activeProof.image_url}
                download={`${activeProof.title}.jpg`}
                className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-xl active:scale-95 text-sm"
              >
                <Download size={16} />
                Download Document
              </a>
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
                <button onClick={closeDetails} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400">
                  <X size={18} />
                </button>
              </div>

              <div className="p-5 space-y-4">
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
                      {JSON.parse(detailsProof.ai_summary).map((point, i) => (
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
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>,
      document.body
    )}
    </div>
  );
}
