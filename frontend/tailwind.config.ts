// Wrapper file for tooling that looks for tailwind.config.ts
// It re-exports the CJS Tailwind config to avoid ESM scope issues.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import cjsTailwind from './tailwind.config.cjs';
export default cjsTailwind as any;
