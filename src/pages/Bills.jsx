import React, { useState, useEffect } from 'react';
import {
  Search, Receipt, Loader2, Eye, ExternalLink,
  AlertTriangle, CheckCircle2, Clock, FileText, Zap, Wrench, X
} from 'lucide-react';
import useDataStore from '../store/useDataStore';
import { cn, formatCurrency } from '../lib/utils';
import useAuthStore from '../store/useAuthStore';
import { getAllowedTabs } from '../lib/permissions';

const Bills = () => {
  const { user: currentUser } = useAuthStore();
  const { services, utilities, loading, updateService, updateUtility } = useDataStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All'); // All, Service, Utility
  const [activeTab, setActiveTab] = useState('active'); // active, history
  const [isSaving, setIsSaving] = useState(false);

  // Aggregate bills from Services and Utilities
  const serviceBills = services
    .map(s => ({
      ...s,
      type: 'Service',
      billRef: s.billNo,
      billUrl: s.billCopy,
      paidTo: s.vendor,
      date: s.date,
      billStatus: (s.actual1 && !s.planned1) || s.status3 === 'Verified' ? 'Verified' : (s.billCopy ? 'Bill Uploaded' : 'Awaiting Bill'),
    }));

  const utilityBills = utilities
    .map(u => ({
      ...u,
      type: 'Utility',
      billRef: u.id,
      billUrl: u.billImage,
      paidTo: u.payTo,
      date: u.billDate || u.date,
      billStatus: u.status,
    }));

  let allBills = [...serviceBills, ...utilityBills];

  // Filter by activeTab (Active vs History)
  if (activeTab === 'active') {
    allBills = allBills.filter(b => b.billStatus !== 'Verified' && b.billStatus !== 'Approved');
  } else if (activeTab === 'history') {
    allBills = allBills.filter(b => b.billStatus === 'Verified' || b.billStatus === 'Approved');
  }

  // Filter by type
  if (filterType !== 'All') {
    allBills = allBills.filter(b => b.type === filterType);
  }

  // Filter by search
  if (searchTerm) {
    allBills = allBills.filter(b =>
      b.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.paidTo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.billRef || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [selectedBillForVerify, setSelectedBillForVerify] = useState(null);

  const openVerifyModal = (bill) => {
    setSelectedBillForVerify(bill);
    setIsVerifyModalOpen(true);
  };

  const handleVerifySubmit = async () => {
    if (!selectedBillForVerify) return;
    setIsSaving(true);
    try {
      if (selectedBillForVerify.type === 'Service') {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const realDateTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

        await updateService(selectedBillForVerify.sheetRowIndex, {
          actual1: realDateTime,
          planned1: ''
        });
        alert(`Service ${selectedBillForVerify.id} bill verified successfully!`);
      } else {
        const today = new Date().toISOString().split('T')[0];
        await updateUtility(selectedBillForVerify.sheetRowIndex, {
          status: 'Approved',
          actual1: today
        });
        alert(`Utility ${selectedBillForVerify.id} bill approved successfully!`);
      }
      setIsVerifyModalOpen(false);
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const totalServiceBills = serviceBills.length;
  const totalUtilityBills = utilityBills.length;
  const pendingVerification = allBills.filter(b =>
    b.type === 'Service' ? b.billStatus !== 'Verified' : b.billStatus === 'Bill Received'
  ).length;

  const billsTabsConfig = [
    { id: 'active', label: 'Active Bills', count: serviceBills.filter(b => b.billStatus !== 'Verified' && b.billStatus !== 'Approved').length + utilityBills.filter(b => b.billStatus !== 'Verified' && b.billStatus !== 'Approved').length, colorClass: 'bg-amber-100 text-amber-800' },
    { id: 'history', label: 'History', count: serviceBills.filter(b => b.billStatus === 'Verified' || b.billStatus === 'Approved').length + utilityBills.filter(b => b.billStatus === 'Verified' || b.billStatus === 'Approved').length, colorClass: 'bg-emerald-100 text-emerald-800' }
  ];
  const visibleTabs = getAllowedTabs(currentUser, 'Bills', billsTabsConfig);
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
        <p className="text-gray-500">Unified view of all Service and Utility bills for upload, verification, and tracking.</p>
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
        <div className="bg-white p-6 rounded-2xl border-l-4 border-l-blue-500 border border-gray-200 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Service Bills</p>
          <h4 className="text-2xl font-bold text-gray-900 mt-1">{totalServiceBills}</h4>
        </div>
        <div className="bg-white p-6 rounded-2xl border-l-4 border-l-purple-500 border border-gray-200 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Utility Bills</p>
          <h4 className="text-2xl font-bold text-gray-900 mt-1">{totalUtilityBills}</h4>
        </div>
        <div className="bg-white p-6 rounded-2xl border-l-4 border-l-amber-500 border border-gray-200 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Pending Verification</p>
          <h4 className="text-2xl font-bold text-gray-900 mt-1">{pendingVerification}</h4>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by ID, vendor, bill number..."
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
                  ? "bg-gray-900 text-white border-gray-900 shadow-lg shadow-gray-900/10"
                  : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
              )}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Bills Table */}
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
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Reference</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Pay To</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Bill Copy</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {allBills.map((bill, index) => (
                  <tr key={`${bill.type}-${bill.sheetRowIndex}-${index}`} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-1 rounded-md text-[10px] font-bold uppercase flex items-center gap-1 w-fit",
                        bill.type === 'Service'
                          ? "bg-gray-100 text-gray-700 border-gray-200"
                          : "bg-gray-900 text-white border-gray-900"
                      )}>
                        {bill.type === 'Service' ? <Wrench size={10} /> : <Zap size={10} />}
                        {bill.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-900">{bill.id}</span>
                        {bill.billRef && <span className="text-xs text-gray-400 mt-0.5">Bill: {bill.billRef}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{bill.paidTo}</td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900">{formatCurrency(bill.amount)}</td>
                    <td className="px-6 py-4">
                      {bill.billUrl ? (
                        <a
                          href={bill.billUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 text-xs text-gray-700 hover:text-gray-900 font-semibold"
                        >
                          <Eye size={13} />
                          <span>Preview</span>
                          <ExternalLink size={11} />
                        </a>
                      ) : (
                        <span className="text-xs text-gray-400 font-medium">No bill uploaded</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-xs font-bold inline-block",
                        bill.billStatus === 'Verified' && "bg-emerald-100 text-emerald-700",
                        bill.billStatus === 'Approved' && "bg-indigo-100 text-indigo-700",
                        bill.billStatus === 'Bill Uploaded' && "bg-blue-100 text-blue-700",
                        bill.billStatus === 'Bill Received' && "bg-amber-100 text-amber-700",
                        bill.billStatus === 'Awaiting Bill' && "bg-red-50 text-red-500",
                        !['Verified', 'Approved', 'Bill Uploaded', 'Bill Received', 'Awaiting Bill'].includes(bill.billStatus) && "bg-gray-100 text-gray-600"
                      )}>
                        {bill.billStatus || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {bill.type === 'Service' && bill.billCopy && bill.billStatus !== 'Verified' && (
                        <button
                          disabled={isSaving}
                          onClick={() => openVerifyModal(bill)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold transition-all border border-emerald-100 ml-auto"
                        >
                          <CheckCircle2 size={13} />
                          <span>Verify</span>
                        </button>
                      )}
                      {bill.type === 'Utility' && bill.billStatus === 'Bill Received' && (
                        <button
                          disabled={isSaving}
                          onClick={() => openVerifyModal(bill)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-all border border-indigo-100 ml-auto"
                        >
                          <CheckCircle2 size={13} />
                          <span>Approve</span>
                        </button>
                      )}
                      {((bill.type === 'Service' && bill.billStatus === 'Verified') || (bill.type === 'Utility' && bill.billStatus === 'Approved')) && (
                        <span className="text-xs text-emerald-600 font-bold px-2 py-1.5">✓ Done</span>
                      )}
                    </td>
                  </tr>
                ))}
                {allBills.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-gray-400 text-sm">
                      No bills found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Verify / Approve Modal */}
      {isVerifyModalOpen && selectedBillForVerify && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-100">
            <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-800 text-sm md:text-base">
                  {selectedBillForVerify.type === 'Service' ? 'Verify Service Bill' : 'Approve Utility Bill'}
                </h3>
                <p className="text-[10px] text-gray-400 mt-0.5">Please review the details below before proceeding</p>
              </div>
              <button
                disabled={isSaving}
                onClick={() => setIsVerifyModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 rounded-lg p-1 hover:bg-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="space-y-2.5 bg-gray-50 p-4 rounded-xl border border-gray-100 text-xs">
                <div className="flex justify-between border-b border-gray-200/50 pb-1.5">
                  <span className="text-gray-400 font-semibold uppercase">Reference ID</span>
                  <span className="text-gray-800 font-bold">{selectedBillForVerify.id}</span>
                </div>
                <div className="flex justify-between border-b border-gray-200/50 pb-1.5">
                  <span className="text-gray-400 font-semibold uppercase">Type</span>
                  <span className="text-gray-800 font-bold">{selectedBillForVerify.type}</span>
                </div>
                <div className="flex justify-between border-b border-gray-200/50 pb-1.5">
                  <span className="text-gray-400 font-semibold uppercase">Pay To / Vendor</span>
                  <span className="text-gray-800 font-bold">{selectedBillForVerify.paidTo}</span>
                </div>
                {selectedBillForVerify.type === 'Service' && (
                  <>
                    <div className="flex justify-between border-b border-gray-200/50 pb-1.5">
                      <span className="text-gray-400 font-semibold uppercase">Firm Name</span>
                      <span className="text-gray-800 font-bold">{selectedBillForVerify.firmName}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-200/50 pb-1.5">
                      <span className="text-gray-400 font-semibold uppercase">Service Checker</span>
                      <span className="text-gray-800 font-bold">{selectedBillForVerify.checker}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-200/50 pb-1.5">
                      <span className="text-gray-400 font-semibold uppercase">Planned Start Date</span>
                      <span className="text-gray-800 font-bold">{selectedBillForVerify.planned1 || '—'}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-200/50 pb-1.5">
                      <span className="text-gray-400 font-semibold uppercase">Actual Start Date</span>
                      <span className="text-gray-800 font-bold">{selectedBillForVerify.actual1 || '—'}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-200/50 pb-1.5">
                      <span className="text-gray-400 font-semibold uppercase">Planned End Date</span>
                      <span className="text-gray-800 font-bold">{selectedBillForVerify.planned2 || '—'}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-200/50 pb-1.5">
                      <span className="text-gray-400 font-semibold uppercase">Actual End Date</span>
                      <span className="text-gray-800 font-bold">{selectedBillForVerify.actual2 || '—'}</span>
                    </div>
                  </>
                )}
                {selectedBillForVerify.type === 'Utility' && (
                  <div className="flex justify-between border-b border-gray-200/50 pb-1.5">
                    <span className="text-gray-400 font-semibold uppercase">Department</span>
                    <span className="text-gray-800 font-bold">{selectedBillForVerify.department}</span>
                  </div>
                )}
                <div className="flex justify-between border-b border-gray-200/50 pb-1.5">
                  <span className="text-gray-400 font-semibold uppercase">Bill Reference</span>
                  <span className="text-gray-800 font-bold">{selectedBillForVerify.billRef || '—'}</span>
                </div>
                <div className="flex justify-between border-b border-gray-200/50 pb-1.5">
                  <span className="text-gray-400 font-semibold uppercase">Total Amount</span>
                  <span className="text-gray-800 font-bold">{formatCurrency(selectedBillForVerify.amount)}</span>
                </div>
                {selectedBillForVerify.tdsAmount !== undefined && selectedBillForVerify.tdsAmount > 0 && (
                  <div className="flex justify-between border-b border-gray-200/50 pb-1.5">
                    <span className="text-gray-400 font-semibold uppercase">TDS Deduction</span>
                    <span className="text-rose-600 font-bold">- {formatCurrency(selectedBillForVerify.tdsAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between border-b border-gray-200/50 pb-1.5">
                  <span className="text-gray-400 font-semibold uppercase">Net Payable</span>
                  <span className="text-emerald-700 font-bold">
                    {formatCurrency(selectedBillForVerify.amount - (selectedBillForVerify.tdsAmount || 0))}
                  </span>
                </div>
                {(selectedBillForVerify.remark || selectedBillForVerify.remarks) && (
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-semibold uppercase">Remarks</span>
                    <span className="text-gray-600 font-medium text-right max-w-[200px] truncate" title={selectedBillForVerify.remark || selectedBillForVerify.remarks}>
                      {selectedBillForVerify.remark || selectedBillForVerify.remarks}
                    </span>
                  </div>
                )}
              </div>

              {selectedBillForVerify.billUrl && (
                <div className="flex items-center justify-between p-3 bg-blue-50/50 border border-blue-100 rounded-xl">
                  <div className="flex items-center gap-2">
                    <FileText size={15} className="text-blue-600 shrink-0" />
                    <span className="text-[11px] text-blue-800 font-semibold">Attached Bill Invoice</span>
                  </div>
                  <a
                    href={selectedBillForVerify.billUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-bold cursor-pointer"
                  >
                    <span>View Bill</span>
                    <ExternalLink size={10} />
                  </a>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => setIsVerifyModalOpen(false)}
                className="px-4 py-2.5 border border-gray-200 rounded-xl text-gray-700 text-xs hover:bg-gray-50 font-semibold transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleVerifySubmit}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-600/10 transition-all active:scale-95 cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="animate-spin" size={14} />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} />
                    <span>{selectedBillForVerify.type === 'Service' ? 'Verify & Proceed' : 'Approve & Proceed'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Bills;
