import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { App as CapacitorApp } from '@capacitor/app';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, ShieldCheck, X } from 'lucide-react';

interface ShareData {
  text?: string;
  imageUri?: string;
}

const ShareActionSheet: React.FC = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [shareData, setShareData] = useState<ShareData | null>(null);

  useEffect(() => {
    // Listen for Deep Links and Share Targets
    const listener = CapacitorApp.addListener('appUrlOpen', (event) => {
      // url example: msfamily://share?type=text&content=hello
      // or msfamily://addtransaction
      const url = event.url;
      if (!url.startsWith('msfamily://')) return;

      try {
        const urlObj = new URL(url);
        const host = urlObj.host; // "share", "addtransaction", "myproofs"

        if (host === 'share') {
          const type = urlObj.searchParams.get('type');
          const content = urlObj.searchParams.get('content');
          const uri = urlObj.searchParams.get('uri');

          if (type === 'text' && content) {
            setShareData({ text: content });
            setIsOpen(true);
          } else if (type === 'image' && uri) {
            setShareData({ imageUri: uri });
            setIsOpen(true);
          }
        } else if (host === 'addtransaction' || host === 'add') {
          navigate('/add');
        } else if (host === 'myproofs' || host === 'proofs') {
          navigate('/proofs');
        }
      } catch (err) {
        console.warn('Failed to parse appUrlOpen URL:', err);
      }
    });

    return () => {
      listener.then(l => l.remove()).catch(() => {});
    };
  }, [navigate]);

  const handleAction = (path: string) => {
    setIsOpen(false);
    navigate(path, { state: { sharedData: shareData } });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100000] flex items-end justify-center sm:items-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />

          {/* Bottom Sheet Modal */}
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-sm bg-white rounded-3xl sm:rounded-3xl p-6 shadow-2xl glass-panel-static border border-slate-200"
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-800">What do you want to do?</h2>
                <p className="text-sm text-slate-500 mt-1">Select where to save the shared {shareData?.text ? 'text content' : 'image file'}.</p>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 -mr-2 -mt-2 text-slate-400 hover:bg-slate-100 rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => handleAction('/add')}
                className="flex items-center gap-4 bg-primary-50 hover:bg-primary-100 border border-primary-100 p-4 rounded-2xl transition-all active:scale-95 group"
              >
                <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm text-primary-500 group-hover:scale-110 transition-transform">
                  <FileText size={24} />
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-slate-800">Add Record</h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">Save as a transaction note</p>
                </div>
              </button>

              <button
                onClick={() => handleAction('/proofs')}
                className="flex items-center gap-4 bg-amber-50 hover:bg-amber-100 border border-amber-100 p-4 rounded-2xl transition-all active:scale-95 group"
              >
                <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm text-amber-500 group-hover:scale-110 transition-transform">
                  <ShieldCheck size={24} />
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-slate-800">Add Proof</h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">Save to your secure locker</p>
                </div>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ShareActionSheet;
