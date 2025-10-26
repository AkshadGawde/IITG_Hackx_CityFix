// Wrapper to ensure CommonJS config is used in environments that prefer TS config.
// Next.js will load this file if present, so we re-export the CJS config.
// This prevents "module is not defined in ES module scope" errors when package.json
// or tooling treats configs as ESM.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - Node's CJS interop may not have proper types here.
import cjsConfig from './next.config.cjs';
export default cjsConfig as any;
