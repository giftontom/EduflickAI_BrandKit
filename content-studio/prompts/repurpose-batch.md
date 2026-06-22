# Prompt — repurpose & batch (one source → many assets / a week in one pass)

Load `00_SYSTEM_PROMPT.md` first. This is the highest-leverage prompt in the sprint: it turns one
source (a masterclass recording, a student demo, a curriculum doc) into a coordinated set of
assets, OR plans a full week. It produces a **brief + the copy for each asset** in one structured
output. (For long individual assets, then run the dedicated prompt per item — see
`SMALL_MODELS_GUIDE.md` §7 on batching by type.)

---

```text
FACTS (only source of live numbers — never invent; missing → [[NEEDS: …]]):
- Today's date / current week of the 6-week sprint: [[ ]]   Funnel phase: [[1 Awareness | 2 Consideration | 3 Conversion]]
- Masterclass date / cohort start / seats left:      [[ ]]
- Registration link / WhatsApp:                       [[ ]]
- Price / retail / venue:                              [[₹49,000 / ₹70,000 / Trivandrum]]

TASK — pick ONE mode:
- MODE A · REPURPOSE: source = [[e.g. "this masterclass recording" / paste notes / a demo]].
  Produce: [[1 carousel + 3 reels + 2 captions + 1 LinkedIn post]] from it.
- MODE B · WEEK PLAN: plan [[7]] posts for week [[__]] (phase above). For each day, give platform,
  pillar, format, hook line, and a one-line brief. Then write the copy for the [[2]] highest-priority ones.

CONSTRAINTS (priority order):
1. Every asset ladders to ONE pillar (Build in Public / Get Hired / Learn Fast / The Cohort /
   Early Bird) and matches the funnel phase's CTA (awareness→register free; conversion→book seat).
2. Don't repeat the same hook across assets — vary the angle (pain / proof / scarcity / how-it-works).
3. Keep each asset's copy in its channel's shape (caption = hook+2-4 lines+CTA+tags; carousel =
   5-8 one-idea slides; reel = hook+beats+CTA; LinkedIn = hook+short paras+CTA).
4. Numbers as proof everywhere. No emoji. No forbidden words. No invented facts.
5. End with a BATCH QA line: confirm no emoji, no forbidden words, no invented facts across the set.

OUTPUT (exactly this):
=== PLAN ===
| # | day/slot | platform | pillar | format | hook line | brief |
(one row per asset)
=== COPY ===
--- ASSET 1: [type] ---
   (full copy in that asset's format)
--- ASSET 2: [type] ---
   ...
=== BATCH QA ===
no emoji: ✔/✗ | no forbidden words: ✔/✗ | no invented facts (all live numbers from FACTS): ✔/✗
```

---

## Few-shot — Mode B, week plan skeleton (Phase 1, Awareness)

> **=== PLAN ===**
>
> | # | day | platform | pillar | format | hook line | brief |
> |---|-----|----------|--------|--------|-----------|-------|
> | 1 | Mon | IG Reel | Build in Public | reel | "you don't need another *course*. you need a deploy." | week-8 RAG chatbot demo, fast cuts |
> | 2 | Tue | LinkedIn | The Cohort | post | "we turned away revenue to cap cohort 1 at 20." | founder POV on in-person + accountability |
> | 3 | Wed | IG | Learn Fast | carousel | "the 2026 AI engineer *stack*" | cursor → next.js → rag → agents, 6 slides |
> | 4 | Thu | IG Reel | Get Hired | reel | "‘AI experience required.’ you have none." | theory vs shipping intercut |
> | 5 | Fri | All + WhatsApp | Early Bird | announcement | "free technical masterclass — build an AI app live." | masterclass announce, register CTA |
> | 6 | Sat | IG Stories | Learn Fast | poll | "can you build with LLMs? yes / not yet" | countdown + poll sticker |
> | 7 | Sun | LinkedIn | Get Hired | carousel | "month 1 / 2 / 3, what you actually build" | curriculum breakdown |
>
> **=== COPY ===** (then full copy for the 2 priority assets, in their formats)
> **=== BATCH QA ===** no emoji: ✔ | no forbidden words: ✔ | no invented facts: ✔

*(Pulls directly from the campaign plan's Phase-1 weekly template; adjust per the live phase.)*
