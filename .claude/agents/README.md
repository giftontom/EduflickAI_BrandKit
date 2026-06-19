# Eduflick AI — Agent Team

A multi-agent team that operates on this brand kit. Definitions live beside this file as
`.claude/agents/*.md` (Claude Code subagents). The brand's sources of truth govern everything:
live values in `content-studio/FACTS.md`, design tokens in `design-system/tokens/tokens.json`,
voice in `content-studio/BRAND_CHEATSHEET.md`, hard rules in `AGENTS.md`.

## The team

| Agent                    | Role                                                                   | Model  |
| ------------------------ | ---------------------------------------------------------------------- | ------ |
| `lead-brand-custodian`   | Orchestrates, routes work, owns the final ship/merge gate              | opus   |
| `content-copywriter`     | On-brand copy (skill: eduflick-content)                                | sonnet |
| `design-system-engineer` | Token pipeline, components, recipes (design-tokens)                    | sonnet |
| `visual-production`      | Assemble + render + export artifacts (design-studio, web-to-image/pdf) | sonnet |
| `qa-fact-integrity`      | Truth + brand QA gate (can block)                                      | sonnet |
| `red-team-auditor`       | Adversarial risk / security sweep                                      | opus   |
| `devops-repo-hygiene`    | CI, builds, deps, git, renames                                         | sonnet |

## Recursive workflow

```text
lead decomposes & routes
  -> producer (copywriter / design-eng / visual): pull FACTS + tokens, assemble
  -> RENDER (must be seen)
  -> self-QA
  -> qa-fact-integrity  --block--> back to producer (recurse)
  -> red-team-auditor   --fail---> back to producer / devops (recurse)
  -> lead final gate
  -> devops: build -> CI green -> PR -> (human-approved) merge -> export
```

Any gate failure routes back with concrete findings; after 3 cycles, escalate to the human.
Communication is via shared artifacts, not chatter: `FACTS.md` (truth), `tokens.json` (design),
PRs + CI (integration), and this gate (Definition of Done).

## Pre-publish gate — Definition of Done

Nothing ships until ALL pass:

- [ ] Every date/price/seat/link pulled VERBATIM from `content-studio/FACTS.md`; unknowns typeset as a literal `[[PLACEHOLDER]]`.
- [ ] `node tools/check-facts.mjs` passes (no retired strings; add `--links` to also check external links).
- [ ] One hue: indigo `#5B5BF0` + neutrals; coral `#FF6E5A` semantic-flag only; never a third hue; no hardcoded hex (use `var(--token)`).
- [ ] lowercase display headings; mono UPPERCASE labels; NO emoji; exactly one _serif_ accent word per hook.
- [ ] The notched-card mark is undistorted / not recolored; brand glow only behind a focal element via `.halo`.
- [ ] Generated files (tokens.css, tokens.flat.json, brand.tokens.mjs, snippets.md) regenerated from source — `npm run tokens && npm run snippets` leaves a clean `git diff`.
- [ ] Visuals were RENDERED and seen (not assumed); exports at true sizes.
- [ ] Finalized facts honored: venue **UXP Innovation Hub, Trivandrum**; **#TrivandrumTech**; **Technopark de-emphasized** → Trivandrum / industry; **no fixed close date**; **eduflickai.com** / `info@eduflickai.com`.
- [ ] Merge to main only with explicit human approval.

## Versioning this team

These files live under `.claude/`, which `.gitignore` excludes except `.claude/skills/`. To commit the
team like the skills, add `!.claude/agents/` to `.gitignore`; otherwise they remain local-only (still
fully functional for Claude Code on this machine).
