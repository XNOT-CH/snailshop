// The invite code a visitor arrived with, written by /r/[code] and read once by
// /api/register. HttpOnly because nothing in the browser needs it — keeping it
// out of document.cookie means a page script cannot rewrite someone else's
// attribution. Lax so it survives the click-through from an external post.
export const INVITE_COOKIE = "snail_invite";

// How long a click stays worth a signup. Long enough for "saw the video today,
// signed up on payday"; short enough that a shared computer does not credit a
// promoter months later.
export const INVITE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export const INVITE_COOKIE_PATH = "/";
