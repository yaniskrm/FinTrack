"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import Script from "next/script";
import { TURNSTILE_ORIGIN, TURNSTILE_SITE_KEY } from "../lib/captcha";

// Minimal typing of the part of Cloudflare's `window.turnstile` we use —
// declared here rather than pulling in a type package (no new dependency).
interface TurnstileRenderOptions {
  sitekey: string;
  theme: "auto";
  size: "flexible";
  language: "fr";
  callback: (token: string) => void;
  "expired-callback": () => void;
  "error-callback": () => void;
}
interface TurnstileApi {
  render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId?: string) => void;
}
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export interface TurnstileHandle {
  /** A Turnstile token is single-use: call after every submit attempt that consumed it. */
  reset: () => void;
}

interface TurnstileProps {
  /** Called with the token once solved, and with `null` when it expires or errors. */
  onToken: (token: string | null) => void;
}

const SCRIPT_SRC = `${TURNSTILE_ORIGIN}/turnstile/v0/api.js?render=explicit`;

/** Cloudflare Turnstile widget. Renders nothing when no site key is configured. */
export const Turnstile = forwardRef<TurnstileHandle, TurnstileProps>(function Turnstile({ onToken }, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  const [scriptReady, setScriptReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  useImperativeHandle(ref, () => ({
    reset: () => {
      if (widgetIdRef.current !== null) {
        window.turnstile?.reset(widgetIdRef.current);
      }
    },
  }));

  useEffect(() => {
    const container = containerRef.current;
    if (!scriptReady || !container || !window.turnstile || TURNSTILE_SITE_KEY === undefined) return;

    const widgetId = window.turnstile.render(container, {
      sitekey: TURNSTILE_SITE_KEY,
      theme: "auto",
      size: "flexible",
      language: "fr",
      callback: (token) => {
        setFailed(false);
        onTokenRef.current(token);
      },
      "expired-callback": () => {
        onTokenRef.current(null);
      },
      "error-callback": () => {
        setFailed(true);
        onTokenRef.current(null);
      },
    });
    widgetIdRef.current = widgetId;

    return () => {
      window.turnstile?.remove(widgetId);
      widgetIdRef.current = null;
    };
  }, [scriptReady]);

  const handleReady = useCallback(() => {
    setScriptReady(true);
  }, []);

  if (TURNSTILE_SITE_KEY === undefined) return null;

  return (
    <div className="space-y-2">
      <Script src={SCRIPT_SRC} strategy="afterInteractive" onReady={handleReady} />
      <div ref={containerRef} role="group" aria-label="Vérification anti-robot" className="min-h-[65px]" />
      {failed && (
        <p role="alert" className="text-sm text-destructive">
          La vérification anti-robot n&apos;a pas pu se charger. Rechargez la page.
        </p>
      )}
    </div>
  );
});

/**
 * State for a form protected by Turnstile. When no site key is configured,
 * `ready` is always true and `token` stays null — the form behaves as before.
 */
export function useCaptcha() {
  const enabled = TURNSTILE_SITE_KEY !== undefined;
  const [token, setToken] = useState<string | null>(null);
  const widgetRef = useRef<TurnstileHandle>(null);

  /** Drops the (now spent) token and asks Turnstile for a fresh one. */
  const reset = useCallback(() => {
    setToken(null);
    widgetRef.current?.reset();
  }, []);

  return {
    enabled,
    token: token ?? undefined,
    setToken,
    widgetRef,
    reset,
    /** Submit is allowed once a token exists — or when CAPTCHA is not in use. */
    ready: !enabled || token !== null,
  };
}
