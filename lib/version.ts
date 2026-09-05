// Release identity of this build. The values are inlined by `next.config.ts`
// (see the `env` block there) — package.json for the number, a Docker build arg
// for the commit — so they are fixed per image and need no runtime env_file.
export const APP_VERSION = process.env.APP_VERSION ?? "0.0.0";
export const GIT_COMMIT = process.env.GIT_COMMIT ?? "dev";
export const BUILT_AT = process.env.BUILT_AT ?? "";
