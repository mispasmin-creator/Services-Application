import { formatDate } from './utils';

const STORAGE_KEY = 'tat_stage_days';

export const DEFAULT_STAGE_DAYS = {
  offers: 0,
  services: 0,
  bills: 0,
  tally: 0,
  utility: 0,
};

// Retrieve configured days from localStorage
export function getTATStageDays() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STAGE_DAYS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_STAGE_DAYS, ...parsed };
  } catch {
    return { ...DEFAULT_STAGE_DAYS };
  }
}

// Save configured days to localStorage and dispatch event for live re-renders
export function saveTATStageDays(daysMap) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(daysMap));
    window.dispatchEvent(new Event('tat-days-updated'));
  } catch (err) {
    console.error('Failed to save TAT days:', err);
  }
}

// Convert string or timestamp to ms safely
export function parseMs(val) {
  if (!val) return null;
  if (typeof val === 'number') return val;
  const t = Date.parse(val);
  return Number.isNaN(t) ? null : t;
}

// Get the starting reference date for each stage
export function getStageBaseDate(stageId, item) {
  if (!item) return null;
  switch (stageId) {
    case 'offers':
      // Offer creation date
      return item.timestamp || item.created_at || item.date || null;
    case 'services':
      // Service creation date
      return item.timestamp || item.created_at || item.date || null;
    case 'bills':
      // Payment date (actual2), fallback to service creation
      return item.actual2 || item.actual_2 || item.timestamp || item.created_at || null;
    case 'tally':
      // Bill upload date (actual1), fallback to service creation
      return item.actual1 || item.actual_1 || item.timestamp || item.created_at || null;
    case 'utility':
      // Utility creation, bill date, or due date
      return item.timestamp || item.billDate || item.bill_date || item.dueDate || item.due_date || item.created_at || null;
    default:
      return item.timestamp || item.created_at || null;
  }
}

// Compute dynamic planned date: Base Date + configured TAT days
export function computePlannedDate(stageId, item, daysOverride = null) {
  const baseDate = getStageBaseDate(stageId, item);
  if (!baseDate) return '';
  const baseMs = parseMs(baseDate);
  if (!baseMs) return formatDate(baseDate);

  const daysMap = getTATStageDays();
  const days = daysOverride !== null ? Number(daysOverride) || 0 : (Number(daysMap[stageId]) || 0);

  const targetMs = baseMs + (days * 86400000);
  return formatDate(new Date(targetMs));
}
