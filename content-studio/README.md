# Eduflick AI — Content Studio

> Turn the brand kit into finished marketing content — fast, on-brand, and reliably even with
> small/cheap AI models.
> **Eduflick AI** is a venture of **Tomatrix Technologies Pvt Ltd**.

This package is the **content + strategy layer** that sits on top of the design system. The
design system tells you what the brand *looks like*; Content Studio tells you what it *says*,
how to *produce it at volume*, and how to keep a **small model on-brand** while it does the work.

It exists because of a real operating need: the **Full-Stack AI Engineer Program — Pioneer
Cohort** has to fill 20 seats on a 6-week social sprint, and a small team (or a small model, or
a VA) has to churn out captions, carousels, reels, DMs and ads every day without the brand drifting.

---

## 1. What's in here

| File | What it's for |
| --- | --- |
| **`SKILL.md`** | Agent-skill entry point. Point any agent at it. |
| **`BRAND_CHEATSHEET.md`** | ⭐ The whole brand in one page. The context block you paste into *any* model. Self-contained — no other file required. |
| **`EDUFLICK_AI_PLAYBOOK.md`** | The definitive playbook: brand identity + pitch-deck architecture + the publish-ready 12-tile Instagram launch grid (two indigo murals) with finished per-post copy. |
| **`INSTAGRAM_LAUNCH_PLAN.md`** | The complete launch-grid plan in one file: architecture, posting waves, safe-zone spec, brand rules, and full copy for all 12 posts (every carousel slide + caption). |
| **`SMALL_MODELS_GUIDE.md`** | How to get reliable, on-brand output from small models: the generate→check→fix loop, the FACTS block, output constraints, batching, the two-model pattern. |
| **`FACTS.md`** | ⚠️ Single source of truth for all live values — dates, prices, seat counts, links. Every prompt and visual pulls from here. Update this first. |
| **`POSTING_SCHEDULE.md`** | Day-by-day 6-week content calendar with status checkboxes. Fill the dates, then execute. |
| **`CHANNELS.md`** | Per-channel specs, cadence, formats, and which design kit renders each asset. |
| **`QA_CHECKLIST.md`** | The pass/fail gate + 100-point scorecard every piece runs through before shipping. |
| **`prompts/`** | Copy-paste, slot-filled, few-shot prompt templates — one per content type. |

`prompts/` contents:

| Prompt | Produces |
| --- | --- |
| `00_SYSTEM_PROMPT.md` | The master system prompt — load **once** per session, then append `BRAND_CHEATSHEET.md` after it. |
| `instagram-caption.md` | Feed/Reel captions with hook, body, CTA, hashtags. |
| `instagram-carousel.md` | Slide-by-slide carousel copy (curriculum, offer, objection-handler). |
| `reel-script.md` | Reel / YouTube Short scripts: hook, beats, VO, on-screen text, shot notes. |
| `linkedin-post.md` | Founder POV / credibility / hiring-narrative posts. |
| `whatsapp-sequence.md` | The 5–6 message masterclass → booking nurture flow. |
| `ad-copy.md` | Meta/IG paid: primary text, headlines, descriptions, variants. |
| `repurpose-batch.md` | Turn one asset into many; batch a week of content in one pass. |

---

## 2. How the two skills fit together

```text
            ┌─────────────────────────────┐
   words →  │   content-studio (here)     │   strategy, copy, small-model workflow
            │   "what it says"            │
            └──────────────┬──────────────┘
                           │  approved copy
            ┌──────────────▼──────────────┐
 visuals →  │   ../design-system          │   colors, type, logo, UI kits, HTML artifacts
            │   "what it looks like"      │   (eduflick-design skill + collateral kits)
            └─────────────────────────────┘
```

- **Copy lives here.** Voice rules, channel strategy, prompt templates, QA.
- **Pixels live in `../design-system/`.** Tokens (`colors_and_type.css`), logo (`assets/logo/`),
  icons, and the ready-made **collateral kits** that render this copy:
  - `../design-system/collateral/instagram-kit.html` — feed / carousel / story canvases.
  - `../design-system/collateral/brochure-kit.html` — A4 templates.
  - `../design-system/collateral/content-calendar.html` — the 6-week sprint, visualized.
  - `../design-system/slides/` — deck slides.
- **`FACTS.md` is the source of truth for facts** (dates, prices, seats, links); the brand book
  (`../brand-book/Eduflick_Brand_Book_v4.html`) governs visual identity.
- **The campaign this content serves** is `../planning/Eduflick_AI_Social_Media_Campaign_Plan.md`.

---

## 3. Quick start

### A. You're using a capable model (this Claude session)

1. Read `BRAND_CHEATSHEET.md` and `CHANNELS.md`.
2. Open the right file in `prompts/`, fill its FACTS block with real numbers.
3. Generate. Run `QA_CHECKLIST.md`. Hand approved copy to the design kit.

### B. You're driving a small/cheap model (Haiku, mini, local)

1. Paste `prompts/00_SYSTEM_PROMPT.md` as the **system message**, then append `BRAND_CHEATSHEET.md` after it.
2. Paste the specific task prompt (e.g. `prompts/instagram-carousel.md`) as the **first user
   message**, with the FACTS block filled in.
3. Generate **one asset at a time**. Keep temperature modest (≈0.5–0.7).
4. Paste `QA_CHECKLIST.md` and ask the model to score its own draft; fix anything under the bar.
5. Read `SMALL_MODELS_GUIDE.md` for why each of these steps matters.

### C. You're handing this to a teammate / VA

Give them `BRAND_CHEATSHEET.md` + the one prompt file they need + `QA_CHECKLIST.md`. That's a
complete, self-contained brief — no need to learn the whole system.

---

## 4. The one rule that breaks everything if ignored

**Models invent facts.** They will confidently make up the masterclass date, the price, the seat
count, the venue, and the registration link. Every prompt here forces real values through a
**FACTS block** you fill in. If a fact isn't in the FACTS block, the copy must not state it —
it should leave a `[[PLACEHOLDER]]` instead. See `SMALL_MODELS_GUIDE.md` § Anti-hallucination.

---

*Eduflick AI · a Tomatrix Technologies venture · content layer over Brand Book v4.0*
