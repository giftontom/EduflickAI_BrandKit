// feedback.mjs — render the design-comments store into a markdownlint-clean
// DESIGN_FEEDBACK.md digest. Shared by the studio server (regenerates on every
// comment write) and the gen-feedback.mjs CLI, so there is a single format
// source with no drift.
//
// The digest is the Claude-actionable artifact: a separate Claude Code chat
// reads it, opens each source file named in the H2 heading, and implements the
// design edits at the anchors described. Headings are EXACT source paths so one
// file fixes everything inside it.

const HEADER_NOTE =
  '<!-- generated from content-studio/design-comments.json by gen:feedback — do not hand-edit -->';

// 'resolved' / 'wontfix' wording for the struck-through summary tail.
const STATUS_TAIL = { resolved: 'resolved', wontfix: "won't fix", open: 'open' };

// Date only (UTC) for the <sub> line — keeps the digest stable across re-renders
// within a day and avoids noisy second-level churn.
function dateOnly(iso) {
  if (typeof iso !== 'string') return '';
  const m = iso.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : '';
}

// First 8 chars of the UUID — enough to find the comment in the store by eye.
function shortId(id) {
  return typeof id === 'string' ? id.slice(0, 8) : '';
}

// The anchor descriptor after "anchor": element selector and/or normalized
// coords. Coords are omitted for element anchors that carry no x/y.
function anchorPhrase(anchor) {
  if (!anchor || typeof anchor !== 'object') return '';
  const parts = [];
  if (typeof anchor.selector === 'string' && anchor.selector) {
    parts.push('`' + anchor.selector + '`');
  }
  const hasXY = Number.isFinite(anchor.x) && Number.isFinite(anchor.y);
  if (hasXY) {
    parts.push(`(x ${round2(anchor.x)}, y ${round2(anchor.y)})`);
  }
  return parts.join(' ');
}

function round2(n) {
  // Trim to 2 dp without trailing zeros noise (0.62, 0.18, 0.6, 0).
  return String(Math.round(n * 100) / 100);
}

// One comment → its markdown lines (checkbox item + quote + <sub> meta).
function renderComment(c) {
  const seq = Number.isFinite(c.seq) ? c.seq : '?';
  const assetId = (c.assetRef && c.assetRef.assetId) || 'unknown';
  const open = c.status === 'open';
  const box = open ? '[ ]' : '[x]';
  const heading = `**#${seq} · ${assetId}**`;
  const anchor = c.assetRef && c.assetRef.anchor;
  const page = anchor && Number.isFinite(anchor.page) ? ` page ${anchor.page}` : '';
  const phrase = anchorPhrase(anchor);
  const anchorSeg = phrase ? ` — anchor ${phrase}` : '';

  // Open items: full instruction line + quote + meta.
  // Resolved/wontfix: strike the heading, append the status word, no quote.
  const lines = [];
  if (open) {
    lines.push(`- ${box} ${heading}${page}${anchorSeg}`);
    lines.push(`  > ${oneLine(c.text)}`);
    lines.push(`  <sub>id \`${shortId(c.id)}\` · open · updated ${dateOnly(c.updatedAt)}</sub>`);
  } else {
    const tail = STATUS_TAIL[c.status] || c.status || 'resolved';
    lines.push(`- ${box} ~~${heading}${page}~~ — ${tail}`);
  }
  return lines;
}

// Collapse newlines/runs of whitespace so a comment body stays a single
// blockquote line (avoids MD028/blank-quote and stray hard breaks).
function oneLine(text) {
  return String(text == null ? '' : text)
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * renderFeedbackDigest(store) -> markdown string.
 * store = { version, comments: [ <Comment> ] }. Tolerant of a missing/!array
 * comments field (returns the empty digest). Output is markdownlint-clean and
 * ends with a single trailing newline.
 */
export function renderFeedbackDigest(store) {
  const comments = store && Array.isArray(store.comments) ? store.comments : [];

  let open = 0;
  let resolved = 0;
  let wontfix = 0;
  for (const c of comments) {
    if (c.status === 'resolved') resolved++;
    else if (c.status === 'wontfix') wontfix++;
    else open++; // 'open' and anything unexpected counts as open
  }

  // Group by the REAL source file to edit (assetRef.source).
  const groups = new Map(); // source -> { label, comments: [] }
  for (const c of comments) {
    const ref = c.assetRef || {};
    const source = typeof ref.source === 'string' && ref.source ? ref.source : '(unknown source)';
    if (!groups.has(source)) groups.set(source, { label: ref.label || '', comments: [] });
    groups.get(source).comments.push(c);
  }

  const out = [];
  out.push('# Design feedback digest');
  out.push('');
  out.push(HEADER_NOTE);
  out.push('');
  out.push(
    `\`${open}\` open · \`${resolved}\` resolved · \`${wontfix}\` won't fix. Each heading is the ` +
      'exact source file to edit; the pin number matches the on-screen pin; the anchor says where; ' +
      'the quote is the instruction.',
  );

  // Sort files alphabetically A–Z by source path.
  const sources = [...groups.keys()].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  for (const source of sources) {
    const group = groups.get(source);
    out.push('');
    out.push(`## ${source}`);

    // Optional surface summary line: "surface: <label> · N open" when this file
    // has open items and a label is known.
    const openHere = group.comments.filter((c) => (c.status || 'open') === 'open').length;
    if (group.label && openHere > 0) {
      out.push('');
      out.push(`surface: ${group.label} · ${openHere} open`);
    }

    // Comments sorted by seq ascending; ties/missing seq keep input order.
    const sorted = [...group.comments].sort((a, b) => {
      const sa = Number.isFinite(a.seq) ? a.seq : Infinity;
      const sb = Number.isFinite(b.seq) ? b.seq : Infinity;
      return sa - sb;
    });

    out.push('');
    for (const c of sorted) {
      for (const line of renderComment(c)) out.push(line);
    }
  }

  // Join with single newlines; collapse no internal blanks beyond the ones we
  // emitted, and end with exactly one trailing newline (MD047).
  return out.join('\n') + '\n';
}
