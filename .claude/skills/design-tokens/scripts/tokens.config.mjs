// Style Dictionary config — brand-NEUTRAL design-token pipeline.
//
// Source of truth:  a tokens.json (your project's "brand profile").
// Generated outputs (commit them):
//   - tokens.css        → :root custom properties (every surface @imports / inlines this)
//   - tokens.flat.json  → flat name→value map (snippet-drift guard, other tooling)
//   - tokens.mjs        → JS module (color/logo/fonts for exporters & scripts)
//
// Run via build-tokens.mjs:
//   TOKENS_SRC=path/to/tokens.json OUT_DIR=path/to/out node build-tokens.mjs
//
// Importing this file registers the transform + formats as a side effect.

import StyleDictionary from "style-dictionary";
import { resolve } from "node:path";

const SRC = process.env.TOKENS_SRC || resolve(process.cwd(), "tokens.json");
const OUT = (process.env.OUT_DIR || resolve(process.cwd(), "build")) + "/";

// CSS var name = the token's leaf key  (color.accent-500 → --accent-500),
// so names stay short, predictable, and match what effects.css / recipes expect.
StyleDictionary.registerTransform({
  name: "name/leaf",
  type: "name",
  transform: (token) => token.path[token.path.length - 1],
});

const flatMap = (dictionary) => {
  const obj = {};
  for (const token of dictionary.allTokens) obj[token.name] = token.value;
  return obj;
};

StyleDictionary.registerFormat({
  name: "javascript/flat",
  format: ({ dictionary }) =>
    [
      "// AUTO-GENERATED from tokens.json by build-tokens.mjs. Edit the JSON, not this file.",
      `export const tokens = ${JSON.stringify(flatMap(dictionary), null, 2)};`,
      "export const logoPath = tokens['logo-path'];",
      "export const fontsLink = tokens['fonts-link'];",
      "export default tokens;",
      "",
    ].join("\n"),
});

StyleDictionary.registerFormat({
  name: "json/flat",
  format: ({ dictionary }) => JSON.stringify(flatMap(dictionary), null, 2) + "\n",
});

// `meta` tokens (logo path, fonts link, version) are not colors — keep them out of CSS.
const notMeta = (token) => token.path[0] !== "meta";

export default {
  source: [SRC],
  platforms: {
    css: {
      transforms: ["name/leaf"],
      buildPath: OUT,
      files: [
        {
          destination: "tokens.css",
          format: "css/variables",
          filter: notMeta,
          options: { selector: ":root", outputReferences: false },
        },
      ],
    },
    json: {
      transforms: ["name/leaf"],
      buildPath: OUT,
      files: [{ destination: "tokens.flat.json", format: "json/flat" }],
    },
    js: {
      transforms: ["name/leaf"],
      buildPath: OUT,
      files: [{ destination: "tokens.mjs", format: "javascript/flat" }],
    },
  },
};
