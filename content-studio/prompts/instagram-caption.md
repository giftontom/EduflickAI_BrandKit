# Prompt — Instagram / Reel caption

Load `00_SYSTEM_PROMPT.md` as the system message first. Then paste the box below as the user
message, with the FACTS block filled and the TASK line set.

---

```text
FACTS (only source of live numbers — never invent; missing → [[NEEDS: …]]):
- Today's date:          [[ ]]
- Masterclass date/time: [[ ]]   Format: [[free, live, ~90 min, online/in-person]]
- Registration link:     [[ ]]
- Seats total / left:    [[20 / __ ]]
- Early Bird price:         [[₹49,000]]   Retail: [[₹70,000]]
- Cohort start:          [[ ]]   Duration: [[12 weeks]]
- Venue:                 [[UXP Innovation Hub, Trivandrum]]
- WhatsApp / link in bio: [[ ]]

TASK:
- Write [[3]] Instagram caption variants for: [[describe the post / its visual]].
- Hook angle: [[e.g. "I know React but never built with LLMs"]]
- Content pillar: [[Build in Public | Get Hired | Learn Fast | The Cohort | Early Bird]]
- Funnel phase: [[Awareness | Consideration | Conversion]]
- Goal / CTA intent: [[e.g. register for free masterclass | book a seat | save+follow]]

CONSTRAINTS (in priority order):
1. First line is the HOOK — must land in ~125 characters (the feed truncates). No throat-clearing.
2. 2–4 short body lines after. Voice = engineer, not marketer. Numbers as proof.
3. Exactly ONE CTA, matched to the funnel phase, using a real link/handle from FACTS (or [[NEEDS]]).
4. Exactly one serif-accent word in the hook, marked with *asterisks*.
5. 3–6 precise hashtags from: #TrivandrumTech #Trivandrum #Kerala #AIEngineer #FullStackAI
   #LearnAI #RAG #LLM #NextJS #BuildInPublic #TechJobsKerala #CareerInAI. No grind/motivation tags.
6. No emoji. No forbidden words. Lowercase is fine for the hook; sentence case for body.

OUTPUT (exactly this, nothing else):
--- VARIANT 1 ---
Hook:
Body:
CTA:
Hashtags:
--- VARIANT 2 ---
...
--- VARIANT 3 ---
...
```

---

## Few-shot — the bar

**✓ Good (Awareness · Get Hired):**
> **Hook:** you know react. you've *never* shipped with an LLM.
> **Body:** that gap is why "AI experience required" keeps closing doors. in 12 weeks, in-person in Trivandrum, you build 3 real ones — a SaaS dashboard, a RAG chatbot, an agentic platform. deployed. on your résumé.
> **CTA:** free technical masterclass first. register → [[link]]
> **Hashtags:** #AIEngineer #FullStackAI #TrivandrumTech #BuildInPublic #CareerInAI

**✓ Good (Conversion · Early Bird):**
<!-- markdownlint-disable MD050 -->
> **Hook:** cohort 01: ₹49K, not *₹70K*.
> **Body:** early bird price for the first 20 seats. in-person, Trivandrum. 12 weeks to 3 deployed AI projects. [[__]] of 20 left.
> **CTA:** book your seat — only [[__]] of 20 left. apply → eduflickai.com/apply
> **Hashtags:** #FullStackAI #TrivandrumTech #AIEngineer #TechJobsKerala
<!-- markdownlint-enable MD050 -->

**✗ Bad (why):** "🚀 Ready to LEVEL UP your AI career?! Our world-class bootcamp will supercharge
your skills! Don't miss out!! 🔥 #ai #coding #motivation #grind #success" — emoji, hype, forbidden
words ("level up", "supercharge", "world-class", "don't miss out"), no proof number, grind tags.
