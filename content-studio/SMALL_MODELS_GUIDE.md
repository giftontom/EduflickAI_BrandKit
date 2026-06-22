# Getting reliable, on-brand content out of SMALL models

This is the heart of the kit. A big model can read the whole brand book and infer the voice. A
**small/cheap model** (Claude Haiku, GPT-4o-mini, Gemini Flash, Llama/Mistral-class local models)
**can't** — it has less world knowledge, weaker long-context recall, and it *drifts* and
*hallucinates* the longer and vaguer the instruction. This guide is how you get production-grade,
on-brand Eduflick content out of them anyway — cheaply and at volume.

The whole strategy in one line: **do the thinking once, freeze it into a prompt, and make the
small model fill a tightly-constrained template — never improvise.**

---

## 1. Why small models fail at brand work (and the fix for each)

| Failure you'll see | Why it happens | The fix this kit uses |
| --- | --- | --- |
| Generic "marketer" voice, hype, emoji | No brand prior; defaults to its training average | Embed the **full** `BRAND_CHEATSHEET.md` every session. Don't paraphrase it. |
| Makes up the date / price / link / seats | Fills gaps to please you | **FACTS block** (§4). No fact outside it; gaps become `[[PLACEHOLDER]]`. |
| Drifts off-brand after a few turns | Weak long-context recall | **One asset per request.** Re-anchor the rules each turn for long sessions. |
| Ignores half your instructions | Can't track many constraints at once | **Few, ranked constraints** + a fixed **output format**. Checklists over prose. |
| Rambling, too long, no structure | No format pressure | Give an exact **output template** with slots and length caps. |
| Inconsistent across a batch | Sampling variance | Lower temperature (≈0.5), generate variants in one call, pick best. |
| Confidently wrong & won't admit it | No self-doubt by default | **Self-QA pass** against `QA_CHECKLIST.md` + the `[[PLACEHOLDER]]` escape hatch. |

---

## 2. The seven rules of prompting a small model here

1. **Give it everything inline.** Small models can't "go read the brand book." Paste
   `00_SYSTEM_PROMPT.md`, then append the full `BRAND_CHEATSHEET.md` after it, every session.
2. **One task at a time.** One caption, one carousel, one script per request. Don't ask for
   "a week of content" in a single shot — batch *outputs of the same type* (§7), not types.
3. **Constrain the output shape.** Always specify the exact format and length caps. A small model
   given a template fills it well; given freedom it rambles.
4. **Rank constraints; keep them few.** Lead with the 3 that matter most for this asset. A wall of
   20 equal rules → it follows ~5 at random. The prompt files already pre-rank.
5. **Show, don't just tell.** Each prompt file carries 1–2 **few-shot examples**. Examples move a
   small model more than rules do. Keep them.
6. **Forbid invention explicitly.** "If a fact is not in FACTS, write `[[NEEDS: …]]`. Do not guess."
   Repeat this near the end of the prompt (recency helps small models).
7. **Make it check itself.** After generating, paste `QA_CHECKLIST.md` and ask for a score +
   fixes. Cheap models are cheap — a second pass costs almost nothing and catches most misses.

---

## 3. The generate → check → fix loop

```text
  ┌─ 1. SYSTEM: paste prompts/00_SYSTEM_PROMPT.md + append BRAND_CHEATSHEET.md (once per session)
  │
  ├─ 2. USER:   paste the task prompt (e.g. instagram-carousel.md)
  │             + fill its FACTS block with real numbers
  │
  ├─ 3. GEN:    model returns ONE asset in the required format
  │
  ├─ 4. CHECK:  paste QA_CHECKLIST.md → "score this draft 0–100, list every fail"
  │
  ├─ 5. FIX:    "rewrite ONLY the lines that failed; keep the rest"
  │
  └─ 6. SHIP:   copy passes → hand to ../design-system for the visual
```

Steps 4–5 are where small models earn their keep: they're bad at getting it perfect in one shot
but good at *fixing a specific, named problem*. Never ask "make it better" — name the failure.

---

## 4. The FACTS block — your anti-hallucination seatbelt

**The single biggest risk** is a model stating a wrong date, price, seat count, venue, or link.
Every prompt in `prompts/` opens with a FACTS block. You fill it; the model may only use what's in
it. Anything missing becomes a visible placeholder you fix by hand — never a guess.

Copy this, fill it, paste it with the task:

```text
FACTS (the ONLY source of live numbers — do not invent anything else):
- Today's date:            [[e.g. 2026-06-02]]
- Masterclass date/time:   [[e.g. Sat 21 Jun 2026, 5:00 PM IST]]   (or [[NOT SET]])
- Masterclass format:      [[free, live, ~90 min, online/in-person]]
- Registration link:       [[https://… ]]                          (or [[NEEDS LINK]])
- Seats total / left:      [[20 total / 7 left]]
- Early Bird price:           [[₹49,000]]   Retail (Cohort 2): [[₹70,000]]
- Booking fee:             [[₹15,000 to reserve; then ₹17,000 + ₹17,000]]
- Cohort start date:       [[e.g. 6 Jul 2026]]   Duration: [[12 weeks]]
- Venue:                   [[UXP Innovation Hub, Trivandrum]]
- WhatsApp / contact:      [[wa.me/… or phone]]

RULE: Use ONLY the values above for any date, price, number, link, or name. If something
you'd want to state is missing or marked NOT SET / NEEDS, output [[NEEDS: <what>]] in place of it.
Never substitute a value from memory.
```

> Stable facts (the stack, the 3 projects, the wedge, the venue name) live in
> `BRAND_CHEATSHEET.md` and are safe to reference. **Volatile** facts (exact date, seats-left,
> links) must come from this block. When unsure which a fact is, treat it as volatile.
>
> **For the Instagram launch:** the finished copy for all 12 posts + every carousel slide is already
> written in `INSTAGRAM_LAUNCH_PLAN.md` (context in `EDUFLICK_AI_PLAYBOOK.md`; LAUNCH_PLAN is
> canonical where the playbook differs). Reuse it and only fill the FACTS placeholders — don't
> have a small model regenerate launch copy from scratch.

---

## 5. Recommended model settings (model-agnostic)

| Setting | Suggested | Why |
| --- | --- | --- |
| **Temperature** | 0.5–0.7 drafting · 0.2–0.4 for QA/fix/factual | Lower = more on-brand & consistent; raise slightly only if output feels samey. |
| **Max tokens** | Enough for the asset + a little; not huge | Caps rambling. A caption needs ~300, a carousel ~800. |
| **System vs user** | Cheat sheet → **system**; task+FACTS → **user** | Keeps the brand prior stable across turns. |
| **Stop / format** | Ask for the exact template; nothing before/after it | Easier to parse, batch, and paste into the design kit. |
| **n / variants** | Ask for 3 variants in one call, pick 1 | Cheaper than 3 calls; gives you choice. |

Claude-specific (if using the Anthropic API): set the cheat sheet as the system prompt and turn
on **prompt caching** for it — you reuse it across hundreds of generations, so cache it once.
Haiku is the sweet spot for this kit. (See the `claude-api` skill for caching code.)

---

## 6. The two-model pattern (best price/quality)

For volume work, split the job by what each model is good at:

- **Small model = the writer.** Generates drafts and variants in bulk, cheaply.
- **Bigger model (or you) = the editor.** Runs the QA checklist, kills the 1–2 off-brand drafts,
  picks winners. One editor pass over 20 cheap drafts ≫ 20 expensive drafts.

If you only have the small model, make it play both roles in separate turns: **draft** (temp 0.6),
then **switch hats** — "You are now a strict brand editor. Score this against the checklist and
fix fails." Separating the turns matters; a model critiques better than it self-improves inline.

---

## 7. Batching a week of content (without losing the voice)

Do **not** ask one prompt for "Mon–Sun of mixed content" — quality collapses. Instead:

1. **Plan with a big model / yourself, or `repurpose-batch.md`:** decide the week's 7 assets,
   each tagged to a pillar (§7 of the cheat sheet) and a funnel phase.
2. **Batch by type, not by day.** Run `instagram-caption.md` once asking for *5 captions for these
   5 hooks* — same template, same constraints, so the voice stays uniform. Then run the carousel
   prompt for the carousels, etc.
3. **One QA pass per batch.** Score all 5 together; the off-brand one stands out next to siblings.
4. **Render together** so visual rhythm matches (the Instagram Kit shows a 9-up launch grid).

`repurpose-batch.md` automates "1 masterclass recording → 1 carousel + 3 reels + 2 captions + 1
LinkedIn post," which is the highest-leverage move in the 6-week sprint.

---

## 8. Quick failure triage

| Symptom in the output | One-line fix to send the model |
| --- | --- |
| Emoji appeared | "Remove all emoji. Replace each with a number or a mono label." |
| Sounds like a marketer | "Rewrite as an engineer: shorter, declarative, lead with a number or a verb." |
| Too long | "Cut by half. Keep the hook and the CTA." |
| No serif accent word | "Wrap exactly one payoff word in *asterisks*." |
| Made up a date/price | "That value isn't in FACTS. Replace with [[NEEDS: …]]." |
| Title Case headline | "Lowercase the headline. Mono labels stay UPPERCASE." |
| Hype words (unlock/level up/supercharge) | "Forbidden words. Use 'earn a Spark' / a concrete proof instead." |
| Generic hashtags | "Use 3–6 precise tags from the cheat-sheet pool. No grind tags." |
| Doesn't match the funnel stage | "This is a [awareness/consideration/conversion] asset — adjust the CTA accordingly." |
| Tomatrix mis-cased / lowercased | "Legal name is 'Tomatrix Technologies Pvt Ltd' (proper case); short form 'a Tomatrix Technologies venture'." |
| Wordmark as 'eduflickai' / 'Eduflick Ai' | "Write it 'eduflick AI' — lowercase eduflick, uppercase AI." |

---

## 9. Minimal end-to-end example (copy this shape)

> **System:** `<contents of prompts/00_SYSTEM_PROMPT.md>`
> **User:** `<contents of prompts/instagram-caption.md, FACTS filled>` + "Hook angle: 'I know
> React but never built with LLMs.' Pillar: Get Hired. Phase: Awareness."
> **Model →** 3 caption variants in the template.
> **User:** `<contents of QA_CHECKLIST.md>` + "Score each 0–100, fix any under 85."
> **Model →** scored + fixed.
> **You →** pick one, paste copy into the Instagram Kit canvas.

---

*Golden rule: the small model is a precise instrument, not a creative director. You bring the
strategy and the facts; it executes the template. Keep that division and small models punch far
above their price here.*
