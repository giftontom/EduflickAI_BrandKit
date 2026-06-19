# Prompt — Meta / Instagram ad copy

Load `00_SYSTEM_PROMPT.md` first. Paid splits into two jobs: **lead-gen** (cold → apply)
and **retargeting** (warm → seat booking). Output is a full ad set: primary text, headline
variants, descriptions, and the CTA button — ready to paste into Ads Manager.

---

```text
FACTS (only source of live numbers — never invent; missing → [[NEEDS: …]]):
- Cohort start / seats left:  [[ ]]
- Apply link:                 [[eduflickai.com/apply]]
- Price / retail / venue:                         [[₹49,000 / ₹70,000 / Trivandrum]]

TASK:
- Objective: [[Lead-gen → apply (eduflickai.com/apply) | Retargeting → seat booking]]
- Audience: [[cold: 10km of central Trivandrum, 21–28, software/AI/Next.js/B.Tech/job-search
  | warm: 50%+ video viewers / profile visitors / did not apply yet]]
- Pain hook to lead with: [[e.g. "AI experience required — you have none"]]
- Funnel phase: [[ ]]   Number of variants: [[3 primary texts, 4 headlines, 2 descriptions]]

CONSTRAINTS (priority order):
1. Primary text structure: PAIN hook (line 1) → PROMISE → PROOF (a number) → ONE CTA. ≤ 90 words.
2. Headlines ≤ 40 chars, punchy, lowercase, ideally a number. Descriptions ≤ 30 chars.
3. CTA button: lead-gen → "Apply Now" / "Learn More" (copy says "apply →"); retargeting →
   "Book Now" (copy says "book your seat →"). Use a real link from FACTS.
4. Engineer voice, numbers as proof, no emoji, no forbidden words, no exclamation hype.
5. Each primary-text variant should test a different angle (pain / proof / scarcity).
6. Compliance: no income/job guarantees. Say "hire-ready", "recruiter networking", "mock
   interviews" — never "guaranteed job/placement".

OUTPUT (exactly this):
=== PRIMARY TEXT ===
A) (pain angle)
B) (proof angle)
C) (scarcity angle)
=== HEADLINES (≤40 chars) ===
1) 2) 3) 4)
=== DESCRIPTIONS (≤30 chars) ===
1) 2)
=== CTA BUTTON ===  [Sign Up | Learn More | Book Now]
=== LINK ===  [[from FACTS]]
```

---

## Few-shot — lead-gen, cold audience, Awareness

> **=== PRIMARY TEXT ===**
> A) "AI experience required." you have none. that's the gap. in 12 weeks, in-person in Trivandrum, you ship 3 deployed AI projects — a SaaS dashboard, a RAG chatbot, an agentic platform. selective intake, 20 seats. apply →
> B) you know react. you've never shipped with an LLM. our cohort fixes that: 3 deployed projects, the real stack (next.js, claude, pinecone, langchain), capped at 20, in-person in Trivandrum. apply now →
> C) 20 seats. in-person. Trivandrum. the pioneer cohort builds 3 real AI products in 12 weeks at ₹49K (₹70K from the next batch). selective intake — apply before seats are gone. apply →
>
> **=== HEADLINES ===**
>
> 1) ship AI products, not theory
> 2) build 3 AI projects in 12 weeks
> 3) the AI engineer stack, in-person
> 4) apply now · pioneer cohort · Trivandrum
>
> **=== DESCRIPTIONS ===**
>
> 1) capped at 20 · Trivandrum
> 2) pioneer cohort · ₹49K
>
> **=== CTA BUTTON ===** Apply Now
> **=== LINK ===** [[link]]

**✗ Avoid:** "Guaranteed placement!", "🚀 Transform your career!", "world-class", any made-up
date/price, headlines over 40 chars.
