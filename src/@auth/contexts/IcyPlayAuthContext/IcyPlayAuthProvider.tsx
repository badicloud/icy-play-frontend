"use client";

import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiClient } from "@/services/api";
import {
  getCurrentUser,
  login,
  logout,
  refreshAccessToken,
  type CurrentUserResponse,
  type TokenResponse,
} from "@auth/authenticationApi";
import {
  clearStoredSession,
  readStoredSession,
  storeSession,
  subscribeToSessionChanges,
  type IcyPlaySession,
} from "@auth/icyPlaySession";
import { IcyPlayAuthContext, type IcyPlayAuthContextType } from "./IcyPlayAuthContext";

/** Refresh slightly before the access token expires so in-flight calls stay valid. */
const EXPIRY_SKEW_MS = 30_000;

type IcyPlayAuthProviderProps = {
  children: ReactNode;
};

export function IcyPlayAuthProvider({ children }: IcyPlayAuthProviderProps) {
  const [user, setUser] = useState<CurrentUserResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const sessionRef = useRef<IcyPlaySession | null>(null);
  const refreshRef = useRef<Promise<IcyPlaySession | null> | null>(null);

  const applyTokens = useCallback((tokens: TokenResponse) => {
    const session: IcyPlaySession = {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
    };

    sessionRef.current = session;
    storeSession(session);
    apiClient.setAccessToken(session.accessToken);
    return session;
  }, []);

  const clearSession = useCallback(() => {
    sessionRef.current = null;
    refreshRef.current = null;
    clearStoredSession();
    apiClient.clearAccessToken();
    setUser(null);
  }, []);

  /**
   * Resolves the token for outgoing requests, refreshing it first when the
   * current one is expired or about to expire.
   */
  const resolveAccessToken = useCallback(async () => {
    const session = sessionRef.current;

    if (!session) {
      return null;
    }

    const expiresAt = Date.parse(session.expiresAt);
    const isUsable = Number.isNaN(expiresAt) || expiresAt - Date.now() > EXPIRY_SKEW_MS;

    if (isUsable) {
      return session.accessToken;
    }

    refreshRef.current ??= refreshAccessToken(session.refreshToken)
      .then((tokens) => applyTokens(tokens))
      .catch(() => {
        clearSession();
        return null;
      })
      .finally(() => {
        refreshRef.current = null;
      });

    const refreshed = await refreshRef.current;
    return refreshed?.accessToken ?? null;
  }, [applyTokens, clearSession]);

  const refreshUser = useCallback(async () => {
    if (!sessionRef.current) {
      setUser(null);
      return null;
    }

    const currentUser = await getCurrentUser();
    setUser(currentUser);
    return currentUser;
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const tokens = await login({ email, password });
      applyTokens(tokens);

      const currentUser = await getCurrentUser();
      setUser(currentUser);
      return currentUser;
    },
    [applyTokens],
  );

  const signOut = useCallback(async () => {
    const session = sessionRef.current;

    try {
      if (session) {
        await logout(session.refreshToken);
      }
    } catch {
      // The local session is cleared even when the backend call fails so the
      // user is never stuck in a signed-in state.
    } finally {
      clearSession();
    }
  }, [clearSession]);

  useEffect(() => {
    apiClient.configure({
      getAccessToken: resolveAccessToken,
      onUnauthorized: clearSession,
    });
  }, [clearSession, resolveAccessToken]);

  // Keep every open tab in sync: signing out in one tab signs out the rest.
  useEffect(
    () =>
      subscribeToSessionChanges((session) => {
        if (!session) {
          if (sessionRef.current) {
            clearSession();
          }

          return;
        }

        sessionRef.current = session;
        apiClient.setAccessToken(session.accessToken);
        void refreshUser().catch(() => clearSession());
      }),
    [clearSession, refreshUser],
  );

  // Restore the persisted session once on mount.
  useEffect(() => {
    const stored = readStoredSession();

    if (!stored) {
      setIsLoading(false);
      return undefined;
    }

    sessionRef.current = stored;
    apiClient.setAccessToken(stored.accessToken);

    let active = true;

    async function restore() {
      try {
        const currentUser = await getCurrentUser();

        if (active) {
          setUser(currentUser);
        }
      } catch {
        clearSession();
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void restore();

    return () => {
      active = false;
    };
  }, [clearSession]);

  const value = useMemo<IcyPlayAuthContextType>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      signIn,
      signOut,
      refreshUser,
    }),
    [isLoading, refreshUser, signIn, signOut, user],
  );

  return <IcyPlayAuthContext value={value}>{children}</IcyPlayAuthContext>;
}

export default IcyPlayAuthProvider;
