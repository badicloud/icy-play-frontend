"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import FuseLoading from "@fuse/core/FuseLoading";
import { useIcyPlayAuth } from "@auth/contexts/IcyPlayAuthContext/useIcyPlayAuth";

/**
 * The sign out page.
 */
function SignOutPageView() {
  const router = useRouter();
  const { signOut: icyPlaySignOut } = useIcyPlayAuth();

  useEffect(() => {
    let active = true;

    async function clearSession() {
      await icyPlaySignOut();
      await signOut({ redirect: false });

      if (active) {
        router.replace("/sign-in");
        router.refresh();
      }
    }

    void clearSession();
    return () => {
      active = false;
    };
  }, [icyPlaySignOut, router]);

  return <FuseLoading />;
}

export default SignOutPageView;
