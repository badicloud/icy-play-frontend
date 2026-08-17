"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import FuseLoading from "@fuse/core/FuseLoading";
import { apiClient } from "@/services/api";

/**
 * The sign out page.
 */
function SignOutPageView() {
  const router = useRouter();

  useEffect(() => {
    let active = true;

    async function clearSession() {
      apiClient.clearAccessToken();
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
  }, [router]);

  return <FuseLoading />;
}

export default SignOutPageView;
