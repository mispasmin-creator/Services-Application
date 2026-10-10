import React, { useState, useEffect, useRef } from 'react';
import {
  Search, FileSpreadsheet, FileText, Clock, IndianRupee,
  Wrench, Zap, FileSignature, AlertCircle, Loader2, RefreshCw,
  ChevronDown, ChevronRight
} from 'lucide-react';
import useDataStore from '../store/useDataStore';
import useAuthStore from '../store/useAuthStore';
import { cn, formatCurrency, formatDate } from '../lib/utils';
import { getAllowedTabs } from '../lib/permissions';
import useStickyTableHead from '../hooks/useStickyTableHead';

const STAGE_LABELS = {
  Pending: 'Offer - Pending Approval',
  'Service Created': 'Service Created',
  'Work Started': 'Service - Work In Progress',
  'Work Completed': 'Service - Bill Awaited',
  'Bill Received': 'Service - Bill Verification Pending',
  'Payment Pending': 'Payment Pending',
  'Tally Pending': 'Tally Entry Pending',
  'Pending Approval': 'Utility - Pending Approval',
  Approved: 'Utility - Approved (Payment Queue)',
  Rejected: 'Utility - Rejected',
  'On Hold': 'Utility - On Hold',
};

const TYPE_ICON = { Offer: FileSignature, Service: Wrench, Utility: Zap };

const daysSince = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    const fallback = new Date(String(dateStr).split(' ')[0]);
    if (isNaN(fallback.getTime())) return null;
    const diff = Math.floor((Date.now() - fallback.getTime()) / (1000 * 60 * 60 * 24));
    return diff >= 0 ? diff : 0;
  }
  const diff = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  return diff >= 0 ? diff : 0;
};

const DAY_MS = 86400000;

const parseMs = (v) => {
  if (!v) return null;
  const t = new Date(v).getTime();
  return Number.isNaN(t) ? null : t;
};

const fmtStamp = (ms) =>
  ms == null
    ? '—'
    : new Date(ms).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' });

const lastOf = (...vals) => {
  const times = vals.map(parseMs).filter(t => t != null);
  return times.length ? Math.max(...times) : null;
};

// Planned date of the stage an unfinished service is currently stuck in, plus the latest Actual already recorded.
const serviceStageTat = (s) => {
  let planned;
  if (s.status3 || s.status4) {
    if (s.status3 === 'Rectify' && s.status4 !== 'Audited') planned = s.planned4;
    else if (s.status3 === 'Audited' || s.status4 === 'Audited') planned = s.planned5;
    else planned = s.planned3;
  } else if (!s.actual1) planned = s.planned1;
  else if (!s.actual2) planned = s.planned2;
  else planned = s.planned3;
  return { plannedMs: parseMs(planned), lastActualMs: lastOf(s.actual1, s.actual2, s.actual3, s.actual4) };
};

const utilityStageTat = (u) => ({
  plannedMs: parseMs(u.actual1 ? u.planned2 : u.planned1),
  lastActualMs: lastOf(u.actual, u.actual1),
});

// Same stage rules as serviceStageTat / the Tally page, returned as a short key for grouping and filtering.
const serviceStageKey = (s) => {
  if (s.status3 || s.status4) {
    if (s.status3 === 'Rectify' && s.status4 !== 'Audited') return 'rectify';
    if (s.status3 === 'Audited' || s.status4 === 'Audited') return 'tally';
    return 'audit';
  }
  if (!s.actual1) return 'bill';
  if (!s.actual2) return 'payment';
  return 'audit';
};

const STAGE_ROWS = [
  { key: 'offer', label: 'Offer', module: 'Offer' },
  { key: 'bill', label: '1. Bill Received', module: 'Service' },
  { key: 'payment', label: '2. Payment', module: 'Service' },
  { key: 'audit', label: '3. Audit', module: 'Service' },
  { key: 'rectify', label: '4. Rectify', module: 'Service' },
  { key: 'tally', label: '5. Tally Entry', module: 'Service' },
  { key: 'util_approval', label: 'Utility - Approval', module: 'Utility' },
  { key: 'util_tally', label: 'Utility - Tally Entry', module: 'Utility' },
];

const OFFER_DONE_STATUSES = ['Complete', 'Completed', 'Converted'];

const delayDaysOf = (plannedMs) => (plannedMs == null ? null : (Date.now() - plannedMs) / DAY_MS);

const delayText = (d) => {
  if (d == null) return '—';
  return d > 0 ? `${d.toFixed(1)} days late` : `${Math.abs(d).toFixed(1)} days left`;
};

const getStageEval = (plannedVal, actualVal) => {
  const pMs = parseMs(plannedVal);
  const aMs = parseMs(actualVal);
  if (!pMs && !aMs) {
    return { state: 'na', label: 'Not Scheduled', text: '—', cls: 'bg-gray-100 text-gray-400 border-gray-200' };
  }
  if (aMs != null) {
    if (pMs != null) {
      const diffDays = (aMs - pMs) / DAY_MS;
      if (diffDays > 0.05) {
        return { state: 'late', label: `${diffDays.toFixed(1)}d Late`, text: `${diffDays.toFixed(1)}d late`, cls: 'bg-rose-50 text-rose-700 border-rose-200 font-semibold' };
      }
      return { state: 'ontime', label: 'On Time', text: `${Math.abs(diffDays).toFixed(1)}d on time`, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold' };
    }
    return { state: 'done', label: 'Completed', text: 'Done', cls: 'bg-gray-100 text-gray-700 border-gray-200 font-semibold' };
  }
  if (pMs != null) {
    const diffDays = (Date.now() - pMs) / DAY_MS;
    if (diffDays > 0) {
      return { state: 'overdue', label: `${diffDays.toFixed(1)}d Overdue`, text: `${diffDays.toFixed(1)}d late`, cls: 'bg-rose-100 text-rose-800 border-rose-300 font-bold' };
    }
    return { state: 'pending', label: `${Math.abs(diffDays).toFixed(1)}d Left`, text: `${Math.abs(diffDays).toFixed(1)}d left`, cls: 'bg-sky-50 text-sky-700 border-sky-200 font-semibold' };
  }
  return { state: 'pending', label: 'Pending', text: '—', cls: 'bg-gray-50 text-gray-600 border-gray-200' };
};

const getItemStages = (item) => {
  const raw = item.raw || {};
  if (item.type === 'Service') {
    return [
      {
        id: 1,
        title: '1. Bill Received',
        sub: 'Bills Page',
        planned: raw.planned1,
        actual: raw.actual1,
        extra: raw.billNo ? `Bill No: ${raw.billNo}` : null,
      },
      {
        id: 2,
        title: '2. Payment Processing',
        sub: 'Payments Page',
        planned: raw.planned2,
        actual: raw.actual2,
      },
      {
        id: 3,
        title: '3. Audit Verification',
        sub: 'Audit Stage',
        planned: raw.planned3,
        actual: raw.actual3,
        extra: raw.status3 ? `Status: ${raw.status3}` : null,
      },
      {
        id: 4,
        title: '4. Rectify',
        sub: 'If Rejected',
        planned: raw.planned4,
        actual: raw.actual4,
        extra: raw.status4 ? `Status: ${raw.status4}` : (raw.status3 === 'Rectify' ? 'Pending Rectify' : 'N/A (Approved)'),
        isNA: raw.status3 !== 'Rectify' && !raw.planned4 && !raw.actual4,
      },
      {
        id: 5,
        title: '5. Tally Entry',
        sub: 'Tally Page',
        planned: raw.planned5,
        actual: raw.actual5,
        extra: raw.status5 ? `Status: ${raw.status5}` : null,
      },
    ];
  }
  if (item.type === 'Utility') {
    return [
      {
        id: 1,
        title: '1. Payment Approval',
        sub: 'Approval Stage',
        planned: raw.planned1,
        actual: raw.actual1,
      },
      {
        id: 2,
        title: '2. Entry In Tally',
        sub: 'Tally Page',
        planned: raw.planned2,
        actual: raw.actual2,
      },
    ];
  }
  if (item.type === 'Offer') {
    return [
      {
        id: 1,
        title: '1. Service Conversion',
        sub: 'Offer Stage',
        planned: raw.planned1,
        actual: raw.actual1,
      },
    ];
  }
  return [];
};

const Reports = () => {
  const { user: currentUser } = useAuthStore();
  const { offers, services, utilities, loading, fetchData, firms } = useDataStore();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [firmFilter, setFirmFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [stageFilter, setStageFilter] = useState('');
  const [expandedRows, setExpandedRows] = useState(new Set());
  const tableScrollRef = useRef(null);
  useStickyTableHead(tableScrollRef);

  const toggleRowExpand = (key) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const masterFirms = firms && firms.length > 0 ? firms : ['Pmmpl', 'Rkl', 'Purab'];
  const getAllowedFirms = () => {
    if (!currentUser) return [];
    if (currentUser.role?.toLowerCase() === 'admin') return masterFirms;
    const userFirms = currentUser.firmName ? currentUser.firmName.split(',').map(f => f.trim()) : [];
    if (userFirms.map(f => f.toLowerCase()).includes('all') || userFirms.map(f => f.toLowerCase()).includes('all firms')) return masterFirms;
    return masterFirms.filter(firm => userFirms.some(uf => uf.toLowerCase() === firm.toLowerCase()));
  };
  const allowedFirms = getAllowedFirms();

  const tabsConfig = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'pending', label: 'Pending Work' }
  ];
  const visibleTabs = getAllowedTabs(currentUser, 'Reports', tabsConfig);
  const visibleTabIds = visibleTabs.map(t => t.id).join(',');

  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.some(t => t.id === activeTab)) {
      setActiveTab(visibleTabs[0].id);
    }
  }, [visibleTabIds, activeTab]);

  // Consolidate everything that isn't finished yet, across all three modules
  const pendingOffers = offers
    .filter(o => !OFFER_DONE_STATUSES.includes(o.status))
    .map(o => ({
      type: 'Offer', stageKey: 'offer', id: o.id, firmName: o.firmName, stage: o.status || 'Pending', pendingWith: o.vendor, amount: o.amount, timestamp: o.timestamp,
      plannedMs: parseMs(o.planned1), lastActualMs: parseMs(o.actual1),
      raw: o,
    }));

  const pendingServices = services
    .filter(s => s.status !== 'Completed')
    .map(s => ({
      type: 'Service', stageKey: serviceStageKey(s), id: s.id, firmName: s.firmName, stage: s.status, pendingWith: s.vendor, amount: s.amount, timestamp: s.timestamp,
      ...serviceStageTat(s),
      raw: s,
    }));

  const pendingUtilities = utilities
    .filter(u => u.status !== 'Completed')
    .map(u => ({
      type: 'Utility', stageKey: u.actual1 ? 'util_tally' : 'util_approval', id: u.id, firmName: u.firmName, stage: u.status, pendingWith: u.payTo, amount: u.amount, timestamp: u.timestamp,
      ...utilityStageTat(u),
      raw: u,
    }));

  const decoratedItems = [...pendingOffers, ...pendingServices, ...pendingUtilities]
    .map(i => ({
      ...i,
      daysPending: daysSince(i.timestamp),
      delayDays: i.type === 'Offer' && i.plannedMs != null && i.lastActualMs != null
        ? (i.lastActualMs - i.plannedMs) / DAY_MS
        : delayDaysOf(i.plannedMs),
    }));
  let pendingItems = decoratedItems;

  const inFirm = (x) => !firmFilter || (x.firmName || '').toLowerCase() === firmFilter.toLowerCase();

  // Summary strip: totals follow the Firm filter only (not search / stage selection).
  const sum = (arr, pick) => arr.reduce((a, x) => a + (Number(pick(x)) || 0), 0);
  const offersF = offers.filter(inFirm);
  const servicesF = services.filter(inFirm);
  const utilitiesF = utilities.filter(inFirm);
  const offersDone = offersF.filter(o => OFFER_DONE_STATUSES.includes(o.status));
  const servicesDone = servicesF.filter(s => s.status === 'Completed');
  const utilitiesDone = utilitiesF.filter(u => u.status === 'Completed');
  const pendingByModule = (type) => decoratedItems.filter(i => i.type === type && inFirm(i));
  const moduleSummary = [
    { module: 'Offer', label: 'Offers', total: offersF, done: offersDone, pending: pendingByModule('Offer'), totalAmt: sum(offersF, o => o.amount), doneAmt: sum(offersDone, o => o.amount) },
    { module: 'Service', label: 'Services', total: servicesF, done: servicesDone, pending: pendingByModule('Service'), totalAmt: sum(servicesF, s => s.amount), doneAmt: sum(servicesDone, s => s.amount) },
    { module: 'Utility', label: 'Utility', total: utilitiesF, done: utilitiesDone, pending: pendingByModule('Utility'), totalAmt: sum(utilitiesF, u => u.amount), doneAmt: sum(utilitiesDone, u => u.amount) },
  ].filter(m => typeFilter === 'All' || typeFilter === m.module);

  const doneInStage = {
    offer: offersDone.length,
    bill: servicesF.filter(s => s.actual1).length,
    payment: servicesF.filter(s => s.actual2).length,
    audit: servicesF.filter(s => s.actual3).length,
    rectify: servicesF.filter(s => s.status3 === 'Rectify' && s.actual4).length,
    tally: servicesDone.length,
    util_approval: utilitiesF.filter(u => u.actual1).length,
    util_tally: utilitiesDone.length,
  };
  const stageSummary = STAGE_ROWS
    .filter(r => typeFilter === 'All' || typeFilter === r.module)
    .map(r => {
      const here = decoratedItems.filter(i => i.stageKey === r.key && inFirm(i));
      return { ...r, done: doneInStage[r.key] || 0, here: here.length, late: here.filter(i => i.delayDays != null && i.delayDays > 0).length };
    });

  if (typeFilter !== 'All') {
    pendingItems = pendingItems.filter(i => i.type === typeFilter);
  }
  if (stageFilter) {
    pendingItems = pendingItems.filter(i => i.stageKey === stageFilter);
  }
  if (firmFilter) {
    pendingItems = pendingItems.filter(i => (i.firmName || '').toLowerCase() === firmFilter.toLowerCase());
  }
  if (searchTerm) {
    const q = searchTerm.toLowerCase();
    pendingItems = pendingItems.filter(i =>
      (i.id || '').toLowerCase().includes(q) ||
      (i.pendingWith || '').toLowerCase().includes(q) ||
      (i.stage || '').toLowerCase().includes(q) ||
      (i.firmName || '').toLowerCase().includes(q)
    );
  }
  pendingItems = pendingItems.sort((a, b) => (b.daysPending || 0) - (a.daysPending || 0));

  const allPendingItems = [...pendingOffers, ...pendingServices, ...pendingUtilities];
  const totalPendingValue = allPendingItems.reduce((sum, i) => sum + (i.amount || 0), 0);

  const stageBreakdown = {};
  allPendingItems.forEach(i => {
    const label = STAGE_LABELS[i.stage] || i.stage || 'Unknown';
    stageBreakdown[label] = (stageBreakdown[label] || 0) + 1;
  });
  const stageEntries = Object.entries(stageBreakdown).sort((a, b) => b[1] - a[1]);
  const maxStageCount = stageEntries.reduce((max, [, count]) => Math.max(max, count), 1);

  const handleExportExcel = () => {
    const headers = ['Type', 'Reference ID', 'Firm Name', 'Pending Stage', 'Pending With', 'Amount', 'Days Pending', 'Planned', 'Last Actual', 'Delay (days)'];
    const csvRows = [headers.join(',')];
    pendingItems.forEach(item => {
      csvRows.push([
        `"${item.type}"`,
        `"${item.id || ''}"`,
        `"${(item.firmName || '').replace(/"/g, '""')}"`,
        `"${(item.stage || '').replace(/"/g, '""')}"`,
        `"${(item.pendingWith || '').replace(/"/g, '""')}"`,
        item.amount || 0,
        item.daysPending ?? '',
        `"${item.plannedMs != null ? fmtStamp(item.plannedMs) : ''}"`,
        `"${item.lastActualMs != null ? fmtStamp(item.lastActualMs) : ''}"`,
        item.delayDays != null ? item.delayDays.toFixed(1) : ''
      ].join(','));
    });
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Pending_Work_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Pending Work Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 25px; color: #1f2937; }
            h1 { text-align: center; font-size: 20px; font-weight: bold; margin-bottom: 5px; }
            .subtitle { text-align: center; font-size: 12px; color: #6b7280; margin-bottom: 25px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #e5e7eb; padding: 8px 10px; text-align: left; font-size: 11px; }
            th { background-color: #f9fafb; font-weight: bold; color: #374151; text-transform: uppercase; font-size: 9px; }
            tr:nth-child(even) { background-color: #f9fafb; }
          </style>
        </head>
        <body>
          <h1>Pending Work Report</h1>
          <div class="subtitle">Generated on ${formatDate(new Date())} | ${pendingItems.length} pending items</div>
          <table>
            <thead>
              <tr><th>Type</th><th>Reference</th><th>Firm</th><th>Stage</th><th>Pending With</th><th>Amount</th><th>Days Pending</th><th>Planned</th><th>Last Actual</th><th>Delay</th></tr>
            </thead>
            <tbody>
              ${pendingItems.map(item => `
                <tr>
                  <td>${item.type}</td>
                  <td><b>${item.id || ''}</b></td>
                  <td>${item.firmName || '-'}</td>
                  <td>${item.stage || '-'}</td>
                  <td>${item.pendingWith || '-'}</td>
                  <td>${formatCurrency(item.amount)}</td>
                  <td>${item.daysPending ?? '-'}</td>
                  <td>${fmtStamp(item.plannedMs)}</td>
                  <td>${fmtStamp(item.lastActualMs)}</td>
                  <td>${delayText(item.delayDays)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  return (
    <div className="space-y-4">
      <div data-sticky-header-region className="sticky top-7 z-20 bg-[#f2f5ec] space-y-4 pb-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-500 text-sm">See where work is stuck across Offers, Services, and Utility expenses.</p>
      </div>

      {/* Tab Selector */}
      <div className="flex border-b border-gray-200 gap-1 overflow-x-auto pb-px">
        {visibleTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-4 py-2.5 font-semibold text-sm transition-all border-b-2 flex items-center gap-2.5 whitespace-nowrap cursor-pointer",
              activeTab === tab.id
                ? "border-gray-900 text-gray-900 font-bold"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            )}
          >
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
      </div>

      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-2">
          <Loader2 className="animate-spin text-gray-900" size={32} />
          <p className="text-gray-400 text-sm">Loading report data...</p>
        </div>
      ) : activeTab === 'dashboard' ? (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-sm">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Pending</p>
              <h3 className="text-lg font-bold text-gray-900">{allPendingItems.length}</h3>
              <p className="text-xs text-gray-400 mt-1 font-medium">Across all modules</p>
            </div>
            <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-sm">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Offers Pending</p>
              <h3 className="text-lg font-bold text-gray-900">{pendingOffers.length}</h3>
              <p className="text-xs text-gray-400 mt-1 font-medium">Not completed or converted</p>
            </div>
            <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-sm">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Services Pending</p>
              <h3 className="text-lg font-bold text-gray-900">{pendingServices.length}</h3>
              <p className="text-xs text-gray-400 mt-1 font-medium">Somewhere in execution</p>
            </div>
            <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-sm">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Utility Pending</p>
              <h3 className="text-lg font-bold text-gray-900">{pendingUtilities.length}</h3>
              <p className="text-xs text-gray-400 mt-1 font-medium">Approval or payment queue</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-gray-900">Pending Value</h3>
              <span className="text-lg font-bold text-gray-900">{formatCurrency(totalPendingValue)}</span>
            </div>
            <p className="text-xs text-gray-400">Sum of amount across every item not yet marked Completed.</p>
          </div>

          {/* Stage Breakdown */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
            <h3 className="font-bold text-gray-900 mb-3">Where Work Is Stuck</h3>
            {stageEntries.length === 0 ? (
              <p className="text-sm text-gray-400">Nothing pending right now.</p>
            ) : (
              <div className="space-y-3">
                {stageEntries.map(([label, count]) => (
                  <div key={label} className="flex items-center gap-4">
                    <span className="text-sm font-medium text-gray-700 w-64 shrink-0 truncate">{label}</span>
                    <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gray-900 rounded-full"
                        style={{ width: `${Math.max((count / maxStageCount) * 100, 4)}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-gray-900 w-8 text-right shrink-0">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Summary: totals per module + stage-wise done / pending */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    <th className="px-4 py-2.5">Module</th>
                    <th className="px-4 py-2.5">Total</th>
                    <th className="px-4 py-2.5">Complete</th>
                    <th className="px-4 py-2.5">Pending</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {moduleSummary.map(m => {
                    const pct = m.total.length ? Math.round((m.done.length / m.total.length) * 100) : 0;
                    const pendingAmt = sum(m.pending, i => i.amount);
                    const offerNoSvc = m.module === 'Offer' ? m.pending.filter(i => i.lastActualMs == null).length : 0;
                    return (
                      <tr key={m.module}>
                        <td className="px-4 py-3 font-bold text-gray-900">{m.label}</td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-gray-900">{m.total.length}</div>
                          <div className="text-xs text-gray-400">{formatCurrency(m.totalAmt)}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-emerald-700">{m.done.length} <span className="text-xs font-semibold text-gray-400">({pct}%)</span></div>
                          <div className="text-xs text-gray-400">{formatCurrency(m.doneAmt)}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-amber-700">{m.pending.length}</div>
                          <div className="text-xs text-gray-400">{formatCurrency(pendingAmt)}</div>
                          {m.module === 'Offer' && m.pending.length > 0 && (
                            <div className="text-[11px] text-gray-400 mt-0.5">{offerNoSvc} service nahi bani · {m.pending.length - offerNoSvc} service bani, offer baaki</div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    <th className="px-4 py-2.5">Stage</th>
                    <th className="px-4 py-2.5">Done</th>
                    <th className="px-4 py-2.5">Abhi yahan</th>
                    <th className="px-4 py-2.5">Late</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {stageSummary.map(r => (
                    <tr
                      key={r.key}
                      onClick={() => setStageFilter(stageFilter === r.key ? '' : r.key)}
                      className={cn('cursor-pointer hover:bg-gray-50', stageFilter === r.key && 'bg-teal-50')}
                    >
                      <td className="px-4 py-2.5 font-semibold text-gray-800">{r.label}</td>
                      <td className="px-4 py-2.5 text-emerald-700 font-bold">{r.done}</td>
                      <td className="px-4 py-2.5 text-amber-700 font-bold">{r.here}</td>
                      <td className={cn('px-4 py-2.5 font-bold', r.late > 0 ? 'text-rose-600' : 'text-gray-400')}>{r.late}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {stageFilter && (
                <button
                  onClick={() => setStageFilter('')}
                  className="w-full px-4 py-2 text-xs font-semibold text-teal-700 bg-teal-50 border-t border-teal-100 hover:bg-teal-100"
                >
                  Stage filter hatao
                </button>
              )}
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-sm flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search by ID, vendor, firm or stage..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-900 transition-all"
              />
            </div>
            <select
              value={firmFilter}
              onChange={(e) => setFirmFilter(e.target.value)}
              className="px-4 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-900 transition-all min-w-[140px] cursor-pointer"
            >
              <option value="">All Firms</option>
              {allowedFirms.map((firm, i) => (
                <option key={`firm-${i}`} value={firm}>{firm}</option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              {['All', 'Offer', 'Service', 'Utility'].map(type => (
                <button
                  key={type}
                  onClick={() => { setTypeFilter(type); setStageFilter(''); }}
                  className={cn(
                    "px-4 py-2 rounded-xl text-sm font-semibold transition-all border",
                    typeFilter === type
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                  )}
                >
                  {type}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => {
                  if (expandedRows.size === pendingItems.length && pendingItems.length > 0) {
                    setExpandedRows(new Set());
                  } else {
                    setExpandedRows(new Set(pendingItems.map(i => `${i.type}-${i.id}`)));
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold transition-all"
                title="Expand or collapse all stage timelines"
              >
                <ChevronDown size={14} className={cn("transition-transform duration-200", expandedRows.size > 0 && "rotate-180 text-teal-600")} />
                <span>{expandedRows.size === pendingItems.length && pendingItems.length > 0 ? "Collapse All" : "Expand All Stages"}</span>
              </button>
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold transition-all"
                title="Export as CSV/Excel"
              >
                <FileSpreadsheet size={15} className="text-emerald-600" />
                <span>Export Excel</span>
              </button>
              <button
                onClick={handleExportPDF}
                className="flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold transition-all"
                title="Print report as PDF"
              >
                <FileText size={15} className="text-rose-600" />
                <span>Print Report</span>
              </button>
              <button
                onClick={() => fetchData()}
                className="p-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-500 hover:text-gray-800 rounded-xl transition-all shrink-0 cursor-pointer"
                title="Refresh from Sheet"
              >
                <RefreshCw size={15} className={cn(loading && "animate-spin")} />
              </button>
            </div>
          </div>

          {/* Pending Work Table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto" ref={tableScrollRef}>
            <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="w-8 px-2 py-3 sticky top-0 z-10 bg-gray-50 text-center"></th>
                    <th className="px-3 py-3 sticky top-0 z-10 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-3 py-3 sticky top-0 z-10 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">Reference</th>
                    <th className="px-3 py-3 sticky top-0 z-10 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">Firm</th>
                    <th className="px-3 py-3 sticky top-0 z-10 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">Pending With</th>
                    <th className="px-3 py-3 sticky top-0 z-10 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">Stuck At</th>
                    <th className="px-3 py-3 sticky top-0 z-10 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-3 py-3 sticky top-0 z-10 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">Days Pending</th>
                    <th className="px-3 py-3 sticky top-0 z-10 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">Current Planned</th>
                    <th className="px-3 py-3 sticky top-0 z-10 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">Last Actual</th>
                    <th className="px-3 py-3 sticky top-0 z-10 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">Delay</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pendingItems.map((item, index) => {
                    const Icon = TYPE_ICON[item.type] || Clock;
                    const rowKey = `${item.type}-${item.id}`;
                    const isExpanded = expandedRows.has(rowKey);
                    const stages = getItemStages(item);

                    return (
                      <React.Fragment key={`${rowKey}-${index}`}>
                        <tr
                          onClick={() => toggleRowExpand(rowKey)}
                          className={cn(
                            "cursor-pointer transition-colors",
                            isExpanded ? "bg-teal-50/40 hover:bg-teal-50/60" : "hover:bg-gray-50/70"
                          )}
                        >
                          <td className="px-2 py-3 text-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleRowExpand(rowKey);
                              }}
                              className="p-1 rounded-md text-gray-400 hover:text-teal-700 hover:bg-teal-100/60 transition-colors"
                              title={isExpanded ? "Collapse stage details" : "View all stages (Bill, Payment, Audit, Tally)"}
                            >
                              {isExpanded ? (
                                <ChevronDown size={15} className="text-teal-700 stroke-[2.5]" />
                              ) : (
                                <ChevronRight size={15} />
                              )}
                            </button>
                          </td>
                          <td className="px-3 py-3">
                            <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border bg-gray-100 text-gray-700 border-gray-200 flex items-center gap-1 w-fit">
                              <Icon size={11} />
                              {item.type}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-sm font-bold text-gray-900">{item.id}</td>
                          <td className="px-3 py-3 text-sm text-gray-600">{item.firmName || '—'}</td>
                          <td className="px-3 py-3 text-sm text-gray-600 font-medium">{item.pendingWith || '—'}</td>
                          <td className="px-3 py-3">
                            <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                              {STAGE_LABELS[item.stage] || item.stage || 'Unknown'}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-sm font-bold text-gray-900">{formatCurrency(item.amount)}</td>
                          <td className="px-3 py-3 text-sm font-semibold text-gray-700">
                            {item.daysPending !== null ? `${item.daysPending} day${item.daysPending === 1 ? '' : 's'}` : '—'}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">{fmtStamp(item.plannedMs)}</td>
                          <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">{fmtStamp(item.lastActualMs)}</td>
                          <td className={cn(
                            'px-3 py-3 text-sm font-semibold whitespace-nowrap',
                            item.delayDays == null ? 'text-gray-400' : item.delayDays > 0 ? 'text-rose-600' : 'text-emerald-600'
                          )}>
                            {delayText(item.delayDays)}
                          </td>
                        </tr>

                        {/* Accordion Content Row */}
                        {isExpanded && (
                          <tr className="bg-gradient-to-r from-teal-50/50 via-slate-50/50 to-sky-50/50 border-b border-gray-200">
                            <td colSpan={11} className="p-3 pl-10">
                              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3.5">
                                <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2 border-b border-gray-100">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold uppercase tracking-wider text-teal-800">
                                      Stage-wise TAT & Progression (Planned vs Actual vs Delay)
                                    </span>
                                    <span className="text-xs font-medium text-gray-500">
                                      • Ref: <strong className="text-gray-900">{item.id}</strong> ({item.pendingWith || item.firmName})
                                    </span>
                                  </div>
                                  <span className="text-xs font-semibold text-gray-500">
                                    Current Stage: <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">{STAGE_LABELS[item.stage] || item.stage}</span>
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
                                  {stages.map(stage => {
                                    const evalRes = stage.isNA
                                      ? { state: 'na', label: 'N/A (Skipped)', text: 'Not applicable', cls: 'bg-gray-100 text-gray-400 border-gray-200' }
                                      : getStageEval(stage.planned, stage.actual);

                                    return (
                                      <div
                                        key={stage.id}
                                        className={cn(
                                          "p-2.5 rounded-xl border transition-all flex flex-col justify-between",
                                          stage.isNA ? "bg-gray-50/70 border-gray-200 opacity-60" : "bg-white border-gray-200 shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
                                        )}
                                      >
                                        <div>
                                          <div className="flex items-start justify-between gap-1 mb-1">
                                            <span className="text-xs font-bold text-gray-900 truncate" title={stage.title}>
                                              {stage.title}
                                            </span>
                                            <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold border shrink-0", evalRes.cls)}>
                                              {evalRes.label}
                                            </span>
                                          </div>
                                          {stage.sub && (
                                            <p className="text-[10px] font-medium text-teal-700/80 mb-2">
                                              {stage.sub}
                                            </p>
                                          )}
                                          <div className="space-y-1 text-xs">
                                            <div className="flex items-center justify-between text-gray-600">
                                              <span className="text-[11px] text-gray-400">Planned:</span>
                                              <span className="font-semibold text-gray-800 text-[11px] truncate max-w-[120px]" title={stage.planned || ''}>
                                                {stage.planned || '—'}
                                              </span>
                                            </div>
                                            <div className="flex items-center justify-between text-gray-600">
                                              <span className="text-[11px] text-gray-400">Actual:</span>
                                              <span className={cn(
                                                "font-semibold text-[11px] truncate max-w-[120px]",
                                                stage.actual ? "text-emerald-700" : "text-gray-400"
                                              )} title={stage.actual || ''}>
                                                {stage.actual || '—'}
                                              </span>
                                            </div>
                                          </div>
                                        </div>

                                        {stage.extra && (
                                          <div className="mt-2 pt-1 border-t border-gray-100 text-[10px] font-medium text-gray-500 truncate" title={stage.extra}>
                                            {stage.extra}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                  {pendingItems.length === 0 && (
                    <tr>
                      <td colSpan={11} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center">
                            <AlertCircle size={20} className="text-gray-300" />
                          </div>
                          <p className="text-sm text-gray-400 font-medium">No pending work found</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
