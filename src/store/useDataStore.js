import { create } from 'zustand';
import useAuthStore from './useAuthStore';
import { nowDateTime } from '../lib/utils';

const apiUrl = import.meta.env.VITE_APPSCRIPT_URL || 'https://script.google.com/macros/s/AKfycbxH_TMsqQkK3XpPUR4-999K7Q0R-P0WNd0rc1vL9b_KYMFB2xMN6VDP6vXqaNw4Kk3b/exec';

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

// Format a value from getValues() — Date objects come as native Date, strings stay as-is
// Converts to M/D/YYYY HH:mm:ss  (matches nowDateTime format)
const formatSheetDate = (val) => {
  if (!val) return '';
  let dt = val;
  if (typeof val === 'string' && val.includes('T') && !isNaN(Date.parse(val))) {
    dt = new Date(val);
  }
  if (dt instanceof Date && !isNaN(dt.getTime())) {
    const M  = dt.getMonth() + 1;
    const d  = dt.getDate();
    const yyyy = dt.getFullYear();
    const HH = String(dt.getHours()).padStart(2, '0');
    const mm = String(dt.getMinutes()).padStart(2, '0');
    const ss = String(dt.getSeconds()).padStart(2, '0');
    return `${M}/${d}/${yyyy} ${HH}:${mm}:${ss}`;
  }
  return String(val);
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

// Helper to read and write localStorage cache for 0ms instant app loads
const loadCache = (key) => {
  try {
    const item = localStorage.getItem(`fms_cache_${key}`);
    return item ? JSON.parse(item) : null;
  } catch (e) {
    return null;
  }
};

const saveCache = (key, data) => {
  try {
    localStorage.setItem(`fms_cache_${key}`, JSON.stringify(data));
  } catch (e) {
    /* ignore quota errors */
  }
};

const cachedOffers = loadCache('offers') || [];
const cachedServices = loadCache('services') || [];
const cachedUtilities = loadCache('utilities') || [];
const cachedOfferHeaders = loadCache('offerHeaders') || [];
const cachedServiceHeaders = loadCache('serviceHeaders') || [];
const cachedUtilityHeaders = loadCache('utilityHeaders') || [];
const cachedDepartments = loadCache('departments') || [];
const cachedGroupHeads = loadCache('groupHeads') || [];
const cachedFirms = loadCache('firms') || [];
const cachedFmsNames = loadCache('fmsNames') || [];

const useDataStore = create((set, get) => ({
  offers: cachedOffers,
  services: cachedServices,
  utilities: cachedUtilities,
  offerHeaders: cachedOfferHeaders,
  serviceHeaders: cachedServiceHeaders,
  utilityHeaders: cachedUtilityHeaders,
  departments: cachedDepartments,
  groupHeads: cachedGroupHeads,
  firms: cachedFirms,
  fmsNames: cachedFmsNames,
  loading: false,
  isFetchingInBackground: false,
  error: null,

  fetchData: async () => {
    if (get().isFetchingInBackground) {
      console.log("fetchData call ignored - fetch already in progress");
      return;
    }

    const hasExistingData = get().offers.length > 0 || get().services.length > 0 || get().utilities.length > 0;

    // Only set loading to true if we have zero data loaded anywhere
    if (!hasExistingData) {
      set({ loading: true, error: null });
    }
    set({ isFetchingInBackground: true });

    try {
      // Fetch all sheets in PARALLEL — dramatically faster than sequential (was 12-20s, now 2-5s)
      const [offersResult, servicesResult, utilitiesResult, masterResult] = await Promise.allSettled([
        fetchJsonWithRetry(`${apiUrl}?sheet=OFFER`),
        fetchJsonWithRetry(`${apiUrl}?sheet=SERVICE`),
        fetchJsonWithRetry(`${apiUrl}?sheet=UTILITY`),
        fetchJsonWithRetry(`${apiUrl}?sheet=Master`)
      ]);

      const offersRes    = offersResult.status    === 'fulfilled' ? offersResult.value    : { success: false, data: [] };
      const servicesRes  = servicesResult.status  === 'fulfilled' ? servicesResult.value  : { success: false, data: [] };
      const utilitiesRes = utilitiesResult.status === 'fulfilled' ? utilitiesResult.value : { success: false, data: [] };
      const masterRes    = masterResult.status    === 'fulfilled' ? masterResult.value    : { success: false, data: [] };

      if (offersResult.status    === 'rejected') console.error('OFFER fetch failed:',   offersResult.reason);
      if (servicesResult.status  === 'rejected') console.error('SERVICE fetch failed:', servicesResult.reason);
      if (utilitiesResult.status === 'rejected') console.error('UTILITY fetch failed:', utilitiesResult.reason);
      if (masterResult.status    === 'rejected') console.error('Master fetch failed:',  masterResult.reason);

      let offers = [];
      let offerHeaders = [];
      if (offersRes.success && offersRes.data && offersRes.data.length > 0) {
        const { headerIdx, headers } = findHeaderRow(offersRes.data, 'Offer No.');
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
          const getVal = (headerNames, fallbackIdx = -1) => {
            const names = Array.isArray(headerNames) ? headerNames : [headerNames];
            for (const name of names) {
              const colIdx = serviceHeaders.findIndex(h => String(h || '').trim().toLowerCase() === name.toLowerCase());
              if (colIdx >= 0 && row[colIdx] !== undefined && row[colIdx] !== null && String(row[colIdx]).trim() !== '') {
                return String(row[colIdx]).trim();
              }
            }
            if (fallbackIdx >= 0 && row[fallbackIdx] !== undefined && row[fallbackIdx] !== null && String(row[fallbackIdx]).trim() !== '') {
              return String(row[fallbackIdx]).trim();
            }
            return '';
          };
          const s = {
            sheetRowIndex: headerIdx + 2 + idx,
            timestamp: row[0] || '',
            offerNo: row[1] || '',
            id: row[2] || `SRV-${idx + 1}`,
            firmName: row[3] || '',
            checker: row[4] || '',
            amount: parseFloat(row[5]) || 0,
            tdsAmount: parseFloat(row[6]) || 0,
            remark: getVal(['Remark', 'Remarks'], 7),
            vendor: row[8] || '',
            description: row[9] || '',
            location: row[10] || '',
            planned1: formatSheetDate(row[11]),
            actual1: formatSheetDate(row[12]),
            delay1: row[13] || '',
            billNo: getVal(['Bill No.', 'Bill Number'], 14),
            billCopy: getVal(['Bill Copy', 'Bill Image'], 15),
            planned2: formatSheetDate(row[16]),
            actual2: formatSheetDate(row[17]),
            delay2: row[18] || '',
            paymentProof: getVal(['Payment Proof', 'Payment Proof Url', 'Payment Reference'], 19),
            planned3: formatSheetDate(getVal('Planned 3', 19)),
            actual3: formatSheetDate(getVal('Actual 3', 20)),
            delay3: getVal('Delay 3', 21),
            status3: getVal(['Status 3', 'Status3'], 22),
            remarks3: getVal(['Remarks 3', 'Remarks3'], 23),
            planned4: formatSheetDate(getVal('Planned 4', 24)),
            actual4: formatSheetDate(getVal('Actual 4', 25)),
            delay4: getVal('Delay 4', 26),
            status4: getVal(['Status 4', 'Status4'], 27),
            remarks4: getVal(['Remarks 4', 'Remarks4'], 28),
            planned5: formatSheetDate(getVal('Planned 5', 29)),
            actual5: formatSheetDate(getVal('Actual 5', 30)),
            delay5: getVal('Delay 5', 31),
            status5: getVal(['Status 5', 'Status5'], 32),
            remarks5: getVal(['Remarks 5', 'Remarks5'], 33),
            paymentForm: getVal(['Payment Form', 'Payment Form Link', 'Payment Link', 'Form Link'], 34),
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
                remarks: getVal('Remarks'),       // col M — entry remark
                remark1: getVal('Remark 1'),        // col U — approval remark
                tdsAmount: tdsVal,
                amountPaid: parseFloat(getVal('Amount To Be Paid', amountVal - tdsVal)) || (amountVal - tdsVal),
                outstanding: parseFloat(getVal('Outstanding Amount', amountVal - tdsVal)) || (amountVal - tdsVal),
                status: getVal('Status') || 'Pending Approval',
                planned1: formatSheetDate(getVal('Planned 1')),
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

      // Compute effective amountPaid, outstanding, and status for each offer based on linked services
      offers = offers.map(o => {
        const servicesForOffer = services.filter(s => s.offerNo && String(s.offerNo).trim().toLowerCase() === String(o.id).trim().toLowerCase());
        const sumServices = servicesForOffer.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
        const amountPaid = Math.max(Number(o.amountPaid) || 0, sumServices);
        const outstanding = o.amount > 0 ? Math.max(0, Number(o.amount) - amountPaid) : (Number(o.outstanding) || 0);

        let status = o.status;
        if (!status || status === 'Pending') {
          if (servicesForOffer.length > 0 && outstanding <= 0) {
            status = 'Converted';
          }
        }
        return {
          ...o,
          amountPaid,
          outstanding,
          status: status || 'Pending'
        };
      });

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
        loading: false,
        isFetchingInBackground: false 
      });

      // Save to localStorage cache for 0ms initial load next time
      saveCache('offers', offers);
      saveCache('services', services);
      saveCache('utilities', utilities);
      saveCache('offerHeaders', offerHeaders);
      saveCache('serviceHeaders', serviceHeaders);
      saveCache('utilityHeaders', utilityHeaders);
      saveCache('departments', departments);
      saveCache('groupHeads', groupHeads);
      saveCache('firms', firms);
      saveCache('fmsNames', fmsNames);
    } catch (err) {
      set({ error: err.message, loading: false, isFetchingInBackground: false });
    }
  },

  saveRow: async (sheetName, action, rowIndex, rowDataArray, retries = 3) => {
    const params = new URLSearchParams();
    params.append('sheetName', sheetName);
    params.append('action', action);
    if (rowIndex) {
      params.append('rowIndex', String(rowIndex));
    }
    params.append('rowData', JSON.stringify(rowDataArray));

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        body: params,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseErr) {
        throw new Error(`Invalid JSON response: ${text.slice(0, 100)}`);
      }
      if (data && data.success === false) {
        throw new Error(data.message || data.error || 'Server returned failure');
      }
      return data;
    } catch (err) {
      if (retries > 0) {
        console.warn(`saveRow failed for ${sheetName} ${action}, retrying in 300ms... (${retries} left). Error: ${err.message}`);
        await new Promise(resolve => setTimeout(resolve, 300));
        return get().saveRow(sheetName, action, rowIndex, rowDataArray, retries - 1);
      }
      throw err;
    }
  },

  addOffer: async (offer) => {
    const rawHeaders = get().offerHeaders;
    const defaultHeaders = [
      'Timestamp', 'Offer No.', 'Firm Name', 'Vendor Name', 'Work Description',
      'Service Location', 'Amount', 'Is There An Offer', 'Offer Copy',
      'Amount To Be Paid', 'Outstanding Amount', 'Status'
    ];
    const headers = (rawHeaders && rawHeaders.length > 0) ? rawHeaders : defaultHeaders;

    const offerColumnMap = {
      'Firm Name': offer.firmName,
      'Vendor Name': offer.vendor,
      'Work Description': offer.description,
      'Service Location': offer.location,
      'Amount': offer.amount,
      'Is There An Offer': offer.isOffer || 'Yes',
      'Offer Copy': offer.offerCopy || '',
    };
    // Submit Timestamp (Column A) + 7 input columns — leave Offer No, Amount To Be Paid, Outstanding Amount, Status to Google Sheet formulas
    const fullArray = headers.map(header => {
      const norm = String(header || '').trim().toLowerCase().replace(/\s+/g, '');
      if (norm === 'timestamp') return offer.timestamp || nowDateTime();
      if (norm === 'firmname') return offer.firmName;
      if (norm === 'vendorname' || norm === 'vendor') return offer.vendor;
      if (norm === 'workdescription' || norm === 'description') return offer.description;
      if (norm === 'servicelocation' || norm === 'location') return offer.location;
      if (norm === 'amount') return offer.amount;
      if (norm === 'isthereanoffer') return offer.isOffer || 'Yes';
      if (norm === 'offercopy') return offer.offerCopy || '';
      return null;
    });
    let lastMatchIdx = -1;
    for (let i = fullArray.length - 1; i >= 0; i--) {
      if (fullArray[i] !== null) { lastMatchIdx = i; break; }
    }
    const rowDataArray = fullArray.slice(0, lastMatchIdx + 1).map(v => v === null ? '' : v);

    // Optimistic UI update — add new offer to state & localStorage immediately
    const nowTs = nowDateTime();
    const newOfferObj = {
      sheetRowIndex: (get().offers.length > 0 ? Math.max(...get().offers.map(o => o.sheetRowIndex || 0)) + 1 : 2),
      timestamp: nowTs,
      id: '',              // Sheet formula generates Offer No. — will be updated after fetchData
      firmName: offer.firmName,
      vendor: offer.vendor,
      description: offer.description,
      location: offer.location,
      amount: offer.amount,
      isOffer: offer.isOffer || 'Yes',
      offerCopy: offer.offerCopy || '',
      amountPaid: 0,
      outstanding: offer.amount,
      status: 'Pending',
      date: nowTs.split(' ')[0]
    };
    const updatedOffers = [newOfferObj, ...get().offers];
    set({ offers: updatedOffers });
    saveCache('offers', updatedOffers);

    const res = await get().saveRow('OFFER', 'insert', null, rowDataArray);
    // Background refetch — don't block the caller
    if (res && res.success) {
      get().fetchData();
    }
    return res;
  },

  updateOffer: async (rowIndex, updatedFields) => {
    const offer = get().offers.find(o => o.sheetRowIndex === rowIndex);
    if (!offer) throw new Error('Offer not found');
    const merged = { ...offer, ...updatedFields };

    const headers = get().offerHeaders;
    const rowDataArray = headers.map(header => {
      if (header === 'Timestamp') return null;           // never overwrite original timestamp
      if (header === 'Offer No.') return null;           // formula column — do not overwrite
      if (header === 'Firm Name') return merged.firmName;
      if (header === 'Vendor Name') return merged.vendor;
      if (header === 'Work Description') return merged.description;
      if (header === 'Service Location') return merged.location;
      if (header === 'Amount') return merged.amount;
      if (header === 'Is There An Offer') return merged.isOffer;
      if (header === 'Offer Copy') return merged.offerCopy;
      if (header === 'Amount To Be Paid') return null;   // formula column — do not overwrite
      if (header === 'Outstanding Amount') return null;  // formula column — do not overwrite
      if (header === 'Status') return null;              // formula column — do not overwrite
      return '';
    });
    // Optimistic UI update for offers
    const updatedOffers = get().offers.map(o => o.sheetRowIndex === rowIndex ? merged : o);
    set({ offers: updatedOffers });
    saveCache('offers', updatedOffers);

    const res = await get().saveRow('OFFER', 'update', rowIndex, rowDataArray);
    // Background refetch — UI already updated optimistically
    if (res && res.success) {
      get().fetchData();
    }
    return res;
  },

  addService: async (service) => {
    const rawHeaders = get().serviceHeaders;
    const defaultHeaders = [
      'Timestamp', 'Offer No.', 'Service No.', 'Firm Name', 'Service Checker',
      'Total Amount', 'TDS Deduction Amount', 'Remark', 'Vendor Name',
      'Work Description', 'Service Location'
    ];
    const headers = (rawHeaders && rawHeaders.length > 0) ? rawHeaders : defaultHeaders;

    const fullArray = headers.map(header => {
      const norm = String(header || '').trim().toLowerCase().replace(/\s+/g, '');
      if (norm === 'timestamp') return nowDateTime();
      if (norm === 'offerno.' || norm === 'offerno') return service.offerNo;
      if (norm === 'serviceno.' || norm === 'serviceno') return service.id;
      if (norm === 'firmname') return service.firmName;
      if (norm === 'servicechecker' || norm === 'checker') return service.checker;
      if (norm === 'totalamount' || norm === 'amount') return service.amount;
      if (norm === 'tdsdeductionamount' || norm === 'tdsamount') return service.tdsAmount || 0;
      if (norm === 'remark' || norm === 'remarks') return service.remark || '';
      if (norm === 'vendorname' || norm === 'vendor') return service.vendor;
      if (norm === 'workdescription' || norm === 'description') return service.description;
      if (norm === 'servicelocation' || norm === 'location') return service.location;
      return null;
    });
    let lastMatchIdx = -1;
    for (let i = fullArray.length - 1; i >= 0; i--) {
      if (fullArray[i] !== null) { lastMatchIdx = i; break; }
    }
    const rowDataArray = fullArray.slice(0, lastMatchIdx + 1).map(v => v === null ? '' : v);

    // Optimistic UI update — add new service to state immediately
    const nowTs = nowDateTime();
    const newServiceObj = {
      sheetRowIndex: (get().services.length > 0 ? Math.max(...get().services.map(s => s.sheetRowIndex || 0)) + 1 : 2),
      timestamp: nowTs,
      offerNo: service.offerNo,
      id: service.id,
      firmName: service.firmName,
      checker: service.checker,
      amount: service.amount,
      tdsAmount: service.tdsAmount || 0,
      remark: service.remark || '',
      vendor: service.vendor,
      description: service.description,
      location: service.location,
      status: 'Service Created',
      planned1: nowTs, actual1: '', delay1: '',
      billNo: '', billCopy: '',
      planned2: '', actual2: '', delay2: '',
      paymentProof: ''
    };
    const updatedServices = [newServiceObj, ...get().services];
    set({ services: updatedServices });
    saveCache('services', updatedServices);

    const res = await get().saveRow('SERVICE', 'insert', null, rowDataArray);
    // Background refetch — sync with sheet
    if (res && res.success) {
      get().fetchData();
    }
    return res;
  },

  updateService: async (rowIndex, updatedFields) => {
    const service = get().services.find(s => s.sheetRowIndex === rowIndex);
    if (!service) throw new Error('Service not found');
    const merged = { ...service, ...updatedFields };

    // Optimistic UI update — UI reflects change immediately without waiting for network
    const updatedServices = get().services.map(s => s.sheetRowIndex === rowIndex ? merged : s);
    set({ services: updatedServices });
    saveCache('services', updatedServices);

    const headers = get().serviceHeaders;
    const fullArray = headers.map(header => {
      const norm = String(header || '').trim().toLowerCase().replace(/\s+/g, '');
      if (header === 'Timestamp') return null; // Never overwrite original Column A timestamp
      if (header === 'Offer No.') return merged.offerNo;
      if (header === 'Service No.') return merged.id;
      if (header === 'Firm Name') return merged.firmName;
      if (header === 'Service Checker') return merged.checker;
      if (header === 'Total Amount') return merged.amount;
      if (header === 'TDS Deduction Amount') return merged.tdsAmount;
      if (norm === 'remark' || norm === 'remarks') return merged.remark;
      if (header === 'Vendor Name') return merged.vendor;
      if (header === 'Work Description') return merged.description;
      if (header === 'Service Location') return merged.location;
      if (norm.includes('planned')) return null;
      if (norm === 'actual1') return merged.actual1 || null;
      if (norm === 'delay1') return merged.delay1 || null;
      if (header === 'Bill No.') return merged.billNo || null;
      if (header === 'Bill Copy') return merged.billCopy || null;
      if (norm === 'actual2') return merged.actual2 || null;
      if (norm === 'delay2') return merged.delay2 || null;
      if (header === 'Payment Proof') return merged.paymentProof || null;
      if (norm === 'actual3') return merged.actual3 || null;
      if (norm === 'delay3') return merged.delay3 || null;
      if (norm === 'status3') return merged.status3 || null;
      if (norm === 'remarks3') return merged.remarks3 || null;
      if (norm === 'actual4') return merged.actual4 || null;
      if (norm === 'delay4') return merged.delay4 || null;
      if (norm === 'status4') return merged.status4 || null;
      if (norm === 'remarks4') return merged.remarks4 || null;
      if (norm === 'actual5') return merged.actual5 || null;
      if (norm === 'delay5') return merged.delay5 || null;
      if (norm === 'status5') return merged.status5 || null;
      if (norm === 'remarks5' || header === 'Remarks 5') return null; // Never touch Column AH Remarks 5
      if (header === 'Payment Form' || header === 'Payment Form Link' || norm === 'paymentform') return null; // Do not touch Column AI Payment Form
      return null;
    });

    let lastMatchIdx = -1;
    for (let i = fullArray.length - 1; i >= 0; i--) {
      if (fullArray[i] !== null && fullArray[i] !== undefined) { lastMatchIdx = i; break; }
    }

    if (lastMatchIdx < 0) return { success: true };

    // Keep null as null — Code.gs treats null as "don't touch this cell" (see Code.gs line 130).
    // Do NOT convert null to '' because '' is treated as a real value and overwrites formulas like Planned 5.
    const rowDataArray = fullArray.slice(0, lastMatchIdx + 1).map(v => v === null ? null : v);
    const res = await get().saveRow('SERVICE', 'update', rowIndex, rowDataArray);
    // Background refetch — UI already updated optimistically above
    if (res && res.success) {
      get().fetchData();
    }
    return res;
  },

  addUtility: async (utility) => {
    const headers = get().utilityHeaders;
    const allowedHeaders = [
      'Timestamp',
      'UT-Utility No.', 'Utility No.',
      'Firm Name',
      'Person Name',
      'Name Of User',
      'Department',
      'Group Head',
      'Pay To',
      'Bill Amount',
      'Bill Image',
      'Bill Date',
      'Due Date',
      'Remarks',
      'TDS Deduction Amount',
      'Amount To Be Paid'
    ];

    const fullArray = headers.map(header => {
      if (!allowedHeaders.includes(header)) return null;

      if (header === 'Timestamp') return nowDateTime();
      if (header === 'UT-Utility No.' || header === 'Utility No.') return utility.id;
      if (header === 'Firm Name') return utility.firmName || '';
      if (header === 'Person Name') return utility.personName || '';
      if (header === 'Name Of User') return utility.userName || '';
      if (header === 'Department') return utility.department || '';
      if (header === 'Group Head') return utility.groupHead || '';
      if (header === 'Pay To') return utility.payTo || '';
      if (header === 'Bill Amount') return utility.amount || 0;
      if (header === 'Bill Image') return utility.billImage || '';
      if (header === 'Bill Date') return utility.billDate || '';
      if (header === 'Due Date') return utility.dueDate || '';
      if (header === 'Remarks') return utility.remarks || '';
      if (header === 'TDS Deduction Amount') return utility.tdsAmount || 0;
      if (header === 'Amount To Be Paid') return (utility.amountPaid !== undefined && utility.amountPaid !== null) ? utility.amountPaid : ((utility.amount || 0) - (utility.tdsAmount || 0));

      return null;
    });
    // Everything after the last creation-time field (Planned/Actual approval + payment
    // columns) is filled in step-by-step later via updateUtility — trim the array so
    // creation never touches those cells, otherwise it blanks out the Planned formula columns.
    let lastMatchIdx = -1;
    for (let i = fullArray.length - 1; i >= 0; i--) {
      if (fullArray[i] !== null) { lastMatchIdx = i; break; }
    }
    const rowDataArray = fullArray.slice(0, lastMatchIdx + 1).map(v => v === null ? '' : v);
    const res = await get().saveRow('UTILITY', 'insert', null, rowDataArray);
    // Background refetch — don't block the caller
    if (res && res.success) {
      get().fetchData();
    }
    return res;
  },

  updateUtility: async (rowIndex, updatedFields) => {
    const utility = get().utilities.find(u => u.sheetRowIndex === rowIndex);
    if (!utility) throw new Error('Utility not found');
    const merged = { ...utility, ...updatedFields };
    
    // Optimistic UI update
    set(state => ({
      utilities: state.utilities.map(u => u.sheetRowIndex === rowIndex ? merged : u)
    }));

    const headers = get().utilityHeaders;
    const rowDataArray = headers.map(header => {
      // Helper: only return a value if it was explicitly passed in updatedFields
      const norm = h => String(h || '').trim().toLowerCase().replace(/\s+/g, '');
      const hn = norm(header);

      // Map header → field key
      if (hn === 'timestamp') return null; // never overwrite timestamp
      if (hn === 'ut-utilityno.' || hn === 'utilityno.' || hn === 'utilityno') return null; // never overwrite ID

      if ('firmName' in updatedFields && hn === 'firmname') return updatedFields.firmName;
      if ('personName' in updatedFields && hn === 'personname') return updatedFields.personName;
      if ('userName' in updatedFields && hn === 'nameofuser') return updatedFields.userName;
      if ('department' in updatedFields && hn === 'department') return updatedFields.department;
      if ('groupHead' in updatedFields && hn === 'grouphead') return updatedFields.groupHead;
      if ('payTo' in updatedFields && hn === 'payto') return updatedFields.payTo;
      if ('amount' in updatedFields && hn === 'billamount') return updatedFields.amount;
      if ('billImage' in updatedFields && hn === 'billimage') return updatedFields.billImage;
      if ('billDate' in updatedFields && hn === 'billdate') return updatedFields.billDate;
      if ('dueDate' in updatedFields && hn === 'duedate') return updatedFields.dueDate;
      if ('remarks' in updatedFields && hn === 'remarks') return updatedFields.remarks;      // col M
      if ('remark1' in updatedFields && hn === 'remark1') return updatedFields.remark1;       // col U
      if ('tdsAmount' in updatedFields && hn === 'tdsdeductionamount') return updatedFields.tdsAmount;
      if ('amountPaid' in updatedFields && hn === 'amounttobepaid') return updatedFields.amountPaid;
      if ('outstanding' in updatedFields && hn === 'outstandingamount') return updatedFields.outstanding;
      if ('status' in updatedFields && hn === 'status') return updatedFields.status;
      if (hn.startsWith('planned')) return null; // Formula columns — always preserve
      if ('actual1' in updatedFields && hn === 'actual1') return updatedFields.actual1;
      if ('delay1' in updatedFields && hn === 'delay1') return updatedFields.delay1;
      if ('actual2' in updatedFields && hn === 'actual2') return updatedFields.actual2;
      if ('delay2' in updatedFields && (hn === 'delay2' || hn === 'dalay2')) return updatedFields.delay2;
      if ('paymentFormLink' in updatedFields && hn === 'paymentformlink') return updatedFields.paymentFormLink;
      if ('fmsName' in updatedFields && hn === 'fmsname') return updatedFields.fmsName;
      if ('details' in updatedFields && hn === 'details') return updatedFields.details;
      if ('approvalAttachment' in updatedFields && hn === 'approvalattachment') return updatedFields.approvalAttachment;
      if ('paymentNo' in updatedFields && hn === 'paymentnumber') return updatedFields.paymentNo;
      if ('paymentMode' in updatedFields && hn === 'paymentmode') return updatedFields.paymentMode;
      if ('transactionRef' in updatedFields && hn === 'transactionreference') return updatedFields.transactionRef;
      if ('paymentDate' in updatedFields && hn === 'paymentdate') return updatedFields.paymentDate;
      if ('paymentAttachment' in updatedFields && hn === 'paymentattachment') return updatedFields.paymentAttachment;
      if ('paymentRemarks' in updatedFields && hn === 'paymentremarks') return updatedFields.paymentRemarks;

      return null; // all other columns → preserve existing value in sheet
    });
    const res = await get().saveRow('UTILITY', 'update', rowIndex, rowDataArray);
    // Background refetch — UI already updated optimistically above (line ~584)
    if (res && res.success) {
      get().fetchData();
    }
    return res;
  },

  clearData: () => set({ offers: [], services: [], utilities: [] })
}));

export default useDataStore;
