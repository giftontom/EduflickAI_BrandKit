/**
 * Application form fields — the single declarative contract.
 *
 * The server (validate.js) and the rendered form (public/apply/index.html) both
 * follow this list. Field copy is grounded in content-studio/FACTS.md. Adding or
 * changing a field here means mirroring it in index.html.
 *
 * type: text | email | tel | url | select | radio | checkbox | textarea | consent
 *   - `multiple: true` (checkbox)  -> value is an array of option values
 *   - `consent`                    -> a single required checkbox, stored as boolean true
 *   - `options: [{value,label}]`   -> server whitelists the submitted value(s)
 */
export const HONEYPOT = 'company';
export const TURNSTILE_FIELD = 'cf-turnstile-response';

export const FIELDS = [
  { name: 'fullName', label: 'Full name', type: 'text', required: true, autocomplete: 'name', maxlen: 120 },
  { name: 'email', label: 'Email', type: 'email', required: true, autocomplete: 'email', maxlen: 160 },
  { name: 'phone', label: 'Phone / WhatsApp', type: 'tel', required: true, autocomplete: 'tel', maxlen: 40 },
  {
    name: 'role',
    label: 'Current background',
    type: 'select',
    required: true,
    options: [
      { value: 'btech-student', label: 'B.Tech student' },
      { value: 'btech-grad', label: 'B.Tech graduate (2024–2026)' },
      { value: 'junior-dev', label: 'Junior developer (0–2 yrs)' },
      { value: 'career-changer', label: 'Career-changer' },
      { value: 'other', label: 'Other' },
    ],
  },
  {
    name: 'yearsCoding',
    label: 'Coding experience',
    type: 'select',
    required: true,
    options: [
      { value: '0', label: 'Just starting (0)' },
      { value: '<1', label: 'Less than 1 year' },
      { value: '1-2', label: '1–2 years' },
      { value: '3-5', label: '3–5 years' },
      { value: '5+', label: '5+ years' },
    ],
  },
  {
    name: 'primaryLanguage',
    label: 'Primary language',
    type: 'select',
    required: false,
    options: [
      { value: 'python', label: 'Python' },
      { value: 'js-ts', label: 'JavaScript / TypeScript' },
      { value: 'java', label: 'Java' },
      { value: 'go', label: 'Go' },
      { value: 'c-cpp', label: 'C / C++' },
      { value: 'other', label: 'Other' },
    ],
  },
  {
    name: 'builtWithLLMs',
    label: 'Built with LLMs before?',
    type: 'radio',
    required: false,
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ],
  },
  {
    name: 'stackFamiliarity',
    label: 'Comfortable with',
    type: 'checkbox',
    multiple: true,
    required: false,
    options: [
      { value: 'react', label: 'React' },
      { value: 'nextjs', label: 'Next.js' },
      { value: 'backend', label: 'Backend APIs' },
      { value: 'databases', label: 'Databases' },
      { value: 'none', label: 'None yet' },
    ],
  },
  {
    name: 'primaryGoal',
    label: 'Primary goal',
    type: 'select',
    required: true,
    options: [
      { value: 'get-hired', label: 'Get hired in an AI role' },
      { value: 'build-products', label: 'Build my own AI products' },
      { value: 'level-up', label: 'Level up in my current job' },
      { value: 'other', label: 'Other' },
    ],
  },
  { name: 'linkedin', label: 'LinkedIn URL', type: 'url', required: false, autocomplete: 'url', maxlen: 200 },
  { name: 'portfolio', label: 'Portfolio / GitHub', type: 'url', required: false, maxlen: 200 },
  {
    name: 'heardFrom',
    label: 'How did you hear about us?',
    type: 'select',
    required: false,
    options: [
      { value: 'instagram', label: 'Instagram' },
      { value: 'linkedin', label: 'LinkedIn' },
      { value: 'whatsapp', label: 'WhatsApp' },
      { value: 'referral', label: 'Friend / referral' },
      { value: 'search', label: 'Web search' },
      { value: 'other', label: 'Other' },
    ],
  },
  { name: 'toolsWanted', label: 'AI tools you want to learn', type: 'textarea', required: false, maxlen: 600 },
  { name: 'notes', label: 'Anything else?', type: 'textarea', required: false, maxlen: 1200 },
  {
    name: 'availabilityConfirm',
    label: 'In-person availability',
    type: 'consent',
    required: true,
    text: 'I can attend all 12 weeks in person at UXP Innovation Hub, Trivandrum.',
  },
  {
    name: 'consent',
    label: 'Data consent',
    type: 'consent',
    required: true,
    text:
      'I agree to Eduflick AI storing these details to process my application and contact me about the program.',
  },
];
