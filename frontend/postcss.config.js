// Wrapper for tools that look for postcss.config.js
// Re-exports the CommonJS config to avoid ESM scope issues.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
module.exports = require("./postcss.config.cjs");
