import React, { useState, useRef } from 'react';
import {
  Plus, Search, CheckCircle2,
  ArrowRight, Loader2, AlertCircle, X,
  FileText, Upload, Paperclip, ExternalLink
} from 'lucide-react';
import useDataStore from '../store/useDataStore';
import { cn, formatCurrency, uploadFileToDrive } from '../lib/utils';
import useAuthStore from '../store/useAuthStore';

const Offers = () => {
  const { user: currentUser } = useAuthStore();
  const { offers, services, loading, addOffer, updateOffer, addService, firms } = useDataStore();
  const [searchTerm, setSearchTerm] = useState('');

  const masterFirms = firms && firms.length > 0 ? firms : ['Pmmpl', 'Rkl', 'Purab'];

  const getAllowedFirms = () => {
    if (!currentUser) return [];
    if (currentUser.role?.toLowerCase() === 'admin') return masterFirms;
    const userFirms = currentUser.firmName ? currentUser.firmName.split(',').map(f => f.trim()) : [];
    if (userFirms.map(f => f.toLowerCase()).includes('all') || userFirms.map(f => f.toLowerCase()).includes('all firms')) {
      return masterFirms;
    }
    return masterFirms.filter(firm => 
      userFirms.some(uf => uf.toLowerCase() === firm.toLowerCase())
    );
  };

  const allowedFirms = getAllowedFirms();
  const [activeTab, setActiveTab] = useState('active'); // active, history

  // Create Offer Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [newOffer, setNewOffer] = useState({
    firmName: 'All',
    vendor: '',
    description: '',
    location: '',
    amount: '',
    isOffer: 'Yes',
    offerCopy: ''
  });

  // File upload state
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

  // Handle file upload to ImgBB
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
      setNewOffer(prev => ({ ...prev, offerCopy: fileUrl }));
    } catch (err) {
      setUploadError('Upload error: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  // Convert to Service Modal state
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [selectedOfferForConvert, setSelectedOfferForConvert] = useState(null);
  const [convertFields, setConvertFields] = useState({
    serviceNo: '',
    checker: '',
    tdsAmount: '0',
    remark: '',
    vendor: '',
    firmName: 'All',
    description: '',
    location: '',
    amount: ''
  });

  // Handle Create Offer Submit
  const handleCreateOffer = async (e) => {
    e.preventDefault();
    if (!newOffer.vendor || !newOffer.description || !newOffer.location || !newOffer.amount) {
      setSaveError('Vendor Name, Work Description, Location aur Amount required hain.');
      return;
    }

    // Auto-generate Offer No. in sequence: OFF-001, OFF-002...
    const nextNum = String(offers.length + 1).padStart(3, '0');
    const autoId = `OFF-${nextNum}`;

    setIsSaving(true);
    setSaveError('');
    try {
      const res = await addOffer({
        id: autoId,
        firmName: newOffer.firmName,
        vendor: newOffer.vendor,
        description: newOffer.description,
        location: newOffer.location,
        amount: parseFloat(newOffer.amount),
        isOffer: newOffer.isOffer,
        offerCopy: newOffer.isOffer === 'Yes' ? newOffer.offerCopy : ''
      });
      if (res.success) {
        setIsCreateModalOpen(false);
        setUploadedFile(null);
        setUploadError('');
        setNewOffer({
          firmName: 'All',
          vendor: '',
          description: '',
          location: '',
          amount: '',
          isOffer: 'Yes',
          offerCopy: ''
        });
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        setSaveError(res.message || 'Failed to save offer.');
      }
    } catch (err) {
      setSaveError(err.message || 'Error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Approve Offer
  const handleApproveOffer = async (offer) => {
    if (!window.confirm(`Are you sure you want to approve Offer ${offer.id}?`)) return;
    try {
      await updateOffer(offer.sheetRowIndex, { status: 'Approved' });
      alert('Offer approved successfully!');
    } catch (err) {
      alert(`Error approving offer: ${err.message}`);
    }
  };

  // Handle Open Convert Modal
  const openConvertModal = (offer) => {
    setSelectedOfferForConvert(offer);
    const nextNum = String(services.length + 1).padStart(3, '0');
    const autoId = `SRV-${nextNum}`;
    setConvertFields({
      serviceNo: autoId,
      checker: '',
      tdsAmount: '0',
      remark: '',
      vendor: offer.vendor || '',
      firmName: offer.firmName || 'All',
      description: offer.description || '',
      location: offer.location || '',
      amount: offer.amount || ''
    });
    setIsConvertModalOpen(true);
  };

  // Handle Convert to Service Submit
  const handleConvertSubmit = async (e) => {
    e.preventDefault();
    if (!convertFields.serviceNo || !convertFields.checker || !convertFields.vendor || !convertFields.description || !convertFields.location || !convertFields.amount) {
      alert('Please fill in all required fields.');
      return;
    }

    setIsSaving(true);
    try {
      // 1. Create service record
      const serviceRes = await addService({
        offerNo: selectedOfferForConvert.id,
        id: convertFields.serviceNo,
        firmName: convertFields.firmName,
        checker: convertFields.checker,
        amount: parseFloat(convertFields.amount),
        tdsAmount: parseFloat(convertFields.tdsAmount) || 0,
        remark: convertFields.remark,
        vendor: convertFields.vendor,
        description: convertFields.description,
        location: convertFields.location
      });

      if (serviceRes.success) {
        // 2. Mark offer status as Completed
        await updateOffer(selectedOfferForConvert.sheetRowIndex, { status: 'Completed' });
        setIsConvertModalOpen(false);
        alert(`Successfully Completed Offer ${selectedOfferForConvert.id} to Service ${convertFields.serviceNo}!`);
      } else {
        alert(`Failed to create service: ${serviceRes.message}`);
      }
    } catch (err) {
      alert(`Error converting to service: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Filter offers
  const filteredOffers = offers.filter(o => {
    // Tab filter
    if (activeTab === 'active') {
      if (o.status === 'Completed' || o.status === 'Converted') return false;
    } else if (activeTab === 'history') {
      if (o.status !== 'Completed' && o.status !== 'Converted') return false;
    }

    // Search filter
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        o.id.toLowerCase().includes(q) ||
        o.vendor.toLowerCase().includes(q) ||
        o.location.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Offer Management</h1>
          <p className="text-slate-500">Create, manage, and convert vendor service quotations.</p>
        </div>
        <button
          onClick={() => {
            const defaultFirm = allowedFirms[0] || 'All';
            setNewOffer({
              firmName: defaultFirm,
              vendor: '',
              description: '',
              location: '',
              amount: '',
              isOffer: 'Yes',
              offerCopy: ''
            });
            setIsCreateModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-95 font-medium"
        >
          <Plus size={18} />
          <span>Create New Offer</span>
        </button>
      </div>

      {/* Tab Selector */}
      <div className="flex border-b border-slate-200 gap-1 overflow-x-auto pb-px">
        {[
          { id: 'active', label: 'Active Offers', count: offers.filter(o => o.status !== 'Completed' && o.status !== 'Converted').length, colorClass: 'bg-blue-100 text-blue-800' },
          { id: 'history', label: 'History', count: offers.filter(o => o.status === 'Completed' || o.status === 'Converted').length, colorClass: 'bg-emerald-100 text-emerald-800' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-5 py-4 font-semibold text-sm transition-all border-b-2 flex items-center gap-2.5 whitespace-nowrap cursor-pointer",
              activeTab === tab.id
                ? "border-blue-600 text-blue-600 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            )}
          >
            <span>{tab.label}</span>
            <span className={cn(
              "px-2.5 py-0.5 text-xs font-bold rounded-full transition-colors",
              activeTab === tab.id ? tab.colorClass : "bg-slate-100 text-slate-600"
            )}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search by offer no, vendor or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-2">
          <Loader2 className="animate-spin text-blue-600" size={32} />
          <p className="text-slate-400 text-sm">Fetching offers...</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Offer No</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Firm Name</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Vendor</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Offer Copy</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredOffers.map((offer) => (
                  <tr key={offer.sheetRowIndex} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4 text-sm font-bold text-blue-600">{offer.id}</td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-600">{offer.firmName}</td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-slate-900">{offer.vendor}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate">{offer.description}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{offer.location}</td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-900">{formatCurrency(offer.amount)}</td>
                    <td className="px-6 py-4">
                      {offer.offerCopy ? (
                        <a href={offer.offerCopy} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors">
                          <FileText size={14} />
                          <span>View File</span>
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-xs font-bold inline-block text-center min-w-[80px]",
                        offer.status === 'Approved' && "bg-emerald-100 text-emerald-700",
                        offer.status === 'Converted' && "bg-blue-100 text-blue-700",
                        offer.status === 'Pending' && "bg-amber-100 text-amber-700"
                      )}>
                        {offer.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {(offer.status === 'Pending' || offer.status === 'Approved') && (
                          <button
                            onClick={() => openConvertModal(offer)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold transition-all border border-blue-100"
                          >
                            <ArrowRight size={13} />
                            <span>Review</span>
                          </button>
                        )}
                        {offer.status === 'Converted' && (
                          <span className="text-xs text-slate-400 font-medium px-2 py-1.5">Converted</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredOffers.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-10 text-center text-slate-400 text-sm">
                      No offers found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create New Offer Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-100">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800">Create New Offer</h3>
                <p className="text-xs text-slate-400 mt-0.5">Initialize a quotation/initial request</p>
              </div>
              <button
                disabled={isSaving}
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateOffer} className="p-6 space-y-4">
              {saveError && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-xl border border-red-100">
                  <AlertCircle size={16} />
                  <span>{saveError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase">Firm Name</label>
                  <select
                    disabled={isSaving}
                    value={newOffer.firmName}
                    onChange={(e) => setNewOffer({ ...newOffer, firmName: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    {currentUser?.role?.toLowerCase() === 'admin' && <option value="All">All</option>}
                    {allowedFirms.map((firm) => (
                      <option key={firm} value={firm}>{firm}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase">Vendor Name</label>
                <input
                  disabled={isSaving}
                  type="text"
                  placeholder="e.g. Swift Services Ltd"
                  value={newOffer.vendor}
                  onChange={(e) => setNewOffer({ ...newOffer, vendor: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase">Work Description</label>
                <textarea
                  disabled={isSaving}
                  placeholder="Describe the scope of work..."
                  value={newOffer.description}
                  onChange={(e) => setNewOffer({ ...newOffer, description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase">Location</label>
                  <input
                    disabled={isSaving}
                    type="text"
                    placeholder="e.g. Mumbai"
                    value={newOffer.location}
                    onChange={(e) => setNewOffer({ ...newOffer, location: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase">Amount (₹)</label>
                  <input
                    disabled={isSaving}
                    type="number"
                    placeholder="e.g. 50000"
                    value={newOffer.amount}
                    onChange={(e) => setNewOffer({ ...newOffer, amount: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase">Is There An Offer?</label>
                  <select
                    disabled={isSaving}
                    value={newOffer.isOffer}
                    onChange={(e) => setNewOffer({ ...newOffer, isOffer: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>

                {newOffer.isOffer === 'Yes' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase">Offer Copy (Upload File)</label>

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
                        <button type="button" onClick={() => { setUploadedFile(null); setNewOffer(prev => ({ ...prev, offerCopy: '' })); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="text-slate-400 hover:text-red-500">
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={isSaving || isUploading}
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-50 border-2 border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50/30 rounded-xl text-sm text-slate-500 hover:text-blue-600 transition-all"
                      >
                        {isUploading ? (
                          <>
                            <Loader2 size={15} className="animate-spin" />
                            <span className="text-xs font-medium">Uploading...</span>
                          </>
                        ) : (
                          <>
                            <Upload size={15} />
                            <span className="text-xs font-medium">Click to upload file</span>
                          </>
                        )}
                      </button>
                    )}

                    {uploadError && (
                      <p className="text-[10px] text-red-500 font-medium mt-1">{uploadError}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 text-sm hover:bg-slate-50 font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-blue-600/10"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Create Offer</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Convert to Service Modal */}
      {isConvertModalOpen && selectedOfferForConvert && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-100">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800">Review</h3>
                <p className="text-xs text-slate-400 mt-0.5">Initialize a service record directly</p>
              </div>
              <button
                disabled={isSaving}
                onClick={() => setIsConvertModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConvertSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase">Offer Ref No.</label>
                  <select
                    disabled={true}
                    value={selectedOfferForConvert.id}
                    className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 cursor-not-allowed"
                  >
                    <option value={selectedOfferForConvert.id}>
                      {selectedOfferForConvert.id} - {selectedOfferForConvert.vendor}
                    </option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase">Firm Name</label>
                  <select
                    disabled={isSaving}
                    value={convertFields.firmName}
                    onChange={(e) => setConvertFields({ ...convertFields, firmName: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white"
                  >
                    {currentUser?.role?.toLowerCase() === 'admin' && <option value="All">All</option>}
                    {allowedFirms.map((firm) => (
                      <option key={firm} value={firm}>{firm}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase">Service Checker *</label>
                  <input
                    disabled={isSaving}
                    type="text"
                    placeholder="e.g. John Doe"
                    value={convertFields.checker}
                    onChange={(e) => setConvertFields({ ...convertFields, checker: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase">Vendor Name *</label>
                <input
                  disabled={isSaving}
                  type="text"
                  placeholder="e.g. Global Logistics"
                  value={convertFields.vendor}
                  onChange={(e) => setConvertFields({ ...convertFields, vendor: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase">Work Description *</label>
                <textarea
                  disabled={isSaving}
                  placeholder="Specify scope of work..."
                  value={convertFields.description}
                  onChange={(e) => setConvertFields({ ...convertFields, description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase">Location *</label>
                  <input
                    disabled={isSaving}
                    type="text"
                    placeholder="e.g. Delhi"
                    value={convertFields.location}
                    onChange={(e) => setConvertFields({ ...convertFields, location: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase">Amount (₹) *</label>
                  <input
                    disabled={isSaving}
                    type="number"
                    placeholder="e.g. 45000"
                    value={convertFields.amount}
                    onChange={(e) => setConvertFields({ ...convertFields, amount: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase">TDS Deduction Amount (₹)</label>
                  <input
                    disabled={isSaving}
                    type="number"
                    placeholder="e.g. 1000"
                    value={convertFields.tdsAmount}
                    onChange={(e) => setConvertFields({ ...convertFields, tdsAmount: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase">Remarks</label>
                  <input
                    disabled={isSaving}
                    type="text"
                    placeholder="Any remarks..."
                    value={convertFields.remark}
                    onChange={(e) => setConvertFields({ ...convertFields, remark: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => setIsConvertModalOpen(false)}
                  className="px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 text-sm hover:bg-slate-50 font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-blue-600/10"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Create Entry</span>
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

export default Offers;
