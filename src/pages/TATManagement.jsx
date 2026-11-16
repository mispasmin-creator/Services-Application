import React, { useState, useEffect, useMemo } from 'react';
import {
  Timer,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Check,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import {
  DEFAULT_STAGE_DAYS,
  fetchTATStageDays,
  saveTATStageDays,
  getStageBaseDate,
  getStagePlannedDate,
  parseMs,
} from '../lib/tatUtils';
import { isAdmin } from '../lib/permissions';
import useAuthStore from '../store/useAuthStore';
import useDataStore from '../store/useDataStore';

const DAY = 86400000;
const CACHE_MS = 60000;

const SERVICE_COLUMNS = 'id,created_at,service_no,offer_no,firm_name,vendor_name,total_amount,bill_no,bill_copy_url,planned_1,actual_1,planned_2,actual_2,planned_3,planned_5,actual_5,status_5,tat_days';
const OFFER_COLUMNS = 'id,created_at,offer_no,firm_name,vendor_name,amount,amount_to_be_paid,outstanding_amount,status,planned_1,actual_1,tat_days';
const UTILITY_COLUMNS = 'id,created_at,utility_no,firm_name,person_name,pay_to,status,bill_date,due_date,planned_1,actual_1,planned_2,actual_2,tat_days';

// Reused when the page is opened again shortly, unless something was saved since
let tatDataCache = null;

// Format timestamp as DD/MM/YYYY HH:mm:ss (IST / Local)
const fmtDT = (val) => {
  if (!val) return '—';
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return '—';
  const pad = (n) => String(n).padStart(2, '0');
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  const seconds = pad(d.getSeconds());
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
};

// 5 Main Stages mapped 1-to-1 to Sidebar Pages & their business completion rules
const STAGES_CONFIG = [
  {
    id: 'offers',
    name: 'Offers',
    table: 'offers',
    column: 'offers.planned1',
    getPool: (data) => data.offers,
    // Match Offers.jsx rule: Complete if status is Complete/Converted/Done OR outstanding is 0 with payment
    isCompleted: (o) => {
      if (!o) return false;
      const status = String(o.status || '').trim().toLowerCase();
      if (['complete', 'completed', 'converted'].includes(status)) return true;
      const outstanding = Number(o.outstanding);
      const amountPaid = Number(o.amountPaid);
      if (o.amount > 0 && o.outstanding !== undefined && o.outstanding !== null && outstanding <= 0 && amountPaid > 0) return true;
      return false;
    },
    getPlanned: (r) => r.planned_1 || r.created_at,
    getActual: (r) => r.actual_1 || (['complete', 'completed', 'converted'].includes(String(r.status || '').toLowerCase()) ? r.created_at : null),
    getRef: (r) => r.offer_no || `OFF-${r.id}`,
    getParty: (r) => r.vendor_name || r.firm_name || '—',
  },
  {
    id: 'services',
    name: 'Services',
    table: 'services',
    column: 'services.planned2',
    getPool: (data) => data.services,
    // Match Services.jsx rule: An entry is done from Service page if actual_2 is set OR bill has been processed
    isCompleted: (r) => !!(r.actual_2 || r.bill_no || r.bill_copy_url),
    getPlanned: (r) => r.planned_2 || r.created_at,
    getActual: (r) => r.actual_2 || (r.bill_no || r.bill_copy_url ? r.actual_1 || r.created_at : null),
    getRef: (r) => r.service_no || `SRV-${r.id}`,
    getParty: (r) => r.vendor_name || r.firm_name || '—',
  },
  {
    id: 'bills',
    name: 'Bills',
    table: 'services',
    column: 'services.planned1',
    getPool: (data) => data.services,
    // Match Bills.jsx rule: Done if actual_1 is set
    isCompleted: (r) => !!r.actual_1,
    getPlanned: (r) => r.planned_1 || r.created_at,
    getActual: (r) => r.actual_1,
    getRef: (r) => r.service_no || `SRV-${r.id}`,
    getParty: (r) => r.vendor_name || r.firm_name || '—',
  },
  {
    id: 'tally',
    name: 'Tally',
    table: 'services',
    column: 'services.planned5',
    // Match Tally.jsx rule: Tally pool consists of services where bill has been uploaded
    getPool: (data) => data.services.filter((s) => !!s.actual_1),
    // Completed if actual_5 is set OR status_5 is Completed
    isCompleted: (r) => !!(r.actual_5 || r.status_5 === 'Completed'),
    getPlanned: (r) => r.planned_5 || r.planned_3 || r.actual_1 || r.created_at,
    getActual: (r) => r.actual_5 || (r.status_5 === 'Completed' ? r.actual_1 || r.created_at : null),
    getRef: (r) => r.service_no || `SRV-${r.id}`,
    getParty: (r) => r.vendor_name || r.firm_name || '—',
  },
  {
    id: 'utility',
    name: 'Utility',
    table: 'utilities',
    column: 'utilities.planned2',
    getPool: (data) => data.utilities,
    // Match Utility.jsx rule: Completed if actual_2 is set OR status is Completed
    isCompleted: (r) => !!(r.actual_2 || r.status === 'Completed'),
    getPlanned: (r) => r.planned_2 || r.planned_1 || r.due_date || r.created_at,
    getActual: (r) => r.actual_2 || (r.status === 'Completed' ? r.actual_1 || r.created_at : null),
    getRef: (r) => r.utility_no || `UT-${r.id}`,
    getParty: (r) => r.person_name || r.pay_to || r.firm_name || '—',
  },
];

const TATManagement = () => {
  const [loading, setLoading] = useState(true);
  const [dataStore, setDataStore] = useState({
    services: [],
    offers: [],
    utilities: [],
  });

  const { user: currentUser } = useAuthStore();
  const canEditDays = isAdmin(currentUser);

  // Extra days, stored in Supabase (stage_settings)
  const [extraDaysMap, setExtraDaysMap] = useState(DEFAULT_STAGE_DAYS);
  const [daysLoaded, setDaysLoaded] = useState(false);
  const [daysError, setDaysError] = useState('');

  // Admin password prompt: { days, stageId } while open
  const [pendingSave, setPendingSave] = useState(null);
  const [password, setPassword] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);

  const [savedStageId, setSavedStageId] = useState(null);

  // Drill-down selection
  const [selectedStageId, setSelectedStageId] = useState('offers');
  const [detailFilter, setDetailFilter] = useState('all'); // 'all' | 'pending' | 'complete' | 'delayed'
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Fetch live Supabase data
  const fetchData = async (force = false) => {
    setLoading(true);
    try {
      try {
        setExtraDaysMap(await fetchTATStageDays());
        setDaysLoaded(true);
        setDaysError('');
      } catch (err) {
        console.error('Error fetching TAT days:', err);
        setDaysLoaded(false);
        setDaysError('Extra days load nahi hue. Refresh karke dobara try karein.');
      }

      const now = Date.now();
      if (
        !force &&
        tatDataCache &&
        now - tatDataCache.at < CACHE_MS &&
        tatDataCache.at > useDataStore.getState().lastWriteAt
      ) {
        setDataStore(tatDataCache.data);
        return;
      }

      const [sRes, oRes, uRes] = await Promise.all([
        supabase.from('services').select(SERVICE_COLUMNS).order('created_at', { ascending: false }),
        supabase.from('offers').select(OFFER_COLUMNS).order('created_at', { ascending: false }),
        supabase.from('utilities').select(UTILITY_COLUMNS).order('created_at', { ascending: false }),
      ]);

      const rawServices = sRes.data || [];
      const rawOffers = oRes.data || [];
      const rawUtilities = uRes.data || [];

      // Compute offer amountPaid + outstanding from linked services (matching useDataStore SUMIFS)
      const mappedOffers = rawOffers.map((row) => {
        const oId = row.offer_no || '';
        const oFirm = row.firm_name || '';
        const servicesForOffer = rawServices.filter((s) =>
          s.offer_no &&
          String(s.offer_no).trim().toLowerCase() === String(oId).trim().toLowerCase() &&
          (!s.firm_name || !oFirm || String(s.firm_name).trim().toLowerCase() === String(oFirm).trim().toLowerCase())
        );
        const sumServices = servicesForOffer.reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0);
        const hasLinked = servicesForOffer.length > 0;
        const amountPaid = hasLinked ? sumServices : (Number(row.amount_to_be_paid) || 0);
        const amount = Number(row.amount) || 0;
        const outstanding = amount > 0 ? Math.max(0, amount - amountPaid) : (Number(row.outstanding_amount) || 0);
        let status = row.status || 'Pending';
        if (!status || status === 'Pending') {
          if (hasLinked && outstanding <= 0) status = 'Converted';
        }
        return {
          ...row,
          amount,
          amountPaid,
          outstanding,
          status,
        };
      });

      const loaded = {
        services: rawServices,
        offers: mappedOffers,
        utilities: rawUtilities,
      };
      if (!sRes.error && !oRes.error && !uRes.error) {
        tatDataCache = { data: loaded, at: Date.now() };
      }
      setDataStore(loaded);
    } catch (err) {
      console.error('Error fetching TAT data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openSavePrompt = (days, stageId) => {
    setPassword('');
    setSaveError('');
    setPendingSave({ days, stageId });
  };

  // Save extra days for a stage. They apply only to entries created after this save.
  const handleSaveExtraDays = (stageId) => {
    openSavePrompt({ [stageId]: Number(extraDaysMap[stageId]) || 0 }, stageId);
  };

  // Reset all extra days to 0
  const handleResetAllZero = () => {
    openSavePrompt({ ...DEFAULT_STAGE_DAYS }, null);
  };

  const confirmSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveError('');
    try {
      await saveTATStageDays(currentUser?.username, password, pendingSave.days);
      setExtraDaysMap((prev) => ({ ...prev, ...pendingSave.days }));
      if (pendingSave.stageId) {
        const stageId = pendingSave.stageId;
        setSavedStageId(stageId);
        setTimeout(() => setSavedStageId(null), 2000);
      }
      setPendingSave(null);
      setPassword('');
    } catch (err) {
      console.error('Failed to save extra days:', err);
      setSaveError(
        err.message.includes('not_admin')
          ? 'Password galat hai, ya yeh login Admin nahi hai.'
          : 'Save nahi hua. Dobara try karein.'
      );
    } finally {
      setSaving(false);
    }
  };

  // Process stage statistics and list of items
  const processedStages = useMemo(() => {
    const now = Date.now();

    return STAGES_CONFIG.map((stage) => {
      const rawList = stage.getPool(dataStore) || [];
      const extraDays = Number(extraDaysMap[stage.id]) || 0;

      let pending = 0;
      let complete = 0;
      let delayed = 0;
      let totalDelayDays = 0;

      const items = [];

      rawList.forEach((raw) => {
        const isDone = stage.isCompleted(raw);
        const baseDate = getStageBaseDate(stage.id, raw);
        const realPlannedMs = parseMs(baseDate) || now;
        const effectivePlannedMs = parseMs(getStagePlannedDate(stage.id, raw)) || realPlannedMs;

        const actualVal = isDone ? stage.getActual(raw) : null;
        const actualMs = parseMs(actualVal);

        let isCompleted = false;
        let isDelayed = false;
        let delayDays = 0;

        if (isDone) {
          isCompleted = true;
          complete++;
          // Completed items: delay is calculated between actual completion and effective planned date
          const compareTime = actualMs || parseMs(raw.created_at) || effectivePlannedMs;
          delayDays = (compareTime - effectivePlannedMs) / DAY;
          if (delayDays > 0.05) {
            isDelayed = true;
            delayed++;
            totalDelayDays += delayDays;
          }
        } else {
          // Pending items: actual hasn't happened yet, so delay is not calculated
          pending++;
          isCompleted = false;
          isDelayed = false;
          delayDays = 0;
        }

        items.push({
          id: raw.id,
          ref: stage.getRef(raw),
          party: stage.getParty(raw),
          realPlannedMs,
          effectivePlannedMs,
          actualMs,
          isCompleted,
          isDelayed,
          delayDays,
        });
      });

      const avgDelay = delayed > 0 ? (totalDelayDays / delayed).toFixed(1) : '0.0';

      return {
        ...stage,
        extraDays,
        pending,
        complete,
        delayed,
        avgDelay,
        items,
      };
    });
  }, [dataStore, extraDaysMap]);

  // Current selected stage for drill-down
  const activeStage = useMemo(() => {
    return processedStages.find((s) => s.id === selectedStageId) || processedStages[0];
  }, [processedStages, selectedStageId]);

  // Filter items in active stage
  const filteredDetailItems = useMemo(() => {
    if (!activeStage || !activeStage.items) return [];

    return activeStage.items.filter((item) => {
      // Tab filter
      if (detailFilter === 'pending' && item.isCompleted) return false;
      if (detailFilter === 'complete' && !item.isCompleted) return false;
      if (detailFilter === 'delayed' && !item.isDelayed) return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const refMatch = (item.ref || '').toLowerCase().includes(q);
        const partyMatch = (item.party || '').toLowerCase().includes(q);
        if (!refMatch && !partyMatch) return false;
      }

      return true;
    });
  }, [activeStage, detailFilter, searchQuery]);

  // Reset page when filter or stage changes
  useEffect(() => {
    setPage(1);
  }, [selectedStageId, detailFilter, searchQuery]);

  // Pagination for drill-down
  const totalItems = filteredDetailItems.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredDetailItems.slice(start, start + pageSize);
  }, [filteredDetailItems, page, pageSize]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-sm">
          <Timer size={22} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">TAT Management</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Live Supabase data: Planned, Actual aur Delay tracking. Extra days sirf save ke baad bani nayi entries par lagte hain; purani entries ki date nahi badalti.
          </p>
        </div>
      </div>

      {/* Main Card: Stage-wise TAT (Supabase Live) */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Card Top Bar */}
        <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-bold text-gray-900">Stage-wise TAT (Supabase Live)</h2>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => fetchData(true)}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={13} className={cn(loading && 'animate-spin')} />
              <span>Refresh</span>
            </button>
            <button
              onClick={handleResetAllZero}
              disabled={!canEditDays || !daysLoaded}
              title={canEditDays ? undefined : 'Sirf Admin din badal sakta hai'}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCcw size={13} />
              <span>Sab 0 karo</span>
            </button>
          </div>
        </div>

        {daysError && (
          <div className="px-6 py-2.5 bg-red-50 border-b border-red-100 text-xs font-semibold text-red-600">
            {daysError}
          </div>
        )}

        {/* Stages Summary Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-50/60">
                <th className="py-3 px-6">Stage</th>
                <th className="py-3 px-4">Table / Planned column</th>
                <th className="py-3 px-4 text-center">Pending</th>
                <th className="py-3 px-4 text-center">Complete</th>
                <th className="py-3 px-4 text-center">Delayed</th>
                <th className="py-3 px-4 text-center">Avg delay</th>
                <th className="py-3 px-4 text-center">Extra days</th>
                <th className="py-3 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {loading && processedStages[0]?.items?.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    <Loader2 className="animate-spin inline-block mr-2" size={20} />
                    Calculating live stage metrics...
                  </td>
                </tr>
              ) : (
                processedStages.map((stage) => {
                  const isSelected = selectedStageId === stage.id;
                  return (
                    <tr
                      key={stage.id}
                      className={cn(
                        'transition-colors cursor-pointer group',
                        isSelected ? 'bg-emerald-50/50' : 'hover:bg-gray-50/80'
                      )}
                      onClick={() => {
                        setSelectedStageId(stage.id);
                        setDetailFilter('all');
                      }}
                    >
                      {/* Stage Name */}
                      <td className="py-3.5 px-6 font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">
                        {stage.name}
                      </td>

                      {/* Table / Column */}
                      <td className="py-3.5 px-4 font-mono text-xs text-gray-500">
                        {stage.column}
                      </td>

                      {/* Pending count (Clickable) */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedStageId(stage.id);
                            setDetailFilter('pending');
                          }}
                          className="px-2.5 py-1 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-200/60 transition-colors cursor-pointer"
                          title="Click to view pending entries"
                        >
                          {stage.pending}
                        </button>
                      </td>

                      {/* Complete count (Clickable) */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedStageId(stage.id);
                            setDetailFilter('complete');
                          }}
                          className="px-2.5 py-1 rounded-lg text-sm font-bold text-emerald-600 hover:bg-emerald-100/60 transition-colors cursor-pointer"
                          title="Click to view complete entries"
                        >
                          {stage.complete}
                        </button>
                      </td>

                      {/* Delayed count (Clickable) */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedStageId(stage.id);
                            setDetailFilter('delayed');
                          }}
                          className="px-2.5 py-1 rounded-lg text-sm font-bold text-rose-600 hover:bg-rose-100/60 transition-colors cursor-pointer"
                          title="Click to view delayed entries"
                        >
                          {stage.delayed}
                        </button>
                      </td>

                      {/* Avg Delay */}
                      <td className="py-3.5 px-4 text-center font-medium text-gray-700">
                        {stage.avgDelay} din
                      </td>

                      {/* Extra Days Input */}
                      <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="number"
                          min="0"
                          max="60"
                          disabled={!canEditDays || !daysLoaded}
                          value={extraDaysMap[stage.id] ?? 0}
                          onChange={(e) => {
                            const val = Math.min(60, Math.max(0, parseInt(e.target.value, 10) || 0));
                            setExtraDaysMap((prev) => ({ ...prev, [stage.id]: val }));
                          }}
                          className="w-16 px-2.5 py-1 bg-white border border-gray-300 rounded-lg text-center text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                        />
                      </td>

                      {/* Action Save Button */}
                      <td className="py-3.5 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleSaveExtraDays(stage.id)}
                          disabled={!canEditDays || !daysLoaded}
                          title={canEditDays ? undefined : 'Sirf Admin din badal sakta hai'}
                          className={cn(
                            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
                            savedStageId === stage.id
                              ? 'bg-emerald-700 text-white'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          )}
                        >
                          {savedStageId === stage.id ? (
                            <>
                              <Check size={13} />
                              <span>Saved</span>
                            </>
                          ) : (
                            <>
                              <Save size={13} />
                              <span>Save</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drill-Down Details Card (Reference Image 2) */}
      {activeStage && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in duration-200">
          {/* Detail Card Header */}
          <div className="px-6 py-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-gray-900">{activeStage.name}</h3>
                <span className="text-xs text-gray-500 font-medium">
                  extra days: +{activeStage.extraDays} ({activeStage.column})
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Total {filteredDetailItems.length} entries matching current filter
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Search Box */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search Ref or Party..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all w-44 md:w-56"
                />
              </div>

              {/* Filter Pills (ALL, Pending, Complete) */}
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setDetailFilter('all')}
                  className={cn(
                    'px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer',
                    detailFilter === 'all'
                      ? 'bg-emerald-700 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  )}
                >
                  ALL
                </button>
                <button
                  type="button"
                  onClick={() => setDetailFilter('pending')}
                  className={cn(
                    'px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer',
                    detailFilter === 'pending'
                      ? 'bg-emerald-700 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  )}
                >
                  Pending
                </button>
                <button
                  type="button"
                  onClick={() => setDetailFilter('complete')}
                  className={cn(
                    'px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer',
                    detailFilter === 'complete'
                      ? 'bg-emerald-700 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  )}
                >
                  Complete
                </button>
                <button
                  type="button"
                  onClick={() => setDetailFilter('delayed')}
                  className={cn(
                    'px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer',
                    detailFilter === 'delayed'
                      ? 'bg-emerald-700 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  )}
                >
                  Delayed
                </button>
              </div>
            </div>
          </div>

          {/* Details Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-50/60">
                  <th className="py-3 px-6">Indent / Ref</th>
                  <th className="py-3 px-4">Party</th>
                  <th className="py-3 px-4">Real planned</th>
                  <th className="py-3 px-4">Planned</th>
                  <th className="py-3 px-4">Actual</th>
                  <th className="py-3 px-6 text-right">Delay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-400 font-medium">
                      No records found matching current selection.
                    </td>
                  </tr>
                ) : (
                  paginatedItems.map((item) => (
                    <tr key={`${activeStage.id}-${item.id}`} className="hover:bg-gray-50/70 transition-colors">
                      {/* Indent / Ref */}
                      <td className="py-3 px-6 font-bold text-gray-900 whitespace-nowrap">
                        {item.ref}
                      </td>

                      {/* Party */}
                      <td className="py-3 px-4 text-gray-700 font-medium whitespace-nowrap max-w-xs truncate" title={item.party}>
                        {item.party}
                      </td>

                      {/* Real Planned */}
                      <td className="py-3 px-4 text-gray-600 font-mono text-xs whitespace-nowrap">
                        {fmtDT(item.realPlannedMs)}
                      </td>

                      {/* Planned */}
                      <td className="py-3 px-4 text-gray-900 font-mono text-xs font-semibold whitespace-nowrap">
                        {fmtDT(item.effectivePlannedMs)}
                      </td>

                      {/* Actual */}
                      <td className="py-3 px-4 text-gray-600 font-mono text-xs whitespace-nowrap">
                        {item.isCompleted ? (
                          item.actualMs ? fmtDT(item.actualMs) : <span className="text-emerald-600 font-semibold text-xs">Completed</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>

                      {/* Delay Status Badge */}
                      <td className="py-3 px-6 text-right whitespace-nowrap">
                        {item.isCompleted ? (
                          item.delayDays > 0.05 ? (
                            <span className="inline-block px-2.5 py-0.5 text-xs font-bold rounded border bg-rose-50 text-rose-700 border-rose-200">
                              {item.delayDays.toFixed(1)} din late
                            </span>
                          ) : (
                            <span className="inline-block px-2.5 py-0.5 text-xs font-bold rounded border bg-emerald-50 text-emerald-700 border-emerald-200">
                              On Time
                            </span>
                          )
                        ) : (
                          <span className="inline-block px-2.5 py-0.5 text-xs font-bold rounded border bg-amber-50 text-amber-700 border-amber-200">
                            Pending
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {totalItems > pageSize && (
            <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 bg-gray-50/40">
              <span>
                Showing {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, totalItems)} of {totalItems}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border border-gray-200 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="font-semibold text-gray-700 px-2">
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1.5 rounded-lg border border-gray-200 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Admin password prompt for saving days */}
      {pendingSave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={confirmSave}
            className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-gray-200 p-6 space-y-4"
          >
            <div>
              <h3 className="text-base font-bold text-gray-900">Admin password daalein</h3>
              <p className="text-xs text-gray-500 mt-1">
                Naye din sabhi users ke liye sirf save ke baad bani entries par lagenge.
              </p>
            </div>
            <input
              type="password"
              required
              autoFocus
              autoComplete="current-password"
              aria-label="Admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            {saveError && <p className="text-xs font-semibold text-red-600">{saveError}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingSave(null)}
                disabled={saving}
                className="px-3.5 py-1.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                <span>Save</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default TATManagement;
