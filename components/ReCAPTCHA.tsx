"use client";

import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";

export interface ReCAPTCHAHandle {
  getToken: () => Promise<string>;
  reset: () => void;
}

interface ReCAPTCHAProps {
  siteKey: string;
  theme?: "light" | "dark";
}

const ReCAPTCHA = forwardRef<ReCAPTCHAHandle, ReCAPTCHAProps>(
  ({ siteKey, theme = "light" }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetId = useRef<number | null>(null);

    useEffect(() => {
      if (!siteKey || !containerRef.current) return;

      const existing = containerRef.current.querySelector(".g-recaptcha");
      if (existing) existing.remove();

      const callbackName = `onReCAPTCHALoad_${Date.now()}`;
      const scriptId = `recaptcha-script-${callbackName}`;

      const init = () => {
        if (typeof window === "undefined" || !window.grecaptcha) return;
        if (widgetId.current !== null) {
          window.grecaptcha.reset(widgetId.current);
          return;
        }
        widgetId.current = window.grecaptcha.render(containerRef.current!, {
          sitekey: siteKey,
          theme,
          callback: () => {},
          "expired-callback": () => {
            if (widgetId.current !== null) window.grecaptcha.reset(widgetId.current);
          },
          "error-callback": () => {
            if (widgetId.current !== null) window.grecaptcha.reset(widgetId.current);
          },
        });
      };

      if (window.grecaptcha) {
        init();
        return;
      }

      (window as unknown as Record<string, unknown>)[callbackName] = init;

      const script = document.createElement("script");
      script.id = scriptId;
      script.src = `https://www.google.com/recaptcha/api.js?onload=${callbackName}&render=explicit`;
      script.async = true;
      document.head.appendChild(script);

      return () => {
        delete (window as unknown as Record<string, unknown>)[callbackName];
        const s = document.getElementById(scriptId);
        if (s) s.remove();
        if (widgetId.current !== null) {
          window.grecaptcha?.reset(widgetId.current);
          widgetId.current = null;
        }
      };
    }, [siteKey, theme]);

    useImperativeHandle(ref, () => ({
      getToken: async () => {
        if (widgetId.current === null) return "";
        return window.grecaptcha.getResponse(widgetId.current);
      },
      reset: () => {
        if (widgetId.current !== null) window.grecaptcha.reset(widgetId.current);
      },
    }));

    return (
      <div
        ref={containerRef}
        className="g-recaptcha"
        data-sitekey={siteKey}
      />
    );
  }
);

ReCAPTCHA.displayName = "ReCAPTCHA";

declare global {
  interface Window {
    grecaptcha: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          theme?: "light" | "dark";
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
        }
      ) => number;
      getResponse: (widgetId: number) => string;
      reset: (widgetId: number) => void;
    };
  }
}

export default ReCAPTCHA;
