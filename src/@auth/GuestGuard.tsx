"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import FuseLoading from "@fuse/core/FuseLoading";
import { useIcyPlayAuth } from "./contexts/IcyPlayAuthContext/useIcyPlayAuth";

type GuestGuardProps = {
  children: React.ReactNode;
};

/**
 * Sends a signed-in visitor home. Wrap only the screens that exist to get
 * someone signed in — sign-out, email verification and password reset stay
 * reachable while signed in, because each is something a signed-in person may
 * still legitimately need to finish.
 */
function GuestGuard({ children }: GuestGuardProps) {
  const { isAuthenticated, isLoading } = useIcyPlayAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || isAuthenticated) {
    return <FuseLoading />;
  }

  return <>{children}</>;
}

export default GuestGuard;
