export const SESSION_STORAGE_KEY = "icyplay.session";

export type IcyPlaySession = {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
};

function isSession(value: unknown): value is IcyPlaySession {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<IcyPlaySession>;
  return (
    typeof candidate.accessToken === "string" &&
    typeof candidate.refreshToken === "string" &&
    typeof candidate.expiresAt === "string"
  );
}

export function readStoredSession(): IcyPlaySession | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed: unknown = JSON.parse(raw);
    return isSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function storeSession(session: IcyPlaySession) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Storage can be unavailable in private browsing modes. The in-memory
    // session still works for the current tab.
  }
}

export function clearStoredSession() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // Nothing to recover from: the session is cleared in memory regardless.
  }
}

/**
 * Notifies the callback when another browser tab signs in or out. The callback
 * receives the new session, or null when the session was cleared.
 */
export function subscribeToSessionChanges(onChange: (session: IcyPlaySession | null) => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  function handleStorage(event: StorageEvent) {
    // A null key means the whole storage area was cleared.
    if (event.key !== null && event.key !== SESSION_STORAGE_KEY) {
      return;
    }

    onChange(readStoredSession());
  }

  window.addEventListener("storage", handleStorage);
  return () => window.removeEventListener("storage", handleStorage);
}
