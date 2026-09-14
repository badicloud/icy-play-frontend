"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { useRouter } from "next/navigation";
import FuseLoading from "@fuse/core/FuseLoading";
import { readStoredSession } from "./icyPlaySession";
import { useIcyPlayAuth } from "./contexts/IcyPlayAuthContext/useIcyPlayAuth";

/**
 * Before paint in the browser; the ordinary effect on the server, which has no
 * paint and would only warn about being asked for one.
 */
const useBeforePaint = typeof window === "undefined" ? useEffect : useLayoutEffect;

type AuthGuardProps = {
  children: React.ReactNode;
};

/**
 * Keeps a page that holds somebody's own records away from anybody without a
 * session, and brings them back to it once they have one.
 *
 * Two questions, answered at two speeds.
 *
 * Whether a session EXISTS is in browser storage and can be read synchronously.
 * So somebody signed out never sees the page: no shell, no spinner, no message
 * about a booking that could not be found — the redirect is under way before
 * anything is painted. That is the common case and the one this exists for.
 *
 * Whether that session is still GOOD needs the server and takes a moment, and a
 * visitor holding one waits on a loading screen while it is checked. That is
 * what is actually happening, and worth saying.
 *
 * Nothing is rendered until the browser has had its say, so the server's HTML
 * and the first client render agree: the server cannot read browser storage,
 * and a guard that guessed there would either leak a frame of the page or warn
 * about hydration on every load.
 *
 * Truly refusing the page before the first byte would mean moving the session
 * out of browser storage and into a cookie, which is the only thing a server
 * can read while it renders.
 */
function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useIcyPlayAuth();
  const router = useRouter();
  const [inTheBrowser, setInTheBrowser] = useState(false);

  useEffect(() => {
    setInTheBrowser(true);
  }, []);

  // Read on each render rather than once: signing out in another tab clears it,
  // and this page must not stay open on somebody else's records.
  const hasSession = inTheBrowser && readStoredSession() !== null;
  const turnedAway = inTheBrowser && (!hasSession || (!isLoading && !isAuthenticated));

  useBeforePaint(() => {
    if (!turnedAway) {
      return;
    }

    const here = `${window.location.pathname}${window.location.search}`;

    router.replace(`/sign-in?redirectUrl=${encodeURIComponent(here)}`);
  }, [router, turnedAway]);

  if (!inTheBrowser || turnedAway) {
    // Nothing at all. A spinner for somebody being turned away is a page being
    // shown to somebody who is not allowed one.
    return null;
  }

  if (isLoading || !isAuthenticated) {
    return <FuseLoading />;
  }

  return <>{children}</>;
}

export default AuthGuard;
