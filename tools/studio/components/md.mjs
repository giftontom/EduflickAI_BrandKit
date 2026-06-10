/* md.mjs — markdown rendering for the docs view.
   Uses the vendored globals (marked + DOMPurify, classic scripts loaded in
   index.html). After sanitizing we wrap unfilled placeholder tokens in a
   highlight span by operating on text nodes only — never on raw HTML. */

import { el } from '../dom.mjs';

/* Placeholder tokens look like a double-bracketed name in source docs. */
const PLACEHOLDER_RE = /\[\[[^\]\n]+\]\]/g;

export function renderMarkdown(text) {
  const root = el('div', { class: 'md' });
  const marked = globalThis.marked;
  const purify = globalThis.DOMPurify;
  if (!marked || !purify) {
    root.append(el('pre', { class: 'md-raw' }, text));
    return root;
  }
  root.innerHTML = purify.sanitize(marked.parse(text));
  markPlaceholders(root);
  return root;
}

export function markPlaceholders(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const targets = [];
  while (walker.nextNode()) {
    const n = walker.currentNode;
    PLACEHOLDER_RE.lastIndex = 0;
    if (PLACEHOLDER_RE.test(n.nodeValue)) targets.push(n);
  }
  for (const node of targets) {
    const s = node.nodeValue;
    const frag = document.createDocumentFragment();
    let last = 0;
    PLACEHOLDER_RE.lastIndex = 0;
    let m;
    while ((m = PLACEHOLDER_RE.exec(s)) !== null) {
      if (m.index > last) frag.append(s.slice(last, m.index));
      frag.append(el('span', { class: 'ph', title: 'unfilled placeholder' }, m[0]));
      last = m.index + m[0].length;
    }
    if (last < s.length) frag.append(s.slice(last));
    node.replaceWith(frag);
  }
}
