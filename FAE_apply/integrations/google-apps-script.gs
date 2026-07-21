/**
 * Eduflick AI — Full-Stack AI Engineer applications → Google Sheet
 * ----------------------------------------------------------------------------
 * Receives each application (JSON POST) from the Cloudflare "apply" worker and
 * appends a row to the target spreadsheet. A shared key (?key=…) gates writes.
 *
 * SETUP (in developer@eduflickai.com):
 *  1. Create a Google Sheet (e.g. "FAE Applications").
 *  2. Extensions → Apps Script. Delete the stub, paste THIS whole file, Save.
 *  3. ⚙️ Project Settings → Script properties → add SHARED_KEY = <random string>.
 *  4. Deploy → New deployment → Web app: Execute as Me, Who has access Anyone.
 *  5. NOTIFY_WEBHOOK_URL = <Web app /exec URL>?key=<SHARED_KEY>
 *
 * If rows aren't showing up: open <Web app URL>?key=<SHARED_KEY> in a browser —
 * the JSON it returns includes the EXACT spreadsheet name + url it writes to, and
 * the current row count. Open that url. If the binding is wrong, paste your
 * Sheet's id (from the sheet URL .../d/<ID>/edit) into SHEET_ID below.
 * ----------------------------------------------------------------------------
 */

// Leave blank to use the spreadsheet this script is bound to (created via the
// Sheet's Extensions → Apps Script). Or hardcode a Sheet id to be explicit.
var SHEET_ID = '';

var HEADERS = [
  'received_at', 'name', 'whatsapp', 'email',
  'background', 'goal', 'consent', 'country', 'ip', 'user_agent', 'cf_ray', 'cohort',
  // New fields are APPENDED at the end so existing rows/columns stay aligned. On an
  // existing sheet the header row is NOT rewritten (headers are only written when the
  // sheet is empty) — add these header cells manually (cols M–Q), or clear row 1 once.
  'city', 'experience', 'institution', 'grad_year', 'heard_from',
];

function ss_() {
  var ss = SHEET_ID ? SpreadsheetApp.openById(SHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('No spreadsheet — create the script from the Sheet (Extensions → Apps Script) or set SHEET_ID.');
  return ss;
}

function doPost(e) {
  try {
    if (!isAuthorized_(e)) return json_({ ok: false, error: 'unauthorized' });

    var body = {};
    if (e && e.postData && e.postData.contents) body = JSON.parse(e.postData.contents);
    var r = body.record || body; // accept { record: {...} } or a flat object

    var sheet = ss_().getSheets()[0];
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
      sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
    sheet.appendRow([
      safe_(r.ts) || new Date().toISOString(),
      safe_(r.fullName),
      safe_(r.phone),
      safe_(r.email),
      safe_(r.background),
      safe_(r.goal),
      r.consent === true || r.consent === 'yes' ? 'yes' : '',
      safe_(r.country),
      safe_(r.ip),
      safe_(r.ua),
      safe_(r.ray),
      safe_(r.cohort),
      safe_(r.city),
      safe_(r.experience),
      safe_(r.institution),
      safe_(r.gradYear),
      safe_(r.heardFrom),
    ]);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

// Health + diagnostics: open <Web app URL>?key=<SHARED_KEY> → tells you the exact
// spreadsheet (name + url) this script writes to, and how many rows it has.
function doGet(e) {
  if (!isAuthorized_(e)) return json_({ ok: false, error: 'unauthorized' });
  try {
    var ss = ss_();
    var sheet = ss.getSheets()[0];
    return json_({
      ok: true,
      status: 'ready',
      spreadsheet: ss.getName(),
      url: ss.getUrl(),
      tab: sheet.getName(),
      rows: sheet.getLastRow(),
    });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

// Defense-in-depth formula-injection guard (the Worker already sanitizes, but a
// direct keyed POST would bypass it). Strips control chars + neutralizes a leading
// = + - @ so the cell can never be a live formula.
function safe_(v) {
  if (v == null) return '';
  var s = String(v).replace(/[\x00-\x1F\x7F]/g, '');
  if (/^[=+\-@]/.test(s.replace(/^\s+/, ''))) s = "'" + s;
  return s;
}

function isAuthorized_(e) {
  var key = PropertiesService.getScriptProperties().getProperty('SHARED_KEY');
  return !!key && e && e.parameter && e.parameter.key === key;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
