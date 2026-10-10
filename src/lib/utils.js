import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { supabase as defaultSupabase } from './supabase'
import { createClient } from '@supabase/supabase-js'

// Fallback secondary client for shared Supabase storage (lift-bills / image bucket)
const fallbackSupabase = createClient(
  'https://jcgmyvxcamstnhuwmemc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjZ215dnhjYW1zdG5odXdtZW1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwMDgyODAsImV4cCI6MjA4NTU4NDI4MH0.wMKYEcXGOgrRwy7DKBlBz-a_mWhAuZaknG_iXYvKLLo'
);

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

// Firm → Google Payment Form mapping
export const FIRM_FORM_LINKS = {
  "purab": "https://docs.google.com/forms/d/e/1FAIpQLSdLWKfGPNXK62Orndb137GPKadFiRQZS8W_MM0c11HvdR4KkA/viewform",
  "rkl": "https://docs.google.com/forms/d/e/1FAIpQLScJJFvh6zchRosSzX0mU-u7-oeMaQW6iv1osE70hRDoE-uVrg/viewform",
  "refrasynth": "https://docs.google.com/forms/d/e/1FAIpQLSdHF5shP_liUbm1tsyOS3nrEmNUY9Y5zl4y2odXK0weaDjcpA/viewform",
  "pmmpl": "https://docs.google.com/forms/d/e/1FAIpQLScn8tHEUldlOM_8DKpHUfHHiRImDVjkpkhhfduaZUIxpxlJrA/viewform",
  "refratech": "https://docs.google.com/forms/d/e/1FAIpQLScTunRezHE3TKtNpXjISVWjnywDwUcT6F62DYtkLlgXL6MMaQ/viewform",
};

export function getServicePaymentFormUrl(service) {
  const baseUrl = FIRM_FORM_LINKS[String(service?.firmName || '').trim().toLowerCase()];
  if (!baseUrl) return '';
  const netAmount = Math.round((Number(service.amount) || 0) - (Number(service.tdsAmount) || 0));
  const params = new URLSearchParams({
    usp: 'pp_url',
    'entry.1200639812': service.id || '',
    'entry.604194301': 'New Service Application',
    'entry.1358288895': 'Yes',
    'entry.1091308719': service.vendor || '',
    'entry.1486176123': String(netAmount),
    'entry.2102057582': 'Service Payment',
  });
  return `${baseUrl}?${params.toString()}`;
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

  // Supabase storage URLs - return directly as is
  if (url.includes('supabase.co')) {
    return url;
  }

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

/**
 * Upload file to Supabase Storage
 * Prioritizes 'images' bucket, then 'image' bucket on project, then shared bucket.
 */
export async function uploadFileToStorage(file, folder = 'lift-bills') {
  if (!file) throw new Error('No file provided for upload');

  const timestamp = Date.now();
  const fileExt = (file.name && file.name.includes('.'))
    ? file.name.split('.').pop()
    : (file.type && file.type.includes('/') ? file.type.split('/')[1] : 'pdf');
  const randomSuffix = Math.random().toString(36).substring(7);
  const fileName = `${timestamp}_${randomSuffix}.${fileExt}`;
  const filePath = folder ? `${folder}/${fileName}` : fileName;

  const fileBuffer = await file.arrayBuffer();
  const contentType = file.type || 'application/octet-stream';

  // Candidate targets in priority order:
  // 1. App's Supabase (vivzinohfkyqwxwzpuuy) -> bucket 'images'
  // 2. App's Supabase -> bucket 'image'
  // 3. Shared Supabase (jcgmyvxcamstnhuwmemc) -> bucket 'images'
  // 4. Shared Supabase -> bucket 'image' (currently active & tested)
  const candidates = [
    { client: defaultSupabase, bucket: 'images', name: 'app:images' },
    { client: defaultSupabase, bucket: 'image',  name: 'app:image' },
    { client: fallbackSupabase, bucket: 'images', name: 'shared:images' },
    { client: fallbackSupabase, bucket: 'image',  name: 'shared:image' },
  ];

  let lastError = null;
  for (const candidate of candidates) {
    if (!candidate.client) continue;
    try {
      const { data, error } = await candidate.client.storage
        .from(candidate.bucket)
        .upload(filePath, fileBuffer, {
          contentType,
          cacheControl: '3600',
          upsert: false
        });

      if (!error && data) {
        const { data: { publicUrl } } = candidate.client.storage
          .from(candidate.bucket)
          .getPublicUrl(filePath);

        return { url: publicUrl, path: filePath };
      }

      lastError = error;
    } catch (err) {
      lastError = err;
    }
  }

  // Fallback: If Supabase fails, try legacy Apps Script Google Drive upload
  try {
    const legacyUrl = await uploadLegacyDrive(file);
    return { url: legacyUrl, path: '' };
  } catch (driveErr) {
    throw new Error(`Upload failed: ${lastError?.message || driveErr.message}`);
  }
}

/**
 * Backwards-compatible uploadFileToDrive that returns public URL string
 */
export async function uploadFileToDrive(file, folder = 'lift-bills') {
  const result = await uploadFileToStorage(file, folder);
  return result.url;
}

// ⚡ Legacy fallback helper: Base64 Apps Script upload
async function uploadLegacyDrive(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = reader.result.split(',')[1];
        const params = new URLSearchParams();
        params.append('action', 'uploadFile');
        params.append('fileName', file.name || 'file');
        params.append('mimeType', file.type || 'application/octet-stream');
        params.append('base64Data', base64Data);

        const apiUrl = import.meta.env.VITE_APPSCRIPT_URL;
        if (!apiUrl) throw new Error('No Apps Script URL configured');

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);

        const response = await fetch(apiUrl, {
          method: 'POST',
          body: params,
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          signal: controller.signal,
        });
        clearTimeout(timeout);

        const result = await response.json();
        if (result.success) {
          resolve(getDriveViewUrl(result.fileUrl));
        } else {
          reject(new Error(result.error || result.message || 'Legacy upload failed'));
        }
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

