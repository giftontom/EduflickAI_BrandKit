/**
 * Application form fields — the single declarative contract (server + form).
 *
 * Lean, fast-fill set (6 fields): the redesigned mobile wizard collects only what's
 * needed to contact + lightly qualify an applicant. Everything else happens in the
 * WhatsApp conversation. Copy is grounded in content-studio/FACTS.md.
 *
 * type: text | email | tel | radio | consent
 *   - `radio`   -> a single choice rendered as tappable chips; server whitelists it
 *   - `consent` -> a single required checkbox, stored as boolean true
 */
export const HONEYPOT = 'company';
export const TURNSTILE_FIELD = 'cf-turnstile-response';

export const FIELDS = [
  { name: 'fullName', label: 'Full name', type: 'text', required: true, autocomplete: 'name', maxlen: 120 },
  { name: 'phone', label: 'WhatsApp number', type: 'tel', required: true, autocomplete: 'tel', maxlen: 40 },
  { name: 'email', label: 'Email', type: 'email', required: true, autocomplete: 'email', maxlen: 160 },
  {
    name: 'background',
    label: 'Background',
    type: 'radio',
    required: true,
    options: [
      { value: 'btech-student', label: 'B.Tech student' },
      { value: 'btech-grad', label: 'B.Tech graduate' },
      { value: 'junior-dev', label: 'Junior developer' },
      { value: 'career-changer', label: 'Career-changer' },
      { value: 'other', label: 'Something else' },
    ],
  },
  {
    name: 'goal',
    label: 'Goal',
    type: 'radio',
    required: true,
    options: [
      { value: 'get-hired', label: 'Get hired in an AI role' },
      { value: 'build-products', label: 'Build my own AI products' },
      { value: 'level-up', label: 'Level up at my current job' },
      { value: 'other', label: 'Still figuring it out' },
    ],
  },
  {
    name: 'consent',
    label: 'Consent',
    type: 'consent',
    required: true,
    text:
      'I can attend in person in Trivandrum and agree to Eduflick AI storing these details to process my application and contact me.',
  },
];
