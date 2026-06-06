import React, { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';

interface CachedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  url: string;
}

export const CachedImage: React.FC<CachedImageProps> = ({ url, alt, className, ...props }) => {
  const [src, setSrc] = useState<string>('');

  useEffect(() => {
    if (!url) return;

    if (!Capacitor.isNativePlatform()) {
      setSrc(url);
      return;
    }

    let isMounted = true;

    const loadCachedImage = async () => {
      try {
        // Clean URL to make a unique safe filename
        const urlObj = new URL(url);
        const safeName = urlObj.pathname.replace(/[^a-zA-Z0-9.-]/g, '_');
        const cachePath = `img_cache_${safeName}`;

        try {
          // Check if file exists in cache directory
          const uriResult = await Filesystem.getUri({
            path: cachePath,
            directory: Directory.Cache
          });

          // Verify file exists by reading its metadata (throws if not found)
          await Filesystem.stat({
            path: cachePath,
            directory: Directory.Cache
          });

          if (isMounted) {
            setSrc(Capacitor.convertFileSrc(uriResult.uri));
          }
        } catch (fileNotFoundErr) {
          // File does not exist, fetch from remote
          const response = await fetch(url);
          if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
          const blob = await response.blob();

          // Convert blob to base64
          const base64Data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              if (typeof reader.result === 'string') {
                resolve(reader.result.split(',')[1]);
              } else {
                reject(new Error('FileReader result is not a string'));
              }
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });

          // Write file to local cache
          await Filesystem.writeFile({
            path: cachePath,
            data: base64Data,
            directory: Directory.Cache,
            recursive: true
          });

          const uriResult = await Filesystem.getUri({
            path: cachePath,
            directory: Directory.Cache
          });

          if (isMounted) {
            setSrc(Capacitor.convertFileSrc(uriResult.uri));
          }
        }
      } catch (err) {
        console.warn('[CacheImage] Failed to cache/load image:', err);
        // Fallback to direct remote URL
        if (isMounted) {
          setSrc(url);
        }
      }
    };

    loadCachedImage();

    return () => {
      isMounted = false;
    };
  }, [url]);

  if (!src) {
    // Show a premium loading pulse skeleton
    return (
      <div 
        className={`animate-pulse bg-slate-100/50 dark:bg-slate-800/50 backdrop-blur-md rounded-[14px] ${className}`} 
        style={{ width: '100%', height: '100%', minHeight: '100px' }} 
      />
    );
  }

  return <img src={src} alt={alt} className={className} {...props} />;
};
