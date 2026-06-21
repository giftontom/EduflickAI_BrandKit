/**
 * Server-side validation + normalization. Runs independently of the client, so a
 * crafted POST cannot bypass the form. Returns only whitelisted, length-capped
 * fields in `clean` (the honeypot and Turnstile token are never stored).
 */
import { FIELDS } from './fields.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE = /^https?:\/\/.+/i;
const CHECKED = new Set(['yes', 'on', 'true', '1']);

function isChecked(v) {
  if (v === true) return true;
  if (Array.isArray(v)) return v.length > 0;
  return typeof v === 'string' && CHECKED.has(v.trim().toLowerCase());
}

export function validate(input) {
  const errors = {};
  const clean = {};

  for (const f of FIELDS) {
    const raw = input ? input[f.name] : undefined;

    // Single required checkbox (availability / consent) -> boolean true.
    if (f.type === 'consent') {
      if (isChecked(raw)) clean[f.name] = true;
      else if (f.required) errors[f.name] = `${f.label} is required.`;
      continue;
    }

    // Multi checkbox -> array of valid option values.
    if (f.multiple) {
      const list = Array.isArray(raw) ? raw : raw == null || raw === '' ? [] : [raw];
      const valid = new Set((f.options || []).map((o) => o.value));
      const arr = list
        .map((x) => String(x).trim())
        .filter((x) => valid.has(x))
        .slice(0, 20);
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
    clean[f.name] = v;
  }

  return { ok: Object.keys(errors).length === 0, errors, clean };
}
