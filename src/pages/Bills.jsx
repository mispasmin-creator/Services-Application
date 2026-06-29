import React, { useState, useRef, useEffect } from 'react';
import {
  Search, Loader2, FileText, X,
  Upload, Paperclip, ExternalLink
} from 'lucide-react';
import useDataStore from '../store/useDataStore';
import { cn, formatCurrency, uploadFileToDrive } from '../lib/utils';
import useAuthStore from '../store/useAuthStore';
import { getAllowedTabs } from '../lib/permissions';

const Bills = () => {
  const { user: currentUser } = useAuthStore();
  const { services, loading, updateService } = useDataStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('active');
  const [isSaving, setIsSaving] = useState(false);

  // ── Upload Bill modal ────────────────────────────────────────────
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedForUpload, setSelectedForUpload] = useState(null);
  const [billForm, setBillForm] = useState({ billNo: '', billCopy: '' });
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);


  const openUploadModal = (s) => {
    setSelectedForUpload(s);
    setBillForm({ billNo: s.billNo || '', billCopy: s.billCopy || '' });
    setUploadedFile(s.billCopy ? { name: 'Current Bill Copy', url: s.billCopy } : null);
    setUploadError('');
    setIsUploadModalOpen(true);
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setUploadError('File too large. Max 10MB.'); return; }
    setIsUploading(true);
    setUploadError('');
    try {
      const url = await uploadFileToDrive(file);
      setUploadedFile({ name: file.name, url });
      setBillForm(prev => ({ ...prev, billCopy: url }));
    } catch (err) {
      setUploadError('Upload error: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveBill = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateService(selectedForUpload.sheetRowIndex, {
        billNo: billForm.billNo,
        billCopy: billForm.billCopy,
      });
      setIsUploadModalOpen(false);
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // billStatus helper — History = billCopy uploaded
  const getBillStatus = (s) => {
    if (s.billCopy) return 'Bill Uploaded';
    return 'Awaiting Bill';
  };

  const getBillStatusColor = (status) => {
    if (status === 'Bill Uploaded') return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
    return 'bg-red-50 text-red-500 border border-red-100';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed':       return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
      case 'Payment Pending': return 'bg-rose-100 text-rose-700 border border-rose-200';
      case 'Bill Received':   return 'bg-indigo-100 text-indigo-700 border border-indigo-200';
      case 'Work Started':    return 'bg-blue-100 text-blue-700 border border-blue-200';
      default:                return 'bg-gray-100 text-gray-700 border border-gray-200';
    }
  };

  // Filtered service list
  const filteredServices = services.filter(s => {
    if (activeTab === 'active'  &&  s.billCopy) return false;
    if (activeTab === 'history' && !s.billCopy) return false;

    const term = searchTerm.toLowerCase();
    return (
      s.id.toLowerCase().includes(term) ||
      s.offerNo.toLowerCase().includes(term) ||
      s.vendor.toLowerCase().includes(term) ||
      s.firmName.toLowerCase().includes(term) ||
      (s.billNo || '').toLowerCase().includes(term)
    );
  });

  const activeCount  = services.filter(s => !s.billCopy).length;
  const historyCount = services.filter(s => !!s.billCopy).length;

  const billsTabsConfig = [
    { id: 'active',  label: 'Active Bills', count: activeCount,  colorClass: 'bg-amber-100 text-amber-800'    },
    { id: 'history', label: 'History',      count: historyCount, colorClass: 'bg-emerald-100 text-emerald-800' },
  ];
  const visibleTabs   = getAllowedTabs(currentUser, 'Bills', billsTabsConfig);
  const visibleTabIds = visibleTabs.map(t => t.id).join(',');

  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.some(t => t.id === activeTab)) {
      setActiveTab(visibleTabs[0].id);
    }
  }, [visibleTabIds, activeTab]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Centralized Bills</h1>
        <p className="text-gray-500">Upload, verify and track all service bills.</p>
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
        <div className="bg-white p-5 rounded-2xl border-l-4 border-l-red-400 border border-gray-200 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Awaiting Bill</p>
          <h4 className="text-2xl font-bold text-gray-900 mt-1">{activeCount}</h4>
        </div>
        <div className="bg-white p-5 rounded-2xl border-l-4 border-l-emerald-600 border border-gray-200 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Bill Uploaded</p>
          <h4 className="text-2xl font-bold text-gray-900 mt-1">{historyCount}</h4>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by service no, offer no, vendor, firm or bill no..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-900 transition-all"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-2">
          <Loader2 className="animate-spin text-gray-900" size={32} />
          <p className="text-gray-400 text-sm">Loading bills...</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Offer No.</th>
                  <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Service No.</th>
                  <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Firm Name</th>
                  <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Checker</th>
                  <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Total Amount</th>
                  <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">TDS</th>
                  <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Vendor</th>
                  <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Location</th>
                  <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Service Status</th>
                  <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Planned Date</th>
                  <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Bill No.</th>
                  <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Bill Copy</th>
                  <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Bill Status</th>
                  <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredServices.map((s) => {
                  const billStatus = getBillStatus(s);
                  return (
                    <tr key={s.sheetRowIndex} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4 text-sm font-semibold text-gray-600 whitespace-nowrap">{s.offerNo}</td>
                      <td className="px-4 py-4 text-sm font-bold text-gray-900 whitespace-nowrap">{s.id}</td>
                      <td className="px-4 py-4 text-sm text-gray-600 font-medium whitespace-nowrap">{s.firmName}</td>
                      <td className="px-4 py-4 text-sm text-gray-600 whitespace-nowrap">{s.checker}</td>
                      <td className="px-4 py-4 text-sm font-bold text-gray-900 whitespace-nowrap">{formatCurrency(s.amount)}</td>
                      <td className="px-4 py-4 text-sm text-gray-600 whitespace-nowrap">{formatCurrency(s.tdsAmount)}</td>
                      <td className="px-4 py-4 text-sm text-gray-800 font-medium whitespace-nowrap">{s.vendor}</td>
                      <td className="px-4 py-4 text-sm text-gray-600 whitespace-nowrap">{s.location}</td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={cn("px-2.5 py-1 text-xs font-semibold rounded-full", getStatusColor(s.status))}>
                          {s.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {s.planned1 ? (
                          <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-full">
                            {s.planned1}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700 font-medium whitespace-nowrap">{s.billNo || '—'}</td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {s.billCopy ? (
                          <a href={s.billCopy} target="_blank" rel="noreferrer"
                            className="flex items-center gap-1.5 text-xs font-bold text-gray-700 hover:text-gray-900 transition-colors">
                            <FileText size={14} /><span>View</span>
                          </a>
                        ) : <span className="text-xs text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={cn("px-2.5 py-1 text-xs font-semibold rounded-full", getBillStatusColor(billStatus))}>
                          {billStatus}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right whitespace-nowrap">
                        {billStatus === 'Awaiting Bill' && (
                          <button onClick={() => openUploadModal(s)} disabled={isSaving}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-all ml-auto">
                            <Upload size={13} /><span>Upload Bill</span>
                          </button>
                        )}
                        {billStatus === 'Bill Uploaded' && (
                          <button onClick={() => openUploadModal(s)} disabled={isSaving}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition-all ml-auto">
                            <Upload size={13} /><span>Edit Bill</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredServices.length === 0 && (
                  <tr>
                    <td colSpan={13} className="px-6 py-10 text-center text-gray-400 text-sm">
                      No bills found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Upload Bill Modal ──────────────────────────────────── */}
      {isUploadModalOpen && selectedForUpload && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-gray-100">
            <div className="px-6 py-4 border-b border-indigo-100 flex items-center justify-between"
              style={{ background: 'linear-gradient(90deg, #eef2ff, #f5f3ff)' }}>
              <div>
                <h3 className="font-bold text-indigo-900">Upload Bill — {selectedForUpload.id}</h3>
                <p className="text-xs text-indigo-500 mt-0.5">Enter bill number and upload bill copy</p>
              </div>
              <button disabled={isSaving} onClick={() => setIsUploadModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 rounded-lg p-1 hover:bg-gray-100 transition-colors">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveBill} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-xl text-sm">
                <div>
                  <span className="text-gray-400 text-xs uppercase font-bold">Vendor</span>
                  <p className="font-semibold text-gray-800 mt-0.5">{selectedForUpload.vendor}</p>
                </div>
                <div>
                  <span className="text-gray-400 text-xs uppercase font-bold">Net Payable</span>
                  <p className="font-bold text-emerald-700 mt-0.5">
                    {formatCurrency(selectedForUpload.amount - (selectedForUpload.tdsAmount || 0))}
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase">Bill No.</label>
                <input disabled={isSaving} type="text" placeholder="e.g. TAX/2026/099"
                  value={billForm.billNo}
                  onChange={(e) => setBillForm(prev => ({ ...prev, billNo: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-gray-900/20 focus:border-gray-900 transition-all" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase">Bill Copy</label>
                <input ref={fileInputRef} type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }} />
                {uploadedFile ? (
                  <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <Paperclip size={15} className="text-emerald-600 shrink-0" />
                    <span className="text-sm text-emerald-700 font-semibold truncate flex-1">{uploadedFile.name}</span>
                    <a href={uploadedFile.url} target="_blank" rel="noreferrer" className="text-emerald-600 hover:text-emerald-800 shrink-0"><ExternalLink size={14} /></a>
                    <button type="button" onClick={() => { setUploadedFile(null); setBillForm(prev => ({ ...prev, billCopy: '' })); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                      className="text-gray-400 hover:text-red-500 shrink-0"><X size={14} /></button>
                  </div>
                ) : (
                  <button type="button" disabled={isSaving || isUploading} onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 border-2 border-dashed border-gray-300 hover:border-indigo-400 hover:bg-indigo-50 rounded-xl text-sm text-gray-500 hover:text-indigo-700 transition-all">
                    {isUploading
                      ? <><Loader2 size={15} className="animate-spin" /><span className="font-medium">Uploading...</span></>
                      : <><Upload size={15} /><span className="font-medium">Click to upload bill copy</span></>}
                  </button>
                )}
                {uploadError && <p className="text-xs text-red-500 font-medium">{uploadError}</p>}
              </div>

              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                <button type="button" disabled={isSaving} onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2.5 border border-gray-200 rounded-xl text-gray-600 text-sm hover:bg-gray-50 font-semibold transition-all">
                  Cancel
                </button>
                <button type="submit" disabled={isSaving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-gray-900/10">
                  {isSaving ? <><Loader2 className="animate-spin" size={16} /><span>Saving...</span></> : <><FileText size={15} /><span>Save Bill</span></>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Bills;
