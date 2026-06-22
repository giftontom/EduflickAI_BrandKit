# Recipe — web landing / marketing section

Load `00_SYSTEM_PROMPT.md` + `../DESIGN_CHEATSHEET.md` + `snippets.md` first. For the public site:
a hero, a how-it-works row, a curriculum/stack section, a pricing/scarcity block, or a closing CTA.
Output is ONE responsive, self-contained HTML section (not a fixed canvas). Mirror the look in
`../ui_kits/web/marketing.jsx`. Render at desktop + ~390px mobile widths and QA both.

---

```text
FACTS (only source of live numbers; missing → [[NEEDS: …]]):
- Masterclass date / cohort start / seats left: [[ ]]
- Price / retail / venue:                        [[₹49,000 / ₹70,000 / Trivandrum]]
- Registration link:                             [[ ]]

INPUTS:
- Section: [[hero | how-it-works (3 steps) | curriculum/stack grid | pricing+scarcity | closing CTA]]
- Theme: [[dark (default) | indigo gradient hero | paper]]
- Eyebrow / headline (lowercase, one *serif* word) / sub / CTA: [[ ]]

BUILD RULES:
1. Responsive: a centered `max-width:1100px` container, fluid headline with `clamp()`
   (e.g. `clamp(40px,6vw,72px)`), CSS grid that collapses to 1 column under 760px.
2. HERO: eyebrow (S4) → big lowercase headline w/ one serif word (S5) → serif/body sub (S6) →
   primary + ghost buttons (S7). Optional indigo gradient bg (S11) + faint dots. Consider a small
   "live feed" mock using flick cards (S9) on the right at desktop.
3. HOW-IT-WORKS: 3 cards (S8), each a mono step id ("01"), a lowercase title, one line. Equal grid.
4. CURRICULUM/STACK: a grid of tags/pills (S10) or stat cards; mono labels; numbers as proof.
5. PRICING/SCARCITY: two cards (Early Bird ₹49K vs retail ₹70K); the coral scarcity flag (S10) on the
   Early Bird card only; dashed spec rows (S12) for the payment structure.
6. CLOSING CTA: indigo gradient, headline + primary button + wordmark/mark.
7. Hover states from S7 (lift + brand glow). One hue. Return ONE complete HTML file (section + the
   minimal page shell so it renders standalone).

OUTPUT: one ```html ... ``` block.
```

---

## Worked example (abbreviated — hero, indigo gradient)
>
> `.hero-indigo` bg + faint dots. Centered container. Eyebrow `EDUFLICK · A FEED FOR THINKING`.
> Headline `clamp(40,6vw,72)` lowercase: `learn anything in *sixty* seconds.` Serif sub: "the
> doom-scroll antidote." Buttons: `try free` (primary) + `view the app` (ghost). On desktop, a
> column of 3 flick cards (S9) floats right; collapses below the copy on mobile. One hue, paper mark
> in the corner.

**✗ Avoid:** a second hue, gradient buttons in other colors, Title Case, system fonts, heavy card
shadows, stock hero photo, a price/date not in FACTS, a layout that doesn't collapse on mobile.
