import { create } from 'zustand';
import useAuthStore from './useAuthStore';
import { nowDateTime, formatDate } from '../lib/utils';
import { supabase } from '../lib/supabase';

const apiUrl = import.meta.env.VITE_APPSCRIPT_URL || 'https://script.google.com/macros/s/AKfycbxH_TMsqQkK3XpPUR4-999K7Q0R-P0WNd0rc1vL9b_KYMFB2xMN6VDP6vXqaNw4Kk3b/exec';


// ⚡ Request deduplication — prevents duplicate parallel requests
const requestCache = new Map();
const requestTimestamps = new Map();
const CACHE_TTL = 30000; // 30 seconds

const getCacheKey = (url, method) => `${method}:${url}`;

const cachedFetch = async (url, options = {}, cacheTTL = CACHE_TTL) => {
  const method = options.method || 'GET';
  const key = getCacheKey(url, method);

  // Return cached result if still fresh
  const cached = requestCache.get(key);
  const timestamp = requestTimestamps.get(key);
  if (cached && timestamp && Date.now() - timestamp < cacheTTL) {
    return cached;
  }

  // If request already in flight, wait for it
  if (requestCache.has(key) && typeof requestCache.get(key).then === 'function') {
    return requestCache.get(key);
  }

  // Execute new request
  const promise = fetch(url, options).then(r => r.json());
  requestCache.set(key, promise);

  promise.then(data => {
    requestCache.set(key, data);
    requestTimestamps.set(key, Date.now());
  }).catch(() => {
    requestCache.delete(key);
    requestTimestamps.delete(key);
  });

  return promise;
};

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

// Format a value to MM/dd/yyyy HH:mm:ss
const formatSheetDate = (val) => formatDate(val);

// ⚡ Robust fetch with retry, timeout, and exponential backoff
const fetchJsonWithRetry = async (url, options = {}, retries = 1, delay = 50) => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000); // 20 second timeout (Apps Script can be slow on cold start)

    const sheetName = new URL(url).searchParams.get('sheet') || 'unknown';
    console.log(`[Fetch] Fetching ${sheetName} sheet...`);

    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json();
    if (data && data.success === false) {
      throw new Error(data.message || data.error || 'API failed');
    }
    console.log(`[Fetch] ✅ ${sheetName}: ${data.data?.length || 0} rows`);
    return data;
  } catch (err) {
    console.error(`[Fetch] ❌ ${url.split('?')[1] || 'unknown'}: ${err.message}`);
    if (retries > 0 && err.name !== 'AbortError') {
      console.log(`[Fetch] Retrying (${retries} left)...`);
      await new Promise(resolve => setTimeout(resolve, 200));
      return fetchJsonWithRetry(url, options, retries - 1, delay);
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
const cachedAllOffers = loadCache('allOffers') || [];
const cachedServices = loadCache('services') || [];
const cachedUtilities = loadCache('utilities') || [];
const cachedOfferHeaders = loadCache('offerHeaders') || [];
const cachedServiceHeaders = loadCache('serviceHeaders') || [];
const cachedUtilityHeaders = loadCache('utilityHeaders') || [];
const cachedDepartments = loadCache('departments') || [];
const cachedGroupHeads = loadCache('groupHeads') || [];
const cachedFirms = loadCache('firms') || [];
const cachedFmsNames = loadCache('fmsNames') || [];
const cachedServiceLocations = loadCache('serviceLocations') || [];
const getInitialMaxSrv = () => {
  const cachedVal = loadCache('globalMaxServiceId');
  if (typeof cachedVal === 'number' && cachedVal > 0) return cachedVal;
  const ids = (cachedServices || []).map(s => {
    const m = String(s.id || '').match(/SRV-(\d+)/i);
    return m ? parseInt(m[1], 10) : 0;
  }).filter(id => id > 0);
  return ids.length > 0 ? Math.max(...ids) : 0;
};
const cachedGlobalMaxServiceId = getInitialMaxSrv();

const useDataStore = create((set, get) => ({
  offers: cachedOffers,
  allOffers: cachedAllOffers,
  services: cachedServices,
  utilities: cachedUtilities,
  offerHeaders: cachedOfferHeaders,
  serviceHeaders: cachedServiceHeaders,
  utilityHeaders: cachedUtilityHeaders,
  departments: cachedDepartments,
  groupHeads: cachedGroupHeads,
  firms: cachedFirms,
  fmsNames: cachedFmsNames,
  serviceLocations: cachedServiceLocations,
  globalMaxServiceId: cachedGlobalMaxServiceId,
  getNextServiceId: () => {
    const currentMax = get().globalMaxServiceId || 0;
    return `SRV-${String(currentMax + 1).padStart(3, '0')}`;
  },
  loading: false,
  isFetchingInBackground: false,
  error: null,
  lastFetchTime: 0, // ⚡ Track last fetch to skip redundant calls
  fetchDebounceTimer: null, // ⚡ Debounce timer

  fetchData: async (force = false) => {
    const now = Date.now();
    const timeSinceLastFetch = now - get().lastFetchTime;

    // ⚡ Skip only if NOT forced AND fetched within last 15 sec AND already fetching
    if (!force && timeSinceLastFetch < 15000 && get().isFetchingInBackground) {
      return;
    }

    if (!force && get().isFetchingInBackground) {
      console.log('fetchData call ignored - fetch already in progress');
      return;
    }

    const hasExistingData = get().offers.length > 0 || get().services.length > 0 || get().utilities.length > 0;

    if (!hasExistingData) {
      set({ loading: true, error: null });
    }
    set({ isFetchingInBackground: true });

    try {
      // 🔵 Fetch from Supabase in parallel
      const [servicesRes, offersRes, utilitiesRes, masterRes] = await Promise.allSettled([
        supabase.from('services').select('*').order('created_at', { ascending: false }),
        supabase.from('offers').select('*').order('created_at', { ascending: false }),
        supabase.from('utilities').select('*').order('created_at', { ascending: false }),
        supabase.from('master_data').select('*'),
      ]);

      // — Services —
      let services = [];
      if (servicesRes.status === 'fulfilled' && !servicesRes.value.error) {
        services = (servicesRes.value.data || []).map(row => {
          const s = {
            sheetRowIndex: row.id,
            id:            row.service_no        || '',
            timestamp:     formatDate(row.created_at),
            offerNo:       row.offer_no           || '',
            firmName:      row.firm_name          || '',
            checker:       row.service_checker    || '',   // ✅ Supabase: service_checker
            amount:        Number(row.total_amount)  || 0, // ✅ Supabase: total_amount
            tdsAmount:     Number(row.tds_amount)    || 0,
            remark:        row.remark             || '',
            vendor:        row.vendor_name        || '',   // ✅ Supabase: vendor_name
            description:   row.work_description   || '',  // ✅ Supabase: work_description
            location:      row.service_location   || '',  // ✅ Supabase: service_location
            planned1:      formatDate(row.planned_1),     // ✅ Supabase: planned_1
            actual1:       formatDate(row.actual_1),      // ✅ Supabase: actual_1
            delay1:        '',                           // not in Supabase
            billNo:        row.bill_no            || '',
            billCopy:      row.bill_copy_url      || '',   // ✅ Supabase: bill_copy_url
            planned2:      formatDate(row.planned_2),     // ✅ Supabase: planned_2
            actual2:       formatDate(row.actual_2),      // ✅ Supabase: actual_2
            delay2:        '',                           // not in Supabase
            paymentProof:  row.bill_copy_url      || '',  // maps to bill_copy_url
            planned3:      formatDate(row.planned_3),     // ✅ Supabase: planned_3
            actual3:       formatDate(row.actual_3),      // ✅ Supabase: actual_3
            delay3:        '',
            status3:       row.status_3           || '',  // ✅ Supabase: status_3
            remarks3:      row.remarks_3          || '',  // ✅ Supabase: remarks_3
            planned4:      formatDate(row.planned_4),     // ✅ Supabase: planned_4
            actual4:       formatDate(row.actual_4),      // ✅ Supabase: actual_4
            delay4:        '',
            status4:       row.status_4           || '',  // ✅ Supabase: status_4
            remarks4:      row.remarks_4          || '',  // ✅ Supabase: remarks_4
            planned5:      formatDate(row.planned_5),     // ✅ Supabase: planned_5
            actual5:       formatDate(row.actual_5),      // ✅ Supabase: actual_5
            delay5:        '',
            status5:       row.status_5           || '',  // ✅ Supabase: status_5
            remarks5:      row.remarks_5          || '',  // ✅ Supabase: remarks_5
            paymentForm:   row.payment_form_url   || '',  // ✅ Supabase: payment_form_url
            date:          formatDate(row.created_at),
            _dbId:         row.id,
          };
          s.status = getServiceStatus(s);
          return s;
        });
      } else if (servicesRes.status === 'rejected') {
        console.error('[Supabase] services fetch failed:', servicesRes.reason);
      } else {
        console.error('[Supabase] services error:', servicesRes.value?.error?.message);
      }

      // — Offers —
      let offers = [];
      if (offersRes.status === 'fulfilled' && !offersRes.value.error) {
        offers = (offersRes.value.data || []).map(row => ({
          sheetRowIndex: row.id,
          id:            row.offer_no          || '',
          timestamp:     formatDate(row.created_at),
          firmName:      row.firm_name         || '',
          vendor:        row.vendor_name       || '',   // ✅ Supabase: vendor_name
          description:   row.work_description  || '',  // ✅ Supabase: work_description
          location:      row.service_location  || '',  // ✅ Supabase: service_location
          amount:        Number(row.amount)    || 0,
          isOffer:       row.is_there_offer    || '',  // ✅ Supabase: is_there_offer
          offerCopy:     row.offer_copy_url    || '',  // ✅ Supabase: offer_copy_url
          amountPaid:    Number(row.amount_to_be_paid)  || 0,  // ✅ Supabase: amount_to_be_paid
          outstanding:   Number(row.outstanding_amount) || 0,  // ✅ Supabase: outstanding_amount
          status:        row.status            || 'Pending',
          date:          formatDate(row.created_at),
          _dbId:         row.id,
        }));
      } else if (offersRes.status === 'rejected') {
        console.error('[Supabase] offers fetch failed:', offersRes.reason);
      } else {
        console.error('[Supabase] offers error:', offersRes.value?.error?.message);
      }

      // — Utilities —
      let utilities = [];
      if (utilitiesRes.status === 'fulfilled' && !utilitiesRes.value.error) {
        utilities = (utilitiesRes.value.data || []).map(row => {
          const amountVal = Number(row.bill_amount) || 0;
          const tdsVal    = Number(row.tds_amount)  || 0;   // ✅ Supabase: tds_amount
          const actual1   = row.actual_1;                   // ✅ Supabase: actual_1
          const actual2   = row.actual_2;                   // ✅ Supabase: actual_2
          let statusVal   = row.status || '';
          if (actual2 || statusVal === 'Completed')        statusVal = 'Completed';
          else if (actual1 || statusVal === 'Approved')    statusVal = 'Approved';
          else if (statusVal === 'Rejected')               statusVal = 'Rejected';
          else if (!statusVal)                             statusVal = 'Pending Approval';

          return {
            sheetRowIndex:      row.id,
            id:                 row.utility_no              || '',
            timestamp:          formatDate(row.created_at),
            firmName:           row.firm_name               || '',
            personName:         row.person_name             || '',
            userName:           row.user_name               || '',  // ✅ Supabase: user_name
            department:         row.department              || '',
            groupHead:          row.group_head              || '',
            payTo:              row.pay_to                  || '',
            amount:             amountVal,
            billImage:          row.bill_image_url          || '',  // ✅ Supabase: bill_image_url
            billDate:           formatDate(row.bill_date),
            dueDate:            formatDate(row.due_date),
            remarks:            row.remarks                 || '',
            remark1:            row.remark_1               || '',   // ✅ Supabase: remark_1
            tdsAmount:          tdsVal,
            amountPaid:         Number(row.amount_to_be_paid)  || (amountVal - tdsVal),
            outstanding:        Number(row.outstanding_amount) || (amountVal - tdsVal),
            status:             statusVal,
            actual:             formatDate(row.actual_0),           // ✅ Supabase: actual_0
            planned1:           formatDate(row.planned_1),          // ✅ Supabase: planned_1
            actual1:            formatDate(row.actual_1),           // ✅ Supabase: actual_1
            delay1:             row.delay1                 || '',
            planned2:           formatDate(row.planned_2),          // ✅ Supabase: planned_2
            actual2:            formatDate(row.actual_2),           // ✅ Supabase: actual_2
            delay2:             row.delay2                 || '',
            paymentFormLink:    row.payment_form_link       || '',
            fmsName:            row.fms_name               || '',
            details:            row.details                || '',
            approvalAttachment: row.approval_attachment_url || '', // ✅ Supabase: approval_attachment_url
            paymentNo:          row.payment_number         || '',
            paymentMode:        row.payment_mode           || '',
            transactionRef:     row.transaction_reference  || '',
            paymentDate:        formatDate(row.payment_date),
            paymentAttachment:  row.payment_attachment_url || '',   // ✅ Supabase: payment_attachment_url
            paymentRemarks:     row.payment_remarks        || '',
            date:               formatDate(row.bill_date || row.created_at),
            _dbId:              row.id,
          };
        });
      } else if (utilitiesRes.status === 'rejected') {
        console.error('[Supabase] utilities fetch failed:', utilitiesRes.reason);
      } else {
        console.error('[Supabase] utilities error:', utilitiesRes.value?.error?.message);
      }

      // — Master Data — (Supabase: list_type + value format)
      let departments = [], groupHeads = [], firms = [], fmsNames = [], serviceLocations = [];
      if (masterRes.status === 'fulfilled' && !masterRes.value.error) {
        const rows = masterRes.value.data || [];
        const getList = (type) => [...new Set(
          rows.filter(r => r.list_type === type && r.value).map(r => r.value)
        )].sort((a, b) => a.localeCompare(b));
        departments      = getList('department');
        groupHeads       = getList('group_head');
        firms            = getList('firm_name');
        fmsNames         = getList('fms_name');
        serviceLocations = getList('service_location');
      } else if (masterRes.status === 'rejected') {
        console.error('[Supabase] master_data fetch failed:', masterRes.reason);
      }

      // Compute offer amountPaid + outstanding from linked services (SUMIFS logic)
      offers = offers.map(o => {
        const servicesForOffer = services.filter(s =>
          s.offerNo &&
          String(s.offerNo).trim().toLowerCase() === String(o.id).trim().toLowerCase() &&
          (!s.firmName || !o.firmName || String(s.firmName).trim().toLowerCase() === String(o.firmName).trim().toLowerCase())
        );
        const sumServices = servicesForOffer.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
        const hasLinked   = servicesForOffer.length > 0;
        const amountPaid  = hasLinked ? sumServices : (Number(o.amountPaid) || 0);
        const outstanding = o.amount > 0 ? Math.max(0, Number(o.amount) - amountPaid) : (Number(o.outstanding) || 0);
        let status = o.status;
        if (!status || status === 'Pending') {
          if (hasLinked && outstanding <= 0) status = 'Converted';
        }
        return { ...o, amountPaid, outstanding, status: status || 'Pending' };
      });

      const allOffers = [...offers];

      // Global max SRV number
      const allSrvIds = services
        .map(s => { const m = String(s.id || '').match(/SRV-(\d+)/i); return m ? parseInt(m[1], 10) : 0; })
        .filter(id => !isNaN(id) && id > 0);
      const globalMaxServiceId = allSrvIds.length > 0 ? Math.max(...allSrvIds) : 0;

      // Firm-based access filter
      const currentUser = useAuthStore.getState().user;
      const isAdmin = currentUser?.role?.toLowerCase() === 'admin';
      const userFirms = currentUser?.firmName
        ? currentUser.firmName.split(',').map(f => f.trim().toLowerCase())
        : [];
      const hasAllAccess = userFirms.includes('all') || userFirms.includes('all firms');

      if (!isAdmin && !hasAllAccess) {
        offers    = offers.filter(o    => userFirms.includes((o.firmName    || '').trim().toLowerCase()));
        services  = services.filter(s  => userFirms.includes((s.firmName    || '').trim().toLowerCase()));
        utilities = utilities.filter(u => userFirms.includes((u.firmName    || '').trim().toLowerCase()));
      }

      set({
        offers,
        allOffers,
        services,
        utilities,
        offerHeaders:    [],   // not needed with Supabase (column names are fixed)
        serviceHeaders:  [],
        utilityHeaders:  [],
        departments,
        groupHeads,
        firms,
        fmsNames,
        serviceLocations,
        globalMaxServiceId,
        loading: false,
        isFetchingInBackground: false,
        lastFetchTime: Date.now(),
      });

      // Cache for instant 0ms load next session
      saveCache('offers', offers);
      saveCache('allOffers', allOffers);
      saveCache('services', services);
      saveCache('utilities', utilities);
      saveCache('departments', departments);
      saveCache('groupHeads', groupHeads);
      saveCache('firms', firms);
      saveCache('fmsNames', fmsNames);
      saveCache('serviceLocations', serviceLocations);
      saveCache('globalMaxServiceId', globalMaxServiceId);

      console.log(`[Supabase] ✅ Loaded — services:${services.length} offers:${offers.length} utilities:${utilities.length}`);

    } catch (err) {
      const errorMsg = err.message || 'Failed to load data from Supabase';
      console.error('[fetchData Error]', err);
      const hasCachedData = get().offers.length > 0 || get().services.length > 0;
      set({
        error: hasCachedData ? `${errorMsg} (showing cached data)` : errorMsg,
        loading: false,
        isFetchingInBackground: false,
      });
    }
  },


  // ─── Legacy no-ops (Sheets calls removed) ───────────────────────────────────
  saveRow:  async () => ({ success: true }),
  saveCell: async () => ({ success: true }),

  // ─── OFFERS ──────────────────────────────────────────────────────────────────
  addOffer: async (offer) => {
    const nowTs = new Date().toISOString();
    const row = {
      offer_no:          offer.id            || '',
      firm_name:         offer.firmName      || '',
      vendor_name:       offer.vendor        || '',
      work_description:  offer.description   || '',
      service_location:  offer.location      || '',
      amount:            Number(offer.amount) || 0,
      is_there_offer:    offer.isOffer       || 'Yes',
      offer_copy_url:    offer.offerCopy     || '',
      amount_to_be_paid: 0,              // nothing paid yet — SUMIFS will compute from services
      outstanding_amount: Number(offer.amount) || 0,
      status:            'Pending',
    };

    // Optimistic UI
    const newObj = {
      sheetRowIndex: Date.now(),
      timestamp: nowTs, id: offer.id, firmName: offer.firmName,
      vendor: offer.vendor, description: offer.description,
      location: offer.location, amount: Number(offer.amount) || 0,
      isOffer: offer.isOffer || 'Yes', offerCopy: offer.offerCopy || '',
      amountPaid: 0, outstanding: Number(offer.amount) || 0,
      status: 'Pending', date: nowTs,
    };
    const updatedOffers = [newObj, ...get().offers];
    const updatedAllOffers = [newObj, ...(get().allOffers || [])];
    set({ offers: updatedOffers, allOffers: updatedAllOffers });
    saveCache('offers', updatedOffers);
    saveCache('allOffers', updatedAllOffers);

    const { data, error } = await supabase.from('offers').insert(row).select().single();
    if (error) { console.error('[addOffer]', error.message); throw new Error(error.message); }
    console.log('[addOffer] ✅', data?.offer_no);
    get().fetchData(true); // force refresh after write
    return { success: true };
  },

  updateOffer: async (rowIndex, updatedFields) => {
    const offer = get().offers.find(o => o.sheetRowIndex === rowIndex || o._dbId === rowIndex);
    if (!offer) throw new Error('Offer not found');
    const merged = { ...offer, ...updatedFields };

    const patch = {};
    if ('firmName'    in updatedFields) patch.firm_name        = updatedFields.firmName;
    if ('vendor'      in updatedFields) patch.vendor_name      = updatedFields.vendor;
    if ('description' in updatedFields) patch.work_description = updatedFields.description;
    if ('location'    in updatedFields) patch.service_location = updatedFields.location;
    if ('amount'      in updatedFields) patch.amount           = Number(updatedFields.amount);
    if ('isOffer'     in updatedFields) patch.is_there_offer   = updatedFields.isOffer;
    if ('offerCopy'   in updatedFields) patch.offer_copy_url   = updatedFields.offerCopy;
    if ('status'      in updatedFields) patch.status           = updatedFields.status;

    // Optimistic UI
    const updatedOffers = get().offers.map(o =>
      (o.sheetRowIndex === rowIndex || o._dbId === rowIndex) ? merged : o
    );
    set({ offers: updatedOffers });
    saveCache('offers', updatedOffers);

    if (Object.keys(patch).length > 0) {
      const { error } = await supabase.from('offers')
        .update(patch)
        .eq('offer_no', offer.id);
      if (error) { console.error('[updateOffer]', error.message); throw new Error(error.message); }
    }
    get().fetchData(true); // force refresh after write
    return { success: true };
  },

  // ─── SERVICES ────────────────────────────────────────────────────────────────
  addService: async (service) => {
    const nowTs = new Date().toISOString();
    const netAmount = Math.round((Number(service.amount) || 0) - (Number(service.tdsAmount) || 0));

    // Auto-generate Payment Form URL (same Google Form as old system)
    const FORM_BASE = 'https://docs.google.com/forms/d/e/1FAIpQLScJJFvh6zchRosSzX0mU-u7-oeMaQW6iv1osE70hRDoE-uVrg/viewform?usp=pp_url';
    const paymentFormUrl = `${FORM_BASE}&entry.1200639812=${encodeURIComponent(service.id || '')}&entry.604194301=New+Service+Application&entry.1358288895=Yes&entry.1091308719=${encodeURIComponent(service.vendor || '')}&entry.1486176123=${netAmount}&entry.2102057582=Service+Payment`;

    const row = {
      service_no:        service.id          || '',
      offer_no:          service.offerNo     || '',
      firm_name:         service.firmName    || '',
      service_checker:   service.checker     || '',
      total_amount:      Number(service.amount)    || 0,
      tds_amount:        Number(service.tdsAmount) || 0,
      remark:            service.remark      || '',
      vendor_name:       service.vendor      || '',
      work_description:  service.description || '',
      service_location:  service.location    || '',
      payment_form_url:  paymentFormUrl,     // ✅ auto-generated
    };

    // Optimistic UI
    const newObj = {
      sheetRowIndex: Date.now(),
      timestamp: nowTs, offerNo: service.offerNo, id: service.id,
      firmName: service.firmName, checker: service.checker,
      amount: Number(service.amount) || 0, tdsAmount: Number(service.tdsAmount) || 0,
      remark: service.remark || '', vendor: service.vendor,
      description: service.description, location: service.location,
      status: 'Service Created',
      planned1: '', actual1: '', delay1: '', billNo: '', billCopy: '',
      planned2: '', actual2: '', delay2: '', paymentProof: '',
    };
    const updatedServices = [newObj, ...get().services];
    const match = String(service.id || '').match(/SRV-(\d+)/i);
    const newIdNum = match ? parseInt(match[1], 10) : 0;
    const updatedGlobalMax = Math.max(get().globalMaxServiceId || 0, newIdNum);
    set({ services: updatedServices, globalMaxServiceId: updatedGlobalMax });
    saveCache('services', updatedServices);
    saveCache('globalMaxServiceId', updatedGlobalMax);

    const { data, error } = await supabase.from('services').insert(row).select().single();
    if (error) { console.error('[addService]', error.message); throw new Error(error.message); }
    console.log('[addService] ✅', data?.service_no);
    get().fetchData(true); // force refresh after write
    return { success: true };
  },

  updateService: async (rowIndex, updatedFields) => {
    const service = get().services.find(s => s.sheetRowIndex === rowIndex || s._dbId === rowIndex);
    if (!service) throw new Error('Service not found');
    const merged = { ...service, ...updatedFields };
    merged.status = getServiceStatus(merged);

    // Optimistic UI
    const updatedServices = get().services.map(s =>
      (s.sheetRowIndex === rowIndex || s._dbId === rowIndex) ? merged : s
    );
    set({ services: updatedServices });
    saveCache('services', updatedServices);

    const patch = {};
    if ('offerNo'      in updatedFields) patch.offer_no          = updatedFields.offerNo;
    if ('firmName'     in updatedFields) patch.firm_name         = updatedFields.firmName;
    if ('checker'      in updatedFields) patch.service_checker   = updatedFields.checker;
    if ('amount'       in updatedFields) patch.total_amount      = Number(updatedFields.amount);
    if ('tdsAmount'    in updatedFields) patch.tds_amount        = Number(updatedFields.tdsAmount);
    if ('remark'       in updatedFields) patch.remark            = updatedFields.remark;
    if ('vendor'       in updatedFields) patch.vendor_name       = updatedFields.vendor;
    if ('description'  in updatedFields) patch.work_description  = updatedFields.description;
    if ('location'     in updatedFields) patch.service_location  = updatedFields.location;
    if ('actual1'      in updatedFields) patch.actual_1          = updatedFields.actual1 || null;
    if ('billNo'       in updatedFields) patch.bill_no           = updatedFields.billNo;
    if ('billCopy'     in updatedFields) patch.bill_copy_url     = updatedFields.billCopy;
    if ('actual2'      in updatedFields) patch.actual_2          = updatedFields.actual2 || null;
    if ('paymentProof' in updatedFields) patch.bill_copy_url     = updatedFields.paymentProof; // no separate payment_proof col
    if ('actual3'      in updatedFields) patch.actual_3          = updatedFields.actual3 || null;
    if ('status3'      in updatedFields) patch.status_3          = updatedFields.status3;
    if ('remarks3'     in updatedFields) patch.remarks_3         = updatedFields.remarks3;
    if ('actual4'      in updatedFields) patch.actual_4          = updatedFields.actual4 || null;
    if ('status4'      in updatedFields) patch.status_4          = updatedFields.status4;
    if ('remarks4'     in updatedFields) patch.remarks_4         = updatedFields.remarks4;
    if ('actual5'      in updatedFields) patch.actual_5          = updatedFields.actual5 || null;
    if ('status5'      in updatedFields) patch.status_5          = updatedFields.status5;
    if ('remarks5'     in updatedFields) patch.remarks_5         = updatedFields.remarks5;

    if (Object.keys(patch).length === 0) return { success: true };

    const { error } = await supabase.from('services')
      .update(patch)
      .eq('service_no', service.id);
    if (error) { console.error('[updateService]', error.message); throw new Error(error.message); }
    get().fetchData(true); // force refresh after write
    return { success: true };
  },

  // ─── UTILITIES ───────────────────────────────────────────────────────────────
  addUtility: async (utility) => {
    const tdsVal = Number(utility.tdsAmount) || 0;
    const amtVal = Number(utility.amount) || 0;
    const row = {
      utility_no:          utility.id         || '',
      firm_name:           utility.firmName   || '',
      person_name:         utility.personName || '',
      user_name:           utility.userName   || '',
      department:          utility.department || '',
      group_head:          utility.groupHead  || '',
      pay_to:              utility.payTo      || '',
      bill_amount:         amtVal,
      bill_image_url:      utility.billImage  || '',
      bill_date:           utility.billDate   || null,
      due_date:            utility.dueDate    || null,
      remarks:             utility.remarks    || '',
      tds_amount:          tdsVal,
      amount_to_be_paid:   utility.amountPaid !== undefined ? Number(utility.amountPaid) : (amtVal - tdsVal),
      outstanding_amount:  amtVal - tdsVal,
      status:              'Pending Approval',
    };

    const { data, error } = await supabase.from('utilities').insert(row).select().single();
    if (error) { console.error('[addUtility]', error.message); throw new Error(error.message); }
    console.log('[addUtility] ✅', data?.utility_no);
    get().fetchData(true); // force refresh after write
    return { success: true };
  },

  updateUtility: async (rowIndex, updatedFields) => {
    const utility = get().utilities.find(u => u.sheetRowIndex === rowIndex || u._dbId === rowIndex);
    if (!utility) throw new Error('Utility not found');
    const merged = { ...utility, ...updatedFields };

    // Optimistic UI
    set(state => ({
      utilities: state.utilities.map(u =>
        (u.sheetRowIndex === rowIndex || u._dbId === rowIndex) ? merged : u
      )
    }));

    const patch = {};
    if ('firmName'          in updatedFields) patch.firm_name             = updatedFields.firmName;
    if ('personName'        in updatedFields) patch.person_name           = updatedFields.personName;
    if ('userName'          in updatedFields) patch.user_name             = updatedFields.userName;
    if ('department'        in updatedFields) patch.department            = updatedFields.department;
    if ('groupHead'         in updatedFields) patch.group_head            = updatedFields.groupHead;
    if ('payTo'             in updatedFields) patch.pay_to               = updatedFields.payTo;
    if ('amount'            in updatedFields) patch.bill_amount           = Number(updatedFields.amount);
    if ('billImage'         in updatedFields) patch.bill_image_url        = updatedFields.billImage;
    if ('billDate'          in updatedFields) patch.bill_date             = updatedFields.billDate || null;
    if ('dueDate'           in updatedFields) patch.due_date              = updatedFields.dueDate  || null;
    if ('remarks'           in updatedFields) patch.remarks               = updatedFields.remarks;
    if ('remark1'           in updatedFields) patch.remark_1              = updatedFields.remark1;
    if ('tdsAmount'         in updatedFields) patch.tds_amount            = Number(updatedFields.tdsAmount);
    if ('amountPaid'        in updatedFields) patch.amount_to_be_paid     = Number(updatedFields.amountPaid);
    if ('outstanding'       in updatedFields) patch.outstanding_amount    = Number(updatedFields.outstanding);
    if ('status'            in updatedFields) patch.status                = updatedFields.status;
    if ('actual'            in updatedFields) patch.actual_0              = updatedFields.actual   || null;
    if ('actual1'           in updatedFields) patch.actual_1              = updatedFields.actual1  || null;
    if ('delay1'            in updatedFields) patch.delay1                = updatedFields.delay1;
    if ('actual2'           in updatedFields) patch.actual_2              = updatedFields.actual2  || null;
    if ('delay2'            in updatedFields) patch.delay2                = updatedFields.delay2;
    if ('paymentFormLink'   in updatedFields) patch.payment_form_link     = updatedFields.paymentFormLink;
    if ('fmsName'           in updatedFields) patch.fms_name              = updatedFields.fmsName;
    if ('details'           in updatedFields) patch.details               = updatedFields.details;
    if ('approvalAttachment'in updatedFields) patch.approval_attachment_url = updatedFields.approvalAttachment;
    if ('paymentNo'         in updatedFields) patch.payment_number        = updatedFields.paymentNo;
    if ('paymentMode'       in updatedFields) patch.payment_mode          = updatedFields.paymentMode;
    if ('transactionRef'    in updatedFields) patch.transaction_reference = updatedFields.transactionRef;
    if ('paymentDate'       in updatedFields) patch.payment_date          = updatedFields.paymentDate || null;
    if ('paymentAttachment' in updatedFields) patch.payment_attachment_url= updatedFields.paymentAttachment;
    if ('paymentRemarks'    in updatedFields) patch.payment_remarks       = updatedFields.paymentRemarks;

    if (Object.keys(patch).length === 0) return { success: true };

    const { error } = await supabase.from('utilities')
      .update(patch)
      .eq('utility_no', utility.id);
    if (error) { console.error('[updateUtility]', error.message); throw new Error(error.message); }
    get().fetchData(true); // force refresh after write
    return { success: true };
  },

  clearData: () => set({ offers: [], services: [], utilities: [] })
}));

export default useDataStore;
