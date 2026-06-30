import React, { useState, useEffect } from 'react';
import { Search, Loader2, CreditCard, FileText, CheckCircle2, X } from 'lucide-react';
import useDataStore from '../store/useDataStore';
import { cn, formatCurrency, nowDateTime } from '../lib/utils';
import useAuthStore from '../store/useAuthStore';
import { getAllowedTabs } from '../lib/permissions';

const Services = () => {
  const { user: currentUser } = useAuthStore();
  const { services, loading, updateService } = useDataStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('payment');
  const [isSaving, setIsSaving] = useState(false);

  // Payment confirm modal
  const [confirmService, setConfirmService] = useState(null);
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentNote, setPaymentNote] = useState('');

  const openConfirm = (s) => {
    setPaymentDate('');
    setPaymentNote('');
    setConfirmService(s);
  };

  const handleConfirmPayment = async () => {
    setIsSaving(true);
    try {
      const ts = nowDateTime();
      await updateService(confirmService.sheetRowIndex, {
        actual2: ts,
        paymentProof: paymentNote || ts,
      });
      setConfirmService(null);
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

  const filteredServices = services.filter(s => {
    if (activeTab === 'payment' && s.paymentProof) return false;
    if (activeTab === 'history' && !s.paymentProof) return false;

    const term = searchTerm.toLowerCase();
    return (
      s.id.toLowerCase().includes(term) ||
      s.offerNo.toLowerCase().includes(term) ||
      s.vendor.toLowerCase().includes(term) ||
      s.location.toLowerCase().includes(term) ||
      s.checker.toLowerCase().includes(term)
    );
  });

  const paymentCount = services.filter(s => !s.paymentProof).length;
  const historyCount = services.filter(s => !!s.paymentProof).length;

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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Service Execution</h1>
        <p className="text-gray-500">Manage and track service orders execution workflows.</p>
      </div>

      {/* Tabs */}
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border-l-4 border-l-amber-500 border border-gray-200 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Payment Pending</p>
          <h4 className="text-2xl font-bold text-gray-900 mt-1">{paymentCount}</h4>
        </div>
        <div className="bg-white p-5 rounded-2xl border-l-4 border-l-emerald-600 border border-gray-200 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Completed</p>
          <h4 className="text-2xl font-bold text-gray-900 mt-1">{historyCount}</h4>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by service no, offer no, vendor, location or checker..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-gray-900/20 focus:border-gray-900 transition-all"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-2">
          <Loader2 className="animate-spin text-gray-900" size={32} />
          <p className="text-gray-400 text-sm">Loading service sheets...</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-240px)]">
          <div className="overflow-auto flex-1">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {activeTab === 'payment' && (
                    <>
                      <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Done</th>
                      <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Action</th>
                    </>
                  )}
                  <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Offer No.</th>
                  <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Service No.</th>
                  <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Firm Name</th>
                  <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Checker</th>
                  <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Total Amount</th>
                  <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">TDS</th>
                  <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Vendor</th>
                  <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Location</th>
                  <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Status</th>
                  <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Planned Date</th>
                  {activeTab === 'payment' && (
                    <>
                      <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Bill No.</th>
                      <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Bill Copy</th>
                    </>
                  )}
                  {activeTab === 'history' && (
                    <>
                      <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Bill No.</th>
                      <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Bill Copy</th>
                      <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Payment Date</th>
                      <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Payment Proof</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredServices.map((service) => (
                  <tr key={service.sheetRowIndex} className="hover:bg-gray-50 transition-colors">
                    {/* Checkbox + Action — first columns on Make Payment tab */}
                    {activeTab === 'payment' && (
                      <>
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            checked={false}
                            onChange={() => openConfirm(service)}
                            disabled={isSaving}
                            title="Mark payment as done"
                            className="w-4 h-4 rounded cursor-pointer"
                            style={{ accentColor: '#1e3a5f' }}
                          />
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {service.paymentForm ? (
                            <a href={service.paymentForm} target="_blank" rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-lg text-xs font-bold text-amber-700 transition-all">
                              <CreditCard size={13} /><span>Payment Form</span>
                            </a>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                      </>
                    )}

                    <td className="px-4 py-4 text-sm font-semibold text-gray-600 whitespace-nowrap">{service.offerNo}</td>
                    <td className="px-4 py-4 text-sm font-bold text-gray-900 whitespace-nowrap">{service.id}</td>
                    <td className="px-4 py-4 text-sm text-gray-600 font-medium whitespace-nowrap">{service.firmName}</td>
                    <td className="px-4 py-4 text-sm text-gray-600 whitespace-nowrap">{service.checker}</td>
                    <td className="px-4 py-4 text-sm font-bold text-gray-900 whitespace-nowrap">{formatCurrency(service.amount)}</td>
                    <td className="px-4 py-4 text-sm text-gray-600 whitespace-nowrap">{formatCurrency(service.tdsAmount)}</td>
                    <td className="px-4 py-4 text-sm text-gray-800 font-medium whitespace-nowrap">{service.vendor}</td>
                    <td className="px-4 py-4 text-sm text-gray-600 whitespace-nowrap">{service.location}</td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={cn("px-2.5 py-1 text-xs font-semibold rounded-full", getStatusColor(service.status))}>
                        {service.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {service.planned2 ? (
                        <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-full">
                          {service.planned2}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>

                    {activeTab === 'payment' && (
                      <>
                        <td className="px-4 py-4 text-sm text-gray-700 font-medium whitespace-nowrap">{service.billNo || '—'}</td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {service.billCopy ? (
                            <a href={service.billCopy} target="_blank" rel="noreferrer"
                              className="flex items-center gap-1.5 text-xs font-bold text-gray-700 hover:text-gray-900 transition-colors">
                              <FileText size={14} /><span>View</span>
                            </a>
                          ) : <span className="text-xs text-gray-400">—</span>}
                        </td>
                      </>
                    )}

                    {activeTab === 'history' && (
                      <>
                        <td className="px-4 py-4 text-sm text-gray-700 font-medium whitespace-nowrap">{service.billNo || '—'}</td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {service.billCopy ? (
                            <a href={service.billCopy} target="_blank" rel="noreferrer"
                              className="flex items-center gap-1.5 text-xs font-bold text-gray-700 hover:text-gray-900 transition-colors">
                              <FileText size={14} /><span>View</span>
                            </a>
                          ) : <span className="text-xs text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600 whitespace-nowrap">{service.actual2 || '—'}</td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {service.paymentProof && service.paymentProof.startsWith('http') ? (
                            <a href={service.paymentProof} target="_blank" rel="noreferrer"
                              className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-800 transition-colors">
                              <CheckCircle2 size={14} /><span>View Proof</span>
                            </a>
                          ) : (
                            <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                              <CheckCircle2 size={14} />{service.paymentProof || '—'}
                            </span>
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
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

      {/* ── Payment Confirm Modal ──────────────────────────────── */}
      {confirmService && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-100">
            {/* Header */}
            <div className="px-6 py-4 border-b flex items-center justify-between"
              style={{ background: 'linear-gradient(90deg, #f2f5ea, #fafafa)' }}>
              <div>
                <h3 className="font-bold text-gray-900">Payment Done — {confirmService.id}</h3>
                <p className="text-xs text-gray-500 mt-0.5">Confirm payment completion details</p>
              </div>
              <button disabled={isSaving} onClick={() => setConfirmService(null)}
                className="text-gray-400 hover:text-gray-600 rounded-lg p-1 hover:bg-gray-100 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Service summary */}
              <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50 rounded-xl text-sm border border-gray-100">
                <div>
                  <span className="text-xs text-gray-400 uppercase font-bold block">Vendor</span>
                  <span className="font-semibold text-gray-800 mt-0.5">{confirmService.vendor}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-400 uppercase font-bold block">Net Payable</span>
                  <span className="font-bold text-emerald-700 mt-0.5">
                    {formatCurrency((confirmService.amount || 0) - (confirmService.tdsAmount || 0))}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-400 uppercase font-bold block">Firm</span>
                  <span className="font-semibold text-gray-800 mt-0.5">{confirmService.firmName}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-400 uppercase font-bold block">Bill No.</span>
                  <span className="font-semibold text-gray-800 mt-0.5">{confirmService.billNo || '—'}</span>
                </div>
              </div>

              {/* Payment Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase">Payment Date *</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  disabled={isSaving}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white transition-all"
                />
              </div>

              {/* Payment Note / Reference */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase">Payment Reference / Note</label>
                <input
                  type="text"
                  placeholder="e.g. UTR-123456 or NEFT reference"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  disabled={isSaving}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white transition-all"
                />
                <p className="text-xs text-gray-400">Yeh Payment Proof ke roop mein save hoga (optional)</p>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                <button type="button" disabled={isSaving} onClick={() => setConfirmService(null)}
                  className="px-4 py-2.5 border border-gray-200 rounded-xl text-gray-600 text-sm hover:bg-gray-50 font-semibold transition-all">
                  Cancel
                </button>
                <button onClick={handleConfirmPayment} disabled={isSaving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-gray-900/10">
                  {isSaving
                    ? <><Loader2 className="animate-spin" size={16} /><span>Saving...</span></>
                    : <><CheckCircle2 size={15} /><span>Confirm Payment Done</span></>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Services;
