"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import FuseLoading from "@fuse/core/FuseLoading";
import { useIcyPlayAuth } from "./contexts/IcyPlayAuthContext/useIcyPlayAuth";

type RoleGuardProps = {
  /** Any one of these roles is enough. */
  roles: readonly string[];
  children: React.ReactNode;
};

/**
 * Gates a route on the signed-in user's roles.
 *
 * The Fuse control panel is guarded by AuthGuardRedirect, which reads the
 * next-auth session rather than IcyPlayAuthProvider, so it cannot be reused
 * here without either bouncing our users or exposing the whole demo.
 */
function RoleGuard({ roles, children }: RoleGuardProps) {
  const { user, isAuthenticated, isLoading } = useIcyPlayAuth();
  const router = useRouter();
  const isAllowed = Boolean(user?.roles.some((role) => roles.includes(role)));

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!isAuthenticated) {
      router.replace("/sign-in");
      return;
    }

    if (!isAllowed) {
      router.replace("/401");
    }
  }, [isAllowed, isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated || !isAllowed) {
    return <FuseLoading />;
  }

  return <>{children}</>;
}

export default RoleGuard;
