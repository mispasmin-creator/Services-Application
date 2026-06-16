import { create } from 'zustand';
import useAuthStore from './useAuthStore';

const apiUrl = import.meta.env.VITE_APPSCRIPT_URL;

const getServiceStatus = (s) => {
  if (s.status5 === 'Completed' || s.actual5) return 'Completed';
  if (s.status4 === 'Completed' || s.status4 === 'Paid' || s.actual4 || (s.actual2 && !s.planned2)) return 'Tally Pending';
  if (s.status3 === 'Approved' || s.actual3 || (s.actual1 && !s.planned1)) return 'Payment Pending';
  if (s.billNo || s.billCopy) return 'Bill Received';
  if (s.actual2) return 'Work Completed';
  if (s.actual1) return 'Work Started';
  return 'Service Created';
};

// Find the header row by searching for a known key column
const findHeaderRow = (data, knownCol) => {
  if (!data || !data.length) return { headerIdx: -1, headers: [] };
  for (let i = 0; i < data.length; i++) {
    if (data[i] && data[i].some(cell => String(cell).trim() === knownCol)) {
      return { headerIdx: i, headers: data[i] };
    }
  }
  return { headerIdx: -1, headers: [] };
};

// Robust fetch with retry and exponential backoff to handle Google Apps Script connection drops/throttling
const fetchJsonWithRetry = async (url, options = {}, retries = 3, delay = 150) => {
  try {
    const res = await fetch(url, options);
    if (!res.ok) {
      throw new Error(`HTTP error! Status: ${res.status}`);
    }
    const data = await res.json();
    if (data && data.success === false) {
      throw new Error(data.message || 'API returned success: false');
    }
    return data;
  } catch (err) {
    if (retries > 0) {
      console.warn(`Fetch failed for ${url}, retrying in ${delay}ms... (${retries} retries left). Error: ${err.message}`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchJsonWithRetry(url, options, retries - 1, delay * 1.5);
    }
    throw err;
  }
};

const useDataStore = create((set, get) => ({
  offers: [],
  services: [],
  utilities: [],
  offerHeaders: [],
  serviceHeaders: [],
  utilityHeaders: [],
  departments: [],
  groupHeads: [],
  firms: [],
  fmsNames: [],
  loading: false,
  error: null,

  fetchData: async () => {
    if (get().loading) {
      console.log("fetchData call ignored - fetch already in progress");
      return;
    }
    set({ loading: true, error: null });
    try {
      // Stagger fetches and use retry helper to avoid connection drop or throttling errors on Google Apps Script
      const offersRes = await fetchJsonWithRetry(`${apiUrl}?sheet=OFFER`);
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const servicesRes = await fetchJsonWithRetry(`${apiUrl}?sheet=SERVICE`);
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const utilitiesRes = await fetchJsonWithRetry(`${apiUrl}?sheet=UTILITY`);
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const masterRes = await fetchJsonWithRetry(`${apiUrl}?sheet=Master`)
        .catch(err => {
          console.error("Master sheet fetch failed after retries:", err);
          return { success: false, data: [] };
        });

      let offers = [];
      let offerHeaders = [];
      if (offersRes.success && offersRes.data && offersRes.data.length > 0) {
        const { headerIdx, headers } = findHeaderRow(offersRes.data, 'OROffer No.');
        offerHeaders = headers;
        if (headerIdx >= 0) {
          const rows = offersRes.data.slice(headerIdx + 1);
          offers = rows
            .filter(row => row && row.some(cell => String(cell || '').trim() !== ''))
            .map((row, idx) => ({
              sheetRowIndex: headerIdx + 2 + idx,
              timestamp: row[0] || '',
              id: row[1] || `OFF-${idx + 1}`,
              firmName: row[2] || '',
              vendor: row[3] || '',
              description: row[4] || '',
              location: row[5] || '',
              amount: parseFloat(row[6]) || 0,
              isOffer: row[7] || '',
              offerCopy: row[8] || '',
              amountPaid: parseFloat(row[9]) || 0,
              outstanding: parseFloat(row[10]) || 0,
              status: row[11] || 'Pending',
              date: row[0] ? String(row[0]).split(' ')[0] : ''
            }));
        }
      }

      let services = [];
      let serviceHeaders = [];
      if (servicesRes.success && servicesRes.data && servicesRes.data.length > 0) {
        const { headerIdx, headers } = findHeaderRow(servicesRes.data, 'Service No.');
        serviceHeaders = headers;
        if (headerIdx >= 0) {
          const rows = servicesRes.data.slice(headerIdx + 1);
          services = rows
            .filter(row => row && row.some(cell => String(cell || '').trim() !== ''))
            .map((row, idx) => {
          const s = {
            sheetRowIndex: headerIdx + 2 + idx,
            timestamp: row[0] || '',
            offerNo: row[1] || '',
            id: row[2] || `SRV-${idx + 1}`,
            firmName: row[3] || '',
            checker: row[4] || '',
            amount: parseFloat(row[5]) || 0,
            tdsAmount: parseFloat(row[6]) || 0,
            remark: row[7] || '',
            vendor: row[8] || '',
            description: row[9] || '',
            location: row[10] || '',
            planned1: row[11] || '',
            actual1: row[12] || '',
            delay1: row[13] || '',
            billNo: row[14] || '',
            billCopy: row[15] || '',
            planned2: row[16] || '',
            actual2: row[17] || '',
            delay2: row[18] || '',
            paymentProof: row[19] || '',
            planned3: row[20] || '',
            actual3: row[21] || '',
            delay3: row[22] || '',
            status3: row[23] || '',
            remarks3: row[24] || '',
            planned4: row[25] || '',
            actual4: row[26] || '',
            delay4: row[27] || '',
            status4: row[28] || '',
            remarks4: row[29] || '',
            planned5: row[30] || '',
            actual5: row[31] || '',
            delay5: row[32] || '',
            status5: row[33] || '',
            remarks5: row[34] || '',
            paymentForm: row[35] || '',
            date: row[0] ? String(row[0]).split(' ')[0] : ''
          };
          s.status = getServiceStatus(s);
          return s;
        });
        }
      }

      let utilities = [];
      let utilityHeaders = [];
      if (utilitiesRes.success && utilitiesRes.data && utilitiesRes.data.length > 0) {
        let { headerIdx, headers } = findHeaderRow(utilitiesRes.data, 'Utility No.');
        if (headerIdx >= 0) {
          utilityHeaders = headers;
          
          // Self-healing columns: check if any requested columns are missing
          const requiredPaymentCols = [
            'Payment Number',
            'Payment Mode',
            'Transaction Reference',
            'Payment Date',
            'Payment Attachment',
            'Payment Remarks',
            'Fms Name',
            'Details',
            'Approval Attachment'
          ];
          const missingCols = requiredPaymentCols.filter(col => !utilityHeaders.includes(col));
          if (missingCols.length > 0) {
            utilityHeaders = [...utilityHeaders, ...missingCols];
            // Fire-and-forget update to the Google Sheet header row so it's persisted
            get().saveRow('UTILITY', 'update', headerIdx + 1, utilityHeaders)
              .catch(err => console.error('Error updating utility headers on Google Sheets:', err));
          }

          const rows = utilitiesRes.data.slice(headerIdx + 1);
          utilities = rows
            .filter(row => row && row.some(cell => String(cell || '').trim() !== ''))
            .map((row, idx) => {
              const getVal = (headerName, defaultVal = '') => {
                const colIdx = utilityHeaders.indexOf(headerName);
                return (colIdx >= 0 && row[colIdx] !== undefined) ? row[colIdx] : defaultVal;
              };
              
              const amountVal = parseFloat(getVal('Bill Amount', 0)) || 0;
              const tdsVal = parseFloat(getVal('TDS Deduction Amount', 0)) || 0;
              
              return {
                sheetRowIndex: headerIdx + 2 + idx,
                timestamp: getVal('Timestamp'),
                id: getVal('Utility No.') || `UT-${idx + 1}`,
                firmName: getVal('Firm Name'),
                personName: getVal('Person Name'),
                userName: getVal('Name Of User'),
                department: getVal('Department'),
                groupHead: getVal('Group Head'),
                payTo: getVal('Pay To'),
                amount: amountVal,
                billImage: getVal('Bill Image'),
                billDate: getVal('Bill Date'),
                dueDate: getVal('Due Date'),
                remarks: getVal('Remarks'),
                tdsAmount: tdsVal,
                amountPaid: parseFloat(getVal('Amount To Be Paid', amountVal - tdsVal)) || (amountVal - tdsVal),
                outstanding: parseFloat(getVal('Outstanding Amount', amountVal - tdsVal)) || (amountVal - tdsVal),
                status: getVal('Status') || 'Pending Approval',
                planned1: getVal('Planned 1'),
                actual1: getVal('Actual 1'),
                delay1: getVal('Delay 1'),
                planned2: getVal('Planned 2'),
                actual2: getVal('Actual 2'),
                delay2: getVal('Delay 2') || getVal('Dalay 2'),
                paymentFormLink: getVal('Payment Form Link'),
                
                // New approval fields
                fmsName: getVal('Fms Name'),
                details: getVal('Details'),
                approvalAttachment: getVal('Approval Attachment'),
                
                // Payment Fields (Step 3)
                paymentNo: getVal('Payment Number'),
                paymentMode: getVal('Payment Mode'),
                transactionRef: getVal('Transaction Reference'),
                paymentDate: getVal('Payment Date'),
                paymentAttachment: getVal('Payment Attachment'),
                paymentRemarks: getVal('Payment Remarks'),
                
                date: getVal('Bill Date') || (getVal('Timestamp') ? String(getVal('Timestamp')).split(' ')[0] : '')
              };
            });
        }
      }

      let departments = [];
      let groupHeads = [];
      let firms = [];
      let fmsNames = [];
      if (masterRes && masterRes.success && masterRes.data && masterRes.data.length > 0) {
        const rows = masterRes.data.slice(1);
        const validRows = rows.filter(row => Array.isArray(row));
        departments = [...new Set(validRows.map(row => String(row[0] || '').trim()).filter(val => val !== ''))];
        groupHeads = [...new Set(validRows.map(row => String(row[1] || '').trim()).filter(val => val !== ''))];
        firms = [...new Set(validRows.map(row => String(row[2] || '').trim()).filter(val => val !== ''))];
        fmsNames = [...new Set(validRows.map(row => String(row[3] || '').trim()).filter(val => val !== ''))];
      }

      // Filter data based on current logged in user's assigned firms (except for admins or 'All' access)
      const currentUser = useAuthStore.getState().user;
      const isAdmin = currentUser?.role?.toLowerCase() === 'admin';
      const userFirms = currentUser?.firmName
        ? currentUser.firmName.split(',').map(f => f.trim().toLowerCase())
        : [];
      const hasAllAccess = userFirms.includes('all') || userFirms.includes('all firms');

      if (!isAdmin && !hasAllAccess) {
        offers = offers.filter(o => {
          const firm = (o.firmName || '').trim().toLowerCase();
          return userFirms.includes(firm);
        });
        services = services.filter(s => {
          const firm = (s.firmName || '').trim().toLowerCase();
          return userFirms.includes(firm);
        });
        utilities = utilities.filter(u => {
          const firm = (u.firmName || '').trim().toLowerCase();
          return userFirms.includes(firm);
        });
      }

      set({ 
        offers, 
        services, 
        utilities, 
        offerHeaders, 
        serviceHeaders, 
        utilityHeaders, 
        departments,
        groupHeads,
        firms,
        fmsNames,
        loading: false 
      });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  saveRow: async (sheetName, action, rowIndex, rowDataArray) => {
    const params = new URLSearchParams();
    params.append('sheetName', sheetName);
    params.append('action', action);
    if (rowIndex) {
      params.append('rowIndex', String(rowIndex));
    }
    params.append('rowData', JSON.stringify(rowDataArray));

    const response = await fetch(apiUrl, {
      method: 'POST',
      body: params,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return await response.json();
  },

  addOffer: async (offer) => {
    const headers = get().offerHeaders;
    const rowDataArray = headers.map(header => {
      if (header === 'Timestamp') return new Date().toLocaleString();
      if (header === 'OROffer No.') return offer.id;
      if (header === 'Firm Name') return offer.firmName;
      if (header === 'Vendor Name') return offer.vendor;
      if (header === 'Work Description') return offer.description;
      if (header === 'Service Location') return offer.location;
      if (header === 'Amount') return offer.amount;
      if (header === 'Is There An Offer') return offer.isOffer || 'Yes';
      if (header === 'Offer Copy') return offer.offerCopy || '';
      if (header === 'Amount To Be Paid') return offer.amount;
      if (header === 'Outstanding Amount') return offer.amount;
      if (header === 'Status') return 'Pending';
      return '';
    });
    const res = await get().saveRow('OFFER', 'insert', null, rowDataArray);
    if (res.success) {
      await get().fetchData();
    }
    return res;
  },

  updateOffer: async (rowIndex, updatedFields) => {
    const offer = get().offers.find(o => o.sheetRowIndex === rowIndex);
    if (!offer) throw new Error('Offer not found');
    const merged = { ...offer, ...updatedFields };
    const headers = get().offerHeaders;
    const rowDataArray = headers.map(header => {
      if (header === 'Timestamp') return merged.timestamp || new Date().toLocaleString();
      if (header === 'OROffer No.') return merged.id;
      if (header === 'Firm Name') return merged.firmName;
      if (header === 'Vendor Name') return merged.vendor;
      if (header === 'Work Description') return merged.description;
      if (header === 'Service Location') return merged.location;
      if (header === 'Amount') return merged.amount;
      if (header === 'Is There An Offer') return merged.isOffer;
      if (header === 'Offer Copy') return merged.offerCopy;
      if (header === 'Amount To Be Paid') return merged.amountPaid;
      if (header === 'Outstanding Amount') return merged.outstanding;
      if (header === 'Status') return merged.status;
      return '';
    });
    const res = await get().saveRow('OFFER', 'update', rowIndex, rowDataArray);
    if (res.success) {
      await get().fetchData();
    }
    return res;
  },

  addService: async (service) => {
    const headers = get().serviceHeaders;
    const rowDataArray = headers.map(header => {
      if (header === 'Timestamp') return new Date().toLocaleString();
      if (header === 'Offer No.') return service.offerNo;
      if (header === 'Service No.') return service.id;
      if (header === 'Firm Name') return service.firmName;
      if (header === 'Service Checker') return service.checker;
      if (header === 'Total Amount') return service.amount;
      if (header === 'TDS Deduction Amount') return service.tdsAmount || 0;
      if (header === 'Remark') return service.remark || '';
      if (header === 'Vendor Name') return service.vendor;
      if (header === 'Work Description') return service.description;
      if (header === 'Service Location') return service.location;
      return '';
    });
    const res = await get().saveRow('SERVICE', 'insert', null, rowDataArray);
    if (res.success) {
      await get().fetchData();
    }
    return res;
  },

  updateService: async (rowIndex, updatedFields) => {
    const service = get().services.find(s => s.sheetRowIndex === rowIndex);
    if (!service) throw new Error('Service not found');
    const merged = { ...service, ...updatedFields };
    const headers = get().serviceHeaders;
    const rowDataArray = headers.map(header => {
      const norm = (header || '').replace(/\s+/g, '');
      if (header === 'Timestamp') return merged.timestamp || new Date().toLocaleString();
      if (header === 'Offer No.') return merged.offerNo;
      if (header === 'Service No.') return merged.id;
      if (header === 'Firm Name') return merged.firmName;
      if (header === 'Service Checker') return merged.checker;
      if (header === 'Total Amount') return merged.amount;
      if (header === 'TDS Deduction Amount') return merged.tdsAmount;
      if (header === 'Remark') return merged.remark;
      if (header === 'Vendor Name') return merged.vendor;
      if (header === 'Work Description') return merged.description;
      if (header === 'Service Location') return merged.location;
      if (norm === 'Planned1') return merged.planned1;
      if (norm === 'Actual1') return merged.actual1;
      if (norm === 'Delay1') return merged.delay1;
      if (norm === 'Planned2') return merged.planned2;
      if (norm === 'Actual2') return merged.actual2;
      if (norm === 'Delay2') return merged.delay2;
      if (header === 'Payment Proof') return merged.paymentProof;
      if (header === 'Bill No.') return merged.billNo;
      if (header === 'Bill Copy') return merged.billCopy;
      if (norm === 'Planned3') return merged.planned3;
      if (norm === 'Actual3') return merged.actual3;
      if (norm === 'Delay3') return merged.delay3;
      if (norm === 'Status3') return merged.status3;
      if (norm === 'Remarks3') return merged.remarks3;
      if (norm === 'Planned4') return merged.planned4;
      if (norm === 'Actual4') return merged.actual4;
      if (norm === 'Delay4') return merged.delay4;
      if (norm === 'Status4') return merged.status4;
      if (norm === 'Remarks4') return merged.remarks4;
      if (norm === 'Planned5') return merged.planned5;
      if (norm === 'Actual5') return merged.actual5;
      if (norm === 'Delay5') return merged.delay5;
      if (norm === 'Status5') return merged.status5;
      if (norm === 'Remarks5') return merged.remarks5;
      if (header === 'Payment Form') return merged.paymentForm;
      return '';
    });
    const res = await get().saveRow('SERVICE', 'update', rowIndex, rowDataArray);
    if (res.success) {
      await get().fetchData();
    }
    return res;
  },

  addUtility: async (utility) => {
    const headers = get().utilityHeaders;
    const rowDataArray = headers.map(header => {
      if (header === 'Timestamp') return new Date().toLocaleString();
      if (header === 'UT-Utility No.' || header === 'Utility No.') return utility.id;
      if (header === 'Firm Name') return utility.firmName || '';
      if (header === 'Person Name') return utility.personName;
      if (header === 'Name Of User') return utility.userName;
      if (header === 'Department') return utility.department;
      if (header === 'Group Head') return utility.groupHead;
      if (header === 'Pay To') return utility.payTo;
      if (header === 'Bill Amount') return utility.amount;
      if (header === 'Bill Image') return utility.billImage;
      if (header === 'Bill Date') return utility.billDate;
      if (header === 'Due Date') return utility.dueDate;
      if (header === 'Remarks') return utility.remarks || '';
      if (header === 'TDS Deduction Amount') return utility.tdsAmount || 0;
      if (header === 'Amount To Be Paid') return utility.amountPaid || (utility.amount - (utility.tdsAmount || 0));
      if (header === 'Outstanding Amount') return utility.outstanding || (utility.amount - (utility.tdsAmount || 0));
      if (header === 'Status') return utility.status || 'Pending Approval';
      if (header === 'Fms Name') return utility.fmsName || '';
      if (header === 'Details') return utility.details || '';
      if (header === 'Approval Attachment') return utility.approvalAttachment || '';
      return '';
    });
    const res = await get().saveRow('UTILITY', 'insert', null, rowDataArray);
    if (res.success) {
      await get().fetchData();
    }
    return res;
  },

  updateUtility: async (rowIndex, updatedFields) => {
    const utility = get().utilities.find(u => u.sheetRowIndex === rowIndex);
    if (!utility) throw new Error('Utility not found');
    const merged = { ...utility, ...updatedFields };
    const headers = get().utilityHeaders;
    const rowDataArray = headers.map(header => {
      if (header === 'Timestamp') return merged.timestamp || new Date().toLocaleString();
      if (header === 'UT-Utility No.' || header === 'Utility No.') return merged.id;
      if (header === 'Firm Name') return merged.firmName || '';
      if (header === 'Person Name') return merged.personName;
      if (header === 'Name Of User') return merged.userName;
      if (header === 'Department') return merged.department;
      if (header === 'Group Head') return merged.groupHead;
      if (header === 'Pay To') return merged.payTo;
      if (header === 'Bill Amount') return merged.amount;
      if (header === 'Bill Image') return merged.billImage;
      if (header === 'Bill Date') return merged.billDate;
      if (header === 'Due Date') return merged.dueDate;
      if (header === 'Remarks') return merged.remarks;
      if (header === 'TDS Deduction Amount') return merged.tdsAmount;
      if (header === 'Amount To Be Paid') return merged.amountPaid || merged.amount;
      if (header === 'Outstanding Amount') return merged.outstanding;
      if (header === 'Status') return merged.status;
      if (header === 'Planned 1') return merged.planned1;
      if (header === 'Actual 1') return merged.actual1;
      if (header === 'Delay 1') return merged.delay1;
      if (header === 'Planned 2') return merged.planned2;
      if (header === 'Actual 2') return merged.actual2;
      if (header === 'Delay 2' || header === 'Dalay 2') return merged.delay2;
      if (header === 'Payment Form Link') return merged.paymentFormLink || '';
      
      // New approval fields
      if (header === 'Fms Name') return merged.fmsName || '';
      if (header === 'Details') return merged.details || '';
      if (header === 'Approval Attachment') return merged.approvalAttachment || '';
      
      // Payment details
      if (header === 'Payment Number') return merged.paymentNo || '';
      if (header === 'Payment Mode') return merged.paymentMode || '';
      if (header === 'Transaction Reference') return merged.transactionRef || '';
      if (header === 'Payment Date') return merged.paymentDate || '';
      if (header === 'Payment Attachment') return merged.paymentAttachment || '';
      if (header === 'Payment Remarks') return merged.paymentRemarks || '';
      return '';
    });
    const res = await get().saveRow('UTILITY', 'update', rowIndex, rowDataArray);
    if (res.success) {
      await get().fetchData();
    }
    return res;
  },

  clearData: () => set({ offers: [], services: [], utilities: [] })
}));

export default useDataStore;
