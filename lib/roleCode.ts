const MAX_ROLE_CODE_LENGTH = 50;
const FALLBACK_PREFIX = "ROLE";

function trimUnderscores(value: string) {
  return value.replace(/^_+|_+$/g, "");
}

export function normalizeRoleCode(value: string | null | undefined) {
  const normalized = (value ?? "")
    .trim()
    .toUpperCase()
    .replaceAll(/\s+/g, "_")
    .replaceAll(/[^A-Z0-9_]/g, "_")
    .replaceAll(/_+/g, "_");

  return trimUnderscores(normalized).slice(0, MAX_ROLE_CODE_LENGTH);
}

export function buildFallbackRoleCode(seed: string) {
  const compactSeed = seed.replaceAll(/[^A-Z0-9]/gi, "").toUpperCase().slice(0, 12);
  const suffix = compactSeed || crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase();
  return `${FALLBACK_PREFIX}_${suffix}`.slice(0, MAX_ROLE_CODE_LENGTH);
}

export async function resolveUniqueRoleCode(options: {
  name?: string | null;
  requestedCode?: string | null;
  fallbackSeed: string;
  isTaken: (code: string) => Promise<boolean>;
  currentCode?: string | null;
}) {
  const currentCode = normalizeRoleCode(options.currentCode);
  const requestedCode = normalizeRoleCode(options.requestedCode);
  const derivedFromName = normalizeRoleCode(options.name);
  const baseCode =
    requestedCode || derivedFromName || currentCode || buildFallbackRoleCode(options.fallbackSeed);

  if (baseCode === currentCode) {
    return currentCode;
  }

  if (!(await options.isTaken(baseCode))) {
    return baseCode;
  }

  const suffixBase = baseCode.slice(0, MAX_ROLE_CODE_LENGTH - 3);

  for (let index = 1; index <= 999; index += 1) {
    const candidate = `${suffixBase}_${index}`.slice(0, MAX_ROLE_CODE_LENGTH);
    if (candidate === currentCode) {
      return currentCode;
    }
    if (!(await options.isTaken(candidate))) {
      return candidate;
    }
  }

  return buildFallbackRoleCode(`${options.fallbackSeed}${Date.now()}`);
}
