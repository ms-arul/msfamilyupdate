import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download } from 'lucide-react';

interface QRCodeDisplayProps {
  isOpen: boolean;
  onClose: () => void;
  value: string; // URL or family code
  title?: string;
  subtitle?: string;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  isOpen,
  onClose,
  value,
  title = 'Scan to Join',
  subtitle,
}) => {
  const handleDownload = () => {
    const svg = document.querySelector('#family-qr-code svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 512, 512);
      ctx.drawImage(img, 0, 0, 512, 512);
      const link = document.createElement('a');
      link.download = 'family-qr-code.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-6"
          >
            <div className="bg-white dark:bg-[#111118] rounded-[28px] p-6 w-full max-w-[340px] shadow-2xl border border-slate-200/60 dark:border-white/[0.08] text-center">
              {/* Close button */}
              <div className="flex justify-end mb-2">
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">{title}</h3>
              {subtitle && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">{subtitle}</p>
              )}

              {/* QR Code */}
              <div
                id="family-qr-code"
                className="bg-white p-5 rounded-2xl inline-block shadow-inner mx-auto border border-slate-100"
              >
                <QRCodeSVG
                  value={value}
                  size={200}
                  level="H"
                  includeMargin={false}
                  bgColor="#ffffff"
                  fgColor="#1e1b4b"
                />
              </div>

              {/* Display code text below if it represents a short code (family code) */}
              {value && (value.startsWith('MSF-') || value.length < 20) && (
                <div className="mt-3.5 font-mono font-black tracking-[0.15em] text-primary-500 text-lg bg-primary-500/5 py-2 px-3 rounded-xl border border-primary-500/10 inline-block">
                  {value}
                </div>
              )}

              <p className="text-xs text-slate-400 mt-4 mb-4">
                Point your camera at this code to join the family
              </p>

              {/* Download button */}
              <button
                onClick={handleDownload}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-500/10 text-primary-500 text-sm font-bold border border-primary-500/20 hover:bg-primary-500/15 transition-all active:scale-95"
              >
                <Download size={16} />
                Save QR Code
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default QRCodeDisplay;
