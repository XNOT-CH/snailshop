"use client";

import { useEffect } from "react";
import {
  WELCOME_SEEN_COOKIE,
  WELCOME_SEEN_COOKIE_PATH,
  WELCOME_SEEN_COOKIE_VALUE,
  getNextBangkokMidnight,
} from "@/lib/welcomeCookie";

export function WelcomeSeenMarker() {
  useEffect(() => {
    const expires = getNextBangkokMidnight().toUTCString();

    document.cookie = [
      `${WELCOME_SEEN_COOKIE}=${WELCOME_SEEN_COOKIE_VALUE}`,
      `Expires=${expires}`,
      `Path=${WELCOME_SEEN_COOKIE_PATH}`,
      "SameSite=Lax",
    ].join("; ");
  }, []);

  return null;
}
