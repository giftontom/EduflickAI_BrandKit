# Prompt — <content type>

> Copy this into `content-studio/prompts/<name>.md`. Pair with
> `prompts/00_SYSTEM_PROMPT.md` (loaded once per session). See `content-studio/README.md`.

**Produces:** <e.g. a 6-slide carousel + caption> · **Channel:** <IG / LinkedIn / …>

## FACTS (fill before generating — from `content-studio/FACTS.md`)

```text
PROGRAM      = [[…]]
MASTERCLASS  = [[date / link]]
PRICE        = [[…]]
SEATS        = [[… of …]]
APPLY / LINK = [[…]]
```

> Any value not in FACTS.md → output `[[PLACEHOLDER]]`, do not guess.

## Task

<One precise instruction. State the structure (hook → body → CTA → hashtags) and limits
(word/char counts) explicitly so a small model stays in bounds.>

## Voice

Confident, technical, no fluff. Short declaratives. Own the word "flick". **No emoji.**
Numbers as proof. Forbidden: "level up / unlock / claim reward / boost".

## Few-shot (1–2 on-brand examples)

✗ <off-brand before> → ✓ <on-brand after>

## Output format

<Exact shape to return — e.g. `SLIDE 1: …` / `CAPTION: …` / `HASHTAGS: …`>

## Done when

- [ ] No invented facts (placeholders where unknown)
- [ ] `content-studio/QA_CHECKLIST.md` passes
