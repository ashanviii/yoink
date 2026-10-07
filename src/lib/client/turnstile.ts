/**
 * Cloudflare Turnstile: an invisible bot check run before each resolve. It only
 * shows a checkbox when Cloudflare isn't sure the visitor is human. Disabled
 * when NEXT_PUBLIC_TURNSTILE_SITE_KEY wasn't set at build time.
 */

interface TurnstileApi {
  render(
    container: HTMLElement,
    options: {
      sitekey: string;
      appearance: "interaction-only";
      retry: "never";
      callback: (token: string) => void;
      "error-callback": () => void;
      "expired-callback": () => void;
    },
  ): string;
  remove(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

/** Header the server reads the token from (see lib/server/turnstile.ts). */
export const TURNSTILE_HEADER = "X-Turnstile-Token";

let script: Promise<TurnstileApi> | null = null;
let widgetId: string | null = null;
let cancelPending: (() => void) | null = null;

function load(): Promise<TurnstileApi> {
  script ??= new Promise<TurnstileApi>((resolve, reject) => {
    const tag = document.createElement("script");
    tag.src = SCRIPT_URL;
    tag.async = true;
    tag.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("Turnstile failed to start.")));
    tag.onerror = () => reject(new Error("Turnstile failed to load."));
    document.head.appendChild(tag);
  }).catch((err) => {
    script = null;
    throw err;
  });
  return script;
}

/** Where the checkbox appears on the rare occasions Cloudflare asks for one. */
function container(): HTMLElement {
  let el = document.getElementById("turnstile-widget");
  if (!el) {
    el = document.createElement("div");
    el.id = "turnstile-widget";
    Object.assign(el.style, { position: "fixed", bottom: "16px", left: "50%", transform: "translateX(-50%)", zIndex: "60" });
    document.body.appendChild(el);
  }
  return el;
}

/** Starts loading the script early so the first check is quick. */
export function preloadTurnstile(): void {
  if (SITE_KEY) load().catch(() => undefined);
}

/**
 * Runs a fresh check and returns its single-use token, or null when Turnstile is
 * disabled. A newer call cancels an older pending one with an AbortError.
 */
export async function turnstileToken(): Promise<string | null> {
  if (!SITE_KEY) return null;
  const api = await load();
  cancelPending?.();
  if (widgetId) api.remove(widgetId);

  let cancel: () => void = () => undefined;
  return new Promise<string>((resolve, reject) => {
    const fail = () => reject(new Error("bot check failed"));
    cancel = () => reject(new DOMException("Superseded", "AbortError"));
    cancelPending = cancel;
    widgetId = api.render(container(), {
      sitekey: SITE_KEY,
      appearance: "interaction-only",
      retry: "never",
      callback: resolve,
      "error-callback": fail,
      "expired-callback": fail,
    });
  }).finally(() => {
    if (cancelPending === cancel) cancelPending = null;
  });
}
