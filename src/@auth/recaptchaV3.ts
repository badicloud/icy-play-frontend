const scriptId = "icyplay-recaptcha-v3-script";
let loadPromise: Promise<void> | undefined;

declare global {
  interface Window {
    grecaptcha?: {
      ready: (callback: () => void) => void;
      execute: (
        siteKey: string,
        options: { action: string },
      ) => Promise<string>;
    };
  }
}

function loadRecaptcha(siteKey: string): Promise<void> {
  if (window.grecaptcha?.execute) {
    return Promise.resolve();
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = new Promise((resolve, reject) => {
    const handleReady = () => {
      if (!window.grecaptcha) {
        reject(new Error("reCAPTCHA failed to initialize."));
        return;
      }

      window.grecaptcha.ready(resolve);
    };

    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    const isNewScript = !script;
    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}&badge=bottomright`;
      script.async = true;
      script.defer = true;
    }

    script.addEventListener("load", handleReady, { once: true });

    script.addEventListener(
      "error",
      () =>
        reject(
          new Error("reCAPTCHA could not load. Please refresh and try again."),
        ),
      { once: true },
    );

    if (isNewScript) {
      document.head.appendChild(script);
    } else if (window.grecaptcha) {
      handleReady();
    }
  });

  return loadPromise;
}

export async function preloadRecaptcha(): Promise<void> {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  if (!siteKey) {
    throw new Error("reCAPTCHA is not configured.");
  }

  await loadRecaptcha(siteKey);
}

export async function executeRecaptcha(action: string): Promise<string> {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  if (!siteKey) {
    throw new Error("reCAPTCHA is not configured.");
  }

  await preloadRecaptcha();
  const token = await window.grecaptcha?.execute(siteKey, { action });
  if (!token) {
    throw new Error(
      "reCAPTCHA verification could not be started. Please try again.",
    );
  }

  return token;
}
