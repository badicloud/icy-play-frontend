export const SESSION_STORAGE_KEY = "icyplay.session";

export type IcyPlaySession = {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
};

/**
 * "Remember me" decides which browser store holds the session.
 *
 * - local:   survives closing the browser, so the visitor stays signed in.
 * - session: cleared when the tab closes, which is what someone on a shared
 *            or public computer expects.
 */
type StorageKind = "local" | "session";

function getStore(kind: StorageKind): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    // Storage can be unavailable in private browsing modes.
    return null;
  }
}

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

function readFrom(kind: StorageKind): IcyPlaySession | null {
  const store = getStore(kind);

  if (!store) {
    return null;
  }

  try {
    const raw = store.getItem(SESSION_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed: unknown = JSON.parse(raw);
    return isSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Which store currently holds the session, if any. */
export function getSessionStorageKind(): StorageKind | null {
  if (readFrom("session")) {
    return "session";
  }

  return readFrom("local") ? "local" : null;
}

export function readStoredSession(): IcyPlaySession | null {
  // A tab-scoped session wins: it is the more recent, more deliberate choice.
  return readFrom("session") ?? readFrom("local");
}

/**
 * Writes the session. Pass `remember` at sign-in to choose the store; omit it
 * on a token refresh so the visitor's original choice is preserved.
 */
export function storeSession(session: IcyPlaySession, remember?: boolean) {
  const kind: StorageKind =
    remember === undefined ? (getSessionStorageKind() ?? "local") : remember ? "local" : "session";

  try {
    getStore(kind)?.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    // Never leave a copy behind in the store we did not pick.
    getStore(kind === "local" ? "session" : "local")?.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // The in-memory session still works for the current tab.
  }
}

export function clearStoredSession() {
  try {
    getStore("local")?.removeItem(SESSION_STORAGE_KEY);
    getStore("session")?.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // Nothing to recover from: the session is cleared in memory regardless.
  }
}

/**
 * Notifies the callback when another browser tab signs in or out. Only fires
 * for remembered sessions, because a tab-scoped session is private to its tab
 * by design.
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
