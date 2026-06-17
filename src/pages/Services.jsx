import React, { useState, useRef, useEffect } from 'react';
import {
  Plus, Search, Filter, ArrowUpRight, Clock, CheckCircle2,
  Loader2, AlertCircle, X, Wrench, Calendar, FileText,
  MapPin, User, IndianRupee, Building2, Eye, CalendarCheck,
  Upload, Paperclip, ExternalLink
} from 'lucide-react';
import useDataStore from '../store/useDataStore';
import { cn, formatCurrency, uploadFileToDrive } from '../lib/utils';
import useAuthStore from '../store/useAuthStore';
import { getAllowedTabs } from '../lib/permissions';

const Services = () => {
  const { user: currentUser } = useAuthStore();
  const { services, offers, loading, addService, updateService } = useDataStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('active'); // active, history
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Modals state
  // Timeline inputs state
  const [timelineDates, setTimelineDates] = useState({
    actual1: '', // Work Started
    planned1: '',
    actual2: '', // Work Completed
    planned2: '',
    billNo: '',
    billCopy: '',
    remark: '',
    tdsAmount: ''
  });

  // File upload state for bill copy
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

  // Handle file upload to Google Drive via Apps Script
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
      setTimelineDates(prev => ({ ...prev, billCopy: fileUrl }));
    } catch (err) {
      setUploadError('Upload error: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed': return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
      case 'Tally Pending': return 'bg-purple-100 text-purple-700 border border-purple-200';
      case 'Payment Pending': return 'bg-rose-100 text-rose-700 border border-rose-200';
      case 'Bill Received': return 'bg-indigo-100 text-indigo-700 border border-indigo-200';
      case 'Work Completed': return 'bg-cyan-100 text-cyan-700 border border-cyan-200';
      case 'Work Started': return 'bg-blue-100 text-blue-700 border border-blue-200';
      case 'Service Created': return 'bg-gray-100 text-gray-700 border border-gray-200';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // Open Details & Timeline Modal
  const openDetailModal = (service) => {
    setSelectedService(service);
    setTimelineDates({
      actual1: service.actual1 || '',
      planned1: service.planned1 || '',
      actual2: service.actual2 || '',
      planned2: service.planned2 || '',
      billNo: service.billNo || '',
      billCopy: service.billCopy || '',
      remark: service.remark || '',
      tdsAmount: service.tdsAmount || ''
    });
    if (service.billCopy) {
      setUploadedFile({ name: 'Current Bill Copy', url: service.billCopy });
    } else {
      setUploadedFile(null);
    }
    setUploadError('');
    setIsDetailModalOpen(true);
  };

  // Handle Timeline Updates
  const handleUpdateTimeline = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updates = {
        billNo: timelineDates.billNo,
        billCopy: timelineDates.billCopy,
        remark: timelineDates.remark,
        tdsAmount: parseFloat(timelineDates.tdsAmount) || 0
      };

      const res = await updateService(selectedService.sheetRowIndex, updates);
      if (res.success) {
        setIsDetailModalOpen(false);
        alert('Service timeline updated successfully!');
      } else {
        alert(`Failed to update timeline: ${res.message}`);
      }
    } catch (err) {
      alert(`Error updating: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Filter services
  const filteredServices = services.filter(s => {
    // Tab filter
    if (activeTab === 'active') {
      if (s.status === 'Completed') return false;
    } else if (activeTab === 'history') {
      if (s.status !== 'Completed') return false;
    }

    // Search filter
    const term = searchTerm.toLowerCase();
    return (
      s.id.toLowerCase().includes(term) ||
      s.vendor.toLowerCase().includes(term) ||
      s.location.toLowerCase().includes(term) ||
      s.checker.toLowerCase().includes(term)
    );
  });

  // Compute Stats
  const activeCount = services.filter(s => s.status === 'Work Started' || s.status === 'Service Created').length;
  const billPendingCount = services.filter(s => s.status === 'Work Completed' || s.status === 'Bill Pending').length;
  const completedCount = services.filter(s => s.status === 'Completed').length;

  const servicesTabsConfig = [
    { id: 'active', label: 'Active Services', count: services.filter(s => s.status !== 'Completed').length, colorClass: 'bg-blue-100 text-blue-800' },
    { id: 'history', label: 'History', count: services.filter(s => s.status === 'Completed').length, colorClass: 'bg-emerald-100 text-emerald-800' }
  ];
  const visibleTabs = getAllowedTabs(currentUser, 'Services', servicesTabsConfig);
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

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border-l-4 border-l-gray-900 border border-gray-200 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Active Execution</p>
          <h4 className="text-2xl font-bold text-gray-900 mt-1">{activeCount}</h4>
        </div>
        <div className="bg-white p-6 rounded-2xl border-l-4 border-l-amber-500 border border-gray-200 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Bill Pending</p>
          <h4 className="text-2xl font-bold text-gray-900 mt-1">{billPendingCount}</h4>
        </div>
        <div className="bg-white p-6 rounded-2xl border-l-4 border-l-emerald-600 border border-gray-200 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Completed Services</p>
          <h4 className="text-2xl font-bold text-gray-900 mt-1">{completedCount}</h4>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search services by reference no, vendor, location or checker..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-gray-900/20 focus:border-gray-900 transition-all"
          />
        </div>
      </div>

      {/* Main Table */}
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-2">
          <Loader2 className="animate-spin text-gray-900" size={32} />
          <p className="text-gray-400 text-sm">Loading service sheets...</p>
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
                  <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Service Checker</th>
                  <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Total Amount</th>
                  <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">TDS Deduction Amount</th>
                  <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Remark</th>
                  <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Vendor Name</th>
                  <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Work Description</th>
                  <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Service Location</th>
                  <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Status</th>
                  <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right whitespace-nowrap">Timeline</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredServices.map((service) => (
                  <tr key={service.sheetRowIndex} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-4 py-4 text-sm font-semibold text-gray-600 whitespace-nowrap">{service.offerNo}</td>
                    <td className="px-4 py-4 text-sm font-bold text-gray-900 whitespace-nowrap">{service.id}</td>
                    <td className="px-4 py-4 text-sm text-gray-600 font-medium whitespace-nowrap">{service.firmName}</td>
                    <td className="px-4 py-4 text-sm text-gray-600 whitespace-nowrap">{service.checker}</td>
                    <td className="px-4 py-4 text-sm font-bold text-gray-900 whitespace-nowrap">{formatCurrency(service.amount)}</td>
                    <td className="px-4 py-4 text-sm text-gray-600 whitespace-nowrap">{formatCurrency(service.tdsAmount)}</td>
                    <td className="px-4 py-4 text-sm text-gray-500 truncate max-w-[150px]" title={service.remark}>{service.remark || '—'}</td>
                    <td className="px-4 py-4 text-sm text-gray-800 font-medium whitespace-nowrap">{service.vendor}</td>
                    <td className="px-4 py-4 text-sm text-gray-600 truncate max-w-[200px]" title={service.description}>{service.description}</td>
                    <td className="px-4 py-4 text-sm text-gray-600 whitespace-nowrap">{service.location}</td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-xs font-bold inline-block text-center min-w-[100px]",
                        getStatusColor(service.status)
                      )}>
                        {service.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => openDetailModal(service)}
                        className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 hover:bg-gray-100 rounded-lg text-xs font-bold text-gray-600 transition-all ml-auto"
                      >
                        <Eye size={13} />
                        <span>Timeline / Edit</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredServices.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-gray-400 text-sm">
                      No services found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Timeline & Details Modal */}
      {isDetailModalOpen && selectedService && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden border border-gray-100">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-800">Timeline & Details ({selectedService.id})</h3>
                <p className="text-xs text-gray-400 mt-0.5">Manage task execution, bill uploads, and reviews</p>
              </div>
              <button
                disabled={isSaving}
                onClick={() => setIsDetailModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 rounded-lg p-1 hover:bg-gray-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateTimeline} className="overflow-y-auto max-h-[80vh] p-6 space-y-6">
              {/* Top Info Grid */}
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100 text-xs">
                <div className="space-y-1">
                  <span className="text-gray-400 font-semibold block uppercase">Vendor</span>
                  <span className="text-gray-800 font-bold block">{selectedService.vendor}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-gray-400 font-semibold block uppercase">Work Location</span>
                  <span className="text-gray-800 font-bold block">{selectedService.location}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-gray-400 font-semibold block uppercase">Offer Ref</span>
                  <span className="text-gray-800 font-semibold block text-gray-900">{selectedService.offerNo}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-gray-400 font-semibold block uppercase">Firm Name</span>
                  <span className="text-gray-800 font-bold block">{selectedService.firmName}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-gray-400 font-semibold block uppercase">Total Amount</span>
                  <span className="text-gray-800 font-bold block">{formatCurrency(selectedService.amount)}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-gray-400 font-semibold block uppercase">Current Status</span>
                  <span className="text-gray-800 font-bold block text-gray-900">{selectedService.status}</span>
                </div>
              </div>

              {/* Editable Fields (TDS / Remarks) */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase">TDS Deduction Amount (₹)</label>
                  <input
                    disabled={isSaving}
                    type="number"
                    value={timelineDates.tdsAmount}
                    onChange={(e) => setTimelineDates({ ...timelineDates, tdsAmount: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-gray-900/20 focus:border-gray-900 transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase">Service Remarks</label>
                  <input
                    disabled={isSaving}
                    type="text"
                    value={timelineDates.remark}
                    onChange={(e) => setTimelineDates({ ...timelineDates, remark: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-gray-900/20 focus:border-gray-900 transition-all"
                  />
                </div>
              </div>

              {/* Execution Timelines Section */}
              <div className="border-t border-gray-100 pt-4 space-y-4">
                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Execution Milestones</h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Milestone 1: Work Started */}
                  <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-200/60 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gray-100 border border-gray-300 flex items-center justify-center text-xs font-bold text-gray-700">1</div>
                      <span className="text-xs font-bold text-gray-700 uppercase">Work Started Stage</span>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 block uppercase mb-1">Planned Start Date</label>
                        <input
                          type="date"
                          value={timelineDates.planned1}
                          onChange={(e) => setTimelineDates({ ...timelineDates, planned1: e.target.value })}
                          className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 block uppercase mb-1">Actual Start Date</label>
                        <input
                          type="date"
                          value={timelineDates.actual1}
                          onChange={(e) => setTimelineDates({ ...timelineDates, actual1: e.target.value })}
                          className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Milestone 2: Work Completed */}
                  <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-200/60 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gray-100 border border-gray-300 flex items-center justify-center text-xs font-bold text-gray-700">2</div>
                      <span className="text-xs font-bold text-gray-700 uppercase">Work Completed Stage</span>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 block uppercase mb-1">Planned End Date</label>
                        <input
                          type="date"
                          value={timelineDates.planned2}
                          onChange={(e) => setTimelineDates({ ...timelineDates, planned2: e.target.value })}
                          className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 block uppercase mb-1">Actual End Date</label>
                        <input
                          type="date"
                          value={timelineDates.actual2}
                          onChange={(e) => setTimelineDates({ ...timelineDates, actual2: e.target.value })}
                          className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Milestone 3: Bill Upload (Enabled when work started/completed is entered) */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gray-100 border border-gray-300 flex items-center justify-center text-xs font-bold text-gray-700">3</div>
                    <span className="text-xs font-bold text-gray-700 uppercase">Centralized Bill Submission</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 block uppercase mb-1">Bill Number</label>
                      <input
                        type="text"
                        placeholder="e.g. TAX/2026/099"
                        value={timelineDates.billNo}
                        onChange={(e) => setTimelineDates({ ...timelineDates, billNo: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 block uppercase mb-1">Bill Copy (Upload File)</label>

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
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl min-h-[38px]">
                          <Paperclip size={14} className="text-emerald-600 shrink-0" />
                          <span className="text-xs text-emerald-700 font-semibold truncate flex-1">{uploadedFile.name}</span>
                          <a href={uploadedFile.url} target="_blank" rel="noreferrer" className="text-emerald-600 hover:text-emerald-800 shrink-0">
                            <ExternalLink size={12} />
                          </a>
                          <button
                            type="button"
                            onClick={() => {
                              setUploadedFile(null);
                              setTimelineDates(prev => ({ ...prev, billCopy: '' }));
                              if (fileInputRef.current) fileInputRef.current.value = '';
                            }}
                            className="text-gray-400 hover:text-red-500 shrink-0"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={isSaving || isUploading}
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white border-2 border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-50 rounded-xl text-xs text-gray-500 hover:text-gray-900 transition-all min-h-[38px]"
                        >
                          {isUploading ? (
                            <>
                              <Loader2 size={14} className="animate-spin text-gray-900" />
                              <span className="text-xs font-medium text-gray-600">Uploading...</span>
                            </>
                          ) : (
                            <>
                              <Upload size={14} className="text-gray-400" />
                              <span className="text-xs font-medium">Click to upload file</span>
                            </>
                          )}
                        </button>
                      )}

                      {uploadError && (
                        <p className="text-[10px] text-red-500 font-medium mt-1">{uploadError}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Other Stages Read-Only View inside Execution page */}
                <div className="grid grid-cols-3 gap-3 pt-2 text-[10px] text-gray-500">
                  <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                    <span className="font-semibold block uppercase">4. Audit & Verification</span>
                    <span className="font-bold text-gray-700 mt-1 block">
                      {selectedService.status3 ? `${selectedService.status3}` : 'Pending Verification'}
                    </span>
                  </div>
                  <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                    <span className="font-semibold block uppercase">5. Payment Release</span>
                    <span className="font-bold text-gray-700 mt-1 block">
                      {selectedService.status4 ? `${selectedService.status4}` : 'Pending Payment'}
                    </span>
                  </div>
                  <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                    <span className="font-semibold block uppercase">6. Tally Accounting</span>
                    <span className="font-bold text-gray-700 mt-1 block">
                      {selectedService.status5 ? `${selectedService.status5}` : 'Pending Tally Voucher'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => setIsDetailModalOpen(false)}
                  className="px-4 py-2.5 border border-gray-200 rounded-xl text-gray-600 text-sm hover:bg-gray-50 font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-gray-900/10"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <span>Save Service State</span>
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

export default Services;
