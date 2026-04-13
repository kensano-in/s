'use client';

import { useEffect, useRef } from 'react';

// hCaptcha attaches itself to window at runtime — augment global to satisfy TypeScript
declare global {
  interface Window {
    hcaptcha?: any;
  }
}


/**
 * hCaptcha Widget Component
 */
export default function HCaptchaWidget() {
  const containerRef = useRef<HTMLDivElement>(null);
  const siteKey = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY;

  useEffect(() => {
    // Load hCaptcha script if not already present
    if (!window.hcaptcha) {
      const script = document.createElement('script');
      script.src = 'https://js.hcaptcha.com/1/api.js';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }
  }, []);

  if (!siteKey) {
    return (
      <div className="p-3 bg-yellow-500/10 border border-yellow-500/50 rounded-lg text-yellow-500 text-[10px] font-bold uppercase tracking-wider">
        Security: NEXT_PUBLIC_HCAPTCHA_SITE_KEY missing. Bypass mode active.
      </div>
    );
  }

  return (
    <div className="flex justify-center my-4">
      <div 
        ref={containerRef}
        className="h-captcha" 
        data-sitekey={siteKey}
        data-theme="dark"
      ></div>
    </div>
  );
}
