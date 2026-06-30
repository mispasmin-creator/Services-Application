import React, { useState, useEffect } from 'react';
import {
  Search, Database, Loader2, CheckCircle2,
  Wrench, Zap, X, BookOpen, ShieldCheck,
  ShieldAlert, AlertTriangle, AlertCircle,
  ExternalLink, Eye, CheckSquare, RefreshCw
} from 'lucide-react';
import useDataStore from '../store/useDataStore';
import { cn, formatCurrency, nowDateTime } from '../lib/utils';
import useAuthStore from '../store/useAuthStore';
import { getAllowedTabs } from '../lib/permissions';

const Tally = () => {
  const { user: currentUser } = useAuthStore();
  const { services, loading, updateService } = useDataStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('audit'); // 'audit', 'rectify', 'tally', 'completed'
  const [isSaving, setIsSaving] = useState(false);
  
  // Modals state
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isRectifyModalOpen, setIsRectifyModalOpen] = useState(false);
  const [isTallyModalOpen, setIsTallyModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  
  // Input fields for modals
  const [auditRemarks, setAuditRemarks] = useState('');
  const [rectificationReason, setRectificationReason] = useState('');
  const [showRectificationInput, setShowRectificationInput] = useState(false);
  const [resolutionNote, setResolutionNote] = useState('');
  const [tallyVoucher, setTallyVoucher] = useState('');
  const [tallyDate, setTallyDate] = useState('');
  const [tallyRemarks, setTallyRemarks] = useState('');

  // Show services where bill has been uploaded (same as Bills → History)
  const serviceTally = services
    .filter(s => !!s.billCopy)
    .map(s => ({
      ...s,
      type: 'Service',
      paidTo: s.vendor,
      tallyStatus: (s.status5 === 'Completed' || s.actual5) ? 'Completed' : 'Tally Pending',
      tallyVoucher: s.remarks5 || '',
      netAmount: s.amount - (s.tdsAmount || 0),
    }));

  const allTally = [...serviceTally];

  // Map items with audit status and comments
  const mappedTally = allTally.map(item => {
    let auditStatus = '';
    let auditRemarks = '';
    
    if (item.type === 'Service') {
      if (item.status4 === 'Audited') {
        auditStatus = 'Audited';
        auditRemarks = item.remarks4 || '';
      } else {
        auditStatus = item.status3 || '';
        auditRemarks = item.remarks3 || '';
      }
    } else {
      auditStatus = item.planned2 || '';
      auditRemarks = item.remarks || '';
    }
    
    // Determine stage
    let stage = 'audit';
    if (item.tallyStatus === 'Completed') {
      stage = 'completed';
    } else if (item.type === 'Service') {
      if (item.status3 === 'Rectify' && item.status4 !== 'Audited') {
        stage = 'rectify';
      } else if (item.status3 === 'Audited' || item.status4 === 'Audited') {
        stage = 'tally';
      } else {
        stage = 'audit';
      }
    } else {
      if (auditStatus === 'Rectify') {
        stage = 'rectify';
      } else if (auditStatus === 'Audited' || auditStatus === 'Done') {
        stage = 'tally';
      } else {
        stage = 'audit';
      }
    }
    
    return {
      ...item,
      auditStatus,
      auditRemarks,
      stage
    };
  });

  // Filter based on Search Term
  let filteredTally = mappedTally;
  if (searchTerm) {
    filteredTally = filteredTally.filter(t =>
      t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.paidTo || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  // Count elements per stage for the filtered set
  const auditCount = filteredTally.filter(t => t.stage === 'audit').length;
  const rectifyCount = filteredTally.filter(t => t.stage === 'rectify').length;
  const tallyCount = filteredTally.filter(t => t.stage === 'tally').length;
  const completedCount = filteredTally.filter(t => t.stage === 'completed').length;

  const activeTabItems = filteredTally.filter(t => t.stage === activeTab);
  
  // Total Accounting amount computed on completed vouchers
  const totalAmountCompleted = filteredTally
    .filter(t => t.stage === 'completed')
    .reduce((sum, t) => sum + (t.netAmount || 0), 0);

  const tallyTabsConfig = [
    { id: 'audit', label: '1. Audit Stage', count: auditCount, colorClass: 'bg-amber-100 text-amber-700' },
    { id: 'rectify', label: '2. Rectify Stage', count: rectifyCount, colorClass: 'bg-rose-100 text-rose-700' },
    { id: 'tally', label: '3. Tally Entry', count: tallyCount, colorClass: 'bg-indigo-100 text-indigo-700' },
    { id: 'completed', label: 'Completed', count: completedCount, colorClass: 'bg-emerald-100 text-emerald-700' }
  ];
  const visibleTabs = getAllowedTabs(currentUser, 'Tally', tallyTabsConfig);
  const visibleTabIds = visibleTabs.map(t => t.id).join(',');

  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.some(t => t.id === activeTab)) {
      setActiveTab(visibleTabs[0].id);
    }
  }, [visibleTabIds, activeTab]);

  // Modals Open Triggers
  const openAuditModal = (item) => {
    setSelectedItem(item);
    setAuditRemarks('');
    setRectificationReason('');
    setShowRectificationInput(false);
    setIsAuditModalOpen(true);
  };

  const openRectifyModal = (item) => {
    setSelectedItem(item);
    setResolutionNote('');
    setIsRectifyModalOpen(true);
  };

  const openTallyModal = (item) => {
    setSelectedItem(item);
    setTallyVoucher(item.tallyVoucher || '');
    setTallyDate(new Date().toISOString().split('T')[0]);
    setTallyRemarks('');
    setIsTallyModalOpen(true);
  };

  // Stage updates execution
  const handleAuditSubmit = async (status, remarks = '') => {
    setIsSaving(true);
    try {
      if (selectedItem.type === 'Service') {
        await updateService(selectedItem.sheetRowIndex, {
          actual3: nowDateTime(),
          status3: status,
          remarks3: remarks || (status === 'Audited' ? 'Approved in Audit' : '')
        });
      }
      setIsAuditModalOpen(false);
      alert(`Entry ${selectedItem.id} audit state updated to ${status === 'Audited' ? 'Done' : 'Rectify'}!`);
    } catch (err) {
      alert(`Error updating audit state: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRectifySubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const remarksText = resolutionNote ? `Rectified: ${resolutionNote}` : 'Rectified and approved';
      if (selectedItem.type === 'Service') {
        await updateService(selectedItem.sheetRowIndex, {
          actual4: nowDateTime(),
          status4: 'Audited',
          remarks4: remarksText
        });
      }
      setIsRectifyModalOpen(false);
      alert(`Entry ${selectedItem.id} marked as Rectified & sent to Tally Entry!`);
    } catch (err) {
      alert(`Error submitting resolution: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTallyEntry = async (e) => {
    e.preventDefault();
    if (!tallyDate) {
      alert('Please enter tally entry date.');
      return;
    }
    setIsSaving(true);
    try {
      const remarksText = tallyRemarks 
        ? `Voucher: ${tallyVoucher} (Remarks: ${tallyRemarks})` 
        : (tallyVoucher || 'Tally entry done');
      if (selectedItem.type === 'Service') {
        await updateService(selectedItem.sheetRowIndex, {
          actual5: tallyDate,
          status5: 'Completed',
          remarks5: remarksText
        });
      }
      setIsTallyModalOpen(false);
      alert(`Tally voucher recorded successfully for ${selectedItem.id}!`);
    } catch (err) {
      alert(`Error saving tally entry: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tally Accounting</h1>
          <p className="text-gray-500">Perform audits, handle rectification cases, and record tally voucher entries.</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border-l-4 border-l-amber-500 border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Awaiting Audit / Rectification</p>
            <h4 className="text-2xl font-bold text-gray-900 mt-1">{auditCount + rectifyCount} <span className="text-xs font-normal text-gray-400">entries</span></h4>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl">
            <ShieldAlert className="text-amber-500" size={24} />
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border-l-4 border-l-indigo-500 border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Ready for Tally Entry</p>
            <h4 className="text-2xl font-bold text-gray-900 mt-1">{tallyCount} <span className="text-xs font-normal text-gray-400">entries</span></h4>
          </div>
          <div className="p-3 bg-indigo-50 rounded-xl">
            <Database className="text-indigo-500" size={24} />
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border-l-4 border-l-emerald-500 border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Tallied Amount</p>
            <h4 className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totalAmountCompleted)}</h4>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl">
            <CheckCircle2 className="text-emerald-500" size={24} />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -trangray-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by reference ID or payee/vendor name..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-900 transition-all"
          />
        </div>
      </div>

      {/* Stages Tab Selector */}
      <div className="flex border-b border-gray-200 gap-1 overflow-x-auto pb-px">
        {visibleTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-5 py-3 font-semibold text-sm transition-all border-b-2 flex items-center gap-2.5 whitespace-nowrap cursor-pointer",
              activeTab === tab.id
                ? "border-gray-900 text-gray-900 font-bold"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            )}
          >
            <span>{tab.label}</span>
            <span className={cn(
              "px-2 py-0.5 text-xs font-bold rounded-full",
              activeTab === tab.id ? tab.colorClass : "bg-gray-100 text-gray-600"
            )}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Stage Content */}
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-2 bg-white rounded-2xl border border-gray-200">
          <Loader2 className="animate-spin text-gray-900" size={32} />
          <p className="text-gray-400 text-sm font-medium">Fetching staging data...</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-240px)]">
          <div className="overflow-auto flex-1">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Offer No.</th>
                  <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Service No.</th>
                  <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Firm Name</th>
                  <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Checker</th>
                  <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Total Amount</th>
                  <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">TDS</th>
                  <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Net Amount</th>
                  <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Vendor</th>
                  <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Location</th>
                  <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Status</th>
                  <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Bill No.</th>
                  <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Bill Copy</th>
                  <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Planned Date</th>
                  {activeTab === 'rectify' && (
                    <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Rectification Reason</th>
                  )}
                  {activeTab === 'completed' && (
                    <>
                      <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Voucher No.</th>
                      <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Tally Date</th>
                    </>
                  )}
                  <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {activeTabItems.map((item, index) => (
                  <tr key={`tally-stage-${item.type}-${item.sheetRowIndex}-${index}`} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-4 py-4 text-sm font-semibold text-gray-600 whitespace-nowrap">{item.offerNo || '—'}</td>
                    <td className="px-4 py-4 text-sm font-bold text-gray-900 whitespace-nowrap">{item.id}</td>
                    <td className="px-4 py-4 text-sm text-gray-600 font-medium whitespace-nowrap">{item.firmName || '—'}</td>
                    <td className="px-4 py-4 text-sm text-gray-600 whitespace-nowrap">{item.checker || '—'}</td>
                    <td className="px-4 py-4 text-sm font-bold text-gray-900 whitespace-nowrap">{formatCurrency(item.amount)}</td>
                    <td className="px-4 py-4 text-sm text-rose-600 font-semibold whitespace-nowrap">
                      {item.tdsAmount ? `- ${formatCurrency(item.tdsAmount)}` : '—'}
                    </td>
                    <td className="px-4 py-4 text-sm font-bold text-emerald-700 whitespace-nowrap">{formatCurrency(item.netAmount)}</td>
                    <td className="px-4 py-4 text-sm text-gray-800 font-medium whitespace-nowrap">{item.vendor || '—'}</td>
                    <td className="px-4 py-4 text-sm text-gray-600 whitespace-nowrap">{item.location || '—'}</td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={cn(
                        "px-2.5 py-1 text-xs font-semibold rounded-full",
                        item.status === 'Completed'       ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                        item.status === 'Payment Pending' ? 'bg-rose-100 text-rose-700 border border-rose-200' :
                        item.status === 'Bill Received'   ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' :
                        item.status === 'Tally Pending'   ? 'bg-purple-100 text-purple-700 border border-purple-200' :
                        'bg-gray-100 text-gray-700 border border-gray-200'
                      )}>
                        {item.status || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700 font-medium whitespace-nowrap">{item.billNo || '—'}</td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {item.billCopy ? (
                        <a href={item.billCopy} target="_blank" rel="noreferrer"
                          className="flex items-center gap-1.5 text-xs font-bold text-gray-700 hover:text-gray-900 transition-colors">
                          <Eye size={13} /><span>View</span>
                        </a>
                      ) : <span className="text-xs text-gray-400">—</span>}
                    </td>

                    {/* Planned Date — stage-wise */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      {(() => {
                        const planned =
                          activeTab === 'audit'     ? item.planned3 :
                          activeTab === 'rectify'   ? item.planned4 :
                          activeTab === 'tally'     ? item.planned5 :
                          activeTab === 'completed' ? item.planned5 : '';
                        return planned ? (
                          <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-full">
                            {planned}
                          </span>
                        ) : <span className="text-xs text-gray-400">—</span>;
                      })()}
                    </td>

                    {activeTab === 'rectify' && (
                      <td className="px-4 py-4 text-xs font-semibold text-rose-600 max-w-xs whitespace-nowrap" title={item.auditRemarks}>
                        <div className="flex items-center gap-1">
                          <AlertTriangle size={12} className="shrink-0" />
                          <span className="truncate max-w-[160px]">{item.auditRemarks || 'Needs corrections'}</span>
                        </div>
                      </td>
                    )}
                    {activeTab === 'completed' && (
                      <>
                        <td className="px-4 py-4 text-sm font-bold text-gray-700 whitespace-nowrap">
                          {item.tallyVoucher || <span className="text-gray-300 italic text-xs">N/A</span>}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-500 font-medium whitespace-nowrap">
                          {item.actual5 || '—'}
                        </td>
                      </>
                    )}

                    <td className="px-4 py-4 text-right whitespace-nowrap">
                      {activeTab === 'audit' && (
                        <button onClick={() => openAuditModal(item)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-xs font-bold transition-all cursor-pointer">
                          <ShieldAlert size={13} /><span>Verify Audit</span>
                        </button>
                      )}
                      {activeTab === 'rectify' && (
                        <button onClick={() => openRectifyModal(item)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-all cursor-pointer">
                          <CheckSquare size={13} /><span>Resolve</span>
                        </button>
                      )}
                      {activeTab === 'tally' && (
                        <button onClick={() => openTallyModal(item)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition-all cursor-pointer">
                          <BookOpen size={13} /><span>Enter Tally</span>
                        </button>
                      )}
                      {activeTab === 'completed' && (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-bold px-2 py-1">
                          <CheckCircle2 size={13} /><span>Tallied</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}

                {activeTabItems.length === 0 && (
                  <tr>
                    <td colSpan={15} className="px-6 py-12 text-center text-gray-400 text-sm">
                      <div className="flex flex-col items-center gap-2">
                        <Database className="text-gray-300" size={32} />
                        <p className="font-semibold text-gray-400">No records found in this stage.</p>
                        <p className="text-xs text-gray-300">Entries mapped to '{activeTab}' are currently empty.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 1. AUDIT ACTION MODAL */}
      {isAuditModalOpen && selectedItem && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-100">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-800 flex items-center gap-1.5">
                  <ShieldAlert className="text-amber-500" size={18} />
                  <span>Audit Review: {selectedItem.id}</span>
                </h3>
                <p className="text-[10px] text-gray-400 mt-0.5">Prefilled details. Mark as Done or Not Done.</p>
              </div>
              <button 
                disabled={isSaving}
                onClick={() => setIsAuditModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 rounded-lg p-1 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Info grid */}
              <div className="grid grid-cols-2 gap-3 bg-gray-50 p-4 rounded-xl border border-gray-100 text-xs">
                <div>
                  <span className="text-gray-400 font-bold block uppercase">Payee / Vendor</span>
                  <span className="text-gray-800 font-bold block mt-0.5">{selectedItem.paidTo}</span>
                </div>
                <div>
                  <span className="text-gray-400 font-bold block uppercase">Transaction Type</span>
                  <span className="text-gray-800 font-bold block mt-0.5">{selectedItem.type}</span>
                </div>
                <div>
                  <span className="text-gray-400 font-bold block uppercase">Net Payable</span>
                  <span className="text-emerald-700 font-bold text-sm block mt-0.5">{formatCurrency(selectedItem.netAmount)}</span>
                </div>
                <div>
                  <span className="text-gray-400 font-bold block uppercase">TDS Deducted</span>
                  <span className="text-rose-600 font-semibold block mt-0.5">{selectedItem.tdsAmount ? formatCurrency(selectedItem.tdsAmount) : 'Nil'}</span>
                </div>
                <div className="col-span-2 border-t border-gray-200/50 pt-2">
                  <span className="text-gray-400 font-bold block uppercase">Description / Purpose</span>
                  <span className="text-gray-700 font-medium block mt-0.5">{selectedItem.description || selectedItem.remarks || '—'}</span>
                </div>
              </div>

              {/* Shared copy files links */}
              {(selectedItem.billCopy || selectedItem.billImage || selectedItem.paymentProof) && (
                <div className="space-y-1.5 p-3.5 bg-blue-50/50 border border-blue-100/60 rounded-xl text-xs">
                  <span className="text-gray-500 font-bold block uppercase">Uploaded Attachments</span>
                  <div className="space-y-1 mt-1">
                    {(selectedItem.billCopy || selectedItem.billImage) && (
                      <a 
                        href={selectedItem.billCopy || selectedItem.billImage} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-gray-700 hover:text-gray-900 font-bold flex items-center gap-1"
                      >
                        <Eye size={12} />
                        <span>View Bill Copy Attachment</span>
                        <ExternalLink size={10} />
                      </a>
                    )}
                    {selectedItem.paymentProof && (
                      <a 
                        href={selectedItem.paymentProof} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-gray-700 hover:text-gray-900 font-bold flex items-center gap-1"
                      >
                        <Eye size={12} />
                        <span>View Payment Proof copy</span>
                        <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Rectification Input toggle */}
              {showRectificationInput ? (
                <div className="space-y-2 border-t border-gray-100 pt-3">
                  <label className="text-xs font-bold text-rose-600 uppercase flex items-center gap-1">
                    <AlertTriangle size={13} />
                    <span>Reason for Rectification (Required)</span>
                  </label>
                  <textarea
                    disabled={isSaving}
                    rows={3}
                    placeholder="Enter what needs to be changed or fixed (e.g. TDS rate wrong, Bill copy illegible)..."
                    value={rectificationReason}
                    onChange={(e) => setRectificationReason(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                  
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => setShowRectificationInput(false)}
                      className="px-3 py-1.5 border border-gray-200 rounded-lg text-gray-500 text-xs font-semibold hover:bg-gray-50"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      disabled={isSaving || !rectificationReason.trim()}
                      onClick={() => handleAuditSubmit('Rectify', rectificationReason)}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-md disabled:opacity-50"
                    >
                      Confirm Reject & Rectify
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1.5 border-t border-gray-100 pt-3">
                    <label className="text-xs font-bold text-gray-700 uppercase">Remarks / Audit Notes</label>
                    <textarea
                      disabled={isSaving}
                      rows={2}
                      placeholder="Add any audit observations or approval notes..."
                      value={auditRemarks}
                      onChange={(e) => setAuditRemarks(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-gray-900/20 focus:outline-none"
                    />
                  </div>
                  <div className="pt-2 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => setShowRectificationInput(true)}
                      className="flex-1 flex items-center justify-center gap-1 px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-sm font-semibold transition-all"
                    >
                      <AlertTriangle size={15} />
                      <span>Reject (Not Done)</span>
                    </button>
                    
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => handleAuditSubmit('Audited', auditRemarks)}
                      className="flex-1 flex items-center justify-center gap-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-emerald-600/10"
                    >
                      <ShieldCheck size={15} />
                      <span>Approve (Done)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. RECTIFY SUBMIT RESOLUTION MODAL */}
      {isRectifyModalOpen && selectedItem && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-100">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-800 flex items-center gap-1.5">
                  <CheckSquare className="text-rose-500" size={18} />
                  <span>Resolve Rectification: {selectedItem.id}</span>
                </h3>
                <p className="text-[10px] text-gray-400 mt-0.5">Fix issue and mark as rectified</p>
              </div>
              <button 
                disabled={isSaving}
                onClick={() => setIsRectifyModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 rounded-lg p-1 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRectifySubmit} className="p-6 space-y-4">
              {/* Display Rectification comments */}
              <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 text-xs text-rose-800 space-y-1">
                <span className="font-bold uppercase tracking-wider block flex items-center gap-1">
                  <AlertTriangle size={12} />
                  Audit Query / Rectification Instructions:
                </span>
                <p className="font-semibold text-rose-900 mt-1 italic">
                  "{selectedItem.auditRemarks || 'Details need verification.'}"
                </p>
              </div>

              {/* Prefilled Display */}
              <div className="grid grid-cols-2 gap-2 text-xs bg-gray-50 p-3.5 border border-gray-100 rounded-xl">
                <div>
                  <span className="text-gray-400 block font-bold uppercase">Payee:</span>
                  <span className="text-gray-800 block font-bold">{selectedItem.paidTo}</span>
                </div>
                <div>
                  <span className="text-gray-400 block font-bold uppercase">Net Amount:</span>
                  <span className="text-emerald-700 block font-bold">{formatCurrency(selectedItem.netAmount)}</span>
                </div>
              </div>

              {/* Resolution Notes Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase">Resolution Notes / Action Taken</label>
                <textarea
                  disabled={isSaving}
                  rows={2}
                  placeholder="e.g. Corrected TDS deduction in sheet / bill re-uploaded..."
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              {/* Action buttons */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => setIsRectifyModalOpen(false)}
                  className="px-4 py-2.5 border border-gray-200 rounded-xl text-gray-600 text-sm hover:bg-gray-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-rose-600/10"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <CheckSquare size={16} />
                      <span>Confirm Done (Send to Tally)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. TALLY ENTRY MODAL (VOUCHER NO & DATE ENTRY) */}
      {isTallyModalOpen && selectedItem && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-100">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-800 flex items-center gap-1.5">
                  <BookOpen className="text-indigo-600" size={18} />
                  <span>Record Tally Entry</span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">{selectedItem.id} — {selectedItem.paidTo}</p>
              </div>
              <button 
                disabled={isSaving}
                onClick={() => setIsTallyModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 rounded-lg p-1 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleTallyEntry} className="p-6 space-y-4">
              {/* Summary */}
              <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 space-y-2">
                <div className="grid grid-cols-2 gap-y-1.5 text-xs">
                  <span className="text-gray-500">Paid To:</span>
                  <span className="font-bold text-gray-800 text-right">{selectedItem.paidTo}</span>
                  <span className="text-gray-500">Bill Amount:</span>
                  <span className="font-bold text-gray-800 text-right">{formatCurrency(selectedItem.amount)}</span>
                  <span className="text-gray-500">TDS:</span>
                  <span className="font-bold text-rose-600 text-right">- {formatCurrency(selectedItem.tdsAmount || 0)}</span>
                  <span className="text-gray-700 font-bold border-t border-indigo-200 pt-1">Net Amount:</span>
                  <span className="font-bold text-emerald-700 text-right border-t border-indigo-200 pt-1">{formatCurrency(selectedItem.netAmount)}</span>
                </div>
              </div>

              {/* Display Audit & Rectify Remarks History */}
              {selectedItem.type === 'Service' && (selectedItem.remarks3 || selectedItem.remarks4) && (
                <div className="bg-gray-50 border border-gray-200/60 rounded-xl p-3 text-xs space-y-2">
                  <span className="font-bold text-gray-500 uppercase tracking-wider block">Remarks History</span>
                  {selectedItem.remarks3 && (
                    <div className="border-b border-gray-200/40 pb-1">
                      <span className="font-semibold text-gray-400 block">Audit Stage Remarks:</span>
                      <p className="text-gray-700 italic font-medium mt-0.5">"{selectedItem.remarks3}"</p>
                    </div>
                  )}
                  {selectedItem.remarks4 && (
                    <div>
                      <span className="font-semibold text-gray-400 block">Rectify Stage Remarks:</span>
                      <p className="text-gray-700 italic font-medium mt-0.5">"{selectedItem.remarks4}"</p>
                    </div>
                  )}
                </div>
              )}

              {selectedItem.type === 'Utility' && selectedItem.remarks && (
                <div className="bg-gray-50 border border-gray-200/60 rounded-xl p-3 text-xs space-y-1">
                  <span className="font-bold text-gray-500 uppercase tracking-wider block">Remarks History</span>
                  <div>
                    <span className="font-semibold text-gray-400 block">Remarks:</span>
                    <p className="text-gray-700 italic font-medium mt-0.5">"{selectedItem.remarks}"</p>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase">Tally Entry Date *</label>
                <input
                  type="date"
                  value={tallyDate}
                  onChange={(e) => setTallyDate(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase">Tally Voucher No. / Reference</label>
                <input
                  type="text"
                  placeholder="e.g. VCH/2026/1234"
                  value={tallyVoucher}
                  onChange={(e) => setTallyVoucher(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase">Remarks / Accounting Notes</label>
                <textarea
                  disabled={isSaving}
                  rows={2}
                  placeholder="Add any internal remarks or notes..."
                  value={tallyRemarks}
                  onChange={(e) => setTallyRemarks(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => setIsTallyModalOpen(false)}
                  className="px-4 py-2.5 border border-gray-200 rounded-xl text-gray-600 text-sm hover:bg-gray-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/10"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      <span>Recording...</span>
                    </>
                  ) : (
                    <>
                      <BookOpen size={16} />
                      <span>Mark as Completed</span>
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

export default Tally;
