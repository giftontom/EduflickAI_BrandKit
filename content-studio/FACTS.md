# Eduflick AI — Live Facts (single source of truth)

> **⚠️ This is the canonical FACTS file.** Every prompt, every artifact, every
> visual typesetting must pull live values from here — not from memory, not from
> a stale copy in a prompt template. Update this file first, then use its values.
>
> **Last updated:** 2026-06-22

---

## Program facts (stable — verify quarterly)

| Fact | Value |
| --- | --- |
| Program name | Full-Stack AI Engineer Program |
| ↳ Note | No certification claim — the program name never includes "Certified"; deliverable is the 3-project portfolio, not a certificate. |
| Cohort | Cohort 01 |
| Format | In-person, offline |
| Venue | UXP Innovation Hub, Trivandrum |
| Duration | 12 weeks (~3 months) |
| Seat cap | 20 (selective intake) |
| Projects built | 3 deployed — SaaS dashboard, RAG chatbot, agentic platform |
| Tech stack | Cursor, Next.js, Claude/OpenAI, Pinecone, LangChain, n8n |
| Week 12 | Mock interviews + recruiter networking with industry HR |
| Operator | Tomatrix Technologies Pvt Ltd |

## Pricing (stable for Cohort 01)

| Fact | Value |
| --- | --- |
| Early Bird price | ₹49,000 |
| Early Bird Discount | ₹49,000 for the first 20 to register — saves ₹21,000 vs the ₹70,000 regular price |
| Regular price (from Cohort 2) | ₹70,000 |
| Reservation deposit | ₹5,000 to reserve a seat |
| Booking (Payment 1) | ₹15,000 total — the ₹5,000 reservation + ₹10,000 joining |
| Payment 2 | ₹17,000 |
| Payment 3 | ₹17,000 |
| Payment structure copy | Reserve with ₹5,000 · ₹15,000 booking, then ₹17,000 + ₹17,000 (₹49,000 total) |

## Top of funnel

| Fact | Value |
| --- | --- |
| Funnel | Apply-direct — every CTA points to eduflickai.com/apply |
| Primary CTA | "Apply →" |
| Note | The masterclass offering was retired (2026-06-11); the funnel is now apply-direct — no lead-magnet step, every CTA points to eduflickai.com/apply. |

---

## Live values (update per cohort — these CHANGE)

| Fact | Value | Last set |
| --- | --- | --- |
| Today's date | 2026-06-22 | |
| Cohort start date | [[NOT SET — e.g. 6 Jul 2026]] | |
| Applications close | [[no close date]] | |
| Seats remaining | [[20 of 20]] | |
| Seats total | 20 | |

---

## Links & contact

| Fact | Value |
| --- | --- |
| Website | eduflickai.com |
| Apply | eduflickai.com/apply |
| Phone / WhatsApp | +91 92078 94926 |
| WhatsApp link | wa.me/919207894926 |
| Email | <info@eduflickai.com> |
| Instagram handle | @eduflick.ai |
| Instagram URL | <https://instagram.com/eduflick.ai> |

---

## Audience (stable)

| Segment | Description |
| --- | --- |
| Primary | B.Tech graduates (2024–2026) who can code but feel "AI-left-behind" |
| Primary | Junior devs (0–2 yrs) in/around Trivandrum |
| Secondary | Parents (for the ₹49K investment conversation) |

**Their words (use as hooks):**

- "I know React but I've never built anything with LLMs."
- "Job postings all want 'AI experience' — I have none."
- "Online courses are just videos. I never finish them."

---

## Corporate AI training (Tomatrix) — B2B offering

> A **separate offering from the Full-Stack AI Engineer Program.** This one is sold to
> companies, led by the **Tomatrix Technologies** brand, with Eduflick AI credited as the
> training & academy arm. Artifact: `brochures/Tomatrix_Corporate_AI_Training_Brochure.html`.
>
> ⚠️ Do not describe this offering with the retired "Enterprise&nbsp;Solutions" wording
> (see `brand.config.json → facts.retiredStrings`) — `check-facts.mjs` fails CI on it.
> Use "Corporate AI Training".

| Fact | Value |
| --- | --- |
| Offering name | Corporate AI Training |
| Lead brand | Tomatrix Technologies Pvt Ltd |
| Delivery | Live, person-to-person — on-site at the client or virtual |
| Curriculum | Custom-built per client; no pre-recorded modules |
| Mentors | Active AI engineers who build client software |
| Cohort size | Any scale |
| Pricing | Not published — consultative; the brochure carries no price |
| Primary CTA | "book a discovery call →" |

**Role tracks (5):** Human Resources & Admin · Sales & Marketing · Finance & Operations ·
Software & Engineering · C-Suite & Management

**Customization process (3 steps):** Deep-Dive Requirement Gathering → Custom Curriculum
Engineering → Live Training & Active Mentoring

**Engagement models (3):** Sprint Workshops (half-day → multi-day) · Weekly Mentorship
Cycles (multi-week) · Continuous Enablement (ongoing support)

### Corporate contact — pending

The brochure currently typesets the canonical Eduflick contacts below as a stand-in.
Replace all three in one edit once Tomatrix-specific details are confirmed.

| Fact | Value in the brochure today | Target |
| --- | --- | --- |
| Email | <info@eduflickai.com> | [[NEEDS: Tomatrix corporate enquiry email]] |
| Phone | +91 92078 94926 | [[NEEDS: Tomatrix corporate phone]] |
| Website | eduflickai.com | [[NEEDS: Tomatrix corporate domain]] |

---

## Hashtag pool (stable)

3–6 per post, mix geo + topic + intent:

`#TrivandrumTech #Trivandrum #Kerala #AIEngineer #FullStackAI #LearnAI #RAG #LLM #NextJS #BuildInPublic #TechJobsKerala #CareerInAI`

---

## Usage

**In prompts:** Reference this file. The old inline FACTS blocks in each prompt
template still work for standalone use but should be synced from here.

**In visuals:** Any date, price, seat count, or link typeset into a canvas must
come from this file. If a value reads `[[NOT SET]]` or `[[NEEDS …]]`, typeset
that exact placeholder — do not guess.

**Update workflow:**

1. Change the value in this file.
2. Regenerate any copy/visual that uses the old value.
3. Re-export affected PNGs.

---

*Eduflick AI · a Tomatrix Technologies venture · one truth, one file.*
