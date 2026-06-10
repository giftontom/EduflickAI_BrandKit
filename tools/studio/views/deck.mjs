/* deck.mjs — the program deck as a 16:9 slide gallery. Reuses the generic
   surface grid and adds an "open deck" link beside the export button. */

import { el, rootHref } from '../dom.mjs';
import { renderSurfaceView } from './social.mjs';

export function render(root, ctx) {
  const surface = ctx.manifest && ctx.manifest.surfaces
    ? ctx.manifest.surfaces.find((s) => s.id === 'deck')
    : null;
  const extras = surface
    ? [el('a', {
      class: 'btn btn-ghost btn-sm',
      href: rootHref(surface.source),
      target: '_blank',
      rel: 'noopener',
    }, 'open deck')]
    : [];
  return renderSurfaceView(root, ctx, 'deck', { extraToolbar: extras });
}
