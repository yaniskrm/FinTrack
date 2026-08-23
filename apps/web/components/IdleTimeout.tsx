"use client";

import { useEffect, useRef } from "react";
import { signOutAction } from "../lib/auth/actions";

const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const ACTIVITY_EVENTS = ["mousedown", "keydown", "touchstart", "scroll"] as const;

/**
 * Signs the user out after 30 minutes of inactivity (CLAUDE.md security rule).
 * Renders nothing — mounted once per authenticated layout.
 */
export function IdleTimeout() {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    function resetTimer() {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        void signOutAction();
      }, IDLE_TIMEOUT_MS);
    }

    resetTimer();
    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, resetTimer);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, resetTimer);
      }
    };
  }, []);

  return null;
}
