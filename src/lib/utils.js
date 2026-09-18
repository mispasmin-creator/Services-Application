import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatDate(val) {
  if (!val) return '';
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed || trimmed === '—' || trimmed === '-' || trimmed === '#REF!' || trimmed === '#N/A' || trimmed === 'null' || trimmed === 'undefined') return '';

    // If already in MM/DD/YYYY HH:mm:ss or M/D/YYYY HH:mm:ss
    const slashParts = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
    if (slashParts) {
      const MM = slashParts[1].padStart(2, '0');
      const dd = slashParts[2].padStart(2, '0');
      const yyyy = slashParts[3];
      const HH = (slashParts[4] || '00').padStart(2, '0');
      const mm = (slashParts[5] || '00').padStart(2, '0');
      const ss = (slashParts[6] || '00').padStart(2, '0');
      return `${MM}/${dd}/${yyyy} ${HH}:${mm}:${ss}`;
    }

    // If pure date string like YYYY-MM-DD
    const ymdParts = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (ymdParts) {
      const yyyy = ymdParts[1];
      const MM = ymdParts[2];
      const dd = ymdParts[3];
      return `${MM}/${dd}/${yyyy} 00:00:00`;
    }

    // Try parsing as Date (e.g. ISO strings like 2026-06-30T09:49:10.634Z)
    const parsedTime = Date.parse(trimmed);
    if (!isNaN(parsedTime)) {
      const dt = new Date(parsedTime);
      const MM = String(dt.getMonth() + 1).padStart(2, '0');
      const dd = String(dt.getDate()).padStart(2, '0');
      const yyyy = dt.getFullYear();
      const HH = String(dt.getHours()).padStart(2, '0');
      const mm = String(dt.getMinutes()).padStart(2, '0');
      const ss = String(dt.getSeconds()).padStart(2, '0');
      return `${MM}/${dd}/${yyyy} ${HH}:${mm}:${ss}`;
    }

    return trimmed;
  }

  if (val instanceof Date && !isNaN(val.getTime())) {
    const MM = String(val.getMonth() + 1).padStart(2, '0');
    const dd = String(val.getDate()).padStart(2, '0');
    const yyyy = val.getFullYear();
    const HH = String(val.getHours()).padStart(2, '0');
    const mm = String(val.getMinutes()).padStart(2, '0');
    const ss = String(val.getSeconds()).padStart(2, '0');
    return `${MM}/${dd}/${yyyy} ${HH}:${mm}:${ss}`;
  }

  return String(val);
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(amount)
}

/* Returns current datetime as MM/dd/yyyy HH:mm:ss (24-hour) */
export function nowDateTime() {
  const now = new Date();
  const MM = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const yyyy = now.getFullYear();
  const HH = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `${MM}/${dd}/${yyyy} ${HH}:${mm}:${ss}`;
}

/* Converts a <input type="date"> value ('yyyy-MM-dd') into M/d/yyyy so every
   date submitted to the sheet matches nowDateTime()'s date format. */
export function formatDateForSubmit(isoDate) {
  if (!isoDate || typeof isoDate !== 'string') return isoDate;
  const [y, m, d] = isoDate.split('-');
  if (!y || !m || !d) return isoDate;
  return `${parseInt(m, 10)}/${parseInt(d, 10)}/${y}`;
}

export function getDriveViewUrl(url) {
  if (!url || typeof url !== 'string') return url;

  // If it's a deprecated script.googleusercontent.com URL, it's broken — return empty
  if (url.includes('script.googleusercontent.com') || url.includes('macros/echo')) {
    console.error('Broken deprecated Google Apps Script URL detected:', url);
    return '';
  }

  // If it's already in /file/d/ID/view format
  const fileDMatch = url.match(/\/file\/d\/([^\/\?#]+)/);
  if (fileDMatch && fileDMatch[1]) {
    return `https://drive.google.com/file/d/${fileDMatch[1]}/view`;
  }

  // If it's uc?export=view&id=ID or uc?id=ID or open?id=ID
  const idMatch = url.match(/[?&]id=([^&]+)/);
  if (idMatch && idMatch[1]) {
    return `https://drive.google.com/file/d/${idMatch[1]}/view`;
  }

  return url;
}

export async function uploadFileToDrive(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        // ⚡ Skip canvas compression for PDFs, just upload directly
        const shouldCompress = file.type && file.type.startsWith('image/') && file.type !== 'image/svg+xml';

        if (shouldCompress && file.size > 2 * 1024 * 1024) {
          // Compress large images to reduce upload time
          compressImage(file, (compressedBase64) => {
            sendUpload(compressedBase64, file.name, file.type, resolve, reject);
          }, reject);
        } else {
          const base64Data = reader.result.split(',')[1];
          sendUpload(base64Data, file.name, file.type, resolve, reject);
        }
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// ⚡ Helper: Compress image before upload
function compressImage(file, onSuccess, onError) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxWidth = 1920;
      const maxHeight = 1080;
      let { width, height } = img;

      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      const compressedBase64 = canvas.toDataURL('image/jpeg', 0.75).split(',')[1];
      onSuccess(compressedBase64);
    };
    img.onerror = () => onError(new Error('Image compression failed'));
    img.src = e.target.result;
  };
  reader.onerror = () => onError(reader.error);
  reader.readAsDataURL(file);
}

// ⚡ Helper: Send upload to server
async function sendUpload(base64Data, fileName, mimeType, resolve, reject) {
  try {
    const params = new URLSearchParams();
    params.append('action', 'uploadFile');
    params.append('fileName', fileName);
    params.append('mimeType', mimeType || 'application/octet-stream');
    params.append('base64Data', base64Data);

    const apiUrl = import.meta.env.VITE_APPSCRIPT_URL || 'https://script.google.com/macros/s/AKfycbxH_TMsqQkK3XpPUR4-999K7Q0R-P0WNd0rc1vL9b_KYMFB2xMN6VDP6vXqaNw4Kk3b/exec';

    // ⚡ Add upload timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const response = await fetch(apiUrl, {
      method: 'POST',
      body: params,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const result = await response.json();
    if (result.success) {
      resolve(getDriveViewUrl(result.fileUrl));
    } else {
      reject(new Error(result.error || result.message || 'Upload failed'));
    }
  } catch (error) {
    reject(error);
  }
}

