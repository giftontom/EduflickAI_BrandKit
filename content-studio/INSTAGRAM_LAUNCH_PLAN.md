# Eduflick AI — Instagram Launch Grid: The Complete Plan

*A venture of Tomatrix Technologies Private Limited*
**Web:** eduflickai.com · **Email:** info@eduflickai.com · **Instagram:** @eduflick.ai

> One self-contained execution plan for the launch grid: strategy, grid architecture, posting
> schedule, safe-zone spec, brand rules, and the **full copy for all 12 posts** (every carousel
> slide + every caption). Render assets live in `../design-system/collateral/`. Brand identity +
> pitch deck context: `EDUFLICK_AI_PLAYBOOK.md`.

---

## 1. Objectives & big idea

A single, deliberately-composed Instagram profile grid of **12 tiles (3×4)** built as **two
continuous indigo-gradient murals**:

1. **Brand reveal / awareness** — the bottom **3×3 (9 tiles)** is one indigo image that introduces
   Eduflick AI's identity, mission, and value proposition.
2. **Course launch** — the **top row (3 tiles)** is a second indigo image that launches the
   **Full-Stack AI Engineer Program — Pioneer Cohort 01** (offline) and drives registrations.

The four "major" posts are **carousels** (multi-image) that tell the full story; the other eight
are single-image mural slices.

---

## 2. Grid architecture

```
ROW 1  TOP    │ TL │ TC │ TR │  ← COURSE mural — one indigo image split 3 ways (posted last)
ROW 2  UPPER  │ UL │ UC │ UR │
ROW 3  MID    │ ML │ MC │ MR │  ← BRAND mural — one indigo image split 9 ways (posted first)
ROW 4  BOTTOM │ BL │ BC │ BR │
```

- **Tile size:** 1080×1350 px (4:5) each.
- **Mural masters (build first, then slice):** brand ≈ **3240×4050** → 9 × 1080×1350; course
  ≈ **3240×1350** → 3 × 1080×1350.
- **Continuity:** the indigo gradient + faint dot grid bleed across seams so each mural reads as
  one picture. **No word, logo, or focal element straddles a seam.**
- **Gradients (one hue only):** brand mural = `radial-gradient(150% 120% at 0% 0%, #5B5BF0,
  #3A2BB8 40%, #0B0822)` (brightest at the UL corner); course mural =
  `radial-gradient(120% 240% at 50% 0%, #5B5BF0, #3A2BB8 42%, #0B0822)` (brightest at center, TC).

---

## 3. Posting plan (waves & fill logic)

Instagram stacks the **newest post at top-left**, so a designed grid is posted **in reverse**, and
a mural must go up **one full row per session** (so it never sits broken mid-row). Post each row
**right → center → left**; post rows **bottom → top**. This naturally reveals the brand mural
3 → 6 → 9, then the course mural completes it at 12.

| Wave | Session | Posts (in upload order, R→C→L) | Grid after |
|---|---|---|---|
| **1** | Day 1 | Post 1 (BR) → Post 2 (BC) → Post 3 (BL) | brand mural shows **3** |
| **2** | Day 2 | Post 4 (MR) → Post 5 (MC) → Post 6 (ML) | brand mural shows **6** |
| **3** | Day 3 | Post 7 (UR) → Post 8 (UC) → Post 9 (UL) | brand mural **complete (9)** |
| **4** | Launch day | Post 10 (TR) → Post 11 (TC) → Post 12 (TL) | grid **complete (12)** |

Cadence is flexible (waves can spread across weeks) **as long as each row's 3 tiles publish in one
session.** Result: the brand reveal fills the body; the course launch crowns the top as the
freshest thing a profile visitor sees.

---

## 4. Safe zone & cropping (every tile)

- Canvas 1080×1350. The new profile grid crops to **3:4** (≈34 px off each side — minor); the
  legacy square crop shows only the centered **1080×1080** (trims **135 px top & bottom** — the
  binding constraint).
- **Rule:** keep all critical content — headline, mark, CTA, intake/scarcity number, eyebrow —
  inside the **centered 1080×1080 safe square**: ≥135 px from top & bottom, ≥96 px sides. Nothing
  critical at the very top or bottom of the frame; nothing critical crossing a mural seam.

---

## 5. Brand & voice rules (condensed)

- **Color:** indigo only (`#5B5BF0`, accent `#8B97FF`, gradient `#3A2BB8→#0B0822`) + neutral
  (`#0A0B10` ink, `#F5F2EA` paper). No third hue. **Coral `#FF6E5A` only** on scarcity (Post 10).
- **Type:** Manrope (lowercase display, 800–900, ≥72 px headline on a 1080 canvas), Instrument
  Serif italic `#8B97FF` for **exactly one accent word** per headline/hook, JetBrains Mono
  UPPERCASE for eyebrows/labels/numbers.
- **Imagery:** no photography — the mark, data, and editorial type only.
- **Voice:** confident, technical, no fluff; numbers as proof; **no emoji**; no hype/forbidden
  words ("level up," "unlock," "supercharge," "world-class," "revolutionary," "don't miss out,"
  "hurry"); lowercase hooks; calm scarcity. Hook ≤125 chars · one CTA · 3–6 hashtags.

---

## 6. FACTS (single source of live values)

**Known constants — use as-is:**
- Course: Full-Stack AI Engineer Program, **Pioneer Cohort 01** (offline / in person)
- Price: **₹49,000** founding · **₹70,000** from Cohort 2
- Intake: **20 selective** seats · Duration: **12 weeks** · **3 deployed projects**
- Venue: **UXP Innovation Hub, Trivandrum**
- Stack: Cursor, Next.js, Claude/OpenAI, Pinecone, LangChain, n8n
- Lead step: free technical masterclass (~90 min, live, builds a real AI app)
- Web: **eduflickai.com** · Apply: **eduflickai.com/apply** · Masterclass:
  **eduflickai.com/masterclass** · Email: **info@eduflickai.com** · Handle: **@eduflick.ai**

**Fill before publishing:** exact masterclass date/time · cohort start date · live `[[seats left]]`
count for the scarcity post.

---

## 7. The 12 posts — full copy

Notation: `*word*` = the one Instrument-Serif italic accent word.

---

### BRAND MURAL · Wave 1 (bottom row)

#### Post 1 — BR · Day 1 · Single image · Brand / Awareness
- **Visual concept:** opener teaser. The mark (faint) with eyebrow `EDUFLICK AI`; small wordmark.
  Bottom-right corner of the brand mural (darkest part of the gradient).
- **Safe zone:** headline + wordmark centered in the safe square; nothing in the bottom 135 px.
- **On-image headline:** `a feed for *thinking*`
- **Caption**
  - **Hook:** your screen already owns your attention. what if it actually *taught* you?
  - **Body:** eduflick ai turns any lecture, paper, or video into sequenced micro-flicks. ai sets the order — you decide what's next. a venture of tomatrix technologies.
  - **CTA:** something new is coming. follow to watch it build → @eduflick.ai
  - **Hashtags:** #LearnAI #AIEngineer #Kerala #Trivandrum

#### Post 2 — BC · Day 1 · Single image · Brand / Awareness
- **Visual concept:** the unit promise. Big lowercase focal headline; mono support.
- **Safe zone:** single centered headline block.
- **On-image headline:** `one concept per *flick*`
- **Caption**
  - **Hook:** one concept. one flick. that's the *whole* unit.
  - **Body:** we call it a flick. 1 flick = 1 core concept. stack enough of them and a feed becomes a syllabus — without the doom-scroll.
  - **CTA:** save this. your feed is about to get smarter → @eduflick.ai
  - **Hashtags:** #LearnAI #AIEngineer #Trivandrum #Kerala

#### Post 3 — BL · Day 1 · Carousel (major) · Brand / Awareness
- **Visual concept:** brand-story carousel; cover = the mural's bottom-left slice. Carousel marker
  top-right.
- **Safe zone:** cover headline centered; each slide keeps text in the safe square.
- **On-cover headline:** `what is *eduflick ai*?`
- **Slides**
  1. **Cover** — `WHAT IS EDUFLICK AI` / **what is *eduflick ai*?** / the end of empty scrolling. learning, rebuilt as a feed. / swipe →
  2. `01 · THE PROBLEM` / **you scroll for hours** / short video is the most engaging format ever built. it just never taught you anything.
  3. `02 · THE IDEA` / **so we kept the feed** / same pull-to-refresh, same one-thumb flow — pointed at things worth knowing.
  4. `03 · THE UNIT` / **1 flick = 1 concept** / any lecture, paper, or video, cut into a sequence of bite-sized flicks.
  5. `04 · THE AI` / **ai sequences. you decide.** / it orders your next flicks; you choose the path. you stay in flow, not in a rabbit hole.
  6. **CTA** — `EDUFLICK AI` / **a feed for *thinking*** / a venture of tomatrix technologies. this is the start. / follow → @eduflick.ai
- **Caption**
  - **Hook:** we kept everything addictive about your feed — and *deleted* the part that wastes you.
  - **Body:** eduflick ai cuts any source into bite-sized flicks. ai sets the sequence, you pick the path. learning that survives the scroll.
  - **CTA:** follow to see what we're building → @eduflick.ai
  - **Hashtags:** #LearnAI #AIEngineer #Trivandrum #Kerala

---

### BRAND MURAL · Wave 2 (middle row)

#### Post 4 — MR · Day 2 · Single image · Brand / Awareness
- **Visual concept:** positioning statement; editorial type, generous negative space.
- **On-image headline:** `the *doom-scroll* antidote`
- **Caption**
  - **Hook:** same feed. same bite-sized hits. except you walk away *sharper*.
  - **Body:** eduflick ai sequences micro-lessons so curiosity compounds instead of evaporating. learning built for the way you already consume.
  - **CTA:** follow → @eduflick.ai
  - **Hashtags:** #LearnAI #AIEngineer #Kerala #Trivandrum

#### Post 5 — MC · Day 2 · Single image · Brand / Awareness (the mark)
- **Visual concept:** the **identity centerpiece** — the mark, large, paper-fill, with indigo glow,
  dead-center of the 3×3 mural. Small caption headline beneath.
- **Safe zone:** mark + line centered; the glow may extend but the mark stays inside the safe square.
- **On-image headline:** `one shape, one *notch*`
- **Caption**
  - **Hook:** a square with a single *notch* bitten out. that's us.
  - **Body:** the notch is the play — the moment a lesson begins. one shape, one notch. our whole identity in a single geometry.
  - **CTA:** follow → @eduflick.ai
  - **Hashtags:** #LearnAI #AIEngineer #Trivandrum

#### Post 6 — ML · Day 2 · Carousel (major) · Brand · Learn-Fast / Awareness
- **Visual concept:** "how it works" carousel; cover = mural mid-left slice. Carousel marker.
- **On-cover headline:** `the *flick* is the unit`
- **Slides**
  1. **Cover** — `HOW IT WORKS` / **the *flick* is the unit** / how a dense paper becomes a feed you actually finish. / swipe →
  2. `01 · CUT` / **drop in any source** / a 2-hour lecture, a dense paper, a youtube deep-dive. anything.
  3. `02 · SEQUENCE` / **ai slices it into micro-lessons** / one concept per flick, ordered so each builds on the last.
  4. `03 · FLOW` / **flick through, stay in flow** / one thumb, no massive time commitment. learn in the gaps of your day.
  5. `04 · SPARKS` / **earn a spark** / streaks and sparks mark what you've understood — not what you've "watched."
  6. **CTA** — `EDUFLICK AI` / **learn anything in *micro-steps*** / the feed for thinking. / follow → @eduflick.ai
- **Caption**
  - **Hook:** drop in a 2-hour lecture. get back micro-flicks you'll *actually* finish.
  - **Body:** ai cuts and sequences; you flick through in flow. one concept at a time, sparks for what sticks.
  - **CTA:** follow to try it first → @eduflick.ai
  - **Hashtags:** #LearnAI #AIEngineer #Kerala #Trivandrum

---

### BRAND MURAL · Wave 3 (upper row)

#### Post 7 — UR · Day 3 · Single image · Brand / Awareness
- **Visual concept:** awareness hook; contrast with the doom-scroll. Bright part of the gradient.
- **On-image headline:** `your feed, but it makes you *smarter*`
- **Caption**
  - **Hook:** what if the next hour of scrolling left you *better* at your job?
  - **Body:** that's the whole bet. eduflick ai swaps empty scroll for sequenced micro-lessons on things worth knowing.
  - **CTA:** follow → @eduflick.ai
  - **Hashtags:** #LearnAI #AIEngineer #CareerInAI #Trivandrum

#### Post 8 — UC · Day 3 · Carousel (major) · Brand / Awareness
- **Visual concept:** the vision carousel; cover = mural upper-center slice. Carousel marker.
- **On-cover headline:** `why we *built* eduflick`
- **Slides**
  1. **Cover** — `THE VISION` / **why we *built* eduflick** / a venture of tomatrix technologies. here's the gap we saw. / swipe →
  2. `01 · THE GAP` / **courses don't get finished** / online completion rates are brutal. videos pile up; skills don't.
  3. `02 · THE SHIFT` / **attention moved to the feed** / so learning has to live there too — bite-sized, sequenced, in the flow of a normal day.
  4. `03 · THE PRODUCT` / **a feed for thinking** / ai-sequenced micro-flicks from any source. curiosity that actually compounds.
  5. `04 · AND IN PERSON` / **we don't just teach it — we *ship* it** / we also train engineers to build this kind of ai. offline, hands-on, in trivandrum.
  6. **CTA** — `WHAT'S NEXT` / **stay *close*** / the feed is coming. so is something for builders. / follow → @eduflick.ai
- **Caption**
  - **Hook:** we built eduflick because we were *tired* of courses nobody finishes.
  - **Body:** a venture of tomatrix technologies. learning rebuilt as an ai-sequenced feed — and an academy that trains engineers to build exactly this.
  - **CTA:** follow → something for builders drops next → @eduflick.ai
  - **Hashtags:** #LearnAI #AIEngineer #BuildInPublic #Trivandrum

#### Post 9 — UL · Day 3 · Single image · Brand → Program / Awareness (bridge)
- **Visual concept:** the bridge tile, directly under the course row; eyebrow `NEXT: THE PROGRAM`.
  Brightest corner of the brand mural — visually leads the eye up into the launch.
- **On-image:** eyebrow `NEXT: THE PROGRAM` · headline `we don't just teach it — we *ship* it`
- **Caption**
  - **Hook:** we don't just build ai products. we build the engineers who *ship* them.
  - **Body:** the same philosophy behind our app drives our academy: no wasted time, just applied learning. an offline, hands-on program in trivandrum that turns "i know react" into "i ship ai."
  - **CTA:** follow — the reveal drops next → @eduflick.ai
  - **Hashtags:** #AIEngineer #FullStackAI #TrivandrumTech #CareerInAI

---

### COURSE MURAL · Wave 4 (top row · launch day)

> **Course name leads (this wave).** The program name **`full-stack ai engineer`** is the
> hero headline on the launch tile (Post 12) and the carousel cover (Post 11), and the legible
> eyebrow on Post 10 — so a scroller understands what this is at a glance. The `eduflick AI`
> wordmark is demoted to the footer/brand line, never the hero.
>
> **Funnel priority (this wave): apply-first.** The primary CTA across all three tiles is
> `apply → eduflickai.com/apply`. The free masterclass is the *soft secondary* only (a muted
> second line on the carousel CTA slide). Seat count is **FACTS-driven** — the coral pill reads
> the live `Seats remaining` value from `FACTS.md` (currently `20 of 20`); update FACTS and
> re-export as seats fill. Do **not** hand-type a number that isn't in FACTS.

#### Post 10 — TR · Day 4 · Single image · Pioneer Urgency / Conversion
- **Visual concept:** intake / scarcity tile, **center-aligned** to sit in the course banner.
  Eyebrow `PIONEER COHORT 01`, the `20 *selective* seats` ticket, the one **coral** live-seat
  pill, founding price, and the apply CTA. Rightmost slice of the course mural.
- **Safe zone:** ticket + coral pill + number prominent and centered in the safe square.
- **On-image:** eyebrow `FULL-STACK AI ENGINEER · COHORT 01` *(names the program)* · ticket
  `12 weeks · uxp innovation hub, trivandrum` / `20 *selective* seats` · coral pill
  `20 of 20 seats open` *(live, from FACTS)* · sub `₹49,000 founding · ₹70,000 from cohort 2` ·
  cta `apply → eduflickai.com/apply`
- **Caption**
  - **Hook:** pioneer cohort 01: 20 *selective* seats. that's the whole room.
  - **Body:** the full-stack ai engineer program. 12 weeks, in person at uxp innovation hub, trivandrum. founding price ₹49,000 (₹70,000 from cohort 2). strictly capped at 20 seats to guarantee 1:1 code reviews.
  - **CTA:** apply now → eduflickai.com/apply
  - **Hashtags:** #FullStackAI #AIEngineer #TrivandrumTech #TechJobsKerala

#### Post 11 — TC · Day 4 · Carousel (major) · The Cohort / Consideration→Conversion
- **Visual concept:** the course carousel; **cover = the course mural's center slice** (the brightest
  point). The program name **`full-stack ai *engineer*`** is the hero headline; the tagline +
  the 3 product cards support it; the `eduflick AI` wordmark sits small at the foot. Carousel marker.
  Middle slides **show** the build: a row of real tool-pills + a `shipped → <project>` tag per month.
- **On-cover headline:** `full-stack ai *engineer*` *(course name = hero)*
- **Slides** *(tight 7; months 1–3 carry a visual tech-stack row + shipped-project tag)*
  1. **Cover** — eyebrow `PIONEER COHORT 01 · 12 WEEKS · TRIVANDRUM` / hero **full-stack ai *engineer*** / sub "ship ai products, not theory. a hands-on, in-person program." / 3 product cards / swipe →
  2. `01 · THE GAP` / **"ai experience required"** / every job wants it. you know react but have never shipped with an llm. we close that.
  3. `02 · MONTH 1` / **foundations + your first ship** / stack: `cursor · next.js · supabase · vercel` → **shipped: saas dashboard** (deployed by week 4).
  4. `03 · MONTH 2` / **rag + agents** / stack: `openai/claude · pinecone · langchain` → **shipped: rag chatbot** grounded in real docs.
  5. `04 · MONTH 3` / **agentic platform + hiring** / stack: `google adk · n8n` → **shipped: agentic platform**. week 12 — mock interviews + industry recruiter networking.
  6. `05 · THE ROOM` / **20 selective seats** / in person at uxp innovation hub, trivandrum. ₹49,000 founding (₹70,000 from cohort 2).
  7. **CTA (apply-first)** — `APPLY · COHORT 01` / **claim your *seat*** / 20 selective seats. apply → eduflickai.com/apply · *(soft secondary)* not ready? free masterclass first → /masterclass
- **Caption**
  - **Hook:** 12 weeks. 3 *deployed* ai projects. one room of 20.
  - **Body:** the full-stack ai engineer program — in person at uxp innovation hub, trivandrum. real stack, real ships, week-12 mock interviews + industry recruiter networking. ₹49,000 founding price, 20 selective seats.
  - **CTA:** apply now → eduflickai.com/apply
  - **Hashtags:** #FullStackAI #AIEngineer #TrivandrumTech #BuildInPublic #CareerInAI

#### Post 12 — TL · Day 4 · Single image · Program / Conversion (crescendo, newest tile)
- **Visual concept:** the launch crescendo and the **newest tile (top-left)** — eyebrow + the mark
  (paper-fill) + the program name **`full-stack ai *engineer*`** as the hero headline + the apply CTA.
  The freshest thing every profile visitor sees, so the course name must read instantly.
- **On-image:** eyebrow `PIONEER COHORT 01 · NOW OPEN` · hero `full-stack ai *engineer*` ·
  sub `the 12-week program is live. apply now.` · cta `apply → eduflickai.com/apply`
- **Caption**
  - **Hook:** it's live. the full-stack ai engineer program — pioneer cohort *01*.
  - **Body:** 12 weeks offline at uxp innovation hub, trivandrum. 3 deployed projects, 20 selective seats, ₹49,000 founding price. apply now — or see it live first at a free masterclass.
  - **CTA:** apply now → eduflickai.com/apply
  - **Hashtags:** #FullStackAI #AIEngineer #TrivandrumTech #TechJobsKerala #CareerInAI

---

## 8. Verification / QA

1. **Copy QA** (`QA_CHECKLIST.md`, ship ≥85, zero hard-fails): each hook ≤125 chars · one CTA ·
   3–6 hashtags · one serif word · no emoji / forbidden words · no invented facts (placeholders
   only) · intake reads "20 selective" · venue reads "UXP Innovation Hub" · links on eduflickai.com.
2. **Design QA** (`../design-system/QA_CHECKLIST.md`): one hue · headline ≥72 px · untouched mark ·
   coral only on Post 10.
3. **Safe-zone:** overlay the centered 1080×1080 mask on each tile; nothing critical outside it or
   crossing a seam. (Toggle in the preview file below.)
4. **Mural cohesion:** assemble all 12; simulate the 3:4 crop; confirm the 9-tile brand mural reads
   as one indigo picture (mark centered on MC) and the 3-tile course mural crowns the top; check
   each wave (3 / 6 / 9 / 12) looks intentional mid-build.

---

## 9. Render assets

- **Assembled mural preview:** `../design-system/collateral/launch-grid.html` — all 12
  tiles as the two murals, with a 1080² safe-zone toggle.
- **Build tiles/slides with:** `../design-system/recipes/instagram-post.md` +
  `../design-system/recipes/snippets.md`; tokens in `../design-system/colors_and_type.css`.
- **Canvas system + launch grid:** `../design-system/collateral/instagram-kit.html`.

*Eduflick AI · a Tomatrix Technologies venture.*
