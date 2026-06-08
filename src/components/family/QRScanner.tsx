import React, { useEffect, useRef, useState } from 'react';
import { X, CameraOff } from 'lucide-react';
import jsQR from 'jsqr';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { registerPlugin, Capacitor } from '@capacitor/core';

const CameraPermission = registerPlugin<any>('CameraPermission');

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (scannedText: string) => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [error, setError] = useState<string>('');
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied' | 'error'>('prompt');

  // Start Camera
  const startCamera = async () => {
    setError('');
    setPermissionState('prompt');
    try {
      // 1. Request native camera permissions if running as an APK / mobile native
      if (Capacitor.isNativePlatform()) {
        try {
          await CameraPermission.checkPermission();
        } catch (err: any) {
          console.warn('Native camera permission check failed:', err);
          throw new Error('Camera permission is required to scan QR codes. Please grant camera access.');
        }
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by your browser or device');
      }

      // Stop any existing stream
      stopCamera();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Back camera
          width: { ideal: 640 },
          height: { ideal: 640 },
        },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.play();
        setCameraActive(true);
        setPermissionState('granted');
      }
    } catch (err: any) {
      console.error('Failed to open camera:', err);
      setPermissionState('denied');
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Camera permission denied. Please allow camera access in your settings.');
      } else {
        setError(err.message || 'Could not access camera. Please check your camera settings.');
      }
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  // Scan frame-by-frame loop
  const scanFrame = () => {
    if (!videoRef.current || !canvasRef.current || !streamRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    try {
      if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
        const width = video.videoWidth;
        const height = video.videoHeight;
        
        // 1. Calculate center square crop bounds
        const size = Math.min(width, height);
        const sx = (width - size) / 2;
        const sy = (height - size) / 2;

        // 2. Set canvas size to optimized 400x400 resolution
        const scanSize = 400;
        canvas.width = scanSize;
        canvas.height = scanSize;

        // 3. Draw cropped center square and scale it down to canvas
        ctx.drawImage(video, sx, sy, size, size, 0, 0, scanSize, scanSize);

        // 4. Extract image pixels
        const imageData = ctx.getImageData(0, 0, scanSize, scanSize);

        // 5. Decode using jsQR (with bundler fallback import checks)
        const jsqrDecoder = (jsQR as any).default || jsQR;
        const code = jsqrDecoder(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (code && code.data) {
          // Success!
          onScanSuccess(code.data);
          stopCamera();
          onClose();
          return;
        }
      }
    } catch (err) {
      console.error('Error in QR scan frame analysis:', err);
    }

    // Continue loop
    if (streamRef.current) {
      animationFrameRef.current = requestAnimationFrame(scanFrame);
    }
  };

  // Watch for play event to start processing frames
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => {
      animationFrameRef.current = requestAnimationFrame(scanFrame);
    };

    video.addEventListener('play', handlePlay);
    return () => {
      video.removeEventListener('play', handlePlay);
    };
  }, [cameraActive]);

  // Handle opening/closing
  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  // Render using React Portal to append directly to document.body.
  // This completely bypasses container layouts and stacking contexts!
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[99999] flex flex-col justify-between bg-black text-white select-none">
          {/* Top Header with Safe Area support */}
          <div className="flex items-center justify-between px-4 pb-4 pt-[calc(env(safe-area-inset-top,0px)+12px)] z-[100000] bg-gradient-to-b from-black/85 via-black/50 to-transparent flex-shrink-0">
            <h3 className="text-lg font-bold tracking-wide">Scan QR Code</h3>
            <button
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all flex items-center justify-center backdrop-blur-md"
            >
              <X size={20} />
            </button>
          </div>

          {/* Camera View Area */}
          <div className="flex-1 relative flex items-center justify-center overflow-hidden">
            {/* Native Video Element */}
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover"
              playsInline
              muted
            />

            {/* Hidden Canvas for decoding */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Premium Overlay Scanner Viewfinder */}
            {cameraActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
                {/* Visual mask / cutout wrapper */}
                <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
                  {/* Custom viewport box */}
                  <div className="absolute inset-0 border-2 border-white/20 rounded-3xl" />

                  {/* Highlighting corner brackets */}
                  <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-primary-500 rounded-tl-2xl" />
                  <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-primary-500 rounded-tr-2xl" />
                  <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-primary-500 rounded-bl-2xl" />
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-primary-500 rounded-br-2xl" />

                  {/* Pulsing scanning red laser animation */}
                  <motion.div
                    className="absolute left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-primary-500 to-transparent shadow-[0_0_8px_rgba(124,58,237,0.8)]"
                    animate={{
                      y: [-110, 110],
                    }}
                    transition={{
                      duration: 2.2,
                      repeat: Infinity,
                      repeatType: "reverse",
                      ease: "easeInOut",
                    }}
                  />
                </div>

                <p className="text-sm font-semibold tracking-wide text-white/80 mt-6 bg-black/60 px-4 py-2 rounded-full backdrop-blur-md border border-white/10">
                  Align QR Code inside the box
                </p>
              </div>
            )}

            {/* Error or Loading State Overlay */}
            {!cameraActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-[#111118] z-20">
                {error ? (
                  <div className="max-w-xs space-y-4">
                    <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
                      <CameraOff size={28} />
                    </div>
                    <h4 className="font-bold text-lg text-white">Camera Access Error</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">{error}</p>
                    <button
                      onClick={startCamera}
                      className="px-6 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 active:scale-95 text-xs font-bold transition-all shadow-md shadow-primary-500/10"
                    >
                      Try Again
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="animate-spin w-10 h-10 border-4 border-primary-500/20 border-t-primary-500 rounded-full mx-auto" />
                    <p className="text-sm font-semibold text-slate-400">Opening camera preview...</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom Help/Details Info bar with Safe Area support */}
          <div className="bg-gradient-to-t from-black via-black/85 to-transparent px-6 pb-[calc(env(safe-area-inset-bottom,0px)+20px)] pt-6 z-[100000] text-center space-y-2 flex-shrink-0">
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Scanning automatically detects family join links or family codes.
            </p>
          </div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default QRScanner;
