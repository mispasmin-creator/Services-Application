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

        const apiUrl = import.meta.env.VITE_APPSCRIPT_URL;
        const response = await fetch(apiUrl, {
          method: 'POST',
          body: params,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        });

        const result = await response.json();
        if (result.success) {
          resolve(result.fileUrl);
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

