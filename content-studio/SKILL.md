---
name: eduflick-content
description: Use this skill to PRODUCE on-brand Eduflick AI marketing & operations CONTENT — Instagram captions/carousels, reel & Shorts scripts, LinkedIn posts, WhatsApp nurture sequences, ad copy, email, landing-page and brochure copy — quickly and at volume, including with smaller/cheaper AI models. Pairs with the eduflick-design skill (which makes the visuals). This skill owns the words, the strategy, and the small-model workflow.
user-invocable: true
---

# Eduflick AI — Content Studio

This skill turns the Eduflick AI brand assets into **finished marketing copy and content**,
reliably and at volume — even when the work is done by a **small, cheap model** (Claude Haiku,
GPT-4o-mini, Llama/Mistral-class local models, etc.).

It is the **words + strategy** half of the brand system. Its sibling, the
`eduflick-design` skill (`../design-system/SKILL.md`), is the **visuals** half (colors, type,
logo, UI kits, HTML artifacts). Use them together: this skill writes the carousel copy;
the design skill renders the carousel.

## When to use this
- "Write me 5 Instagram captions for the masterclass."
- "Give me a 7-slide curriculum carousel."
- "Draft the WhatsApp nurture sequence."
- "Turn this reel idea into a script + on-screen text."
- "I have a cheap model / a VA — give me a reusable prompt that keeps it on-brand."
- Any marketing or ops content for the **Full-Stack AI Engineer Program** (the active business)
  or the **Eduflick consumer learning app** (the product vision).

## Read these first (in order)
1. **`BRAND_CHEATSHEET.md`** — the entire brand compressed into one page. This is the context
   block you paste into *any* model. If you read nothing else, read this.
2. **`SMALL_MODELS_GUIDE.md`** — how to get reliable, on-brand output from small models: the
   generate→check→fix loop, the FACTS block (anti-hallucination), output constraints, batching.
3. **`CHANNELS.md`** — per-channel specs, cadence, and which design kit renders each asset.
4. **`prompts/`** — copy-paste, slot-filled, few-shot prompt templates, one per content type.
5. **`QA_CHECKLIST.md`** — the gate every piece must pass before it ships.

## The core workflow (works for you OR a small model)
1. **Pick the task** → open the matching file in `prompts/`.
2. **Load context** → paste `prompts/00_SYSTEM_PROMPT.md` (which embeds `BRAND_CHEATSHEET.md`)
   as the system/first message.
3. **Fill the FACTS block** → real dates, prices, seat counts, links. Models must never invent these.
4. **Generate** → small models do best one asset at a time, tightly constrained.
5. **QA** → run `QA_CHECKLIST.md`. Regenerate only the parts that fail.
6. **Render** → hand the approved copy to the `eduflick-design` skill / collateral kits for visuals.

## The non-negotiables (full detail in BRAND_CHEATSHEET.md)
- **Voice:** confident, technical, no fluff. Talk like engineers, not marketers. Short declaratives.
- **No emoji** in finished brand copy. **Numbers as proof** (`₹49K`, `20 seats`, `60s`, `12 weeks`).
- **Own the word "flick."** Achievements are **Sparks you earn** — never "level up / unlock / claim."
- **Casing:** lowercase display headlines; UPPERCASE mono labels; one *serif-italic* accent word.
- **One hue:** indigo `#5B5BF0` + neutral (paper/ink). Coral `#FF6E5A` only for CTAs/scarcity.
- **Never invent facts.** Dates, prices, seat counts, names, links come only from the FACTS block.

If invoked with no other guidance: ask what they're making and for which channel, then drive the
workflow above — produce the copy, run the QA checklist, and offer to render the visual.

---
*Eduflick AI · a Tomatrix Technologies venture · content layer over Brand Book v4.0*
