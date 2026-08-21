import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatDate(date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date))
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(amount)
}

/* Returns current datetime as M/d/yyyy HH:mm:ss (24-hour, no leading zero on month/day) */
export function nowDateTime() {
  const now = new Date();
  const M  = now.getMonth() + 1;
  const d  = now.getDate();
  const yyyy = now.getFullYear();
  const HH = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `${M}/${d}/${yyyy} ${HH}:${mm}:${ss}`;
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

