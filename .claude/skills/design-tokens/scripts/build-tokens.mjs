// Build the design tokens: tokens.json → tokens.css + tokens.flat.json + tokens.mjs
//
//   TOKENS_SRC=path/to/tokens.json OUT_DIR=path/to/out node build-tokens.mjs
//
// Defaults: TOKENS_SRC=./tokens.json, OUT_DIR=./build
import StyleDictionary from "style-dictionary";
import config from "./tokens.config.mjs";

const sd = new StyleDictionary(config);
await sd.buildAllPlatforms();
console.log("✓ tokens built → tokens.css + tokens.flat.json + tokens.mjs");
