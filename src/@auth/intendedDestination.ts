/**
 * Where somebody was going before they were asked to sign in.
 *
 * Read from the address bar at the moment it is needed rather than through
 * useSearchParams, so a guard sitting in a layout can use it without that
 * layout needing a Suspense boundary it would not otherwise have.
 */
export function intendedDestination() {
  if (typeof window === "undefined") {
    return "/";
  }

  return safeRedirect(new URLSearchParams(window.location.search).get("redirectUrl"));
}

/**
 * Only a path on this site.
 *
 * An open redirect is how a sign-in page becomes a tool for sending people
 * somewhere else with our name on the door. A protocol, a host, or a leading
 * double slash is refused and the reader lands home.
 */
export function safeRedirect(value: string | null) {
  if (value === null || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  return value;
}
