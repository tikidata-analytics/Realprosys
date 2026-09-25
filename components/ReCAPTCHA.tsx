"use client";

import { useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from "react";

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
    const widgetIdRef = useRef<number | null>(null);

    // Stable init function that always reads the current widgetIdRef
    const initWidget = useCallback(() => {
      if (typeof window === "undefined" || !window.grecaptcha) return;
      if (widgetIdRef.current !== null) return; // already rendered
      if (!containerRef.current) return;
      widgetIdRef.current = window.grecaptcha.render(containerRef.current, {
        sitekey: siteKey,
        theme,
        callback: () => {},
        "expired-callback": () => {
          if (widgetIdRef.current !== null) window.grecaptcha!.reset(widgetIdRef.current);
        },
        "error-callback": () => {
          if (widgetIdRef.current !== null) window.grecaptcha!.reset(widgetIdRef.current);
        },
      });
    }, [siteKey, theme]);

    useEffect(() => {
      if (!siteKey) return;

      // Already have a widget — don't re-init (handles React StrictMode double-mount)
      if (window.grecaptcha && widgetIdRef.current !== null) return;

      const callbackName = `onReCAPTCHALoad_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      (window as unknown as Record<string, unknown>)[callbackName] = () => {
        initWidget();
      };

      const script = document.createElement("script");
      script.src = `https://www.google.com/recaptcha/api.js?onload=${callbackName}&render=explicit`;
      script.async = true;
      document.head.appendChild(script);

      return () => {
        delete (window as unknown as Record<string, unknown>)[callbackName];
        const existing = document.getElementById(callbackName);
        if (existing) existing.remove();
        // Reset widget so next mount starts fresh (handles pending script callback after unmount)
        if (widgetIdRef.current !== null) {
          try { window.grecaptcha?.reset(widgetIdRef.current); } catch { /* widget may already be gone */ }
          widgetIdRef.current = null;
        }
      };
    }, [siteKey, theme, initWidget]);

    useImperativeHandle(ref, () => ({
      getToken: async () => {
        if (widgetIdRef.current === null || !window.grecaptcha) return "";
        return window.grecaptcha.getResponse(widgetIdRef.current);
      },
      reset: () => {
        if (widgetIdRef.current !== null && window.grecaptcha) {
          window.grecaptcha.reset(widgetIdRef.current);
        }
      },
    }));

    // No data-sitekey attr — we call render() explicitly, not auto-render
    return <div ref={containerRef} className="g-recaptcha" />;
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
