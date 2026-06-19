# Prompt library

Copy-paste, slot-filled, few-shot prompt templates — one per content type. Built so a **small
model** can run them with no other context.

## How to use

1. **Once per session:** paste `00_SYSTEM_PROMPT.md` as the **system message**, then append the
   full `../BRAND_CHEATSHEET.md` after it. The system prompt is a compact summary — it does NOT
   embed the cheat sheet, and the cheat sheet is canonical if anything conflicts.
2. **Per asset:** paste the matching task file below as the **first user message**. Each file has:
   - a **FACTS block** to fill with real numbers (the model may not invent any),
   - the **task + ranked constraints**,
   - an exact **output template**,
   - **1–2 few-shot examples** showing the bar.
3. **QA:** paste `../QA_CHECKLIST.md`, ask for a score + fixes. Ship at ≥85, zero hard-fails.
4. **Render:** hand approved copy to `../../design-system/` (collateral kits / slides).

Read `../SMALL_MODELS_GUIDE.md` for why each step matters.

## Files

| File | Produces | Render with |
| --- | --- | --- |
| `00_SYSTEM_PROMPT.md` | (loads the brand into the model) | — |
| `instagram-caption.md` | feed/reel captions + hashtags | Instagram Kit |
| `instagram-carousel.md` | slide-by-slide carousel copy | Instagram Kit |
| `reel-script.md` | Reel / YouTube Short scripts | shoot + story canvas |
| `linkedin-post.md` | founder / credibility / hiring posts | native / Slides |
| `whatsapp-sequence.md` | masterclass→booking nurture flow | send as text |
| `ad-copy.md` | Meta/IG paid copy + variants | Instagram Kit (static) / video |
| `repurpose-batch.md` | one source → many assets; a week in one pass | Content Calendar + kits |

**Don't edit the constraints/examples in these files casually** — they're tuned to keep small
models on-brand. Edit the FACTS block and the task line; leave the guardrails.
