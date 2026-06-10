# Prompt — Instagram carousel (slide-by-slide)

Load `00_SYSTEM_PROMPT.md` first. Carousels are the workhorse for curriculum, the ₹49K-vs-₹70K
offer, and objection-handlers. One idea per slide; the model writes copy only — the Instagram Kit
renders it.

---

```text
FACTS (only source of live numbers — never invent; missing → [[NEEDS: …]]):
- Today's date / masterclass date / cohort start: [[ ]]
- Registration link / WhatsApp:                    [[ ]]
- Seats total / left:                              [[20 / __ ]]
- Pioneer price / Retail:                          [[₹49,000 / ₹70,000]]
- Booking structure:                               [[₹15,000 + ₹17,000 + ₹17,000]]
- Venue:                                           [[UXP Innovation Hub, Trivandrum]]

TASK:
- Carousel topic: [[e.g. "the 2026 AI engineer stack" | "₹49K vs ₹70K — what Pioneer means"
  | "month 1/2/3 curriculum" | objection: "is ₹49K worth it?"]]
- Slide count: [[6]] (range 5–8; slide 1 = hook cover, last = CTA)
- Content pillar: [[ ]]    Funnel phase: [[ ]]

CONSTRAINTS (priority order):
1. ONE idea per slide. Each slide = a short headline (lowercase, ≤7 words) + ≤22 words of support.
2. Slide 1 is a scroll-stopping COVER: the hook + a "swipe" cue. Last slide is the CTA (one ask).
3. Build a narrative arc across slides (problem → proof → payoff), not a list of features.
4. One serif-accent word (in *asterisks*) on the cover and on the CTA slide only.
5. Each slide also gets a UPPERCASE mono "eyebrow" label (e.g. "01 · THE GAP", "STACK 03").
6. Numbers as proof on every middle slide where possible. No emoji. No forbidden words.
7. After the slides, give ONE matching feed caption (hook + 2 lines + CTA + 3–5 hashtags).

OUTPUT (exactly this):
=== SLIDE 1 (COVER) ===
Eyebrow:  [UPPERCASE mono]
Headline: [lowercase, one *serif* word]
Support:  [≤22 words]
Cue:      swipe →
=== SLIDE 2 ===
Eyebrow / Headline / Support
... (through final slide)
=== SLIDE N (CTA) ===
Eyebrow / Headline (one *serif* word) / Support / CTA + link from FACTS
=== CAPTION ===
Hook / Body / CTA / Hashtags
```

---

## Few-shot — abbreviated "the 2026 AI engineer stack" cover + one middle + CTA

> **=== SLIDE 1 (COVER) ===**
> Eyebrow: THE 2026 AI ENGINEER STACK
> Headline: the tools that *actually* get you hired
> Support: not theory. the exact stack you'll ship 3 projects on in 12 weeks.
> Cue: swipe →
>
> **=== SLIDE 4 ===**
> Eyebrow: STACK 03 · RETRIEVAL
> Headline: rag, with a real vector db
> Support: pinecone + langchain. you'll build a chatbot that answers from your own docs. deployed.
>
> **=== SLIDE 6 (CTA) ===**
> Eyebrow: PIONEER COHORT 01
> Headline: learn it *in-person* at uxp innovation hub
> Support: capped at 20 seats. ₹49K founding price. free masterclass first.
> CTA: register free → [[link]]

**✗ Avoid:** slides that are a bullet dump of 10 tools, Title Case headlines, "🔥 swipe to find
out!", or a cover that buries the hook below a logo.
