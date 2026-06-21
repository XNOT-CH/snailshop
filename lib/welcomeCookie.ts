export const WELCOME_SEEN_COOKIE = "snail_welcome_seen";
export const WELCOME_SEEN_COOKIE_VALUE = "1";
export const WELCOME_SEEN_COOKIE_PATH = "/";

const BANGKOK_UTC_OFFSET_MS = 7 * 60 * 60 * 1000;

export function getNextBangkokMidnight(from = new Date()) {
  const bangkokNow = new Date(from.getTime() + BANGKOK_UTC_OFFSET_MS);

  return new Date(
    Date.UTC(
      bangkokNow.getUTCFullYear(),
      bangkokNow.getUTCMonth(),
      bangkokNow.getUTCDate() + 1,
      0,
      0,
      0,
      0,
    ) - BANGKOK_UTC_OFFSET_MS,
  );
}
