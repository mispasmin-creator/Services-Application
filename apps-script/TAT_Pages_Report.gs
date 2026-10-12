/**
 * Page-wise TAT report — live import from Supabase (read-only).
 * Tabs: Overview, Offers, Services, Bills, Tally, Utility
 * Paste -> Save -> select START -> Run -> Authorize. Done.
 */

var SUPABASE_URL = 'https://vivzinohfkyqwxwzpuuy.supabase.co';
var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpdnppbm9oZmt5cXd4d3pwdXV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0MzkwMTQsImV4cCI6MjEwNzAxNTAxNH0.JqW_NlIx4kG8W9Bn0D35Dp16VCcbVxv30R6fSDQjFPQ';

var TZ = 'Asia/Kolkata';
var DAY = 86400000;
var LATE_TOLERANCE_DAYS = 0.05;
var FORCE_REWRITE_MS = 30 * 60 * 1000; // pending delays grow with time -> rewrite at least every 30 min
var PAGES = ['Offers', 'Services', 'Bills', 'Tally', 'Utility'];
var OLD_TABS = ['TAT Report', 'Summary']; // tabs of the earlier script, removed on START

// Status = Done / Pending (ye har jagah same ginti hai). Timing = Done wale me Late/On time, Pending wale me Overdue/Not yet due.
var DATA_HEADERS = ['ID', 'Firm Name', 'Party', 'Stage', 'Planned', 'Actual', 'Delay (days)', 'Status', 'Timing'];
var STATUS_COLOR = { 'Pending': '#e0f2fe', 'Done': '#dcfce7' };
var TIMING_COLOR = { 'Overdue': '#fee2e2', 'Late': '#fecaca', 'Not yet due': '#e0f2fe', 'On time': '#dcfce7' };
var HEAD_BG = '#0f766e';

// ───────────────────────── start / menu ─────────────────────────

function START() {
  var ss = SpreadsheetApp.getActive();
  ss.setSpreadsheetTimeZone(TZ);
  stopLive();
  ScriptApp.newTrigger('refreshReport').timeBased().everyMinutes(1).create();
  ScriptApp.newTrigger('onOpenRefresh').forSpreadsheet(ss).onOpen().create();
  refreshReport(true);
  OLD_TABS.forEach(function (n) {
    var s = ss.getSheetByName(n);
    if (s && ss.getSheets().length > 1) ss.deleteSheet(s);
  });
}

function stopLive() {
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu('TAT Report')
    .addItem('Refresh Now', 'refreshNow')
    .addItem('Start live refresh (every minute)', 'START')
    .addItem('Stop live refresh', 'stopLive')
    .addToUi();
}

function onOpenRefresh() { refreshReport(); }
function refreshNow() { refreshReport(true); }

// ───────────────────────── Supabase fetch ─────────────────────────

function fetchAll_(table, select) {
  var base = SUPABASE_URL + '/rest/v1/' + table;
  var out = [];
  var pageSize = 1000;
  for (var offset = 0; ; offset += pageSize) {
    var url = base + '?select=' + encodeURIComponent(select) +
      '&order=created_at.desc&limit=' + pageSize + '&offset=' + offset;
    var res = UrlFetchApp.fetch(url, {
      method: 'get',
      headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY },
      muteHttpExceptions: true,
    });
    if (res.getResponseCode() !== 200) {
      throw new Error('Supabase ' + table + ' error ' + res.getResponseCode() + ': ' + res.getContentText().slice(0, 200));
    }
    var rows = JSON.parse(res.getContentText());
    out = out.concat(rows);
    if (rows.length < pageSize) break;
  }
  return out;
}

// ───────────────────────── build rows ─────────────────────────
// A row is an object: {id, firm, party, stage, planned(ms|null), actual(ms|null), delay(number|null), status('Done'|'Pending'), timing, done}

function ms_(v) {
  if (!v) return null;
  var t = new Date(v).getTime();
  return isNaN(t) ? null : t;
}

/** done: explicit true/false, or undefined -> done when an actual date exists */
function entry_(stage, id, firm, party, planned, actual, nowMs, done) {
  var p = ms_(planned), a = ms_(actual);
  var isDone = done === undefined ? a != null : !!done;
  var delay = null, timing = '';
  if (isDone) {
    if (a != null && p != null) {
      delay = (a - p) / DAY;
      timing = delay > LATE_TOLERANCE_DAYS ? 'Late' : 'On time';
    }
  } else if (p != null) {
    delay = (nowMs - p) / DAY;
    timing = delay > 0 ? 'Overdue' : 'Not yet due';
  }
  return {
    id: id || '', firm: firm || '', party: party || '', stage: stage,
    planned: p, actual: a, delay: delay == null ? null : Math.round(delay * 10) / 10,
    status: isDone ? 'Done' : 'Pending', timing: timing, done: isDone,
  };
}

function collect_() {
  var nowMs = Date.now();
  var out = { Offers: [], Services: [], Bills: [], Tally: [], Utility: [] };
  var low = function (v) { return String(v == null ? '' : v).trim().toLowerCase(); };

  var services = fetchAll_('services',
    'service_no,offer_no,firm_name,vendor_name,total_amount,bill_no,bill_copy_url,status_3,status_4,status_5,' +
    'planned_1,actual_1,planned_2,actual_2,planned_3,actual_3,planned_4,actual_4,planned_5,actual_5');

  // 1) Offers — same rule as the Offers page (Active vs History)
  //    paid = sum of linked services' total_amount (offer_no + firm match); outstanding = amount - paid
  fetchAll_('offers', 'offer_no,firm_name,vendor_name,status,amount,amount_to_be_paid,outstanding_amount,planned_1,actual_1').forEach(function (r) {
    var oId = low(r.offer_no), oFirm = low(r.firm_name);
    var linked = services.filter(function (s) {
      return s.offer_no && low(s.offer_no) === oId && (!s.firm_name || !oFirm || low(s.firm_name) === oFirm);
    });
    var sum = linked.reduce(function (t, s) { return t + (Number(s.total_amount) || 0); }, 0);
    var amount = Number(r.amount) || 0;
    var paid = linked.length > 0 ? sum : (Number(r.amount_to_be_paid) || 0);
    var outstanding = amount > 0 ? Math.max(0, amount - paid) : (Number(r.outstanding_amount) || 0);
    var status = r.status || 'Pending';
    if (status === 'Pending' && linked.length > 0 && outstanding <= 0) status = 'Converted';
    var st = low(status);
    var done = st === 'complete' || st === 'completed' || st === 'converted' || (amount > 0 && outstanding <= 0 && paid > 0);
    out.Offers.push(entry_('Convert to Service', r.offer_no, r.firm_name, r.vendor_name,
      r.planned_1, done ? r.actual_1 : null, nowMs, done));
  });

  services.forEach(function (r) {
    // 2) Services — "Make Payment" tab vs History (paid = payment date OR bill no OR bill copy)
    var paid = !!(r.actual_2 || r.bill_no || r.bill_copy_url);
    out.Services.push(entry_('Make Payment', r.service_no, r.firm_name, r.vendor_name,
      r.planned_2, paid ? r.actual_2 : null, nowMs, paid));

    // 3) Bills — Active (no bill uploaded) vs History (actual_1 set)
    var billDone = !!r.actual_1;
    out.Bills.push(entry_('Bill Upload', r.service_no, r.firm_name, r.vendor_name,
      r.planned_1, billDone ? r.actual_1 : null, nowMs, billDone));

    // 4) Tally — only services with bill uploaded; each service sits in exactly ONE stage
    if (r.actual_1) {
      if (r.status_5 === 'Completed' || r.actual_5) {
        out.Tally.push(entry_('Completed', r.service_no, r.firm_name, r.vendor_name, r.planned_5, r.actual_5, nowMs, true));
      } else if (r.status_3 === 'Rectify' && r.status_4 !== 'Audited') {
        out.Tally.push(entry_('Rectify', r.service_no, r.firm_name, r.vendor_name, r.planned_4, null, nowMs, false));
      } else if (r.status_3 === 'Audited' || r.status_4 === 'Audited') {
        out.Tally.push(entry_('Tally Entry', r.service_no, r.firm_name, r.vendor_name, r.planned_5, null, nowMs, false));
      } else {
        out.Tally.push(entry_('Audit', r.service_no, r.firm_name, r.vendor_name, r.planned_3, null, nowMs, false));
      }
    }
  });

  // 5) Utility — same 4 tabs as the Utility page; each entry sits in exactly ONE stage
  fetchAll_('utilities', 'utility_no,firm_name,person_name,pay_to,actual_0,planned_1,actual_1,planned_2,actual_2').forEach(function (r) {
    var party = r.pay_to || r.person_name;
    if (r.actual_2) {
      out.Utility.push(entry_('Completed', r.utility_no, r.firm_name, party, r.planned_2, r.actual_2, nowMs, true));
    } else if (r.actual_1) {
      out.Utility.push(entry_('Tally Entry', r.utility_no, r.firm_name, party, r.planned_2, null, nowMs, false));
    } else if (r.actual_0) {
      out.Utility.push(entry_('Payment Approval', r.utility_no, r.firm_name, party, r.planned_1, null, nowMs, false));
    } else {
      out.Utility.push(entry_('Utility Entry (submit baaki)', r.utility_no, r.firm_name, party, null, null, nowMs, false));
    }
  });

  // pending first (biggest delay on top), then done (latest first)
  PAGES.forEach(function (p) {
    out[p].sort(function (x, y) {
      if (x.done !== y.done) return x.done ? 1 : -1;
      if (!x.done) return (y.delay == null ? -1e9 : y.delay) - (x.delay == null ? -1e9 : x.delay);
      return (y.actual || 0) - (x.actual || 0);
    });
  });
  return out;
}

// ───────────────────────── summaries ─────────────────────────

function summarize_(rows) {
  // returns { stage: counters } in first-seen order
  var map = {}, order = [];
  rows.forEach(function (r) {
    var g = map[r.stage];
    if (!g) { g = map[r.stage] = { total: 0, done: 0, pending: 0, overdue: 0, late: 0, ontime: 0, dSum: 0, dN: 0 }; order.push(r.stage); }
    g.total++;
    if (r.done) g.done++; else g.pending++;
    if (r.timing === 'Overdue') g.overdue++;
    if (r.timing === 'Late') g.late++;
    if (r.timing === 'On time') g.ontime++;
    if ((r.timing === 'Late' || r.timing === 'Overdue') && r.delay != null) { g.dSum += r.delay; g.dN++; }
  });
  // Pending = Overdue + Not yet due   |   Done = Late + On time (+ done without dates)
  return order.map(function (s) {
    var g = map[s];
    return [s, g.total, g.done, g.pending, g.overdue, g.pending - g.overdue, g.late, g.ontime,
      g.dN ? Math.round(g.dSum / g.dN * 10) / 10 : 0];
  });
}
var SUM_HEAD = ['Stage', 'Total', 'Done', 'Pending', 'Pending: Overdue', 'Pending: Not yet due', 'Done: Late', 'Done: On time', 'Avg delay of late/overdue (days)'];

// ───────────────────────── write sheets ─────────────────────────

function getSheet_(name) {
  var ss = SpreadsheetApp.getActive();
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function header_(range) {
  range.setFontWeight('bold').setBackground(HEAD_BG).setFontColor('#ffffff').setWrap(true);
}

function writePage_(name, rows, stamp) {
  var sh = getSheet_(name);
  var f = sh.getFilter();
  if (f) f.remove();
  sh.clear();
  sh.setConditionalFormatRules([]);

  sh.getRange(1, 1).setValue(name + ' — TAT').setFontWeight('bold').setFontSize(14);
  sh.getRange(2, 1).setValue('Last refreshed: ' + stamp);

  var sum = summarize_(rows);
  var totals = ['TOTAL'].concat([1, 2, 3, 4, 5, 6, 7].map(function (i) {
    return sum.reduce(function (a, r) { return a + r[i]; }, 0);
  }));
  var sumRows = sum.concat([totals.concat([''])]);

  var r0 = 4;
  header_(sh.getRange(r0, 1, 1, SUM_HEAD.length).setValues([SUM_HEAD]));
  sh.getRange(r0 + 1, 1, sumRows.length, SUM_HEAD.length).setValues(sumRows);
  sh.getRange(r0 + sumRows.length, 1, 1, SUM_HEAD.length).setFontWeight('bold').setBackground('#f3f4f6');

  var t0 = r0 + sumRows.length + 3; // data header row
  sh.getRange(t0 - 1, 1).setValue('Entries (pending upar, done neeche)').setFontWeight('bold');
  header_(sh.getRange(t0, 1, 1, DATA_HEADERS.length).setValues([DATA_HEADERS]));

  if (rows.length) {
    var values = rows.map(function (r) {
      return [r.id, r.firm, r.party, r.stage,
        r.planned != null ? new Date(r.planned) : '',
        r.actual != null ? new Date(r.actual) : '',
        r.delay != null ? r.delay : '', r.status, r.timing];
    });
    var bg = rows.map(function (r) {
      var t = TIMING_COLOR[r.timing] || '#ffffff';
      return [t, STATUS_COLOR[r.status] || '#ffffff', t];
    });
    sh.getRange(t0 + 1, 1, rows.length, DATA_HEADERS.length).setValues(values);
    sh.getRange(t0 + 1, 5, rows.length, 2).setNumberFormat('dd/MM/yyyy HH:mm');
    sh.getRange(t0 + 1, 7, rows.length, 1).setNumberFormat('0.0');
    sh.getRange(t0 + 1, 7, rows.length, 3).setBackgrounds(bg);
    sh.getRange(t0, 1, rows.length + 1, DATA_HEADERS.length).createFilter();
  }
  sh.setFrozenRows(0);
  sh.autoResizeColumns(1, Math.max(SUM_HEAD.length, DATA_HEADERS.length));
  sh.setColumnWidth(1, Math.max(sh.getColumnWidth(1), 130));
}

function writeOverview_(data, stamp) {
  var sh = getSheet_('Overview');
  sh.clear();
  sh.getRange(1, 1).setValue('TAT Overview').setFontWeight('bold').setFontSize(14);
  sh.getRange(2, 1).setValue('Last refreshed: ' + stamp);
  var head = ['Page'].concat(SUM_HEAD);
  var rows = [];
  PAGES.forEach(function (p) {
    summarize_(data[p]).forEach(function (r) { rows.push([p].concat(r)); });
  });
  header_(sh.getRange(4, 1, 1, head.length).setValues([head]));
  if (rows.length) sh.getRange(5, 1, rows.length, head.length).setValues(rows);
  sh.autoResizeColumns(1, head.length);
  sh.setTabColor(HEAD_BG);
  SpreadsheetApp.getActive().setActiveSheet(sh);
  SpreadsheetApp.getActive().moveActiveSheet(1);
}

function fingerprint_(data) {
  // delays of pending rows change with time, so leave them out of the fingerprint
  var slim = PAGES.map(function (p) {
    return data[p].map(function (r) {
      return [r.id, r.firm, r.party, r.stage, r.planned, r.actual, r.done ? r.delay : null, r.status, r.done ? r.timing : ''];
    });
  });
  return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, JSON.stringify(slim)));
}

function refreshReport(force) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return;
  try {
    var data = collect_();
    var props = PropertiesService.getScriptProperties();
    var fp = fingerprint_(data);
    var lastWrite = Number(props.getProperty('LAST_WRITE') || 0);
    var stale = Date.now() - lastWrite > FORCE_REWRITE_MS;
    if (!force && !stale && props.getProperty('LAST_FP') === fp) return;

    var stamp = Utilities.formatDate(new Date(), TZ, 'dd/MM/yyyy HH:mm:ss');
    PAGES.forEach(function (p) { writePage_(p, data[p], stamp); });
    writeOverview_(data, stamp);
    props.setProperties({ LAST_FP: fp, LAST_WRITE: String(Date.now()) });
  } finally {
    lock.releaseLock();
  }
}
