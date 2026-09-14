"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import FuseLoading from "@fuse/core/FuseLoading";
import { intendedDestination } from "./intendedDestination";
import { useIcyPlayAuth } from "./contexts/IcyPlayAuthContext/useIcyPlayAuth";

type GuestGuardProps = {
  children: React.ReactNode;
};

/**
 * Sends a signed-in visitor away from the screens that exist to sign somebody
 * in. Wrap only those — sign-out, email verification and password reset stay
 * reachable while signed in, because each is something a signed-in person may
 * still legitimately need to finish.
 *
 * Away means `redirectUrl` when there is one, not home. This guard runs the
 * instant signing in flips the context, which is sooner than the form's own
 * push, so a guard that always went home sent everybody home however carefully
 * the form had worked out where they came from.
 */
function GuestGuard({ children }: GuestGuardProps) {
  const { isAuthenticated, isLoading } = useIcyPlayAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace(intendedDestination());
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || isAuthenticated) {
    return <FuseLoading />;
  }

  return <>{children}</>;
}

export default GuestGuard;
