import { Capacitor } from '@capacitor/core';
import { triggerInstantNotification } from './notificationService';

const formatDateFilename = (filename: string): string => {
  const dateStr = new Date().toISOString().split('T')[0];
  const ext = filename.split('.').pop() || 'pdf';
  let baseName = filename.substring(0, filename.lastIndexOf('.')) || filename;
  
  baseName = baseName.replace(/[^a-zA-Z0-9._-]/g, '_');
  
  const datePattern = /\d{4}-\d{2}-\d{2}/;
  if (!datePattern.test(baseName)) {
    return `${baseName}_${dateStr}.${ext}`;
  }
  return `${baseName}.${ext}`;
};

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      } else {
        reject(new Error('FileReader result is not a string'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const downloadWeb = async (url: string, filename: string): Promise<void> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 1500);
};

const downloadAndroid = async (url: string, filename: string): Promise<string> => {
  const { Filesystem, Directory } = await import('@capacitor/filesystem');

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
  const blob = await response.blob();
  const base64Data = await blobToBase64(blob);

  const formattedName = formatDateFilename(filename);

  await Filesystem.writeFile({
    path: formattedName,
    data: base64Data,
    directory: Directory.Cache,
    recursive: true,
  });

  const uriResult = await Filesystem.getUri({
    path: formattedName,
    directory: Directory.Cache,
  });

  try {
    const { FileOpener } = await import('@capawesome-team/capacitor-file-opener');
    await FileOpener.openFile({ path: uriResult.uri });
  } catch (e) {
    console.warn('FileOpener error', e);
  }

  await triggerInstantNotification(
    'Download Complete',
    `Saved ${formattedName} to temporary cache. Tap to open.`,
    uriResult.uri,
    true
  );

  return formattedName;
};

export interface DownloadResponse {
  success: boolean;
  message: string;
}

export const downloadBase64File = async (base64Data: string, filename: string, mimeType?: string): Promise<DownloadResponse> => {
  try {
    const formattedName = formatDateFilename(filename);
    
    let pureBase64 = base64Data;
    if (base64Data.includes('base64,')) {
      pureBase64 = base64Data.split('base64,')[1];
    }
    
    if (Capacitor.isNativePlatform()) {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');

      await Filesystem.writeFile({
        path: formattedName,
        data: pureBase64,
        directory: Directory.Cache,
        recursive: true,
      });

      const uriResult = await Filesystem.getUri({
        path: formattedName,
        directory: Directory.Cache,
      });

      try {
        const { FileOpener } = await import('@capawesome-team/capacitor-file-opener');
        await FileOpener.openFile({ path: uriResult.uri });
      } catch (e) {
        console.warn('FileOpener error', e);
      }

      await triggerInstantNotification(
        'Download Complete',
        `Saved ${formattedName} to temporary cache. Tap to open.`,
        uriResult.uri,
        true
      );

      return { success: true, message: `Saved to Cache: ${formattedName}` };
    } else {
      // Web browser: Convert base64 to Blob & Blob Object URL to guarantee browser download success without freezing UI
      const byteCharacters = atob(pureBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType || 'application/octet-stream' });
      const blobUrl = URL.createObjectURL(blob);

      setTimeout(() => {
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = formattedName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
      }, 50);

      return { success: true, message: `Download started: ${formattedName}` };
    }
  } catch (err: any) {
    console.error('[Download] Base64 Error:', err);
    return { success: false, message: `Download failed: ${err.message}` };
  }
};

export const shareBase64File = async (base64Data: string, filename: string): Promise<DownloadResponse> => {
  try {
    const formattedName = formatDateFilename(filename);
    
    if (Capacitor.isNativePlatform()) {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      const { Share } = await import('@capacitor/share');
      
      let pureBase64 = base64Data;
      if (pureBase64.includes('base64,')) {
        pureBase64 = pureBase64.split('base64,')[1];
      }

      await Filesystem.writeFile({
        path: formattedName,
        data: pureBase64,
        directory: Directory.Cache,
        recursive: true,
      });

      const uriResult = await Filesystem.getUri({
        path: formattedName,
        directory: Directory.Cache,
      });

      await Share.share({
        title: formattedName,
        text: `Here is the statement: ${formattedName}`,
        url: uriResult.uri,
        dialogTitle: `Share ${formattedName}`,
      });

      return { success: true, message: `Sharing started for ${formattedName}` };
    } else {
      let pureBase64 = base64Data;
      if (pureBase64.includes('base64,')) {
        pureBase64 = pureBase64.split('base64,')[1];
      }
      
      const byteCharacters = atob(pureBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const file = new File([blob], formattedName, { type: 'application/pdf' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: formattedName,
          text: `Here is the statement: ${formattedName}`,
        });
        return { success: true, message: 'Web share completed' };
      } else {
        return downloadBase64File(base64Data, formattedName);
      }
    }
  } catch (err: any) {
    console.error('[Share] Base64 Error:', err);
    return { success: false, message: `Share failed: ${err.message}` };
  }
};

export const getExtFromUrl = (url: string): string => {
  try {
    const pathname = new URL(url).pathname;
    const ext = pathname.split('.').pop()?.toLowerCase();
    return ext && ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'pdf'].includes(ext) ? ext : 'jpg';
  } catch {
    return 'jpg';
  }
};

export const downloadFile = async (url: string, filename: string): Promise<DownloadResponse> => {
  try {
    if (Capacitor.isNativePlatform()) {
      const savedName = await downloadAndroid(url, filename);
      return {
        success: true,
        message: `Saved to temporary cache: ${savedName}`,
      };
    } else {
      const formattedName = formatDateFilename(filename);
      await downloadWeb(url, formattedName);
      return {
        success: true,
        message: `Download started: ${formattedName}`,
      };
    }
  } catch (err: any) {
    console.error('[Download] Error:', err);
    return {
      success: false,
      message: `Download failed: ${err.message}`,
    };
  }
};
