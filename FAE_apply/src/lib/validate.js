/**
 * Server-side validation + normalization. Runs independently of the client, so a
 * crafted POST cannot bypass the form. Returns only whitelisted, length-capped,
 * formula-injection-sanitized fields in `clean` (honeypot + Turnstile token are
 * never stored).
 */
import { FIELDS } from './fields.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE = /^https?:\/\/.+/i;
const CHECKED = new Set(['yes', 'on', 'true', '1']);
const CONTROL_RE = /[\x00-\x1F\x7F]/g; // ASCII control chars incl TAB/CR/LF/NUL
const FORMULA_RE = /^[=+\-@]/; // leading chars Sheets/Excel treat as a formula

function isChecked(v) {
  if (v === true) return true;
  if (Array.isArray(v)) return v.length > 0;
  return typeof v === 'string' && CHECKED.has(v.trim().toLowerCase());
}

/**
 * Neutralize spreadsheet/CSV formula injection + control chars before a value is
 * stored or written to a Sheet. A cell starting with = + - @ is treated as a live
 * formula (HYPERLINK phishing / IMPORTXML exfiltration) — prefix a quote so it stays
 * inert text. Also strips control chars (defeats CSV/Slack/Discord line-forging).
 * Exported for reuse on Worker-derived fields (User-Agent, etc.).
 */
export function sanitizeCell(v) {
  if (v == null) return v;
  let s = String(v).replace(CONTROL_RE, '');
  if (FORMULA_RE.test(s.replace(/^\s+/, ''))) s = "'" + s;
  return s;
}

export function validate(input) {
  const errors = {};
  const clean = {};

  for (const f of FIELDS) {
    const raw = input ? input[f.name] : undefined;

    // Single required checkbox (consent) -> boolean true.
    if (f.type === 'consent') {
      if (isChecked(raw)) clean[f.name] = true;
      else if (f.required) errors[f.name] = `${f.label} is required.`;
      continue;
    }

    // Multi checkbox -> array of valid option values (whitelisted, then sanitized).
    if (f.multiple) {
      const list = Array.isArray(raw) ? raw : raw == null || raw === '' ? [] : [raw];
      const valid = new Set((f.options || []).map((o) => o.value));
      const arr = list
        .map((x) => String(x).trim())
        .filter((x) => valid.has(x))
        .slice(0, 20)
        .map(sanitizeCell);
      if (f.required && arr.length === 0) errors[f.name] = `${f.label} is required.`;
      else if (arr.length) clean[f.name] = arr;
      continue;
    }

    let v = raw == null ? '' : String(raw).trim();
    const cap = f.maxlen || 2000;
    if (v.length > cap) v = v.slice(0, cap);

    if (v === '') {
      if (f.required) errors[f.name] = `${f.label} is required.`;
      continue;
    }
    if (f.options) {
      const valid = new Set(f.options.map((o) => o.value));
      if (!valid.has(v)) {
        errors[f.name] = `Choose a valid option for ${f.label}.`;
        continue;
      }
    }
    if (f.type === 'email' && !EMAIL_RE.test(v)) {
      errors[f.name] = 'Enter a valid email address.';
      continue;
    }
    if (f.type === 'tel') {
      const digits = v.replace(/\D/g, '');
      if (digits.length < 7 || digits.length > 15) {
        errors[f.name] = 'Enter a valid phone number.';
        continue;
      }
    }
    if (f.type === 'url' && !URL_RE.test(v)) {
      errors[f.name] = 'Enter a full URL (https://…).';
      continue;
    }
    clean[f.name] = sanitizeCell(v);
  }

  return { ok: Object.keys(errors).length === 0, errors, clean };
}
