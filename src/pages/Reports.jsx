import React, { useState, useEffect } from 'react';
import {
  Search, FileSpreadsheet, FileText, Clock, IndianRupee,
  Wrench, Zap, FileSignature, AlertCircle, Loader2
} from 'lucide-react';
import useDataStore from '../store/useDataStore';
import useAuthStore from '../store/useAuthStore';
import { cn, formatCurrency } from '../lib/utils';
import { getAllowedTabs } from '../lib/permissions';

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
  const d = new Date(String(dateStr).split(' ')[0]);
  if (isNaN(d.getTime())) return null;
  const diff = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  return diff >= 0 ? diff : 0;
};

const Reports = () => {
  const { user: currentUser } = useAuthStore();
  const { offers, services, utilities, loading } = useDataStore();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');

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
    .filter(o => o.status !== 'Completed' && o.status !== 'Converted')
    .map(o => ({ type: 'Offer', id: o.id, firmName: o.firmName, stage: o.status || 'Pending', pendingWith: o.vendor, amount: o.amount, timestamp: o.timestamp }));

  const pendingServices = services
    .filter(s => s.status !== 'Completed')
    .map(s => ({ type: 'Service', id: s.id, firmName: s.firmName, stage: s.status, pendingWith: s.vendor, amount: s.amount, timestamp: s.timestamp }));

  const pendingUtilities = utilities
    .filter(u => u.status !== 'Completed')
    .map(u => ({ type: 'Utility', id: u.id, firmName: u.firmName, stage: u.status, pendingWith: u.payTo, amount: u.amount, timestamp: u.timestamp }));

  let pendingItems = [...pendingOffers, ...pendingServices, ...pendingUtilities]
    .map(i => ({ ...i, daysPending: daysSince(i.timestamp) }));

  if (typeFilter !== 'All') {
    pendingItems = pendingItems.filter(i => i.type === typeFilter);
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
    const headers = ['Type', 'Reference ID', 'Firm Name', 'Pending Stage', 'Pending With', 'Amount', 'Days Pending'];
    const csvRows = [headers.join(',')];
    pendingItems.forEach(item => {
      csvRows.push([
        `"${item.type}"`,
        `"${item.id || ''}"`,
        `"${(item.firmName || '').replace(/"/g, '""')}"`,
        `"${(item.stage || '').replace(/"/g, '""')}"`,
        `"${(item.pendingWith || '').replace(/"/g, '""')}"`,
        item.amount || 0,
        item.daysPending ?? ''
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
          <div class="subtitle">Generated on ${new Date().toLocaleString()} | ${pendingItems.length} pending items</div>
          <table>
            <thead>
              <tr><th>Type</th><th>Reference</th><th>Firm</th><th>Stage</th><th>Pending With</th><th>Amount</th><th>Days Pending</th></tr>
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-500">See where work is stuck across Offers, Services, and Utility expenses.</p>
      </div>

      {/* Tab Selector */}
      <div className="flex border-b border-gray-200 gap-1 overflow-x-auto pb-px">
        {visibleTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-5 py-4 font-semibold text-sm transition-all border-b-2 flex items-center gap-2.5 whitespace-nowrap cursor-pointer",
              activeTab === tab.id
                ? "border-gray-900 text-gray-900 font-bold"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            )}
          >
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-2">
          <Loader2 className="animate-spin text-gray-900" size={32} />
          <p className="text-gray-400 text-sm">Loading report data...</p>
        </div>
      ) : activeTab === 'dashboard' ? (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Pending</p>
              <h3 className="text-2xl font-bold text-gray-900">{allPendingItems.length}</h3>
              <p className="text-xs text-gray-400 mt-1.5 font-medium">Across all modules</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Offers Pending</p>
              <h3 className="text-2xl font-bold text-gray-900">{pendingOffers.length}</h3>
              <p className="text-xs text-gray-400 mt-1.5 font-medium">Not completed or converted</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Services Pending</p>
              <h3 className="text-2xl font-bold text-gray-900">{pendingServices.length}</h3>
              <p className="text-xs text-gray-400 mt-1.5 font-medium">Somewhere in execution</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Utility Pending</p>
              <h3 className="text-2xl font-bold text-gray-900">{pendingUtilities.length}</h3>
              <p className="text-xs text-gray-400 mt-1.5 font-medium">Approval or payment queue</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Pending Value</h3>
              <span className="text-lg font-bold text-gray-900">{formatCurrency(totalPendingValue)}</span>
            </div>
            <p className="text-xs text-gray-400">Sum of amount across every item not yet marked Completed.</p>
          </div>

          {/* Stage Breakdown */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h3 className="font-bold text-gray-900 mb-4">Where Work Is Stuck</h3>
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
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search by ID, vendor, firm or stage..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-900 transition-all"
              />
            </div>
            <div className="flex items-center gap-2">
              {['All', 'Offer', 'Service', 'Utility'].map(type => (
                <button
                  key={type}
                  onClick={() => setTypeFilter(type)}
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
            </div>
          </div>

          {/* Pending Work Table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-240px)]">
            <div className="overflow-auto flex-1">
            <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Reference</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Firm</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Pending With</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Stuck At</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Days Pending</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pendingItems.map((item, index) => {
                    const Icon = TYPE_ICON[item.type] || Clock;
                    return (
                      <tr key={`${item.type}-${item.id}-${index}`} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border bg-gray-100 text-gray-700 border-gray-200 flex items-center gap-1 w-fit">
                            <Icon size={11} />
                            {item.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-gray-900">{item.id}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{item.firmName || '—'}</td>
                        <td className="px-6 py-4 text-sm text-gray-600 font-medium">{item.pendingWith || '—'}</td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                            {STAGE_LABELS[item.stage] || item.stage || 'Unknown'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-gray-900">{formatCurrency(item.amount)}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-700">
                          {item.daysPending !== null ? `${item.daysPending} day${item.daysPending === 1 ? '' : 's'}` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                  {pendingItems.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
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
