// Build the design tokens: tokens.json → tokens.css + tokens.flat.json + brand.tokens.mjs
// Run with: npm run tokens
import StyleDictionary from "style-dictionary";
import config from "./tokens.config.mjs";

const sd = new StyleDictionary(config);
await sd.buildAllPlatforms();
console.log("✓ tokens built → design-system/tokens/{tokens.css,tokens.flat.json} + tools/brand.tokens.mjs");
