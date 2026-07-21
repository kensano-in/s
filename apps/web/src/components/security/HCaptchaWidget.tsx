'use client';

import { useEffect, useRef, useState } from 'react';

// hCaptcha attaches itself to window at runtime — augment global to satisfy TypeScript
declare global {
  interface Window {
    hcaptcha?: any;
    onHCaptchaVerify?: (token: string) => void;
    onHCaptchaLoaded?: () => void;
  }
}

interface HCaptchaWidgetProps {
  onVerify?: (token: string) => void;
}

/**
 * hCaptcha Widget Component
 */
export default function HCaptchaWidget({ onVerify }: HCaptchaWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rawSiteKey = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY;
  // Sanitize site key to strip any literal quotes or spaces
  const siteKey = rawSiteKey?.replace(/['"]/g, '').trim();
  const widgetIdRef = useRef<string | null>(null);
  const [showFallback, setShowFallback] = useState(false);

  // Keep callback reference updated without triggering re-runs
  const onVerifyRef = useRef(onVerify);
  useEffect(() => {
    onVerifyRef.current = onVerify;
  }, [onVerify]);

  // Fallback timer: if hCaptcha hasn't loaded in 3 seconds, show bypass button
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!widgetIdRef.current) {
        setShowFallback(true);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!siteKey) return;

    // Expose a global callback that delegates to the current ref
    window.onHCaptchaVerify = (token: string) => {
      onVerifyRef.current?.(token);
    };

    const renderCaptcha = () => {
      if (window.hcaptcha && containerRef.current && !widgetIdRef.current) {
        try {
          containerRef.current.innerHTML = ''; // Clear container
          const id = window.hcaptcha.render(containerRef.current, {
            sitekey: siteKey,
            theme: 'dark',
            callback: 'onHCaptchaVerify'
          });
          widgetIdRef.current = id;
          setShowFallback(false);
        } catch (err) {
          console.error('Failed to render hCaptcha:', err);
        }
      }
    };

    window.onHCaptchaLoaded = () => {
      renderCaptcha();
    };

    // Polling fallback to capture script load regardless of event listener timing
    const pollingInterval = setInterval(() => {
      if (window.hcaptcha && containerRef.current && !widgetIdRef.current) {
        renderCaptcha();
        clearInterval(pollingInterval);
      }
    }, 100);

    if (window.hcaptcha) {
      renderCaptcha();
    } else {
      let script = document.querySelector('script[src*="hcaptcha.com/1/api.js"]') as HTMLScriptElement;
      if (!script) {
        script = document.createElement('script');
        script.src = 'https://js.hcaptcha.com/1/api.js?onload=onHCaptchaLoaded&render=explicit';
        script.async = true;
        script.defer = true;
        document.body.appendChild(script);
      } else {
        script.addEventListener('load', renderCaptcha);
      }
    }

    return () => {
      window.onHCaptchaVerify = undefined;
      clearInterval(pollingInterval);
      
      if (window.hcaptcha && widgetIdRef.current) {
        try {
          window.hcaptcha.reset(widgetIdRef.current);
        } catch (e) {}
        widgetIdRef.current = null;
      }
    };
  }, [siteKey]); // Only depend on siteKey!

  if (!siteKey) {
    return (
      <div className="space-y-3">
        <div className="p-3 bg-yellow-500/10 border border-yellow-500/50 rounded-lg text-yellow-500 text-[10px] font-bold uppercase tracking-wider text-center">
          Security: NEXT_PUBLIC_HCAPTCHA_SITE_KEY missing. Bypass mode active.
        </div>
        <button
          type="button"
          onClick={() => onVerify?.('bypass-token-dev')}
          className="w-full h-10 bg-white/[0.03] border border-white/10 rounded-xl text-[11px] font-bold text-neutral-400 hover:text-white hover:bg-white/[0.05] transition-all"
        >
          Bypass CAPTCHA (Dev Mode)
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center my-2 min-h-[78px] w-full">
      <div ref={containerRef} />
      {showFallback && !widgetIdRef.current && (
        <div className="w-full mt-2 p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-3 animate-fadeIn">
          <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider text-center">Alternative Verification</p>
          <label className="flex items-start gap-3 p-3 bg-white/[0.02] border border-white/5 rounded-xl cursor-pointer hover:bg-white/[0.04] transition-all">
            <input
              type="checkbox"
              onChange={(e) => {
                if (e.target.checked) {
                  onVerifyRef.current?.('bypass-token-dev');
                } else {
                  onVerifyRef.current?.('');
                }
              }}
              className="mt-0.5 rounded border-white/10 bg-white/5 text-violet-500 focus:ring-0 focus:ring-offset-0"
            />
            <span className="text-[11px] text-neutral-300 font-medium select-none leading-tight">
              I confirm that I am a human user.
            </span>
          </label>
        </div>
      )}
    </div>
  );
}
