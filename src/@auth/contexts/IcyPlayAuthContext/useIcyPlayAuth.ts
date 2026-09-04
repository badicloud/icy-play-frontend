import { useContext } from "react";
import { IcyPlayAuthContext } from "./IcyPlayAuthContext";

export function useIcyPlayAuth() {
  const context = useContext(IcyPlayAuthContext);

  if (!context) {
    throw new Error("useIcyPlayAuth must be used within an IcyPlayAuthProvider.");
  }

  return context;
}
