# Recipe — landing section (responsive web block)

A real, responsive web section (hero, feature row, pricing, CTA band) — production HTML/CSS, not a
fixed-pixel canvas. Theme it from `tokens.css`; reuse `design-effects` for surface/atmosphere.

```
FACTS (missing → [[NEEDS: …]]):
- Section purpose:        [[hero | features | pricing | social-proof | CTA]]
- Headline + sub:         [[ ]]
- Primary / secondary CTA:[[ ]]
- Real numbers / links:   [[ ]]

INPUTS:
- Breakpoints: mobile-first; comfortable max-width (~1200px) container.
- Theme: [[dark | light]]; surface effect: [[.cine | .hero | flat]].

BUILD RULES:
1. Fluid + responsive (rem/%/clamp), NOT a fixed canvas. Container max-width; sensible stacking at
   ≤ 768px. This is the one recipe that ships as live web code, not an exported image.
2. Theme entirely from var(--…); load tokens.css then effects.css. One hue + neutrals.
3. Atmosphere from design-effects: a .cine/.hero surface with .vignette + faint .grain; a .halo
   behind the hero focal; .glass for floating cards. Keep it subtle on a scrolling page.
4. Type: headlineCase + one accent word per the profile; mono eyebrow; real body copy.
5. Accessibility: semantic landmarks, focus states, ≥ AA contrast (verify on the actual surface),
   alt text, reduced-motion fallback for any animation.
6. Buttons: primary (accent) + ghost, with a subtle hover lift; real links.
7. Return ONE HTML file (or a component) with responsive CSS.

OUTPUT: one ```html … ``` block.
```

**✗ Avoid:** fixed-pixel layout that breaks on mobile, color literals instead of vars, heavy
animation, low-contrast hero text, placeholder lorem where a FACT belongs.
