import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, Search, CheckCircle2, Clock, Loader2, AlertCircle, X, Zap, 
  Calendar, User, IndianRupee, Eye, ArrowRight, ShieldCheck, 
  Paperclip, ExternalLink, Upload, Database, BookOpen, CreditCard,
  ChevronDown, ChevronUp, AlertTriangle, FileSpreadsheet, FileText,
  ChevronLeft, ChevronRight, CheckSquare, RefreshCw, Filter, Trash2
} from 'lucide-react';
import useDataStore from '../store/useDataStore';
import { cn, formatCurrency, uploadFileToDrive } from '../lib/utils';
import useAuthStore from '../store/useAuthStore';
import { getAllowedTabs } from '../lib/permissions';

const Utility = () => {
  const { user: currentUser } = useAuthStore();
  const { utilities, loading, error, addUtility, updateUtility, departments, groupHeads, firms, fmsNames, fetchData } = useDataStore();

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
  
  // Tab states: 'create', 'approval', 'payment', 'completed'
  const [activeTab, setActiveTab] = useState('create');
  
  // Datatable Search, Sort, Filter, Selection & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [groupHeadFilter, setGroupHeadFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [sortColumn, setSortColumn] = useState('id');
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' | 'desc'
  
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedRows, setSelectedRows] = useState([]); // array of sheetRowIndexes

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isBulkApproveModalOpen, setIsBulkApproveModalOpen] = useState(false);
  const [isBulkPayModalOpen, setIsBulkPayModalOpen] = useState(false);
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);
  
  const [selectedUtility, setSelectedUtility] = useState(null);
  
  // Saving states
  const [saveError, setSaveError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  
  const fileInputRef = useRef(null);
  const payFileInputRef = useRef(null);
  const bulkPayFileInputRef = useRef(null);
  const approvalFileInputRef = useRef(null);

  // Auto generated inputs when opening modals
  const [newUtility, setNewUtility] = useState({
    id: '',
    firmName: '',
    personName: '',
    department: '',
    groupHead: '',
    payTo: '',
    amount: '',
    tdsAmount: '0',
    amountPaid: '0',
    outstanding: '0',
    billDate: '',
    dueDate: '',
    remarks: '',
    billImage: '',
    planned1: '', // Planned Approval
    planned2: ''  // Planned Payment
  });

  const [approvalFields, setApprovalFields] = useState({
    status: 'Approved', // Approved, Rejected, Hold
    approvalStatus: 'Yes', // 'Yes' or 'No'
    fmsName: '',
    details: '',
    payTo: '',
    amountPaid: '',
    remarks: '',
    approvalAttachment: '',
    plannedDate: '',
    actualDate: '',
    delayDays: 0
  });

  const [paymentFields, setPaymentFields] = useState({
    paymentNo: '',
    paymentMode: 'Bank Transfer',
    transactionRef: '',
    paymentDate: '',
    paymentAttachment: '',
    paymentRemarks: '',
    plannedDate: '',
    actualDate: '',
    delayDays: 0
  });

  const [bulkPaymentFields, setBulkPaymentFields] = useState({
    paymentMode: 'Bank Transfer',
    transactionRef: '',
    paymentDate: '',
    paymentAttachment: '',
    paymentRemarks: ''
  });

  // Reset pagination when active tab or filters change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedRows([]);
  }, [activeTab, searchTerm, deptFilter, groupHeadFilter, statusFilter, startDate, endDate]);

  // Load master data on component mount
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Helper: auto generate IDs
  const getNextUtilityId = () => {
    if (!utilities || utilities.length === 0) return 'UT-001';
    const ids = utilities
      .map(u => {
        const match = u.id?.match(/UT-(\d+)/i);
        return match ? parseInt(match[1]) : 0;
      })
      .filter(id => !isNaN(id));
    const maxId = ids.length > 0 ? Math.max(...ids) : 0;
    return `UT-${String(maxId + 1).padStart(3, '0')}`;
  };

  const getNextPaymentId = () => {
    const paidUtilities = utilities.filter(u => u.paymentNo);
    if (paidUtilities.length === 0) return 'PAY-001';
    const ids = paidUtilities
      .map(u => {
        const match = u.paymentNo?.match(/PAY-(\d+)/i);
        return match ? parseInt(match[1]) : 0;
      })
      .filter(id => !isNaN(id));
    const maxId = ids.length > 0 ? Math.max(...ids) : 0;
    return `PAY-${String(maxId + 1).padStart(3, '0')}`;
  };

  // Helper: calculate delay
  const getDelayDays = (planned, actual) => {
    if (!planned || !actual) return 0;
    const pDate = new Date(planned);
    const aDate = new Date(actual);
    pDate.setHours(0,0,0,0);
    aDate.setHours(0,0,0,0);
    const diffTime = aDate - pDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  // Auto calculate Net amount when amount or tds changes in creation form
  const handleAmountChange = (amt, tds) => {
    const parsedAmt = parseFloat(amt) || 0;
    const parsedTds = parseFloat(tds) || 0;
    const net = parsedAmt - parsedTds;
    setNewUtility(prev => ({
      ...prev,
      amount: amt,
      tdsAmount: tds,
      amountPaid: net >= 0 ? String(net) : '0',
      outstanding: net >= 0 ? String(net) : '0'
    }));
  };

  // Handle file upload
  const handleFileUpload = async (file, target) => {
    if (!file) return;
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setUploadError('File size too large. Max 10MB allowed.');
      return;
    }
    setIsUploading(true);
    setUploadError('');
    try {
      const fileUrl = await uploadFileToDrive(file);
      setUploadedFile({ name: file.name, url: fileUrl });
      
      if (target === 'create') {
        setNewUtility(prev => ({ ...prev, billImage: fileUrl }));
      } else if (target === 'payment') {
        setPaymentFields(prev => ({ ...prev, paymentAttachment: fileUrl }));
      } else if (target === 'bulk-payment') {
        setBulkPaymentFields(prev => ({ ...prev, paymentAttachment: fileUrl }));
      } else if (target === 'approval') {
        setApprovalFields(prev => ({ ...prev, approvalAttachment: fileUrl }));
      }
    } catch (err) {
      setUploadError('File upload failed: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  // Trigger Create Modal
  const openCreateModal = () => {
    const today = new Date().toISOString().split('T')[0];
    const plannedPay = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // +7 days
    
    setNewUtility({
      id: getNextUtilityId(),
      firmName: '',
      personName: '',
      department: '',
      groupHead: '',
      payTo: '',
      amount: '',
      tdsAmount: '0',
      amountPaid: '0',
      outstanding: '0',
      billDate: today,
      dueDate: plannedPay,
      remarks: '',
      billImage: '',
      planned1: '',
      planned2: ''
    });
    setUploadedFile(null);
    setUploadError('');
    setSaveError('');
    setIsCreateModalOpen(true);
  };

  // Trigger Detail/Approval Modal
  const openApprovalModal = (utility) => {
    setSelectedUtility(utility);
    const today = new Date().toISOString().split('T')[0];
    
    setApprovalFields({
      status: 'Approved',
      approvalStatus: '',
      fmsName: utility.fmsName || '',
      details: utility.details || '',
      payTo: utility.payTo || '',
      amountPaid: String(utility.amountPaid || ''),
      remarks: utility.remarks || '',
      approvalAttachment: utility.approvalAttachment || '',
      plannedDate: utility.planned1 || today,
      actualDate: today,
      delayDays: getDelayDays(utility.planned1, today)
    });
    setUploadedFile(null);
    setUploadError('');
    setSaveError('');
    setIsDetailModalOpen(true);
  };

  // Update Delay Days on Date Change in Approval
  useEffect(() => {
    if (selectedUtility && approvalFields.plannedDate && approvalFields.actualDate) {
      setApprovalFields(prev => ({
        ...prev,
        delayDays: getDelayDays(prev.plannedDate, prev.actualDate)
      }));
    }
  }, [approvalFields.plannedDate, approvalFields.actualDate, selectedUtility]);

  // Trigger Payment Modal
  const openPaymentModal = (utility) => {
    setSelectedUtility(utility);
    const today = new Date().toISOString().split('T')[0];
    
    setPaymentFields({
      paymentNo: getNextPaymentId(),
      paymentMode: 'Bank Transfer',
      transactionRef: '',
      paymentDate: today,
      paymentAttachment: '',
      paymentRemarks: '',
      plannedDate: utility.planned2 || today,
      actualDate: today,
      delayDays: getDelayDays(utility.planned2, today)
    });
    setUploadedFile(null);
    setUploadError('');
    setSaveError('');
    setIsPayModalOpen(true);
  };

  // Update Delay Days on Date Change in Payment
  useEffect(() => {
    if (selectedUtility && paymentFields.plannedDate && paymentFields.actualDate) {
      setPaymentFields(prev => ({
        ...prev,
        delayDays: getDelayDays(prev.plannedDate, prev.actualDate)
      }));
    }
  }, [paymentFields.plannedDate, paymentFields.actualDate, selectedUtility]);

  // Submit Step 1: Create Utility
  const handleCreateUtility = async (e) => {
    e.preventDefault();
    setSaveError('');
    
    if (!newUtility.id || !newUtility.firmName || !newUtility.personName || !newUtility.payTo || !newUtility.amount || !newUtility.billDate || !newUtility.dueDate) {
      setSaveError('Please fill in all mandatory fields (including Firm Name).');
      return;
    }

    setIsSaving(true);
    try {
      const res = await addUtility({
        id: newUtility.id,
        firmName: newUtility.firmName,
        personName: newUtility.personName,
        userName: newUtility.personName, // Sync user name
        department: newUtility.department || 'N/A',
        groupHead: newUtility.groupHead || 'N/A',
        payTo: newUtility.payTo,
        amount: parseFloat(newUtility.amount),
        tdsAmount: parseFloat(newUtility.tdsAmount) || 0,
        amountPaid: parseFloat(newUtility.amountPaid) || 0,
        outstanding: parseFloat(newUtility.outstanding) || 0,
        billDate: newUtility.billDate,
        dueDate: newUtility.dueDate,
        remarks: newUtility.remarks,
        billImage: newUtility.billImage,
        status: 'Pending Approval',
        planned1: newUtility.planned1,
        planned2: newUtility.planned2
      });

      if (res.success) {
        setIsCreateModalOpen(false);
        alert('Utility entry created successfully and marked as Pending Approval!');
      } else {
        setSaveError(res.message || 'Failed to create utility.');
      }
    } catch (err) {
      setSaveError(err.message || 'Error occurred while saving utility.');
    } finally {
      setIsSaving(false);
    }
  };

  // Submit Step 2: Management Approval Action
  const handleApprovalSubmit = async (e) => {
    e.preventDefault();
    setSaveError('');
    
    if (selectedUtility.status === 'Pending Approval') {
      if (!approvalFields.approvalStatus) {
        setSaveError('Please select Status (Yes or No).');
        return;
      }
      if (!approvalFields.fmsName) {
        setSaveError('Please select Fms Name.');
        return;
      }
      if (approvalFields.approvalStatus === 'Yes' && !approvalFields.details) {
        setSaveError('Please enter Details.');
        return;
      }
    }

    setIsSaving(true);
    
    try {
      let updates = {};
      if (selectedUtility.status === 'Pending Approval') {
        const finalStatus = approvalFields.approvalStatus === 'Yes' ? 'Approved' : 'Rejected';
        updates = {
          status: finalStatus,
          fmsName: approvalFields.fmsName,
          details: approvalFields.approvalStatus === 'Yes' ? approvalFields.details : '',
          remarks: approvalFields.remarks,
          approvalAttachment: approvalFields.approvalStatus === 'Yes' ? approvalFields.approvalAttachment : '',
          actual1: approvalFields.actualDate,
          delay1: approvalFields.delayDays
        };
      } else {
        updates = {
          status: approvalFields.status,
          actual1: approvalFields.actualDate,
          delay1: approvalFields.delayDays,
          remarks: approvalFields.remarks
        };
      }
      
      const res = await updateUtility(selectedUtility.sheetRowIndex, updates);
      if (res.success) {
        setIsDetailModalOpen(false);
        alert(`Utility successfully marked as ${updates.status}!`);
      } else {
        setSaveError(res.message || 'Failed to update approval status.');
      }
    } catch (err) {
      setSaveError(err.message || 'Error updating approval.');
    } finally {
      setIsSaving(false);
    }
  };

  // Submit Step 3: Payment Entry
  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    setSaveError('');
    
    if (!paymentFields.paymentNo || !paymentFields.paymentDate || !paymentFields.transactionRef) {
      setSaveError('Please enter Payment Number, Payment Date, and Transaction Reference.');
      return;
    }

    setIsSaving(true);
    try {
      const updates = {
        status: 'Completed',
        actual2: paymentFields.paymentDate,
        delay2: paymentFields.delayDays, // write delay to Dalay 2
        outstanding: 0, // fully paid
        amountPaid: selectedUtility.amountPaid, // record actual paid
        
        // Payment Info
        paymentNo: paymentFields.paymentNo,
        paymentMode: paymentFields.paymentMode,
        transactionRef: paymentFields.transactionRef,
        paymentDate: paymentFields.paymentDate,
        paymentAttachment: paymentFields.paymentAttachment,
        paymentRemarks: paymentFields.paymentRemarks
      };

      const res = await updateUtility(selectedUtility.sheetRowIndex, updates);
      if (res.success) {
        setIsPayModalOpen(false);
        alert(`Payment recorded successfully! Utility ${selectedUtility.id} is marked as Completed.`);
      } else {
        setSaveError(res.message || 'Failed to record payment entry.');
      }
    } catch (err) {
      setSaveError(err.message || 'Error updating payment.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBulkApprove = async () => {
    setIsSaving(true);
    const pendingApprovalRows = utilities.filter(
      u => selectedRows.includes(u.sheetRowIndex)
    );

    if (pendingApprovalRows.length === 0) {
      alert('No selected rows are eligible for bulk approval.');
      setIsSaving(false);
      setIsBulkApproveModalOpen(false);
      return;
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      let successCount = 0;
      
      for (const utility of pendingApprovalRows) {
        const delay = getDelayDays(utility.planned1, today);
        const updates = {
          status: 'Approved',
          actual1: today,
          delay1: delay,
          remarks: 'Bulk Approved'
        };
        const res = await updateUtility(utility.sheetRowIndex, updates);
        if (res.success) successCount++;
      }
      
      setSelectedRows([]);
      setIsBulkApproveModalOpen(false);
      alert(`Successfully approved ${successCount} utility records in bulk!`);
    } catch (err) {
      alert(`Bulk approval error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Bulk Payment Handler
  const handleBulkPaymentSubmit = async (e) => {
    e.preventDefault();
    if (!bulkPaymentFields.paymentDate || !bulkPaymentFields.transactionRef) {
      alert('Please fill in transaction reference and payment date.');
      return;
    }

    setIsSaving(true);
    const approvedRows = utilities.filter(
      u => selectedRows.includes(u.sheetRowIndex) && u.status === 'Approved'
    );

    if (approvedRows.length === 0) {
      alert('No selected rows are eligible for bulk payment (must be in "Approved" status).');
      setIsSaving(false);
      setIsBulkPayModalOpen(false);
      return;
    }

    try {
      let successCount = 0;
      let payIdCounter = getNextPaymentId();
      
      for (const utility of approvedRows) {
        const delay = getDelayDays(utility.planned2, bulkPaymentFields.paymentDate);
        
        // Auto-increment Payment Number
        const currentPayNo = payIdCounter;
        const numPart = parseInt(payIdCounter.replace('PAY-', ''));
        payIdCounter = `PAY-${String(numPart + 1).padStart(3, '0')}`;

        const updates = {
          status: 'Completed',
          actual2: bulkPaymentFields.paymentDate,
          delay2: delay,
          outstanding: 0,
          amountPaid: utility.amountPaid,
          
          paymentNo: currentPayNo,
          paymentMode: bulkPaymentFields.paymentMode,
          transactionRef: bulkPaymentFields.transactionRef,
          paymentDate: bulkPaymentFields.paymentDate,
          paymentAttachment: bulkPaymentFields.paymentAttachment,
          paymentRemarks: bulkPaymentFields.paymentRemarks
        };
        
        const res = await updateUtility(utility.sheetRowIndex, updates);
        if (res.success) successCount++;
      }

      setSelectedRows([]);
      setIsBulkPayModalOpen(false);
      alert(`Successfully processed payment for ${successCount} records!`);
    } catch (err) {
      alert(`Bulk payment error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Metrics calculation
  const metrics = (() => {
    const totalExpenses = utilities.reduce((sum, u) => sum + u.amount, 0);
    const pendingCreation = utilities.filter(u => u.status?.toLowerCase().includes('pending')).length;
    const pendingApproval = utilities.filter(u => !!u.planned1 && !u.actual1).length;
    const pendingTally = utilities.filter(u => !!u.planned2 && !u.actual2).length;
    const completed = utilities.filter(u => u.status === 'Completed').length;
    return { totalExpenses, pendingCreation, pendingApproval, pendingTally, completed };
  })();

  const utilityTabsConfig = [
    { id: 'create', label: 'Utility Entries', count: metrics.pendingCreation, colorClass: 'bg-gray-200 text-gray-800' },
    { id: 'approval', label: 'Payment Approval', count: metrics.pendingApproval, colorClass: 'bg-amber-100 text-amber-800' },
    { id: 'payment', label: 'Tally Entry', count: metrics.pendingTally, colorClass: 'bg-indigo-100 text-indigo-800' },
    { id: 'completed', label: 'Completed', count: metrics.completed, colorClass: 'bg-emerald-100 text-emerald-800' }
  ];
  const visibleTabs = getAllowedTabs(currentUser, 'Utility', utilityTabsConfig);
  const visibleTabIds = visibleTabs.map(t => t.id).join(',');

  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.some(t => t.id === activeTab)) {
      setActiveTab(visibleTabs[0].id);
    }
  }, [visibleTabIds, activeTab]);

  // Filter & Search Logic
  const filteredUtilities = utilities.filter(u => {
    // Tab stage filter
    if (activeTab === 'create') {
      if (!u.status?.toLowerCase().includes('pending')) return false;
    } else if (activeTab === 'approval') {
      if (!u.planned1 || !!u.actual1) return false;
    } else if (activeTab === 'payment') {
      if (!u.planned2 || !!u.actual2) return false;
    } else if (activeTab === 'completed') {
      if (u.status !== 'Completed') return false;
    }
    
    // Fuzzy Search (ID, PayTo, PersonName, Department, Remarks)
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const match = 
        u.id?.toLowerCase().includes(q) ||
        u.payTo?.toLowerCase().includes(q) ||
        u.personName?.toLowerCase().includes(q) ||
        u.department?.toLowerCase().includes(q) ||
        u.remarks?.toLowerCase().includes(q);
      if (!match) return false;
    }

    // Column Filters
    if (deptFilter && u.department !== deptFilter) return false;
    if (groupHeadFilter && u.groupHead !== groupHeadFilter) return false;
    if (statusFilter && u.status !== statusFilter) return false;

    // Date Filters
    if (startDate && u.billDate && new Date(u.billDate) < new Date(startDate)) return false;
    if (endDate && u.billDate && new Date(u.billDate) > new Date(endDate)) return false;

    return true;
  });

  // Sorting Logic
  const sortedUtilities = [...filteredUtilities].sort((a, b) => {
    let aVal = a[sortColumn];
    let bVal = b[sortColumn];

    // Special handling for number sorting
    if (['amount', 'tdsAmount', 'amountPaid', 'outstanding', 'delay1', 'delay2'].includes(sortColumn)) {
      aVal = parseFloat(aVal) || 0;
      bVal = parseFloat(bVal) || 0;
    } else {
      aVal = String(aVal || '').toLowerCase();
      bVal = String(bVal || '').toLowerCase();
    }

    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination Logic
  const totalItems = sortedUtilities.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const paginatedUtilities = sortedUtilities.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Row Selection Helpers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const currentIds = paginatedUtilities.map(u => u.sheetRowIndex);
      setSelectedRows(prev => [...new Set([...prev, ...currentIds])]);
    } else {
      const currentIds = paginatedUtilities.map(u => u.sheetRowIndex);
      setSelectedRows(prev => prev.filter(id => !currentIds.includes(id)));
    }
  };

  const handleSelectRow = (e, rowIndex) => {
    if (e.target.checked) {
      setSelectedRows(prev => [...prev, rowIndex]);
    } else {
      setSelectedRows(prev => prev.filter(id => id !== rowIndex));
    }
  };

  // Export functions
  const handleExportExcel = () => {
    const headers = [
      'Utility No.', 'Timestamp', 'Person Name', 'Name Of User', 'Department',
      'Group Head', 'Pay To', 'Bill Amount', 'TDS Deduction', 'Amount To Be Paid',
      'Outstanding Amount', 'Status', 'Bill Date', 'Due Date', 'Remarks',
      'Planned 1 (Approval)', 'Actual 1 (Approval)', 'Delay 1 (Days)', 
      'Planned 2 (Payment)', 'Actual 2 (Payment)', 'Delay 2 (Days)',
      'Payment Number', 'Payment Mode', 'Transaction Reference', 'Payment Date', 'Payment Remarks'
    ];
    
    const csvRows = [headers.join(',')];
    
    filteredUtilities.forEach(item => {
      const values = [
        `"${item.id}"`,
        `"${item.timestamp || ''}"`,
        `"${(item.personName || '').replace(/"/g, '""')}"`,
        `"${(item.userName || '').replace(/"/g, '""')}"`,
        `"${(item.department || '').replace(/"/g, '""')}"`,
        `"${(item.groupHead || '').replace(/"/g, '""')}"`,
        `"${(item.payTo || '').replace(/"/g, '""')}"`,
        item.amount,
        item.tdsAmount,
        item.amountPaid,
        item.outstanding,
        `"${item.status || ''}"`,
        `"${item.billDate || ''}"`,
        `"${item.dueDate || ''}"`,
        `"${(item.remarks || '').replace(/"/g, '""')}"`,
        `"${item.planned1 || ''}"`,
        `"${item.actual1 || ''}"`,
        item.delay1 || 0,
        `"${item.planned2 || ''}"`,
        `"${item.actual2 || ''}"`,
        item.delay2 || 0,
        `"${item.paymentNo || ''}"`,
        `"${item.paymentMode || ''}"`,
        `"${item.transactionRef || ''}"`,
        `"${item.paymentDate || ''}"`,
        `"${(item.paymentRemarks || '').replace(/"/g, '""')}"`
      ];
      csvRows.push(values.join(','));
    });
    
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Utility_Entries_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Utility Expenses Report</title>
          <style>
            body { font-family: 'Outfit', sans-serif; padding: 25px; color: #334155; }
            h1 { text-align: center; color: #1e3a8a; font-size: 20px; font-weight: bold; margin-bottom: 5px; }
            .subtitle { text-align: center; font-size: 12px; color: #64748b; margin-bottom: 25px; }
            table { width: 100%; border-collapse: collapse; border-radius: 8px; overflow: hidden; margin-top: 15px; }
            th, td { border: 1px solid #e2e8f0; padding: 10px 12px; text-align: left; font-size: 11px; }
            th { background-color: #f8fafc; font-weight: bold; color: #475569; text-transform: uppercase; font-size: 9px; tracking: 0.05em; }
            tr:nth-child(even) { background-color: #f8fafc; }
            .badge { padding: 2px 6px; border-radius: 9999px; font-size: 9px; font-weight: bold; display: inline-block; }
            .Pending { background-color: #fef3c7; color: #d97706; }
            .Approved { background-color: #e0e7ff; color: #4f46e5; }
            .Completed { background-color: #d1fae5; color: #059669; }
            .footer { margin-top: 40px; border-top: 2px solid #e2e8f0; padding-top: 15px; display: flex; justify-content: space-between; font-size: 11px; color: #475569; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>Utility Expenses Audit Report</h1>
          <div class="subtitle">Generated on ${new Date().toLocaleString()} | Filtered Count: ${filteredUtilities.length} Records</div>
          <table>
            <thead>
              <tr>
                <th>Utility No.</th>
                <th>Requestor</th>
                <th>Dept / Group</th>
                <th>Pay To</th>
                <th>Bill Date</th>
                <th>Due Date</th>
                <th>Bill Amount</th>
                <th>TDS</th>
                <th>Net Payable</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${filteredUtilities.map(item => `
                <tr>
                  <td><b>${item.id}</b></td>
                  <td>${item.personName}</td>
                  <td>${item.department} / ${item.groupHead}</td>
                  <td>${item.payTo}</td>
                  <td>${item.billDate ? item.billDate.split('T')[0] : '—'}</td>
                  <td>${item.dueDate ? item.dueDate.split('T')[0] : '—'}</td>
                  <td>₹${item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td>₹${item.tdsAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td>₹${item.amountPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td><span class="badge ${item.status.replace(/\s+/g, '')}">${item.status}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="footer">
            <span>Total Utilities Listed: ${filteredUtilities.length}</span>
            <span>Sum Net Payable: ₹${filteredUtilities.reduce((sum, item) => sum + item.amountPaid, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  // Toggle Sorting column
  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortOrder('desc');
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-[1600px] mx-auto pb-4 space-y-6">
      {/* Header section with modern design */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-gray-200 text-gray-900 p-6 rounded-3xl shadow-sm">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Utility Expenses Workflow</h1>
          <p className="text-gray-500 mt-1.5 text-sm font-medium"></p>
        </div>
        <button 
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-2xl transition-all shadow-lg shadow-gray-900/20 active:scale-95 font-semibold shrink-0 cursor-pointer"
        >
          <Plus size={18} />
          <span>Create Utility Entry</span>
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-100 text-red-800 p-4 rounded-2xl text-sm font-semibold">
          <AlertCircle size={20} className="text-red-600 shrink-0" />
          <div className="flex-1">
            <span className="font-bold">Error syncing data:</span> {error}. Please try reloading the page or retrying below.
          </div>
          <button 
            onClick={() => fetchData()}
            className="px-3.5 py-1.5 bg-red-100 hover:bg-red-200 text-red-900 rounded-xl transition-all text-xs font-bold"
          >
            Retry Sync
          </button>
        </div>
      )}

      {/* Dynamic Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Budget Managed', value: formatCurrency(metrics.totalExpenses), color: 'border-l-gray-900', bg: 'bg-gray-100', text: 'text-gray-700', icon: Database },
          { label: 'Pending Approval', value: metrics.pendingApproval, color: 'border-l-amber-500', bg: 'bg-amber-50/50', text: 'text-amber-700', icon: Clock },
          { label: 'Approved (Payment Queue)', value: metrics.approved, color: 'border-l-indigo-500', bg: 'bg-indigo-50/50', text: 'text-indigo-700', icon: CreditCard },
          { label: 'Completed Payments', value: metrics.completed, color: 'border-l-emerald-500', bg: 'bg-emerald-50/50', text: 'text-emerald-700', icon: CheckCircle2 }
        ].map((card, i) => (
          <div key={i} className={cn("p-6 rounded-2xl border-l-4 bg-white border border-gray-200 shadow-sm flex items-center justify-between transition-all hover:scale-[1.02]", card.color)}>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{card.label}</p>
              <h4 className="text-2xl font-bold text-gray-900">{card.value}</h4>
            </div>
            <div className={cn("p-3 rounded-xl", card.bg, card.text)}>
              <card.icon size={22} />
            </div>
          </div>
        ))}
      </div>

      {/* Flow Stages Tab Selector */}
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

      {/* Professional Data Table Component */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
        
        {/* Datatable Toolbar */}
        <div className="p-5 border-b border-gray-200 bg-gray-50/50 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            
            {/* Search Input */}
            <div className="relative flex-1 min-w-[300px] max-w-md">
              <Search className="absolute left-3 top-1/2 -trangray-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Search by ID, pay to, requester, or remarks..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-gray-900/20 focus:border-gray-900 transition-all"
              />
            </div>
            
            {/* Action buttons (Excel / PDF Export) */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer"
                title="Export as CSV/Excel"
              >
                <FileSpreadsheet size={15} className="text-emerald-600" />
                <span>Export Excel</span>
              </button>
              <button
                onClick={handleExportPDF}
                className="flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer"
                title="Print Report as PDF"
              >
                <FileText size={15} className="text-rose-600" />
                <span>Print Report</span>
              </button>
              
              <button
                onClick={() => fetchData()}
                className="p-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-500 hover:text-gray-800 rounded-xl transition-all shadow-xs cursor-pointer"
                title="Refresh from Sheet"
              >
                <RefreshCw size={15} className={cn(loading && "animate-spin")} />
              </button>
            </div>
          </div>

          {/* Filtering row */}
          <div className="flex flex-wrap items-center gap-3 text-xs pt-1 border-t border-gray-200/50">
            <div className="flex items-center gap-1 text-gray-400 font-bold mr-1">
              <Filter size={13} />
              <span>FILTERS:</span>
            </div>
            
            {/* Department Dropdown */}
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-gray-900/20"
            >
              <option value="">All Departments</option>
              {departments.map((dept, i) => (
                <option key={`dept-${i}`} value={dept}>{dept}</option>
              ))}
            </select>

            {/* Group Head Dropdown */}
            <select
              value={groupHeadFilter}
              onChange={(e) => setGroupHeadFilter(e.target.value)}
              className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-gray-900/20"
            >
              <option value="">All Group Heads</option>
              {groupHeads.map((gh, i) => (
                <option key={`gh-${i}`} value={gh}>{gh}</option>
              ))}
            </select>

            {/* Status Dropdown (visible in stage 1 'create') */}
            {activeTab === 'create' && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-gray-900/20"
              >
                <option value="">All Statuses</option>
                <option value="Pending Approval">Pending Approval</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
                <option value="On Hold">On Hold</option>
                <option value="Completed">Completed</option>
              </select>
            )}

            {/* Date range inputs */}
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2 py-1 bg-white border border-gray-200 rounded-lg text-[11px] text-gray-600 focus:ring-1 focus:ring-gray-900/20"
                placeholder="From Date"
              />
              <span className="text-gray-400">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2 py-1 bg-white border border-gray-200 rounded-lg text-[11px] text-gray-600 focus:ring-1 focus:ring-gray-900/20"
                placeholder="To Date"
              />
            </div>

            {/* Clear Filters Button */}
            {(deptFilter || groupHeadFilter || statusFilter || startDate || endDate) && (
              <button
                onClick={() => {
                  setDeptFilter('');
                  setGroupHeadFilter('');
                  setStatusFilter('');
                  setStartDate('');
                  setEndDate('');
                }}
                className="px-2.5 py-1 text-gray-700 hover:text-gray-900 font-semibold border border-gray-300 hover:border-gray-400 rounded-lg bg-gray-50 cursor-pointer"
              >
                Reset Filters
              </button>
            )}

            {/* Bulk actions triggers (only when rows selected) */}
            {selectedRows.length > 0 && (
              <div className="ml-auto flex items-center gap-2 bg-gray-100 border border-gray-200 rounded-xl px-3 py-1 animate-pulse">
                <span className="text-[11px] font-bold text-gray-700">{selectedRows.length} selected</span>
                
                {activeTab === 'approval' && (
                  <button
                    onClick={() => setIsBulkApproveModalOpen(true)}
                    className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition-all shadow-xs cursor-pointer"
                  >
                    <CheckSquare size={12} />
                    <span>Approve Selected</span>
                  </button>
                )}

                {activeTab === 'payment' && (
                  <button
                    onClick={() => {
                      setBulkPaymentFields({
                        paymentMode: 'Bank Transfer',
                        transactionRef: '',
                        paymentDate: new Date().toISOString().split('T')[0],
                        paymentAttachment: '',
                        paymentRemarks: ''
                      });
                      setIsBulkPayModalOpen(true);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold transition-all shadow-xs cursor-pointer"
                  >
                    <CreditCard size={12} />
                    <span>Pay Selected</span>
                  </button>
                )}
                
                <button
                  onClick={() => setSelectedRows([])}
                  className="text-gray-400 hover:text-red-500 p-0.5"
                  title="Clear Selection"
                >
                  <X size={12} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Data Table */}
        {loading && utilities.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3 bg-white">
            <Loader2 className="animate-spin text-gray-900" size={36} />
            <p className="text-gray-400 text-sm font-semibold">Fetching utility records from Sheets...</p>
          </div>
        ) : (
          <div className="overflow-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {/* Selection Checkbox (Bulk) */}
                  {(activeTab === 'payment' || activeTab === 'approval') && (
                    <th className="w-12 px-6 py-4">
                      <input 
                        type="checkbox" 
                        className="rounded-md border-gray-300 focus:ring-gray-900/20 w-4 h-4 cursor-pointer"
                        onChange={handleSelectAll}
                        checked={
                          paginatedUtilities.length > 0 && 
                          paginatedUtilities.every(u => selectedRows.includes(u.sheetRowIndex))
                        }
                      />
                    </th>
                  )}

                  {activeTab === 'create' && (
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Timestamp</th>
                  )}
                  <th onClick={() => handleSort('id')} className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-1"><span>Utility No.</span>{sortColumn === 'id' && (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}</div>
                  </th>
                  <th onClick={() => handleSort('firmName')} className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-1"><span>Firm Name</span>{sortColumn === 'firmName' && (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}</div>
                  </th>
                  <th onClick={() => handleSort('personName')} className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-1"><span>Person Name</span>{sortColumn === 'personName' && (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}</div>
                  </th>
                  {activeTab === 'create' && (
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer">Name Of User</th>
                  )}
                  <th onClick={() => handleSort('department')} className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-1"><span>Department</span>{sortColumn === 'department' && (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}</div>
                  </th>
                  <th onClick={() => handleSort('groupHead')} className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-1"><span>Group Head</span>{sortColumn === 'groupHead' && (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}</div>
                  </th>
                  <th onClick={() => handleSort('payTo')} className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-1"><span>Pay To</span>{sortColumn === 'payTo' && (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}</div>
                  </th>
                  <th onClick={() => handleSort('amount')} className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors text-right">
                    <div className="flex items-center gap-1 justify-end"><span>Bill Amount</span>{sortColumn === 'amount' && (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}</div>
                  </th>
                  {activeTab === 'create' && (
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Bill Image</th>
                  )}
                  {activeTab !== 'create' && (
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Bill Copy</th>
                  )}
                  <th onClick={() => handleSort('billDate')} className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-1"><span>Bill Date</span>{sortColumn === 'billDate' && (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}</div>
                  </th>
                  <th onClick={() => handleSort('dueDate')} className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-1"><span>Due Date</span>{sortColumn === 'dueDate' && (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}</div>
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Remarks</th>
                  <th onClick={() => handleSort('tdsAmount')} className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors text-right">
                    <div className="flex items-center gap-1 justify-end"><span>TDS Amount</span>{sortColumn === 'tdsAmount' && (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}</div>
                  </th>
                  <th onClick={() => handleSort('amountPaid')} className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors text-right">
                    <div className="flex items-center gap-1 justify-end"><span>Amount To Be Paid</span>{sortColumn === 'amountPaid' && (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}</div>
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Outstanding Amount</th>
                  <th onClick={() => handleSort('status')} className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-1"><span>Status</span>{sortColumn === 'status' && (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}</div>
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Planned 1</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Actual 1</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Delay 1</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Planned 2</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Actual 2</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Delay 2</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Payment Form</th>
                  {activeTab !== 'create' && activeTab !== 'approval' && (
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                  )}
                </tr>
              </thead>
              
              <tbody className="divide-y divide-gray-200">
                {paginatedUtilities.map((utility) => {
                  const isChecked = selectedRows.includes(utility.sheetRowIndex);
                  
                  return (
                    <tr 
                      key={utility.sheetRowIndex} 
                      className={cn(
                        "hover:bg-gray-50/50 transition-colors group text-sm",
                        isChecked && "bg-gray-100"
                      )}
                    >
                      {/* Bulk Selection checkbox */}
                      {(activeTab === 'payment' || activeTab === 'approval') && (
                        <td className="px-6 py-4">
                          <input type="checkbox" className="rounded-md border-gray-300 focus:ring-gray-900/20 w-4 h-4 cursor-pointer" checked={isChecked} onChange={(e) => handleSelectRow(e, utility.sheetRowIndex)} />
                        </td>
                      )}

                      {activeTab === 'create' && (
                        <td className="px-6 py-4 text-gray-500 font-medium whitespace-nowrap">{utility.timestamp || '—'}</td>
                      )}
                      <td className="px-6 py-4 font-bold text-gray-950 whitespace-nowrap">
                        <div className="flex items-center gap-1.5"><Zap size={14} className="text-gray-700" /><span>{utility.id}</span></div>
                      </td>
                      <td className="px-6 py-4 text-gray-800 font-medium whitespace-nowrap">{utility.firmName || '—'}</td>
                      <td className="px-6 py-4 text-gray-800 font-medium whitespace-nowrap">{utility.personName || '—'}</td>
                      {activeTab === 'create' && (
                        <td className="px-6 py-4 text-gray-800 font-medium whitespace-nowrap">{utility.userName || '—'}</td>
                      )}
                      <td className="px-6 py-4 text-gray-600 font-medium whitespace-nowrap">{utility.department || '—'}</td>
                      <td className="px-6 py-4 text-gray-600 font-medium whitespace-nowrap">{utility.groupHead || '—'}</td>
                      <td className="px-6 py-4 font-medium text-gray-700 whitespace-nowrap">{utility.payTo}</td>
                      <td className="px-6 py-4 text-right font-bold text-gray-900 whitespace-nowrap">{formatCurrency(utility.amount)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {utility.billImage ? (
                          <a href={utility.billImage} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-gray-700 hover:text-gray-900 font-bold hover:underline">
                            <Paperclip size={13} /><span>View</span>
                          </a>
                        ) : (<span className="text-gray-400 italic text-xs">No File</span>)}
                      </td>
                      <td className="px-6 py-4 text-gray-500 font-medium whitespace-nowrap">{utility.billDate ? utility.billDate.split('T')[0] : '—'}</td>
                      <td className="px-6 py-4 text-gray-500 font-medium whitespace-nowrap">{utility.dueDate ? utility.dueDate.split('T')[0] : '—'}</td>
                      <td className="px-6 py-4 text-gray-500 max-w-[180px] truncate whitespace-nowrap" title={utility.remarks}>{utility.remarks || '—'}</td>
                      <td className="px-6 py-4 text-right font-bold text-rose-600 whitespace-nowrap">{utility.tdsAmount > 0 ? `-${formatCurrency(utility.tdsAmount)}` : 'No TDS'}</td>
                      <td className="px-6 py-4 text-right font-bold text-emerald-700 whitespace-nowrap">{formatCurrency(utility.amountPaid)}</td>
                      <td className="px-6 py-4 text-right font-bold text-amber-600 whitespace-nowrap">{formatCurrency(utility.outstanding)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={cn(
                          "px-2.5 py-1 rounded-full text-xs font-bold inline-block text-center border min-w-[110px]",
                          utility.status === 'Completed' && "bg-emerald-50 text-emerald-700 border-emerald-100",
                          utility.status === 'Approved' && "bg-indigo-50 text-indigo-700 border-indigo-100",
                          utility.status?.includes('Pending') && "bg-amber-50 text-amber-700 border-amber-100",
                          utility.status === 'Rejected' && "bg-rose-50 text-rose-700 border-rose-100",
                          utility.status === 'On Hold' && "bg-gray-100 text-gray-700 border-gray-200"
                        )}>{utility.status}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {utility.planned1 ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">{utility.planned1}</span>
                        ) : <span className="text-gray-400 text-xs">—</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {utility.actual1 ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">{utility.actual1}</span>
                        ) : <span className="text-gray-400 text-xs">—</span>}
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        {utility.delay1 ? (
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-600 border border-rose-100">{utility.delay1}d</span>
                        ) : <span className="text-gray-400 text-xs">—</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {utility.planned2 ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">{utility.planned2}</span>
                        ) : <span className="text-gray-400 text-xs">—</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {utility.actual2 ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">{utility.actual2}</span>
                        ) : <span className="text-gray-400 text-xs">—</span>}
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        {utility.delay2 ? (
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-600 border border-rose-100">{utility.delay2}d</span>
                        ) : <span className="text-gray-400 text-xs">—</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {utility.paymentFormLink ? (
                          <a href={utility.paymentFormLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-bold hover:underline text-xs">
                            <Paperclip size={12} /><span>Link</span>
                          </a>
                        ) : <span className="text-gray-400 text-xs">—</span>}
                      </td>

                      {/* Row Action buttons */}
                      {activeTab !== 'create' && activeTab !== 'approval' && (
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end items-center gap-2">

                          
                          {/* Step 2 Approval Action */}
                          {utility.status === 'Pending Approval' && (
                            <button
                              onClick={() => openApprovalModal(utility)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl text-xs font-bold transition-all border border-amber-100 cursor-pointer"
                            >
                              <ShieldCheck size={14} />
                              <span>Verify & Approve</span>
                            </button>
                          )}
                          
                          {/* Step 3 Payment Action */}
                          {activeTab === 'payment' && utility.status === 'Approved' && (
                            <button
                              onClick={() => openPaymentModal(utility)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-all border border-indigo-100 cursor-pointer"
                            >
                              <CreditCard size={14} />
                              <span>Release Payment</span>
                            </button>
                          )}

                          {/* Completed Display */}
                          {utility.status === 'Completed' && (
                            <div className="flex items-center gap-1 text-emerald-600 text-xs font-bold bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-lg">
                              <CheckCircle2 size={13} />
                              <span>Completed</span>
                            </div>
                          )}

                          {/* Detail Timeline preview */}
                          {utility.status !== 'Pending Approval' && (
                            <button
                              onClick={() => {
                                setSelectedUtility(utility);
                                setIsDetailModalOpen(true);
                                // prefill fields for preview mode (not editing status)
                                setApprovalFields({
                                  status: utility.status,
                                  remarks: utility.remarks || '',
                                  plannedDate: utility.planned1 || '',
                                  actualDate: utility.actual1 || '',
                                  delayDays: utility.delay1 || 0
                                });
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-gray-600 hover:text-gray-800 bg-gray-50 border border-gray-200 hover:bg-gray-100 rounded-xl text-xs font-bold transition-all cursor-pointer"
                              title="View details and timeline tracking"
                            >
                              <Eye size={14} />
                              <span>View</span>
                            </button>
                          )}
                        </div>
                                              </td>
                      )}
                    </tr>
                  );
                })}

                {/* Empty State */}
                {totalItems === 0 && (
                  <tr>
                    <td colSpan={16} className="px-6 py-16 text-center text-gray-400 bg-white">
                      <div className="flex flex-col items-center gap-3">
                        <Database className="text-gray-200 animate-pulse" size={42} />
                        <div>
                          <p className="font-bold text-gray-600 text-base">No utilities found</p>
                          <p className="text-xs text-gray-400 mt-1">There are no utility expense entries matching current filter settings.</p>
                        </div>
                        {activeTab === 'create' && (
                          <button
                            onClick={openCreateModal}
                            className="mt-2 px-4 py-2 bg-gray-100 text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-200 font-bold transition-all text-xs cursor-pointer"
                          >
                            Add New Record Now
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Datatable Pagination Controls */}
        {totalItems > 0 && (
          <div className="p-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-gray-500 bg-gray-50/30">
            <div className="flex items-center gap-2">
              <span>Show</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(e.target.value === 'all' ? totalItems : parseInt(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 bg-white border border-gray-200 rounded-md"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value="all">All</option>
              </select>
              <span>entries per page (Total {totalItems} items)</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span>Page {currentPage} of {totalPages || 1}</span>
              <div className="flex items-center gap-1 ml-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="p-1.5 border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  disabled={currentPage === totalPages || totalPages === 0}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="p-1.5 border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-40 cursor-pointer"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* -------------------- STEP 1 MODAL: CREATE UTILITY FORM -------------------- */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden border border-gray-200 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 text-gray-800 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-lg flex items-center gap-2 text-gray-950">
                  <Zap className="text-yellow-500 fill-yellow-500" size={20} />
                  <span>STEP 1: Create Utility Record</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Define a new utility expense and attach the invoice bill</p>
              </div>
              <button 
                disabled={isSaving}
                onClick={() => setIsCreateModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 rounded-xl p-1.5 hover:bg-gray-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleCreateUtility} className="overflow-y-auto p-6 space-y-5 flex-1">
              {saveError && (
                <div className="flex items-center gap-2 text-xs text-rose-700 bg-rose-50 p-3.5 rounded-2xl border border-rose-100 font-bold">
                  <AlertCircle size={15} />
                  <span>{saveError}</span>
                </div>
              )}

              {/* Utility Number and Firm Name */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Utility Number (Auto Generated)</label>
                  <input
                    type="text"
                    disabled
                    value={newUtility.id}
                    className="w-full px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-sm font-bold text-gray-600"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Firm Name *</label>
                  <select
                    disabled={isSaving}
                    value={newUtility.firmName}
                    onChange={(e) => setNewUtility({...newUtility, firmName: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-gray-900/20"
                    required
                  >
                    <option value="">Select Firm Name</option>
                    {allowedFirms.map((firm, index) => (
                      <option key={`firm-opt-${index}`} value={firm}>{firm}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Person Name and Department */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Person Name *</label>
                  <input
                    disabled={isSaving}
                    type="text"
                    placeholder="Enter requestor's name"
                    value={newUtility.personName}
                    onChange={(e) => setNewUtility({...newUtility, personName: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-gray-900/20"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Department *</label>
                  <select
                    disabled={isSaving}
                    value={newUtility.department}
                    onChange={(e) => setNewUtility({...newUtility, department: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-gray-900/20"
                    required
                  >
                    <option value="">Select Department</option>
                    {departments.map((dept, index) => (
                      <option key={`dept-opt-${index}`} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Group Head and Pay To */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Group Head *</label>
                  <select
                    disabled={isSaving}
                    value={newUtility.groupHead}
                    onChange={(e) => setNewUtility({...newUtility, groupHead: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-gray-900/20"
                    required
                  >
                    <option value="">Select Group Head</option>
                    {groupHeads.map((gh, index) => (
                      <option key={`gh-opt-${index}`} value={gh}>{gh}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Pay To (Company/Vendor) *</label>
                  <input
                    disabled={isSaving}
                    type="text"
                    placeholder="e.g. Tata Power / Airtel / Landlord"
                    value={newUtility.payTo}
                    onChange={(e) => setNewUtility({...newUtility, payTo: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-gray-900/20"
                    required
                  />
                </div>
              </div>

              {/* Bill Amount and TDS Deduction */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Bill Amount (₹) *</label>
                  <input
                    disabled={isSaving}
                    type="number"
                    step="0.01"
                    placeholder="Enter total bill amount"
                    value={newUtility.amount}
                    onChange={(e) => handleAmountChange(e.target.value, newUtility.tdsAmount)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-gray-900/20"
                    required
                  />
                </div>
              </div>

              {/* TDS and Amount to be paid calculation */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">TDS Deduction Amount (₹)</label>
                  <input
                    disabled={isSaving}
                    type="number"
                    step="0.01"
                    placeholder="TDS amount if applicable"
                    value={newUtility.tdsAmount}
                    onChange={(e) => handleAmountChange(newUtility.amount, e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-rose-600 focus:ring-2 focus:ring-gray-900/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Amount To Be Paid (Auto Calculated)</label>
                  <input
                    type="text"
                    disabled
                    value={formatCurrency(parseFloat(newUtility.amountPaid))}
                    className="w-full px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-sm font-extrabold text-emerald-700"
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Bill Date *</label>
                  <input
                    disabled={isSaving}
                    type="date"
                    value={newUtility.billDate}
                    onChange={(e) => setNewUtility({...newUtility, billDate: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-gray-900/20"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Due Date *</label>
                  <input
                    disabled={isSaving}
                    type="date"
                    value={newUtility.dueDate}
                    onChange={(e) => setNewUtility({...newUtility, dueDate: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-gray-900/20"
                    required
                  />
                </div>
              </div>

              {/* File Attachment Upload */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Bill Attachment Copy *</label>
                
                {/* Hidden input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf,.doc,.docx"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, 'create');
                  }}
                />

                {/* Upload Button or Visual File Card */}
                {uploadedFile ? (
                  <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl">
                    <Paperclip size={18} className="text-emerald-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-bold text-emerald-800 block truncate">{uploadedFile.name}</span>
                      <a href={uploadedFile.url} target="_blank" rel="noreferrer" className="text-[10px] text-emerald-600 font-bold underline flex items-center gap-0.5 mt-0.5">
                        <span>Open file url</span>
                        <ExternalLink size={10} />
                      </a>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => {
                        setUploadedFile(null);
                        setNewUtility(prev => ({ ...prev, billImage: '' }));
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="p-1 hover:bg-emerald-100 rounded-lg text-emerald-600 hover:text-red-500 transition-colors cursor-pointer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-6 border-2 border-dashed border-gray-300 hover:border-gray-900 bg-gray-50 hover:bg-gray-100 rounded-2xl flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-gray-900 transition-all cursor-pointer"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="animate-spin text-gray-900" size={24} />
                        <span className="text-xs font-bold">Uploading file to Google Drive...</span>
                      </>
                    ) : (
                      <>
                        <Upload size={24} className="text-gray-400 group-hover:text-gray-900" />
                        <span className="text-xs font-bold">Click to upload bill image/invoice attachment (Max 10MB)</span>
                        <span className="text-[10px] text-gray-400">PDF, JPG, JPEG, PNG formats accepted</span>
                      </>
                    )}
                  </button>
                )}

                {uploadError && (
                  <p className="text-[10px] text-rose-500 font-semibold mt-1 flex items-center gap-1">
                    <AlertCircle size={12} />
                    <span>{uploadError}</span>
                  </p>
                )}
              </div>

              {/* Remarks */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Remarks</label>
                <textarea
                  disabled={isSaving}
                  rows={2}
                  placeholder="Enter remarks/description for the utility bill"
                  value={newUtility.remarks}
                  onChange={(e) => setNewUtility({...newUtility, remarks: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-gray-900/20"
                />
              </div>

              {/* Buttons */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-5 py-3 border border-gray-200 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || isUploading}
                  className="flex items-center gap-2 px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-bold transition-all shadow-lg shadow-gray-900/10 cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      <span>Creating Utility Entry...</span>
                    </>
                  ) : (
                    <span>Create & Submit</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------- STEP 2 MODAL: MANAGEMENT APPROVAL / DETAIL PREVIEW -------------------- */}
      {isDetailModalOpen && selectedUtility && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden border border-gray-200 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 text-gray-800 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-lg flex items-center gap-2 text-gray-950">
                  <ShieldCheck className="text-emerald-600" size={20} />
                  <span>Utility Detail & Workflow Timeline ({selectedUtility.id})</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Verify and process utility bill payment release</p>
              </div>
              <button 
                disabled={isSaving}
                onClick={() => setIsDetailModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 rounded-xl p-1.5 hover:bg-gray-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {selectedUtility.status === 'Pending Approval' ? (
                <form onSubmit={handleApprovalSubmit} className="space-y-4">
                  {saveError && (
                    <div className="flex items-center gap-2 text-xs text-rose-700 bg-rose-50 p-3.5 rounded-2xl border border-rose-100 font-bold">
                      <AlertCircle size={15} />
                      <span>{saveError}</span>
                    </div>
                  )}

                  {/* Unique Number (autofill, read-only) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Unique Number</label>
                    <input
                      type="text"
                      disabled
                      value={selectedUtility.id}
                      className="w-full px-3.5 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-xs font-bold text-gray-600"
                    />
                  </div>

                  {/* Fms Name dropdown */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">FMS Name *</label>
                    <select
                      value={approvalFields.fmsName}
                      onChange={(e) => setApprovalFields(prev => ({ ...prev, fmsName: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:ring-1 focus:ring-gray-900/20 cursor-pointer"
                    >
                      <option value="">Select FMS Name</option>
                      {fmsNames && fmsNames.map((name, idx) => (
                        <option key={idx} value={name}>{name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Status dropdown (Yes/No) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Status *</label>
                    <select
                      value={approvalFields.approvalStatus}
                      onChange={(e) => setApprovalFields(prev => ({ ...prev, approvalStatus: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:ring-1 focus:ring-gray-900/20 cursor-pointer"
                    >
                      <option value="">Select Status</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>

                  {/* If Yes is selected, show additional inputs */}
                  {approvalFields.approvalStatus === 'Yes' && (
                    <div className="space-y-4 pt-2 border-t border-gray-100">
                      {/* Details Input field */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Details *</label>
                        <input
                          type="text"
                          placeholder="Enter approval details"
                          value={approvalFields.details}
                          onChange={(e) => setApprovalFields(prev => ({ ...prev, details: e.target.value }))}
                          className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-gray-900/20"
                        />
                      </div>

                      {/* Pay To (autofill, read-only) */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Pay To</label>
                        <input
                          type="text"
                          disabled
                          value={selectedUtility.payTo || ''}
                          className="w-full px-3.5 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-xs font-bold text-gray-600"
                        />
                      </div>

                      {/* Amount To Be Paid (autofill, read-only) */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Amount To Be Paid</label>
                        <input
                          type="text"
                          disabled
                          value={formatCurrency(selectedUtility.amountPaid)}
                          className="w-full px-3.5 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-xs font-bold text-gray-600"
                        />
                      </div>

                      {/* Remarks */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Remarks</label>
                        <textarea
                          placeholder="Enter remarks"
                          rows={3}
                          value={approvalFields.remarks}
                          onChange={(e) => setApprovalFields(prev => ({ ...prev, remarks: e.target.value }))}
                          className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-gray-900/20"
                        />
                      </div>

                      {/* Upload Attachment */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Upload Attachment</label>
                        <input
                          type="file"
                          ref={approvalFileInputRef}
                          onChange={(e) => handleFileUpload(e.target.files[0], 'approval')}
                          className="hidden"
                          accept=".pdf,.jpg,.jpeg,.png"
                        />
                        {approvalFields.approvalAttachment ? (
                          <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-100 rounded-2xl text-xs">
                            <div className="flex items-center gap-2 text-emerald-800 font-bold min-w-0">
                              <Paperclip className="shrink-0" size={14} />
                              <span className="truncate text-emerald-700">Attachment Uploaded Successfully</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setApprovalFields(prev => ({ ...prev, approvalAttachment: '' }));
                                if (approvalFileInputRef.current) approvalFileInputRef.current.value = '';
                              }}
                              className="p-1 hover:bg-emerald-100 rounded-lg text-emerald-600 hover:text-red-500 transition-colors cursor-pointer"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={isUploading}
                            onClick={() => approvalFileInputRef.current?.click()}
                            className="w-full py-6 border-2 border-dashed border-gray-300 hover:border-gray-900 bg-gray-50 hover:bg-gray-100 rounded-2xl flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-gray-900 transition-all cursor-pointer"
                          >
                            {isUploading ? (
                              <>
                                <Loader2 className="animate-spin text-gray-900" size={24} />
                                <span className="text-xs font-bold">Uploading file to Google Drive...</span>
                              </>
                            ) : (
                              <>
                                <Upload size={24} className="text-gray-400 group-hover:text-gray-900" />
                                <span className="text-xs font-bold">Click to upload attachment document (Max 10MB)</span>
                                <span className="text-[10px] text-gray-400">PDF, JPG, JPEG, PNG formats accepted</span>
                              </>
                            )}
                          </button>
                        )}
                        {uploadError && (
                          <span className="text-[10px] text-rose-600 font-bold block mt-1">{uploadError}</span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => setIsDetailModalOpen(false)}
                      className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving || isUploading}
                      className="flex items-center gap-1.5 px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer"
                    >
                      {isSaving ? <Loader2 className="animate-spin" size={13} /> : <ShieldCheck size={14} />}
                      <span>{approvalFields.approvalStatus === 'Yes' ? 'Approve & Release' : 'Reject / Decline'}</span>
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  {/* Details grid */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3 bg-gray-50 p-4 border border-gray-200 rounded-2xl text-xs">
                    <div>
                      <span className="text-gray-400 font-bold block uppercase tracking-wide">Requestor Name</span>
                      <span className="text-gray-900 font-bold text-sm block mt-0.5">{selectedUtility.personName}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 font-bold block uppercase tracking-wide">Dept / Group Head</span>
                      <span className="text-gray-700 font-semibold block mt-0.5">{selectedUtility.department} / {selectedUtility.groupHead}</span>
                    </div>
                    <div className="col-span-2 border-t border-gray-200/50 pt-2">
                      <span className="text-gray-400 font-bold block uppercase tracking-wide">Pay To (Payee)</span>
                      <span className="text-gray-900 font-bold text-sm block mt-0.5">{selectedUtility.payTo}</span>
                    </div>
                    <div className="border-t border-gray-200/50 pt-2">
                      <span className="text-gray-400 font-bold block uppercase tracking-wide">Bill date / Due Date</span>
                      <span className="text-gray-700 font-semibold block mt-0.5">
                        {selectedUtility.billDate ? selectedUtility.billDate.split('T')[0] : '—'} / {selectedUtility.dueDate ? selectedUtility.dueDate.split('T')[0] : '—'}
                      </span>
                    </div>
                    <div className="border-t border-gray-200/50 pt-2">
                      <span className="text-gray-400 font-bold block uppercase tracking-wide">Status</span>
                      <span className="text-gray-700 font-bold block mt-0.5">{selectedUtility.status}</span>
                    </div>

                    {/* Financials block */}
                    <div className="col-span-2 grid grid-cols-3 gap-2 bg-gray-100 p-3 rounded-xl border border-gray-200/50 mt-1">
                      <div>
                        <span className="text-gray-400 font-bold block uppercase">Bill Amount</span>
                        <span className="text-gray-800 font-bold text-xs">{formatCurrency(selectedUtility.amount)}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 font-bold block uppercase">TDS Deduct</span>
                        <span className="text-rose-600 font-bold text-xs">-{formatCurrency(selectedUtility.tdsAmount)}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 font-bold block uppercase">Net Payable</span>
                        <span className="text-emerald-700 font-extrabold text-sm">{formatCurrency(selectedUtility.amountPaid)}</span>
                      </div>
                    </div>
                    
                    {/* Bill Invoice Copy Link inside the details card */}
                    <div className="col-span-2 border-t border-gray-200/50 pt-3 mt-1">
                      <span className="text-gray-400 font-bold block uppercase tracking-wide">Bill Invoice Copy</span>
                      {selectedUtility.billImage ? (
                        <div className="mt-1.5">
                          <a 
                            href={selectedUtility.billImage} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-100 border border-gray-200 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                          >
                            <Paperclip size={14} className="shrink-0" />
                            <span>View Bill Copy</span>
                            <ExternalLink size={12} className="shrink-0" />
                          </a>
                        </div>
                      ) : (
                        <span className="text-gray-500 font-medium italic mt-1 block">No bill copy uploaded</span>
                      )}
                    </div>
                  </div>

                  {/* If completed, display Payment details */}
                  {selectedUtility.status === 'Completed' && (
                    <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-xl space-y-2 text-xs">
                      <span className="font-bold text-emerald-800 uppercase block tracking-wider">Recorded Payment Receipt Details</span>
                      <div className="grid grid-cols-2 gap-y-1.5 font-medium text-gray-700">
                        <div className="flex justify-between pr-3">
                          <span>Payment No:</span>
                          <span className="font-bold text-gray-900">{selectedUtility.paymentNo || '—'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Payment Mode:</span>
                          <span className="font-bold text-gray-900">{selectedUtility.paymentMode || '—'}</span>
                        </div>
                        <div className="flex justify-between pr-3">
                          <span>UTR Ref ID:</span>
                          <span className="font-bold text-gray-900 font-mono">{selectedUtility.transactionRef || '—'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Payment Date:</span>
                          <span>{selectedUtility.paymentDate || '—'}</span>
                        </div>
                      </div>
                      {selectedUtility.paymentAttachment && (
                        <div className="pt-1.5 border-t border-emerald-100 mt-1.5">
                          <a href={selectedUtility.paymentAttachment} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-emerald-700 font-bold hover:underline">
                            <Paperclip size={12} />
                            <span>View Payment Receipt Attachment Copy</span>
                            <ExternalLink size={10} />
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Display Fms Name, Details, and Approval Attachment if they exist */}
                  {(selectedUtility.fmsName || selectedUtility.details || selectedUtility.approvalAttachment) && (
                    <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl space-y-2 text-xs">
                      <span className="font-bold text-gray-700 uppercase block tracking-wider">Management Approval Information</span>
                      <div className="grid grid-cols-2 gap-y-1.5 font-medium text-gray-700">
                        {selectedUtility.fmsName && (
                          <div className="flex justify-between pr-3">
                            <span>FMS Name:</span>
                            <span className="font-bold text-gray-900">{selectedUtility.fmsName}</span>
                          </div>
                        )}
                        {selectedUtility.details && (
                          <div className="flex justify-between col-span-2 border-t border-gray-100 pt-1.5 mt-1">
                            <span>Details:</span>
                            <span className="font-semibold text-gray-800 text-right">{selectedUtility.details}</span>
                          </div>
                        )}
                      </div>
                      {selectedUtility.approvalAttachment && (
                        <div className="pt-1.5 border-t border-gray-200 mt-1.5">
                          <a href={selectedUtility.approvalAttachment} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-gray-700 font-bold hover:underline">
                            <Paperclip size={12} />
                            <span>View Approval Attachment</span>
                            <ExternalLink size={10} />
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
              {/* Right Side: Bill Invoice Preview */}
            </div>
          </div>
        </div>
      )}

      {/* -------------------- STEP 3 MODAL: PAYMENT ENTRY FORM -------------------- */}
      {isPayModalOpen && selectedUtility && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-200">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 text-gray-800 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-lg flex items-center gap-2 text-gray-950">
                  <CreditCard className="text-indigo-600" size={20} />
                  <span>STEP 3: Record Payment Entry</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">{selectedUtility.id} — {selectedUtility.payTo}</p>
              </div>
              <button 
                disabled={isSaving}
                onClick={() => setIsPayModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 rounded-xl p-1.5 hover:bg-gray-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handlePaymentSubmit} className="p-6 space-y-4">
              {saveError && (
                <div className="flex items-center gap-2 text-xs text-rose-700 bg-rose-50 p-3 rounded-xl border border-rose-100 font-bold">
                  <AlertCircle size={14} />
                  <span>{saveError}</span>
                </div>
              )}

              {/* Financial Summary card */}
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-xs space-y-2">
                <span className="font-bold text-gray-500 uppercase tracking-wide block">Bill Summary</span>
                <div className="grid grid-cols-2 gap-y-1.5 font-medium text-gray-700">
                  <span>Gross Bill Amount:</span>
                  <span className="text-right font-bold text-gray-900">{formatCurrency(selectedUtility.amount)}</span>
                  <span>TDS Deducted:</span>
                  <span className="text-right font-bold text-rose-600">-{formatCurrency(selectedUtility.tdsAmount)}</span>
                  <span className="border-t border-gray-200 pt-1.5 font-bold text-gray-900">Amount To Be Paid:</span>
                  <span className="border-t border-gray-200 pt-1.5 text-right font-extrabold text-emerald-700 text-sm">{formatCurrency(selectedUtility.amountPaid)}</span>
                </div>
              </div>

              {/* Payment Number and Date */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Payment No (Auto)</label>
                  <input
                    type="text"
                    disabled
                    value={paymentFields.paymentNo}
                    className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-xl text-xs font-bold text-gray-600"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Payment Date *</label>
                  <input
                    type="date"
                    value={paymentFields.paymentDate}
                    onChange={(e) => setPaymentFields({...paymentFields, paymentDate: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              {/* Mode and Transaction Ref */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Payment Mode *</label>
                  <select
                    value={paymentFields.paymentMode}
                    onChange={(e) => setPaymentFields({...paymentFields, paymentMode: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500"
                    required
                  >
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="UPI">UPI</option>
                    <option value="Net Banking">Net Banking</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Transaction Reference *</label>
                  <input
                    type="text"
                    placeholder="Enter UTR / UPI Transaction ID"
                    value={paymentFields.transactionRef}
                    onChange={(e) => setPaymentFields({...paymentFields, transactionRef: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono focus:ring-1 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              {/* Timelines tracking display */}
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3 text-[11px] grid grid-cols-3 gap-2">
                <div>
                  <span className="text-gray-400 block font-bold uppercase">Planned Date</span>
                  <span className="font-semibold text-gray-800">{paymentFields.plannedDate}</span>
                </div>
                <div>
                  <span className="text-gray-400 block font-bold uppercase">Actual Date</span>
                  <span className="font-semibold text-gray-800">{paymentFields.actualDate}</span>
                </div>
                <div>
                  <span className="text-gray-400 block font-bold uppercase">Calculated Delay</span>
                  <span className={cn("font-bold block", paymentFields.delayDays > 0 ? "text-rose-600" : "text-emerald-700")}>
                    {paymentFields.delayDays} Days
                  </span>
                </div>
              </div>

              {/* Upload Payment Proof attachment */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Payment Proof Upload</label>
                
                <input
                  ref={payFileInputRef}
                  type="file"
                  accept="image/*,.pdf,.doc,.docx"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, 'payment');
                  }}
                />

                {paymentFields.paymentAttachment ? (
                  <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs">
                    <span className="text-emerald-800 font-bold truncate flex-1 pr-2">Payment receipt copy ready</span>
                    <button 
                      type="button" 
                      onClick={() => setPaymentFields(prev => ({ ...prev, paymentAttachment: '' }))}
                      className="text-gray-400 hover:text-red-500 font-bold cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={() => payFileInputRef.current?.click()}
                    className="w-full py-4 border-2 border-dashed border-gray-300 hover:border-indigo-400 bg-gray-50 hover:bg-indigo-50/10 rounded-xl flex items-center justify-center gap-2 text-gray-500 text-xs font-bold cursor-pointer"
                  >
                    {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                    <span>{isUploading ? 'Uploading proof...' : 'Upload Payment Receipt Copy'}</span>
                  </button>
                )}
              </div>

              {/* Remarks */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Remarks</label>
                <input
                  type="text"
                  placeholder="Payment remarks details..."
                  value={paymentFields.paymentRemarks}
                  onChange={(e) => setPaymentFields({...paymentFields, paymentRemarks: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Buttons */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => setIsPayModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || isUploading}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-indigo-600/10 cursor-pointer"
                >
                  {isSaving ? 'Recording Payment...' : 'Record Payment Complete'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------- IMAGE PREVIEW LIGHTBOX -------------------- */}
      {isImagePreviewOpen && selectedUtility && (
        <div className="fixed inset-0 bg-gray-950/80 z-50 flex items-center justify-center p-4">
          <button 
            onClick={() => setIsImagePreviewOpen(false)}
            className="absolute top-4 right-4 bg-gray-900/50 hover:bg-gray-800 text-white p-2.5 rounded-full border border-gray-800 cursor-pointer"
          >
            <X size={24} />
          </button>
          <img 
            src={selectedUtility.billImage} 
            alt="Full size bill copy" 
            className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
          />
        </div>
      )}

      {/* -------------------- BULK APPROVAL CONFIRMATION MODAL -------------------- */}
      {isBulkApproveModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-200 text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500">
              <ShieldCheck size={28} />
            </div>
            <div>
              <h3 className="font-extrabold text-gray-900 text-base">Bulk Approve Utilities</h3>
              <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                Are you sure you want to approve all <b>{utilities.filter(u => selectedRows.includes(u.sheetRowIndex) && u.status === 'Pending Approval').length} selected</b> pending utilities? Approved records will move to the Payment Queue.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                disabled={isSaving}
                onClick={() => setIsBulkApproveModalOpen(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 cursor-pointer"
              >
                Decline
              </button>
              <button
                disabled={isSaving}
                onClick={handleBulkApprove}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow-md cursor-pointer"
              >
                {isSaving ? 'Processing...' : 'Confirm Approve'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- BULK PAYMENT MODAL -------------------- */}
      {isBulkPayModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-200">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 text-gray-800 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base flex items-center gap-2 text-gray-950">
                  <CreditCard className="text-indigo-600" size={18} />
                  <span>Bulk Payment Queue Release</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Recording payment for {utilities.filter(u => selectedRows.includes(u.sheetRowIndex) && u.status === 'Approved').length} selected items</p>
              </div>
              <button 
                disabled={isSaving}
                onClick={() => setIsBulkPayModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 rounded-lg p-1.5 hover:bg-gray-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleBulkPaymentSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Payment Mode *</label>
                  <select
                    value={bulkPaymentFields.paymentMode}
                    onChange={(e) => setBulkPaymentFields({...bulkPaymentFields, paymentMode: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                    required
                  >
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="UPI">UPI</option>
                    <option value="Net Banking">Net Banking</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Payment Date *</label>
                  <input
                    type="date"
                    value={bulkPaymentFields.paymentDate}
                    onChange={(e) => setBulkPaymentFields({...bulkPaymentFields, paymentDate: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Transaction Reference ID *</label>
                <input
                  type="text"
                  placeholder="Enter common transaction reference"
                  value={bulkPaymentFields.transactionRef}
                  onChange={(e) => setBulkPaymentFields({...bulkPaymentFields, transactionRef: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono"
                  required
                />
              </div>

              {/* Upload Proof */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Upload Payment Receipt Copy</label>
                
                <input
                  ref={bulkPayFileInputRef}
                  type="file"
                  accept="image/*,.pdf,.doc,.docx"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, 'bulk-payment');
                  }}
                />

                {bulkPaymentFields.paymentAttachment ? (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs flex justify-between items-center">
                    <span className="text-emerald-800 font-bold truncate">Attachment attached successfully</span>
                    <button 
                      type="button" 
                      onClick={() => setBulkPaymentFields(prev => ({ ...prev, paymentAttachment: '' }))}
                      className="text-gray-400 hover:text-red-500 font-bold cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={() => bulkPayFileInputRef.current?.click()}
                    className="w-full py-4 border-2 border-dashed border-gray-300 hover:border-indigo-400 bg-gray-50 hover:bg-indigo-50/10 rounded-xl flex items-center justify-center gap-2 text-gray-500 text-xs font-bold cursor-pointer"
                  >
                    {isUploading ? <Loader2 size={14} className="animate-spin text-indigo-600" /> : <Upload size={14} />}
                    <span>{isUploading ? 'Uploading proof...' : 'Upload receipt file'}</span>
                  </button>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Remarks</label>
                <input
                  type="text"
                  placeholder="Bulk payment remarks..."
                  value={bulkPaymentFields.paymentRemarks}
                  onChange={(e) => setBulkPaymentFields({...bulkPaymentFields, paymentRemarks: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                />
              </div>

              {/* Buttons */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => setIsBulkPayModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || isUploading}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs shadow-lg shadow-indigo-600/10 cursor-pointer"
                >
                  {isSaving ? 'Processing...' : 'Confirm Bulk Payments'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Utility;
