import React, { useState, useRef, useEffect } from 'react';
import {
  Search, CreditCard, Loader2, CheckCircle2,
  Clock, IndianRupee, Wrench, Zap, ExternalLink, X, AlertCircle,
  Upload, Paperclip
} from 'lucide-react';
import useDataStore from '../store/useDataStore';
import { cn, formatCurrency, uploadFileToDrive } from '../lib/utils';
import useAuthStore from '../store/useAuthStore';
import { getAllowedTabs } from '../lib/permissions';

const Payments = () => {
  const { user: currentUser } = useAuthStore();
  const { services, utilities, loading, updateService, updateUtility } = useDataStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [activeTab, setActiveTab] = useState('active'); // active, history
  const [isSaving, setIsSaving] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [paymentProof, setPaymentProof] = useState('');
  const [paymentDate, setPaymentDate] = useState('');

  const [uploadedFile, setUploadedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

  const handleFileUpload = async (file) => {
    if (!file) return;
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setUploadError('File too large. Max 10MB allowed.');
      return;
    }
    setIsUploading(true);
    setUploadError('');
    try {
      const fileUrl = await uploadFileToDrive(file);
      setUploadedFile({ name: file.name, url: fileUrl });
      setPaymentProof(fileUrl);
    } catch (err) {
      setUploadError('Upload error: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  // Collect items ready for payment (Verified bills)
  const servicePayments = services
    .filter(s => s.status3 === 'Verified' || s.status === 'Payment Pending')
    .map(s => ({
      ...s,
      type: 'Service',
      paidTo: s.vendor,
      paymentStatus: (s.actual2 && !s.planned2) || s.status4 === 'Paid' ? 'Paid' : 'Payment Pending',
      paymentProofUrl: s.paymentProof,
      netAmount: s.amount - (s.tdsAmount || 0),
    }));

  const utilityPayments = utilities
    .filter(u => u.status === 'Approved' || u.status === 'Paid')
    .map(u => ({
      ...u,
      type: 'Utility',
      paidTo: u.payTo,
      paymentStatus: u.status === 'Paid' ? 'Paid' : 'Approved',
      paymentProofUrl: '',
      netAmount: u.amount - (u.tdsAmount || 0),
    }));

  let allPayments = [...servicePayments, ...utilityPayments];

  if (filterType !== 'All') {
    allPayments = allPayments.filter(p => p.type === filterType);
  }

  if (searchTerm) {
    allPayments = allPayments.filter(p =>
      p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.paidTo || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  const pendingCount = allPayments.filter(p => p.paymentStatus !== 'Paid' && p.paymentStatus !== 'Payment Done').length;
  const paidCount = allPayments.filter(p => p.paymentStatus === 'Paid' || p.paymentStatus === 'Payment Done').length;

  // Tab Selector counts (unfiltered by search/type)
  const totalActiveCount = servicePayments.filter(p => p.paymentStatus !== 'Paid' && p.paymentStatus !== 'Payment Done').length + 
                           utilityPayments.filter(p => p.paymentStatus !== 'Paid' && p.paymentStatus !== 'Payment Done').length;
  const totalPaidCount = servicePayments.filter(p => p.paymentStatus === 'Paid' || p.paymentStatus === 'Payment Done').length + 
                         utilityPayments.filter(p => p.paymentStatus === 'Paid' || p.paymentStatus === 'Payment Done').length;

  // Filter by activeTab (Active vs History)
  if (activeTab === 'active') {
    allPayments = allPayments.filter(p => p.paymentStatus !== 'Paid' && p.paymentStatus !== 'Payment Done');
  } else if (activeTab === 'history') {
    allPayments = allPayments.filter(p => p.paymentStatus === 'Paid' || p.paymentStatus === 'Payment Done');
  }

  const totalAmount = allPayments.reduce((sum, p) => sum + (p.netAmount || 0), 0);

  const paymentsTabsConfig = [
    { id: 'active', label: 'Active Payments', count: totalActiveCount, colorClass: 'bg-blue-100 text-blue-800' },
    { id: 'history', label: 'History', count: totalPaidCount, colorClass: 'bg-emerald-100 text-emerald-800' }
  ];
  const visibleTabs = getAllowedTabs(currentUser, 'Payments', paymentsTabsConfig);
  const visibleTabIds = visibleTabs.map(t => t.id).join(',');

  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.some(t => t.id === activeTab)) {
      setActiveTab(visibleTabs[0].id);
    }
  }, [visibleTabIds, activeTab]);

  const openPayModal = (item) => {
    setSelectedItem(item);
    setPaymentProof(item.paymentProofUrl || '');
    if (item.paymentProofUrl) {
      setUploadedFile({ name: 'Current Payment Proof', url: item.paymentProofUrl });
    } else {
      setUploadedFile(null);
    }
    setUploadError('');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setIsPayModalOpen(true);
  };

  const handleMakePayment = async (e) => {
    e.preventDefault();
    if (!paymentDate) {
      alert('Please enter payment date.');
      return;
    }
    setIsSaving(true);
    try {
      if (selectedItem.type === 'Service') {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const realDateTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

        await updateService(selectedItem.sheetRowIndex, {
          actual2: realDateTime,
          planned2: '',
          paymentProof: paymentProof || ''
        });
      } else {
        await updateUtility(selectedItem.sheetRowIndex, {
          status: 'Paid',
          actual1: paymentDate
        });
      }
      setIsPayModalOpen(false);
      alert(`Payment marked as completed for ${selectedItem.id}!`);
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payment Processing</h1>
        <p className="text-gray-500">Release payments for verified bills and upload payment proofs.</p>
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
            <span className={cn(
              "px-2.5 py-0.5 text-xs font-bold rounded-full transition-colors",
              activeTab === tab.id ? tab.colorClass : "bg-gray-100 text-gray-600"
            )}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border-l-4 border-l-amber-500 border border-gray-200 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Pending Payment</p>
          <h4 className="text-2xl font-bold text-gray-900 mt-1">{pendingCount}</h4>
        </div>
        <div className="bg-white p-6 rounded-2xl border-l-4 border-l-emerald-500 border border-gray-200 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Payments Released</p>
          <h4 className="text-2xl font-bold text-gray-900 mt-1">{paidCount}</h4>
        </div>
        <div className="bg-white p-6 rounded-2xl border-l-4 border-l-gray-900 border border-gray-200 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Total Net Amount</p>
          <h4 className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totalAmount)}</h4>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by reference ID or vendor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-900 transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          {['All', 'Service', 'Utility'].map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-semibold transition-all border",
                filterType === type
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
              )}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Payment Table */}
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-2">
          <Loader2 className="animate-spin text-gray-900" size={32} />
          <p className="text-gray-400 text-sm">Loading payments...</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Reference</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Pay To</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Bill Amount</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">TDS</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Net Payable</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {allPayments.map((item, index) => (
                  <tr key={`pay-${item.type}-${item.sheetRowIndex}-${index}`} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-1 rounded-md text-[10px] font-bold uppercase flex items-center gap-1 w-fit",
                        item.type === 'Service'
                          ? "bg-gray-100 text-gray-700 border border-gray-200"
                          : "bg-gray-900 text-white border border-gray-900"
                      )}>
                        {item.type === 'Service' ? <Wrench size={10} /> : <Zap size={10} />}
                        {item.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900">{item.id}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-medium">{item.paidTo}</td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900">{formatCurrency(item.amount)}</td>
                    <td className="px-6 py-4 text-sm text-rose-600 font-semibold">
                      {item.tdsAmount ? `- ${formatCurrency(item.tdsAmount)}` : '—'}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-emerald-700">{formatCurrency(item.netAmount)}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-xs font-bold",
                        (item.paymentStatus === 'Paid' || item.paymentStatus === 'Payment Done') && "bg-emerald-100 text-emerald-700",
                        item.paymentStatus === 'Approved' && "bg-indigo-100 text-indigo-700",
                        item.paymentStatus === 'Payment Pending' && "bg-amber-100 text-amber-700",
                        item.paymentStatus === 'Verified' && "bg-blue-100 text-blue-700"
                      )}>
                        {item.paymentStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {item.paymentStatus !== 'Paid' && item.paymentStatus !== 'Payment Done' ? (
                        <button
                          onClick={() => openPayModal(item)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold transition-all border border-gray-200 ml-auto"
                        >
                          <CreditCard size={13} />
                          <span>Release Payment</span>
                        </button>
                      ) : (
                        <span className="text-xs text-emerald-600 font-bold px-2 py-1.5 flex items-center gap-1 justify-end">
                          <CheckCircle2 size={12} /> Paid
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {allPayments.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-10 text-center text-gray-400 text-sm">
                      {activeTab === 'active'
                        ? "No payments pending. Verify bills first in the Bills module."
                        : "No payment history records found."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payment Release Modal */}
      {isPayModalOpen && selectedItem && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-100">
            <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-800">Release Payment</h3>
                <p className="text-xs text-gray-400 mt-0.5">{selectedItem.id} — {selectedItem.paidTo}</p>
              </div>
              <button
                disabled={isSaving}
                onClick={() => setIsPayModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 rounded-lg p-1 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleMakePayment} className="p-6 space-y-4">
              {/* Summary */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-2">
                <div className="grid grid-cols-2 gap-y-1.5 text-xs">
                  <span className="text-gray-500">Bill Amount:</span>
                  <span className="font-bold text-gray-800 text-right">{formatCurrency(selectedItem.amount)}</span>
                  <span className="text-gray-500">TDS Deduction:</span>
                  <span className="font-bold text-rose-600 text-right">- {formatCurrency(selectedItem.tdsAmount || 0)}</span>
                  <span className="text-gray-700 font-bold border-t border-gray-200 pt-1">Net Payable:</span>
                  <span className="font-bold text-emerald-700 text-right border-t border-gray-200 pt-1">{formatCurrency(selectedItem.netAmount)}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase">Payment Date *</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-gray-900/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase">Payment Proof (Upload File) *</label>

                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                />

                {/* Upload button or preview */}
                {uploadedFile ? (
                  <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <Paperclip size={14} className="text-emerald-600 shrink-0" />
                    <span className="text-xs text-emerald-700 font-semibold truncate flex-1">{uploadedFile.name}</span>
                    <a href={uploadedFile.url} target="_blank" rel="noreferrer" className="text-emerald-600 hover:text-emerald-800">
                      <ExternalLink size={12} />
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        setUploadedFile(null);
                        setPaymentProof('');
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={isSaving || isUploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-50 border-2 border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-50 rounded-xl text-sm text-gray-500 hover:text-gray-900 transition-all"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 size={15} className="animate-spin text-gray-900" />
                        <span className="text-xs font-medium">Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Upload size={15} className="text-gray-400" />
                        <span className="text-xs font-medium">Click to upload payment proof</span>
                      </>
                    )}
                  </button>
                )}

                {uploadError && (
                  <p className="text-[10px] text-red-500 font-medium mt-1">{uploadError}</p>
                )}
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => setIsPayModalOpen(false)}
                  className="px-4 py-2.5 border border-gray-200 rounded-xl text-gray-600 text-sm hover:bg-gray-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-lg"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard size={16} />
                      <span>Confirm Payment</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payments;
