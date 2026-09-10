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
        const base64Data = reader.result.split(',')[1];
        const params = new URLSearchParams();
        params.append('action', 'uploadFile');
        params.append('fileName', file.name);
        params.append('mimeType', file.type || 'application/octet-stream');
        params.append('base64Data', base64Data);

        const apiUrl = import.meta.env.VITE_APPSCRIPT_URL || 'https://script.google.com/macros/s/AKfycbxH_TMsqQkK3XpPUR4-999K7Q0R-P0WNd0rc1vL9b_KYMFB2xMN6VDP6vXqaNw4Kk3b/exec';
        const response = await fetch(apiUrl, {
          method: 'POST',
          body: params,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        });

        const result = await response.json();
        if (result.success) {
          resolve(getDriveViewUrl(result.fileUrl));
        } else {
          reject(new Error(result.error || result.message || 'Upload failed'));
        }
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

