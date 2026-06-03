<!-- Eduflick AI Brand Kit — pull request -->

## What & why

<!-- One or two sentences: what does this change, and what need does it serve? -->

## Type of change

- [ ] Brand/design tokens (`design-system/tokens/tokens.json`)
- [ ] Component / shared CSS (`design-system/components.css`)
- [ ] Copy / prompts (`content-studio/`)
- [ ] Collateral / brochure / deliverable
- [ ] Docs / instructions
- [ ] Tooling / CI

## Checklist

- [ ] Used **tokens** (`var(--…)`) — did not hardcode brand hex/font values.
- [ ] If I changed tokens or snippets, I ran `npm run tokens && npm run snippets` and committed the regenerated files.
- [ ] Live values (dates/prices/seats/links) come from `content-studio/FACTS.md`, not from memory.
- [ ] Ran the relevant QA checklist (`design-system/QA_CHECKLIST.md` and/or `content-studio/QA_CHECKLIST.md`).
- [ ] Re-exported affected PNGs (`cd tools && npm run export`) if a rendered canvas changed.
- [ ] Brand non-negotiables intact: indigo + neutral only, the mark unaltered, no emoji in finished copy.

## Screenshots / renders

<!-- For any visual change, paste a before/after render. Visuals must be seen, not assumed. -->
