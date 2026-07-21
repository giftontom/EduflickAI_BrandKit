/**
 * Application form fields — the single declarative contract (server + form).
 *
 * Fast-fill but qualifying: the wizard collects what's needed to contact + qualify
 * an applicant before a human replies (location, experience, light context), keeping
 * the required set to quick taps / short inputs. Optional fields sharpen the lead
 * without blocking submit. Everything else happens in the WhatsApp conversation.
 * Copy is grounded in content-studio/FACTS.md.
 *
 * type: text | email | tel | radio | select
 *   - `radio`   -> a single choice rendered as tappable chips; server whitelists it
 *   - `select`  -> a single choice rendered as a native dropdown; server whitelists it
 * radio/select/text share the generic validate path — only the value whitelist from
 * `options` matters server-side, so the HTML control is free to differ.
 * (Consent is no longer a field: the last step is review-only and agreement is
 *  implied by submitting — the worker stamps consent:true + consentTs.)
 */
export const HONEYPOT = 'hp_token';
export const TURNSTILE_FIELD = 'cf-turnstile-response';

export const FIELDS = [
  { name: 'fullName', label: 'Full name', type: 'text', required: true, autocomplete: 'name', maxlen: 120 },
  { name: 'phone', label: 'WhatsApp number', type: 'tel', required: true, autocomplete: 'tel', maxlen: 40 },
  { name: 'email', label: 'Email', type: 'email', required: true, autocomplete: 'email', maxlen: 160 },
  // In-person program in Trivandrum — city is the single cheapest qualifier.
  { name: 'city', label: 'City / town', type: 'text', required: true, autocomplete: 'address-level2', maxlen: 80 },
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
    name: 'experience',
    label: 'Coding experience',
    type: 'radio',
    required: true,
    options: [
      { value: 'no-code', label: "Haven't coded yet" },
      { value: 'learning', label: 'Learning the basics' },
      { value: 'some-projects', label: 'Built a few projects' },
      { value: 'professional', label: 'Coding professionally' },
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
  // ---- Optional context (never blocks submit; sharpens the lead) ----
  { name: 'institution', label: 'College or company', type: 'text', required: false, autocomplete: 'organization', maxlen: 120 },
  {
    name: 'gradYear',
    label: 'Graduation year',
    type: 'select',
    required: false,
    options: [
      { value: 'still-studying', label: 'Still studying' },
      { value: '2028', label: '2028' },
      { value: '2027', label: '2027' },
      { value: '2026', label: '2026' },
      { value: '2025', label: '2025' },
      { value: '2024', label: '2024' },
      { value: '2023', label: '2023' },
      { value: '2022', label: '2022' },
      { value: '2021', label: '2021' },
      { value: 'before-2021', label: 'Before 2021' },
    ],
  },
  {
    name: 'heardFrom',
    label: 'How did you hear about us',
    type: 'select',
    required: false,
    options: [
      { value: 'instagram', label: 'Instagram' },
      { value: 'whatsapp', label: 'WhatsApp' },
      { value: 'friend', label: 'A friend' },
      { value: 'google', label: 'Google search' },
      { value: 'event', label: 'An event / college' },
      { value: 'other', label: 'Somewhere else' },
    ],
  },
  // No consent checkbox: the last step is review-only. Agreement is implied by
  // submitting (see the fine-print line in index.html), and the worker records it
  // as consent:true + consentTs at submit time.
];
