const loadImage = (file: File): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
};

const canvasCompress = (
  img: HTMLImageElement,
  maxWidth: number,
  maxHeight: number,
  quality: number
): Promise<Blob | null> => {
  return new Promise((resolve) => {
    let { width, height } = img;

    if (width > maxWidth || height > maxHeight) {
      const ratio = Math.min(maxWidth / width, maxHeight / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      resolve(null);
      return;
    }
    
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    canvas.toBlob(
      (blob) => resolve(blob),
      'image/jpeg',
      quality
    );
  });
};

const iterativeCompress = async (
  img: HTMLImageElement,
  targetBytes: number,
  startQuality: number,
  minQuality: number,
  maxDim: number
): Promise<Blob | null> => {
  let quality = startQuality;
  const currentMaxW = maxDim;
  const currentMaxH = maxDim;
  let blob: Blob | null = null;

  while (quality >= minQuality) {
    blob = await canvasCompress(img, currentMaxW, currentMaxH, quality);
    if (blob && blob.size <= targetBytes) return blob;
    quality -= 0.05;
  }

  const scaleSteps = [0.75, 0.5, 0.35];
  for (const scale of scaleSteps) {
    const scaledW = Math.round(maxDim * scale);
    const scaledH = Math.round(maxDim * scale);
    blob = await canvasCompress(img, scaledW, scaledH, minQuality);
    if (blob && blob.size <= targetBytes) return blob;
  }

  return blob;
};

export const compressForProofs = async (file: File): Promise<File> => {
  const TARGET = 2 * 1024 * 1024; // 2MB

  if (file.size <= TARGET) return file;
  if (!file.type.startsWith('image/')) return file;

  try {
    const img = await loadImage(file);
    const blob = await iterativeCompress(img, TARGET, 0.92, 0.5, 3000);

    if (!blob) return file;

    const compressedFile = new File(
      [blob],
      file.name.replace(/\.(png|bmp|webp)$/i, '.jpg'),
      { type: 'image/jpeg', lastModified: Date.now() }
    );

    console.log(
      `[Compress/Proofs] ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`
    );

    return compressedFile;
  } catch (err) {
    console.warn('[Compress/Proofs] Compression failed, using original:', err);
    return file;
  }
};

export const compressForReceipts = async (file: File): Promise<File> => {
  const TARGET = 200 * 1024; // 200KB

  if (file.size <= TARGET) return file;
  if (!file.type.startsWith('image/')) return file;

  try {
    const img = await loadImage(file);
    const blob = await iterativeCompress(img, TARGET, 0.7, 0.3, 1600);

    if (!blob) return file;

    const compressedFile = new File(
      [blob],
      file.name.replace(/\.(png|bmp|webp)$/i, '.jpg'),
      { type: 'image/jpeg', lastModified: Date.now() }
    );

    console.log(
      `[Compress/Receipts] ${(file.size / 1024).toFixed(0)}KB → ${(compressedFile.size / 1024).toFixed(0)}KB`
    );

    return compressedFile;
  } catch (err) {
    console.warn('[Compress/Receipts] Compression failed, using original:', err);
    return file;
  }
};

export const compressForAvatar = async (file: File): Promise<File> => {
  const TARGET = 100 * 1024; // 100KB

  if (file.size <= TARGET) return file;
  if (!file.type.startsWith('image/')) return file;

  try {
    const img = await loadImage(file);
    const blob = await iterativeCompress(img, TARGET, 0.85, 0.4, 512);

    if (!blob) return file;

    const compressedFile = new File(
      [blob],
      file.name.replace(/\.(png|bmp|webp)$/i, '.jpg'),
      { type: 'image/jpeg', lastModified: Date.now() }
    );

    console.log(
      `[Compress/Avatar] ${(file.size / 1024).toFixed(0)}KB → ${(compressedFile.size / 1024).toFixed(0)}KB`
    );

    return compressedFile;
  } catch (err) {
    console.warn('[Compress/Avatar] Compression failed, using original:', err);
    return file;
  }
};
