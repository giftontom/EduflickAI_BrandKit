/* diff.mjs — minimal LCS line diff + renderer for the facts save modal. */

import { el } from '../dom.mjs';

/* diffLines(aText, bText) -> [{ type: 'same'|'del'|'add', text, aLine?, bLine? }]
   Classic LCS dynamic programming; FACTS.md is small, so O(n*m) is fine. */
export function diffLines(aText, bText) {
  const a = String(aText).split('\n');
  const b = String(bText).split('\n');
  const n = a.length;
  const m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j]
        ? dp[i + 1][j + 1] + 1
        : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const ops = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      ops.push({ type: 'same', text: a[i], aLine: i + 1, bLine: j + 1 });
      i++; j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      ops.push({ type: 'del', text: a[i], aLine: i + 1 });
      i++;
    } else {
      ops.push({ type: 'add', text: b[j], bLine: j + 1 });
      j++;
    }
  }
  while (i < n) { ops.push({ type: 'del', text: a[i], aLine: i + 1 }); i++; }
  while (j < m) { ops.push({ type: 'add', text: b[j], bLine: j + 1 }); j++; }
  return ops;
}

/* renderDiff(ops) -> element. Collapses unchanged runs, keeps `context` lines. */
export function renderDiff(ops, { context = 2 } = {}) {
  const keep = new Array(ops.length).fill(false);
  ops.forEach((op, idx) => {
    if (op.type === 'same') return;
    const lo = Math.max(0, idx - context);
    const hi = Math.min(ops.length - 1, idx + context);
    for (let k = lo; k <= hi; k++) keep[k] = true;
  });

  const root = el('div', { class: 'diff' });
  if (!ops.some((o) => o.type !== 'same')) {
    root.append(el('div', { class: 'diff-skip mono' }, 'no changes'));
    return root;
  }
  let skipped = 0;
  const flush = () => {
    if (!skipped) return;
    root.append(el('div', { class: 'diff-skip mono' }, `${skipped} unchanged lines`));
    skipped = 0;
  };
  for (let idx = 0; idx < ops.length; idx++) {
    if (!keep[idx]) { skipped++; continue; }
    flush();
    const op = ops[idx];
    root.append(el('div', { class: `diff-row diff-${op.type}` },
      el('span', { class: 'ln' }, op.aLine ? String(op.aLine) : ''),
      el('span', { class: 'ln' }, op.bLine ? String(op.bLine) : ''),
      el('span', { class: 'diff-sign' }, op.type === 'add' ? '+' : op.type === 'del' ? '-' : ' '),
      el('span', { class: 'diff-text' }, op.text === '' ? ' ' : op.text)));
  }
  flush();
  return root;
}
