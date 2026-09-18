import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, CreditCard, FileText, CheckCircle2, X, RefreshCw } from 'lucide-react';
import useDataStore from '../store/useDataStore';
import { cn, formatCurrency, nowDateTime, getDriveViewUrl, formatDate } from '../lib/utils';
import useAuthStore from '../store/useAuthStore';
import { getAllowedTabs, isViewOnly } from '../lib/permissions';
import useStickyTableHead from '../hooks/useStickyTableHead';

const Services = () => {
  const { user: currentUser } = useAuthStore();
  const viewOnly = isViewOnly(currentUser);
  const { services, loading, updateService, fetchData } = useDataStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [firmFilter, setFirmFilter] = useState('');

  const { firms } = useDataStore();
  const masterFirms = firms && firms.length > 0 ? firms : ['Pmmpl', 'Rkl', 'Purab'];
  const getAllowedFirms = () => {
    if (!currentUser) return [];
    if (currentUser.role?.toLowerCase() === 'admin') return masterFirms;
    const userFirms = currentUser.firmName ? currentUser.firmName.split(',').map(f => f.trim()) : [];
    if (userFirms.map(f => f.toLowerCase()).includes('all') || userFirms.map(f => f.toLowerCase()).includes('all firms')) return masterFirms;
    return masterFirms.filter(firm => userFirms.some(uf => uf.toLowerCase() === firm.toLowerCase()));
  };
  const allowedFirms = getAllowedFirms();
  const [activeTab, setActiveTab] = useState('payment');
  const [isSaving, setIsSaving] = useState(false);
  const tableScrollRef = useRef(null);
  useStickyTableHead(tableScrollRef);

  // Payment confirm modal
  const [confirmService, setConfirmService] = useState(null);
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentNote, setPaymentNote] = useState('');

  // ⚡ Bulk selection for multiple payments
  const [selectedServices, setSelectedServices] = useState(new Set());
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);

  const openConfirm = (s) => {
    setPaymentDate('');
    setPaymentNote('');
    setConfirmService(s);
  };

  // ⚡ Toggle individual selection
  const toggleServiceSelection = (serviceRowIndex) => {
    const newSelected = new Set(selectedServices);
    if (newSelected.has(serviceRowIndex)) {
      newSelected.delete(serviceRowIndex);
    } else {
      newSelected.add(serviceRowIndex);
    }
    setSelectedServices(newSelected);
  };

  // ⚡ Select/Deselect all visible payment-pending services
  const toggleSelectAll = () => {
    if (selectedServices.size === filteredServices.length) {
      setSelectedServices(new Set());
    } else {
      setSelectedServices(new Set(filteredServices.map(s => s.sheetRowIndex)));
    }
  };

  const handleConfirmPayment = async () => {
    setIsSaving(true);
    try {
      const ts = nowDateTime();
      await updateService(confirmService.sheetRowIndex, {
        actual2: ts,
      });
      setConfirmService(null);
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // ⚡ Bulk confirm payments
  const handleBulkConfirmPayment = async () => {
    if (selectedServices.size === 0) {
      alert('Please select at least one service');
      return;
    }

    if (!window.confirm(`Confirm payment for ${selectedServices.size} selected services?`)) {
      return;
    }

    setIsSaving(true);
    try {
      const ts = nowDateTime();
      const selectedServicesList = filteredServices.filter(s => selectedServices.has(s.sheetRowIndex));

      // Update all selected services in parallel
      await Promise.all(
        selectedServicesList.map(s =>
          updateService(s.sheetRowIndex, { actual2: ts })
        )
      );

      setSelectedServices(new Set());
      setBulkConfirmOpen(false);
      alert(`✅ ${selectedServices.size} payments confirmed!`);
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed':       return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
      case 'Tally Pending':   return 'bg-purple-100 text-purple-700 border border-purple-200';
      case 'Payment Pending': return 'bg-rose-100 text-rose-700 border border-rose-200';
      case 'Bill Received':   return 'bg-indigo-100 text-indigo-700 border border-indigo-200';
      case 'Work Completed':  return 'bg-cyan-100 text-cyan-700 border border-cyan-200';
      case 'Work Started':    return 'bg-blue-100 text-blue-700 border border-blue-200';
      default:                return 'bg-gray-100 text-gray-700 border border-gray-200';
    }
  };

  // An entry is "paid" (done from Service page's perspective) if:
  // - actual2 (payment date) is set, OR
  // - paymentProof is set, OR
  // - billNo or billCopy exists (bill was processed — entry belongs in Bills/next pages now)
  const isPaid = (s) => !!(s.actual2 || s.paymentProof || s.billNo || s.billCopy);

  const filteredServices = services.filter(s => {
    if (activeTab === 'payment' && isPaid(s)) return false;
    if (activeTab === 'history' && !isPaid(s)) return false;

    if (firmFilter && (s.firmName || '').toLowerCase() !== firmFilter.toLowerCase()) return false;

    const term = searchTerm.toLowerCase();
    return (
      s.id.toLowerCase().includes(term) ||
      s.offerNo.toLowerCase().includes(term) ||
      s.vendor.toLowerCase().includes(term) ||
      s.location.toLowerCase().includes(term) ||
      s.checker.toLowerCase().includes(term)
    );
  });

  const paymentCount = services.filter(s => !isPaid(s)).length;
  const historyCount = services.filter(s => isPaid(s)).length;

  const servicesTabsConfig = [
    { id: 'payment', label: 'Make Payment', count: paymentCount, colorClass: 'bg-amber-100 text-amber-800'     },
    { id: 'history', label: 'History',      count: historyCount, colorClass: 'bg-emerald-100 text-emerald-800' },
  ];
  const visibleTabs   = getAllowedTabs(currentUser, 'Services', servicesTabsConfig);
  const visibleTabIds = visibleTabs.map(t => t.id).join(',');

  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.some(t => t.id === activeTab)) {
      setActiveTab(visibleTabs[0].id);
    }
  }, [visibleTabIds, activeTab]);

  return (
    <div className="space-y-4">
      <div data-sticky-header-region className="sticky top-7 z-20 bg-[#f2f5ec] space-y-4 pb-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Service Execution</h1>
        <p className="text-gray-500 text-sm"></p>
      </div>

      {/* Tabs */}
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
            <span className={cn(
              "px-2.5 py-0.5 text-xs font-bold rounded-full transition-colors",
              activeTab === tab.id ? tab.colorClass : "bg-gray-100 text-gray-600"
            )}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-white p-3 rounded-2xl border-l-4 border-l-amber-500 border border-gray-200 shadow-sm">
          <p className="text-xs font-medium text-gray-500">Payment Pending</p>
          <h4 className="text-lg font-bold text-gray-900 mt-0.5">{paymentCount}</h4>
        </div>
        <div className="bg-white p-3 rounded-2xl border-l-4 border-l-emerald-600 border border-gray-200 shadow-sm">
          <p className="text-xs font-medium text-gray-500">Completed</p>
          <h4 className="text-lg font-bold text-gray-900 mt-0.5">{historyCount}</h4>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by service no, offer no, vendor, location or checker..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-1.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-gray-900/20 focus:border-gray-900 transition-all"
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
        <button
          onClick={() => fetchData()}
          className="p-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-500 hover:text-gray-800 rounded-xl transition-all shrink-0 cursor-pointer"
          title="Refresh from Sheet"
        >
          <RefreshCw size={16} className={cn(loading && "animate-spin")} />
        </button>
      </div>

      {/* ⚡ Bulk Action Button */}
      {activeTab === 'payment' && selectedServices.size > 0 && !viewOnly && (
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-indigo-900">
              {selectedServices.size} service{selectedServices.size > 1 ? 's' : ''} selected
            </p>
            <p className="text-xs text-indigo-600 mt-0.5">Confirm payments for all selected entries</p>
          </div>
          <button
            onClick={handleBulkConfirmPayment}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold transition-all shadow-lg shadow-indigo-600/30 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <><Loader2 size={16} className="animate-spin" /><span>Processing...</span></>
            ) : (
              <><CheckCircle2 size={16} /><span>Bulk Confirm</span></>
            )}
          </button>
        </div>
      )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-2">
          <Loader2 className="animate-spin text-gray-900" size={32} />
          <p className="text-gray-400 text-sm">Loading service sheets...</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto" ref={tableScrollRef}>
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {activeTab === 'payment' && (
                    <>
                      {!viewOnly && (
                        <th className="px-3 py-2.5 sticky top-0 z-10 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">
                          <div className="flex items-center justify-center">
                            <input
                              type="checkbox"
                              checked={selectedServices.size > 0 && selectedServices.size === filteredServices.length}
                              onChange={toggleSelectAll}
                              className="w-4 h-4 rounded-md border-gray-300 text-gray-900 focus:ring-gray-900/20 cursor-pointer"
                              style={{ accentColor: '#1e3a5f' }}
                              title="Select/Deselect all"
                            />
                          </div>
                        </th>
                      )}
                      <th className="px-3 py-2.5 sticky top-0 z-10 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">Action</th>
                    </>
                  )}
                  <th className="px-3 py-2.5 sticky top-0 z-10 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    {activeTab === 'history' ? 'Timestamp (Actual)' : 'Timestamp (Planned)'}
                  </th>
                  <th className="px-3 py-2.5 sticky top-0 z-10 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">Offer No.</th>
                  <th className="px-3 py-2.5 sticky top-0 z-10 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">Service No.</th>
                  <th className="px-3 py-2.5 sticky top-0 z-10 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">Firm Name</th>
                  <th className="px-3 py-2.5 sticky top-0 z-10 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">Checker</th>
                  <th className="px-3 py-2.5 sticky top-0 z-10 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">Total Amount</th>
                  <th className="px-3 py-2.5 sticky top-0 z-10 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">TDS</th>
                  <th className="px-3 py-2.5 sticky top-0 z-10 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">Actual Amount</th>
                  <th className="px-3 py-2.5 sticky top-0 z-10 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">Vendor</th>
                  <th className="px-3 py-2.5 sticky top-0 z-10 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">Work Description</th>
                  <th className="px-3 py-2.5 sticky top-0 z-10 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-3 py-2.5 sticky top-0 z-10 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">Remark</th>
                  <th className="px-3 py-2.5 sticky top-0 z-10 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>

                  {activeTab === 'history' && (
                    <>
                      <th className="px-3 py-2.5 sticky top-0 z-10 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">Bill No.</th>
                      <th className="px-3 py-2.5 sticky top-0 z-10 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">Bill Copy</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredServices.map((service) => {
                  const displayDate = activeTab === 'history' ? (service.actual2 || service.actual1 || service.timestamp) : (service.planned2 || service.planned1 || service.timestamp);
                  return (
                  <tr key={service.sheetRowIndex} className="hover:bg-gray-50 transition-colors">
                    {/* Checkbox + Action — first columns on Make Payment tab */}
                    {activeTab === 'payment' && (
                      <>
                        {!viewOnly && (
                          <td className="px-3 py-2.5">
                            <input
                              type="checkbox"
                              checked={selectedServices.has(service.sheetRowIndex)}
                              onChange={() => toggleServiceSelection(service.sheetRowIndex)}
                              disabled={isSaving}
                              title="Select for bulk payment"
                              className="w-4 h-4 rounded-md border-gray-300 text-gray-900 focus:ring-gray-900/20 cursor-pointer"
                              style={{ accentColor: '#1e3a5f' }}
                            />
                          </td>
                        )}
                        <td className="px-3 py-2.5">
                          {service.paymentForm ? (
                            <a
                              href={service.paymentForm}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
                            >
                              <CreditCard size={13} className="shrink-0" /><span>Payment Form</span>
                            </a>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                      </>
                    )}

                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {formatDate(displayDate) ? (
                        <span className={cn(
                          "text-xs font-semibold px-2.5 py-1 rounded-full border",
                          activeTab === 'history'
                            ? "text-emerald-700 bg-emerald-50 border-emerald-100"
                            : "text-indigo-700 bg-indigo-50 border-indigo-100"
                        )}>
                          {formatDate(displayDate)}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-sm font-semibold text-gray-600">{service.offerNo}</td>
                    <td className="px-3 py-2.5 text-sm font-bold text-gray-900">{service.id}</td>
                    <td className="px-3 py-2.5 text-sm text-gray-600 font-medium">{service.firmName}</td>
                    <td className="px-3 py-2.5 text-sm text-gray-600">{service.checker}</td>
                    <td className="px-3 py-2.5 text-sm font-bold text-gray-900">{formatCurrency(service.amount)}</td>
                    <td className="px-3 py-2.5 text-sm text-gray-600">{formatCurrency(service.tdsAmount)}</td>
                    <td className="px-3 py-2.5 text-sm font-bold text-gray-900">{formatCurrency((service.amount || 0) - (service.tdsAmount || 0))}</td>
                    <td className="px-3 py-2.5 text-sm text-gray-800 font-medium">{service.vendor}</td>
                    <td className="px-3 py-2.5 text-sm text-gray-600 max-w-xs truncate" title={service.description}>{service.description || '—'}</td>
                    <td className="px-3 py-2.5 text-sm text-gray-600">{service.location}</td>
                    <td className="px-3 py-2.5 text-sm text-gray-600 max-w-xs truncate" title={service.remark}>{service.remark || '—'}</td>
                    <td className="px-3 py-2.5">
                      <span className={cn("px-2.5 py-1 text-xs font-semibold rounded-full", getStatusColor(service.status))}>
                        {service.status}
                      </span>
                    </td>

                    {activeTab === 'history' && (
                      <>
                        <td className="px-3 py-2.5 text-sm text-gray-700 font-medium">{service.billNo || '—'}</td>
                        <td className="px-3 py-2.5">
                          {service.billCopy ? (
                            <a href={getDriveViewUrl(service.billCopy)} target="_blank" rel="noreferrer"
                              className="flex items-center gap-1.5 text-xs font-bold text-gray-700 hover:text-gray-900 transition-colors">
                              <FileText size={14} /><span>View</span>
                            </a>
                          ) : <span className="text-xs text-gray-400">—</span>}
                        </td>
                      </>
                    )}
                  </tr>
                  );
                })}
                {filteredServices.length === 0 && (
                  <tr>
                    <td colSpan={14} className="px-6 py-10 text-center text-gray-400 text-sm">
                      No services found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}


    </div>
  );
};

export default Services;
