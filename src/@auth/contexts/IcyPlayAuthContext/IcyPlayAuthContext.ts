import { createContext } from "react";
import type { CurrentUserResponse } from "@auth/authenticationApi";

export type IcyPlayAuthContextType = {
  /** The signed-in backend user, or null when nobody is signed in. */
  user: CurrentUserResponse | null;
  isAuthenticated: boolean;
  /** True while the stored session is being restored on first render. */
  isLoading: boolean;
  signIn: (
    email: string,
    password: string,
    captchaToken: string,
    rememberMe: boolean,
  ) => Promise<CurrentUserResponse>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<CurrentUserResponse | null>;
};

export const IcyPlayAuthContext = createContext<IcyPlayAuthContextType | undefined>(undefined);
