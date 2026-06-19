// Eduflick AI — shared indigo DUOTONE primitives (single source for the brand ramps).
// Used by treat-stock.mjs (photos) and treat-image.mjs (any image, incl. Recraft/Gemini
// backdrops). A luminance -> indigo-ramp map via SVG <feComponentTransfer>: every pixel
// collapses to luma then re-colors onto the brand ramp, so no third hue can survive.
//
// dark : ink #0A0B10 → indigo-ink #0B0822 → indigo #5B5BF0 → light-indigo #8B97FF
// paper: indigo #5B5BF0 → light-indigo #8B97FF → warm paper #F5F2EA  (high-key)

export const LUMA = '0.2126 0.7152 0.0722 0 0';   // Rec.709 grayscale row

// 4-stop ramps (shadow → … → highlight) for richer, more cinematic gradation.
export const RAMP = {
  dark:  { r: '0.039 0.043 0.357 0.545', g: '0.043 0.031 0.357 0.592', b: '0.063 0.133 0.941 1.0' },
  paper: { r: '0.357 0.545 0.961',       g: '0.357 0.592 0.949',       b: '0.941 1.0 0.918' },
};

export const filterDef = (id, m) => `
  <filter id="${id}" color-interpolation-filters="sRGB">
    <feColorMatrix type="matrix" values="${LUMA} ${LUMA} ${LUMA} 0 0 0 0 1 0"/>
    <feComponentTransfer>
      <feFuncR type="table" tableValues="${m.r}"/>
      <feFuncG type="table" tableValues="${m.g}"/>
      <feFuncB type="table" tableValues="${m.b}"/>
    </feComponentTransfer>
  </filter>`;
