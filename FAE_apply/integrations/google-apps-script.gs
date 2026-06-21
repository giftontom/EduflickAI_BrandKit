/**
 * Eduflick AI — Full-Stack AI Engineer applications → Google Sheet
 * ----------------------------------------------------------------------------
 * Receives each application (JSON POST) from the Cloudflare "apply" worker and
 * appends a row to this spreadsheet. A shared key (?key=…) gates writes so the
 * public /exec URL can't be abused.
 *
 * SETUP (in developer@eduflickai.com):
 *  1. Create a Google Sheet (e.g. "FAE Applications").
 *  2. Extensions → Apps Script. Delete the stub, paste THIS whole file, Save.
 *  3. Project Settings (gear) → Script properties → Add property:
 *        SHARED_KEY = <a long random string, e.g. 32+ chars>
 *  4. Deploy → New deployment → type "Web app":
 *        Execute as: Me (developer@eduflickai.com)
 *        Who has access: Anyone
 *     Deploy → authorize (Advanced → Go to project → Allow) → copy the Web app URL.
 *  5. Give the worker:  NOTIFY_WEBHOOK_URL = <Web app URL>?key=<SHARED_KEY>
 * ----------------------------------------------------------------------------
 */

var HEADERS = [
  'received_at', 'name', 'whatsapp', 'email',
  'background', 'goal', 'consent', 'country', 'ip', 'user_agent', 'cf_ray', 'cohort',
];

function doPost(e) {
  try {
    if (!isAuthorized_(e)) return json_({ ok: false, error: 'unauthorized' });

    var body = {};
    if (e && e.postData && e.postData.contents) body = JSON.parse(e.postData.contents);
    var r = body.record || body; // accept { record: {...} } or a flat object

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
      sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
    sheet.appendRow([
      r.ts || new Date().toISOString(),
      r.fullName || '',
      r.phone || '',
      r.email || '',
      r.background || '',
      r.goal || '',
      r.consent === true || r.consent === 'yes' ? 'yes' : '',
      r.country || '',
      r.ip || '',
      r.ua || '',
      r.ray || '',
      r.cohort || '',
    ]);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

// Health check: open <Web app URL>?key=<SHARED_KEY> in a browser → {"ok":true,...}
function doGet(e) {
  return isAuthorized_(e)
    ? json_({ ok: true, status: 'ready' })
    : json_({ ok: false, error: 'unauthorized' });
}

function isAuthorized_(e) {
  var key = PropertiesService.getScriptProperties().getProperty('SHARED_KEY');
  return !!key && e && e.parameter && e.parameter.key === key;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
