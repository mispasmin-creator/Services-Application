/**
 * TAT Report — live import from Supabase into this Google Sheet.
 *
 * Read-only: this script only READS from Supabase and WRITES to this sheet.
 *
 * Setup (once):
 *  1. Extensions > Apps Script, paste this file, save.
 *  2. Run  setupConfig()  after putting your Supabase anon key in SUPABASE_KEY below
 *     (or add it under Project Settings > Script properties as SUPABASE_KEY).
 *  3. Run  setupLive()    -> authorises the script, installs the 1-minute refresh trigger.
 *  After that the sheet refreshes itself every minute, on open, and from the
 *  "TAT Report" menu.
 */

var SUPABASE_URL = 'https://vivzinohfkyqwxwzpuuy.supabase.co';
var SUPABASE_KEY = 'PASTE_YOUR_SUPABASE_ANON_KEY_HERE'; // only used by setupConfig(); then clear it again

var REPORT_SHEET = 'TAT Report';
var SUMMARY_SHEET = 'Summary';
var TZ = 'Asia/Kolkata';
var DAY = 86400000;
var LATE_TOLERANCE_DAYS = 0.05; // same tolerance the TAT page uses

var HEADERS = ['Page', 'Stage', 'ID', 'Firm Name', 'Party', 'Planned', 'Actual', 'Delay (days)', 'Status'];

// ───────────────────────── setup / menu ─────────────────────────

function setupConfig() {
  if (!SUPABASE_KEY || SUPABASE_KEY.indexOf('PASTE_') === 0) {
    throw new Error('Pehle SUPABASE_KEY me anon key paste karo, phir setupConfig() chalao.');
  }
  PropertiesService.getScriptProperties().setProperties({
    SUPABASE_URL: SUPABASE_URL,
    SUPABASE_KEY: SUPABASE_KEY,
  });
  SpreadsheetApp.getActive().setSpreadsheetTimeZone(TZ);
}

function setupLive() {
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('refreshReport').timeBased().everyMinutes(1).create();
  ScriptApp.newTrigger('onOpenRefresh').forSpreadsheet(SpreadsheetApp.getActive()).onOpen().create();
  refreshReport(true);
}

function stopLive() {
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu('TAT Report')
    .addItem('Refresh Now', 'refreshNow')
    .addItem('Start live refresh (every minute)', 'setupLive')
    .addItem('Stop live refresh', 'stopLive')
    .addToUi();
}

function onOpenRefresh() { refreshReport(); }
function refreshNow() { refreshReport(true); }

// ───────────────────────── Supabase fetch ─────────────────────────

function cfg_(key) {
  var v = PropertiesService.getScriptProperties().getProperty(key);
  if (!v) throw new Error('Config missing: ' + key + '. setupConfig() chalao.');
  return v;
}

function fetchAll_(table, select) {
  var base = cfg_('SUPABASE_URL') + '/rest/v1/' + table;
  var key = cfg_('SUPABASE_KEY');
  var out = [];
  var pageSize = 1000;
  for (var offset = 0; ; offset += pageSize) {
    var url = base + '?select=' + encodeURIComponent(select) +
      '&order=created_at.desc&limit=' + pageSize + '&offset=' + offset;
    var res = UrlFetchApp.fetch(url, {
      method: 'get',
      headers: { apikey: key, Authorization: 'Bearer ' + key },
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

function ms_(v) {
  if (!v) return null;
  var t = new Date(v).getTime();
  return isNaN(t) ? null : t;
}

function entry_(page, stage, id, firm, party, planned, actual, nowMs) {
  var p = ms_(planned);
  if (p == null) return null; // stage not applicable / not planned yet
  var a = ms_(actual);
  var delay, status;
  if (a != null) {
    delay = (a - p) / DAY;
    status = delay > LATE_TOLERANCE_DAYS ? 'Late' : 'On time';
  } else {
    delay = (nowMs - p) / DAY;
    status = delay > 0 ? 'Overdue' : 'Pending';
  }
  return [page, stage, id || '', firm || '', party || '', new Date(p), a != null ? new Date(a) : '', Math.round(delay * 10) / 10, status];
}

function buildRows_() {
  var nowMs = Date.now();
  var rows = [];
  var push = function (r) { if (r) rows.push(r); };

  fetchAll_('offers', 'offer_no,firm_name,vendor_name,created_at,planned_1,actual_1').forEach(function (r) {
    push(entry_('Offers', 'Offer', r.offer_no, r.firm_name, r.vendor_name, r.planned_1, r.actual_1, nowMs));
  });

  fetchAll_('services',
    'service_no,firm_name,vendor_name,created_at,planned_1,actual_1,planned_2,actual_2,planned_3,actual_3,planned_4,actual_4,planned_5,actual_5'
  ).forEach(function (r) {
    push(entry_('Services', 'Payment Processing', r.service_no, r.firm_name, r.vendor_name, r.planned_2, r.actual_2, nowMs));
    push(entry_('Bills', 'Bill Received', r.service_no, r.firm_name, r.vendor_name, r.planned_1, r.actual_1, nowMs));
    push(entry_('Tally', 'Audit', r.service_no, r.firm_name, r.vendor_name, r.planned_3, r.actual_3, nowMs));
    push(entry_('Tally', 'Rectify', r.service_no, r.firm_name, r.vendor_name, r.planned_4, r.actual_4, nowMs));
    push(entry_('Tally', 'Tally Entry', r.service_no, r.firm_name, r.vendor_name, r.planned_5, r.actual_5, nowMs));
  });

  fetchAll_('utilities', 'utility_no,firm_name,person_name,pay_to,created_at,planned_1,actual_1,planned_2,actual_2').forEach(function (r) {
    var party = r.pay_to || r.person_name;
    push(entry_('Utility', 'Payment Approval', r.utility_no, r.firm_name, party, r.planned_1, r.actual_1, nowMs));
    push(entry_('Utility', 'Entry In Tally', r.utility_no, r.firm_name, party, r.planned_2, r.actual_2, nowMs));
  });

  return rows;
}

// ───────────────────────── write sheets ─────────────────────────

function getSheet_(name) {
  var ss = SpreadsheetApp.getActive();
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function refreshReport(force) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return; // another refresh is running
  try {
    var rows = buildRows_();

    // Skip the sheet write when nothing changed. Delay of pending rows grows with time,
    // so this mostly saves writes when there are no pending rows.
    var fingerprint = Utilities.base64Encode(Utilities.computeDigest(
      Utilities.DigestAlgorithm.MD5, JSON.stringify(rows)));
    var props = PropertiesService.getScriptProperties();
    if (!force && props.getProperty('LAST_FP') === fingerprint) {
      stamp_();
      return;
    }

    writeReport_(rows);
    writeSummary_(rows);
    props.setProperty('LAST_FP', fingerprint);
  } finally {
    lock.releaseLock();
  }
}

function writeReport_(rows) {
  var sh = getSheet_(REPORT_SHEET);
  var oldRows = Math.max(sh.getLastRow() - 1, 0);
  if (oldRows > 0) sh.getRange(2, 1, oldRows, HEADERS.length).clearContent();

  sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS])
    .setFontWeight('bold').setBackground('#0f766e').setFontColor('#ffffff');
  sh.setFrozenRows(1);

  if (rows.length) {
    if (sh.getMaxRows() < rows.length + 1) sh.insertRowsAfter(sh.getMaxRows(), rows.length + 1 - sh.getMaxRows());
    sh.getRange(2, 1, rows.length, HEADERS.length).setValues(rows);
    sh.getRange(2, 6, rows.length, 2).setNumberFormat('dd/MM/yyyy HH:mm');
    sh.getRange(2, 8, rows.length, 1).setNumberFormat('0.0');
  }

  if (!sh.getFilter()) sh.getRange(1, 1, Math.max(rows.length + 1, 2), HEADERS.length).createFilter();

  // colour by status (rules replaced each time so they never pile up)
  var range = sh.getRange(2, 1, Math.max(sh.getMaxRows() - 1, 1), HEADERS.length);
  var rules = [
    ['Late', '#fee2e2'], ['Overdue', '#fef3c7'], ['On time', '#dcfce7'], ['Pending', '#e0f2fe'],
  ].map(function (p) {
    return SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=$I2="' + p[0] + '"').setBackground(p[1]).setRanges([range]).build();
  });
  sh.setConditionalFormatRules(rules);
  sh.autoResizeColumns(1, HEADERS.length);
}

function writeSummary_(rows) {
  var groups = {}; // "Page|Stage" -> counters
  var firms = {};  // "Page|Firm" -> counters
  var bump = function (map, key, r) {
    var g = map[key] || (map[key] = { total: 0, done: 0, pending: 0, late: 0, overdue: 0, delaySum: 0, delayN: 0 });
    var status = r[8], delay = r[7];
    g.total++;
    if (status === 'On time' || status === 'Late') g.done++; else g.pending++;
    if (status === 'Late') g.late++;
    if (status === 'Overdue') g.overdue++;
    if (status === 'Late' || status === 'Overdue') { g.delaySum += delay; g.delayN++; }
  };
  rows.forEach(function (r) {
    bump(groups, r[0] + '|' + r[1], r);
    bump(firms, r[0] + '|' + (r[3] || '—'), r);
  });

  var head = ['Total', 'Done', 'Pending', 'Late (done)', 'Overdue (pending)', 'Avg delay (days)'];
  var toRow = function (key, g) {
    var parts = key.split('|');
    return [parts[0], parts[1], g.total, g.done, g.pending, g.late, g.overdue, g.delayN ? Math.round(g.delaySum / g.delayN * 10) / 10 : 0];
  };
  var stageRows = Object.keys(groups).map(function (k) { return toRow(k, groups[k]); });
  var firmRows = Object.keys(firms).sort().map(function (k) { return toRow(k, firms[k]); });

  var sh = getSheet_(SUMMARY_SHEET);
  sh.clear();
  sh.getRange(1, 1).setValue('TAT Summary').setFontWeight('bold').setFontSize(14);
  sh.getRange(2, 1).setValue('Last refreshed: ' + Utilities.formatDate(new Date(), TZ, 'dd/MM/yyyy HH:mm:ss'));

  var r0 = 4;
  sh.getRange(r0, 1, 1, 8).setValues([['Page', 'Stage'].concat(head)]).setFontWeight('bold').setBackground('#0f766e').setFontColor('#ffffff');
  if (stageRows.length) sh.getRange(r0 + 1, 1, stageRows.length, 8).setValues(stageRows);

  var r1 = r0 + stageRows.length + 3;
  sh.getRange(r1 - 1, 1).setValue('Firm-wise').setFontWeight('bold');
  sh.getRange(r1, 1, 1, 8).setValues([['Page', 'Firm'].concat(head)]).setFontWeight('bold').setBackground('#0f766e').setFontColor('#ffffff');
  if (firmRows.length) sh.getRange(r1 + 1, 1, firmRows.length, 8).setValues(firmRows);

  sh.autoResizeColumns(1, 8);
}

function stamp_() {
  var sh = getSheet_(SUMMARY_SHEET);
  sh.getRange(2, 1).setValue('Last refreshed: ' + Utilities.formatDate(new Date(), TZ, 'dd/MM/yyyy HH:mm:ss'));
}
