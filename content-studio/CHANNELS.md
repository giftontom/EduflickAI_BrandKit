# Channel reference

Compact per-channel specs, cadence, and which design asset renders each. Cadence and phases come
from `../planning/Eduflick_AI_Social_Media_Campaign_Plan.md` (the 6-week, 3-phase Pioneer Cohort
sprint). The funnel: **Awareness → Free Masterclass (lead capture) → Seat booking → Close.**

> Sizes are for the **design** step. The **copy** step is the same on every channel — it's the
> voice in `BRAND_CHEATSHEET.md`. Only length, format, and CTA change per channel.

---

## Instagram — primary (reach + brand)
- **Roles:** Reels (project demos, "day in the cohort"), carousels (curriculum, offer, objections),
  Stories (countdown, polls, seat tracker).
- **Sizes:** feed square **1080×1080**, portrait/carousel **1080×1350 (4:5)**, story/reel **1080×1920 (9:16)**.
- **Caption shape:** strong first line (hook — the feed truncates ~125 chars), 2–4 short lines,
  one CTA, 3–6 hashtags. → `prompts/instagram-caption.md`.
- **Carousel shape:** 5–8 slides; slide 1 = hook, last = CTA; one idea per slide. →
  `prompts/instagram-carousel.md`.
- **Renders with:** `../design-system/collateral/Eduflick Instagram Kit.html` (feed/carousel/story
  canvases + the 9-up launch grid).
- **Launch grid:** the complete 12-tile mural launch plan (architecture, posting waves, safe zones,
  and every post + carousel slide) is in `INSTAGRAM_LAUNCH_PLAN.md`; brand/pitch context in
  `EDUFLICK_AI_PLAYBOOK.md` §3; assembled preview in
  `../design-system/collateral/Eduflick Launch Grid.html`.

## LinkedIn — primary (credibility + hiring narrative)
- **Roles:** founder POV posts ("why we capped Cohort 1 at 20"), curriculum breakdowns, the
  Technopark placement angle, real job-listing screenshots.
- **Shape:** strong first 1–2 lines (LinkedIn truncates at "…see more"), short paragraphs / line
  breaks, a point of view, soft CTA. Longer + more narrative than IG; still no hype, no emoji.
- **Tone tilt:** slightly more first-person founder voice; proof and POV over scarcity.
- **Renders with:** native text post; document/carousel via the Brochure/Slides kits if needed.
- **Prompt:** `prompts/linkedin-post.md`.

## WhatsApp — conversion engine
- **Roles:** masterclass reminders, seat-booking nudges, 1:1 closing. This is where leads convert.
- **Shape:** very short, personal, one ask per message, sent as a human would type. Mono labels
  and headline-casing are relaxed here — it's a chat, not a canvas — but the voice (calm, concrete,
  no hype, no emoji spam) holds. A single tasteful symbol is tolerable; keep it rare.
- **The sequence:** confirm → remind → attend → offer → scarcity → close (5–6 messages).
- **Prompt:** `prompts/whatsapp-sequence.md`.

## YouTube Shorts — proof
- **Roles:** capstone walkthroughs, student build clips, "what is RAG in 60s."
- **Shape:** 9:16, ≤60s, same script discipline as a Reel; title + first line carry it.
- **Renders with:** reuse Reel scripts. → `prompts/reel-script.md` (set platform = Shorts).

## Meta / Instagram Ads — paid acceleration
- **Roles:** lead-gen → Masterclass; retargeting → seat booking. Geo: 10 km of Technopark, age
  21–28, interests software dev / AI / Next.js / B.Tech / job-search.
- **Shape:** primary text (pain hook → promise → proof → CTA), 3–5 short **headline** variants,
  1–2 **description** lines. Primary CTA: **"Register Free →"** (masterclass) early; shift to
  booking CTAs in Phase 3.
- **Creative:** 3–4 Reel-style video ads (pain hook) + 2 static (offer / scarcity).
- **Prompt:** `prompts/ad-copy.md`.

---

## Cadence at a glance (6-week sprint)

| Phase | Weeks | Goal | Content emphasis |
| --- | --- | --- | --- |
| **1 · Awareness & list-building** | 1–2 | Build audience + collect masterclass regs | Reels + carousels on the pain/promise; **masterclass announcement** Fri; LinkedIn founder + curriculum posts. |
| **2 · Consideration & masterclass push** | 3–4 | Max masterclass attendance; seed the offer | Daily Stories countdown; "what you build in week 4/8/11" reels; Technopark hiring angle; **run the masterclass, record it**; ₹49K vs ₹70K carousel. |
| **3 · Conversion & scarcity close** | 5–6 | Convert attendees → bookings; sell out | Live "X of 20 seats left" graphics; masterclass highlight reels; objection-handler carousels; WhatsApp 1:1 close; final-48h urgency; sold-out + Cohort 2 waitlist. |

**Weekly default mix** (Phase 1 template from the plan): Mon Reel · Tue LinkedIn founder · Wed
carousel ("2026 AI engineer stack") · Thu Reel ("theory vs shipping") · Fri masterclass announcement
(all + WhatsApp) · Sat Stories poll/countdown · Sun LinkedIn curriculum carousel.

**Match CTA to phase:** Awareness → "follow / save / register free." Consideration → "register for
the free masterclass." Conversion → "book your seat — X of 20 left, closes [[DATE]]."

---

## Asset → prompt → render map

| You want… | Prompt file | Render with |
| --- | --- | --- |
| IG/Reel caption | `instagram-caption.md` | Instagram Kit |
| Carousel (curriculum/offer/objection) | `instagram-carousel.md` | Instagram Kit |
| Reel / Shorts script | `reel-script.md` | shoot; cover via Instagram Kit story canvas |
| LinkedIn post | `linkedin-post.md` | native / Slides / Brochure Kit |
| WhatsApp nurture flow | `whatsapp-sequence.md` | send as text |
| Meta/IG ad set | `ad-copy.md` | Instagram Kit (static) / video |
| A week / repurpose a recording | `repurpose-batch.md` | Content Calendar + kits |
| A brochure / poster / one-pager | (write copy with the cheat sheet) | `Eduflick Brochure Kit.html`, `../brochures/` |
| A deck | (write copy with the cheat sheet) | `../design-system/slides/` |
