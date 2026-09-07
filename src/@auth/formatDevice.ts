/**
 * Turns a raw user agent into something a person recognises. Deliberately a
 * short table rather than a UA-parsing dependency: the list only has to be good
 * enough to tell one of your own devices from another.
 *
 * Order matters. Edge and Opera both carry "Chrome" in their user agent, and
 * every Chromium browser carries "Safari", so the specific names come first.
 */
const browsers = [
  { name: "Edge", pattern: /Edg[A-Z]?\// },
  { name: "Opera", pattern: /OPR\// },
  { name: "Samsung Internet", pattern: /SamsungBrowser\// },
  { name: "Firefox", pattern: /Firefox\// },
  { name: "Chrome", pattern: /Chrome\// },
  { name: "Safari", pattern: /Safari\// },
] as const;

const systems = [
  { name: "Windows", pattern: /Windows NT/ },
  { name: "Android", pattern: /Android/ },
  { name: "iPhone", pattern: /iPhone/ },
  { name: "iPad", pattern: /iPad/ },
  { name: "macOS", pattern: /Mac OS X/ },
  { name: "Linux", pattern: /Linux/ },
] as const;

export function formatDevice(userAgent: string | null): string {
  if (!userAgent) {
    return "Unknown device";
  }

  const browser = browsers.find((entry) => entry.pattern.test(userAgent))?.name;
  const system = systems.find((entry) => entry.pattern.test(userAgent))?.name;

  if (browser && system) {
    return `${browser} on ${system}`;
  }

  return browser ?? system ?? "Unknown device";
}
