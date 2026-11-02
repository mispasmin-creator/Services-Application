import { formatDate } from './utils';
import { supabase } from './supabase';

export const DEFAULT_STAGE_DAYS = {
  offers: 0,
  services: 0,
  bills: 0,
  tally: 0,
  utility: 0,
};

// Which planned column holds the date of each page, for entries that carry a TAT snapshot
const PLANNED_FIELD = {
  offers: ['planned1', 'planned_1'],
  services: ['planned2', 'planned_2'],
  bills: ['planned1', 'planned_1'],
  tally: ['planned5', 'planned_5'],
  utility: ['planned2', 'planned_2'],
};

// Read the days currently set on the TAT Management page from stage_settings
export async function fetchTATStageDays() {
  const { data, error } = await supabase.from('stage_settings').select('entity, stage, workdays');
  if (error) throw new Error(error.message);
  const find = (entity, stage) =>
    Number(data.find((r) => r.entity === entity && r.stage === stage)?.workdays) || 0;
  return {
    offers: find('offer', 1),
    services: find('service', 2),
    bills: find('service', 1),
    tally: find('service', 5),
    utility: find('utility', 1),
  };
}

// Save days for one or more stages. Only an Admin login is accepted by the database.
export async function saveTATStageDays(username, password, days) {
  const { error } = await supabase.rpc('set_tat_days', {
    p_username: username,
    p_password: password,
    p_days: days,
  });
  if (error) throw new Error(error.message);
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

// New entries (tat_days saved on the row) use the date stored in Supabase.
// Old entries stay fixed at their base date, whatever the days are set to now.
export function getStagePlannedDate(stageId, item) {
  if (!item) return null;
  if (item.tatDays || item.tat_days) {
    const [camel, snake] = PLANNED_FIELD[stageId] || [];
    const stored = item[camel] || item[snake];
    if (stored) return stored;
  }
  return getStageBaseDate(stageId, item);
}

export function computePlannedDate(stageId, item) {
  const planned = getStagePlannedDate(stageId, item);
  return planned ? formatDate(planned) : '';
}
