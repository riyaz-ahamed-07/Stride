import type { AuthSession } from "./types";

const SESSION_KEY = "stride.auth.session";

type Bridge = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

let bridge: Bridge | null = null;
const waiters: Array<(b: Bridge) => void> = [];

export function bindSessionBridge(next: Bridge) {
  bridge = next;
  while (waiters.length) {
    waiters.shift()?.(next);
  }
}

function getBridge(): Promise<Bridge> {
  if (bridge) return Promise.resolve(bridge);
  return new Promise((resolve, reject) => {
    waiters.push(resolve);
    setTimeout(() => {
      const idx = waiters.indexOf(resolve);
      if (idx >= 0) {
        waiters.splice(idx, 1);
        reject(new Error("Session storage bridge not ready"));
      }
    }, 5000);
  });
}

export async function loadStoredSession(): Promise<AuthSession | null> {
  try {
    const store = await getBridge();
    const raw = await store.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed?.access_token || !parsed.full_name) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function saveSession(session: AuthSession): Promise<void> {
  const store = await getBridge();
  await store.setItem(SESSION_KEY, JSON.stringify(session));
}

export async function clearSession(): Promise<void> {
  const store = await getBridge();
  await store.removeItem(SESSION_KEY);
}
