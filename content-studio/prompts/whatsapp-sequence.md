# Prompt — WhatsApp nurture sequence

Load `00_SYSTEM_PROMPT.md` first. WhatsApp is the conversion engine: it moves an applicant from
apply → seat booking → close. Messages are short, personal, one-ask-each, and sound like a human
typing — not a broadcast. Casing relaxes here (it's a chat), but the voice stays calm and concrete.

---

```text
FACTS (only source of live numbers — never invent; missing → [[NEEDS: …]]):
- Apply link:              [[eduflickai.com/apply]]
- Cohort start:            [[ ]]   Seats left: [[ / 20]]
- Pioneer price / retail:  [[₹49,000 / ₹70,000]]
- Booking structure:       [[₹15,000 to reserve, then ₹17,000 + ₹17,000]]
- Booking / payment link:  [[ ]]
- Sender name / who signs: [[e.g. "— Team Eduflick" or a real name]]

TASK:
- Build the [[6]]-message sequence: confirm → follow-up → qualify → offer → scarcity → close.
- Audience: [[applicant (applied, not booked) | warm lead (enquired, not applied) | no-response]]
- Tone: [[warm-professional]]

CONSTRAINTS (priority order):
1. Each message ≤ 3 short lines. ONE ask per message. Sound like a person, not a system.
2. Personalize with a {{first_name}} merge field at the start where natural.
3. Use ONLY links/dates/prices from FACTS. No emoji spam — at most one tasteful symbol per message,
   and only if it helps (a "→" or none at all). No forbidden words. No exclamation hype.
4. Each message states the next concrete step + the relevant number (time, seats, price).
5. The "close" message gives the exact booking step (₹15K to reserve) + the live seats-left
   count. There is NO close date — urgency comes from seat scarcity, never a deadline.
6. Add a one-line NOTE under each message: when to send it (trigger/timing).

OUTPUT (exactly this):
=== MSG 1 · CONFIRM ===
Text:
Note (send when):
=== MSG 2 · REMIND ===
...
=== MSG 6 · CLOSE ===
...
```

---

## Few-shot — three messages at the bar

> **=== MSG 1 · CONFIRM ===**
> Text: hey {{first_name}} — we got your application for Pioneer Cohort 01. 20 seats, in-person, Trivandrum. we'll reach out to qualify and answer questions. anything to ask right now?
> Note (send when): within 1 hour of receiving the application.
>
> **=== MSG 4 · OFFER ===**
> Text: {{first_name}}, the program is 12 weeks, in-person at UXP Innovation Hub, Trivandrum. you ship 3 deployed projects — a SaaS dashboard, a RAG chatbot, an agentic platform. pioneer price is ₹49K (₹70K from cohort 2).
> Note (send when): after the qualification call / follow-up, for warm leads who haven't booked.
>
> **=== MSG 6 · CLOSE ===**
> Text: {{first_name}}, only [[__]] of 20 seats left — they go as they're booked. you can reserve yours with ₹15K (then ₹17K + ₹17K). want me to send the payment link?
> Note (send when): when seats-left drops (per FACTS), to warm leads who haven't booked.

**✗ Avoid:** long paragraphs, multiple asks in one message, "🔥🔥 HURRY only few seats!!!", or
stating a price/date that isn't in FACTS.
