'use client';

import { useState, useEffect, useCallback, useTransition, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { login, signup, checkUsernameAvailability, suggestUsernames, findAccountByEmailOrUsername, findAccountByPhone } from '@/app/login/actions';
import {
  Plus, ArrowRight, ChevronDown, Info, HelpCircle, CheckCircle2, AlertCircle, Loader2, Sparkles, ArrowLeft, Phone, Mail, ShieldAlert, Fingerprint, ShieldCheck, Users2, ScrollText
} from 'lucide-react';
import HCaptchaWidget from '@/components/security/HCaptchaWidget';
import LegalOverlay, { LegalSection } from './LegalOverlay';
import CinematicLogo from './CinematicLogo';
import { useDebounce } from '@/hooks/use-debounce';

// High-Fidelity Phone Format Engine
const formatPhoneNumber = (value: string | null | undefined, iso: string) => {
  const digits = (value || '').replace(/\D/g, '');

  if (iso === 'in') { // India: +91 XXXXX XXXXX
    if (digits.length <= 5) return digits;
    return `${digits.slice(0, 5)} ${digits.slice(5, 10)}`;
  }

  if (iso === 'us' || iso === 'ca') { // US/Canada: +1 (XXX) XXX-XXXX
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  }

  // Global Fallback: XXX XXX XXXX (staggered)
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 12)}`;
};

interface AuthFlowProps {
  initialMode?: 'login' | 'signup';
  isSuspicious: boolean;
  message?: string;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const TAGLINES = [
  { text: 'Establish', color: 'from-emerald-400 to-emerald-200', glow: 'shadow-emerald-500/20' },
  { text: 'Secure', color: 'from-blue-400 to-blue-200', glow: 'shadow-blue-500/20' },
  { text: 'Verify', color: 'from-purple-400 to-purple-200', glow: 'shadow-purple-500/20' },
  { text: 'Restore', color: 'from-rose-400 to-rose-200', glow: 'shadow-rose-500/20' }
];

const COUNTRIES = [
  { name: 'India', code: '+91', iso: 'in' },
  { name: 'United States', code: '+1', iso: 'us' },
  { name: 'United Kingdom', code: '+44', iso: 'gb' },
  { name: 'Canada', code: '+1', iso: 'ca' },
  { name: 'Australia', code: '+61', iso: 'au' },
  { name: 'United Arab Emirates', code: '+971', iso: 'ae' },
  { name: 'Singapore', code: '+65', iso: 'sg' },
  { name: 'Germany', code: '+49', iso: 'de' },
  { name: 'France', code: '+33', iso: 'fr' },
  { name: 'Japan', code: '+81', iso: 'jp' },
  { name: 'Afghanistan', code: '+93', iso: 'af' },
  { name: 'Albania', code: '+355', iso: 'al' },
  { name: 'Algeria', code: '+213', iso: 'dz' },
  { name: 'Andorra', code: '+376', iso: 'ad' },
  { name: 'Angola', code: '+244', iso: 'ao' },
  { name: 'Argentina', code: '+54', iso: 'ar' },
  { name: 'Armenia', code: '+374', iso: 'am' },
  { name: 'Austria', code: '+43', iso: 'at' },
  { name: 'Azerbaijan', code: '+994', iso: 'az' },
  { name: 'Bahamas', code: '+1', iso: 'bs' },
  { name: 'Bahrain', code: '+973', iso: 'bh' },
  { name: 'Bangladesh', code: '+880', iso: 'bd' },
  { name: 'Barbados', code: '+1', iso: 'bb' },
  { name: 'Belarus', code: '+375', iso: 'by' },
  { name: 'Belgium', code: '+32', iso: 'be' },
  { name: 'Belize', code: '+501', iso: 'bz' },
  { name: 'Benin', code: '+229', iso: 'bj' },
  { name: 'Bhutan', code: '+975', iso: 'bt' },
  { name: 'Bolivia', code: '+591', iso: 'bo' },
  { name: 'Bosnia', code: '+387', iso: 'ba' },
  { name: 'Botswana', code: '+267', iso: 'bw' },
  { name: 'Brazil', code: '+55', iso: 'br' },
  { name: 'Brunei', code: '+673', iso: 'bn' },
  { name: 'Bulgaria', code: '+359', iso: 'bg' },
  { name: 'Burkina Faso', code: '+226', iso: 'bf' },
  { name: 'Burundi', code: '+257', iso: 'bi' },
  { name: 'Cambodia', code: '+855', iso: 'kh' },
  { name: 'Cameroon', code: '+237', iso: 'cm' },
  { name: 'Cape Verde', code: '+238', iso: 'cv' },
  { name: 'Chad', code: '+235', iso: 'td' },
  { name: 'Chile', code: '+56', iso: 'cl' },
  { name: 'China', code: '+86', iso: 'cn' },
  { name: 'Colombia', code: '+57', iso: 'co' },
  { name: 'Comoros', code: '+269', iso: 'km' },
  { name: 'Congo', code: '+242', iso: 'cg' },
  { name: 'Costa Rica', code: '+506', iso: 'cr' },
  { name: 'Croatia', code: '+385', iso: 'hr' },
  { name: 'Cuba', code: '+53', iso: 'cu' },
  { name: 'Cyprus', code: '+357', iso: 'cy' },
  { name: 'Czech Republic', code: '+420', iso: 'cz' },
  { name: 'Denmark', code: '+45', iso: 'dk' },
  { name: 'Djibouti', code: '+253', iso: 'dj' },
  { name: 'Dominica', code: '+1', iso: 'dm' },
  { name: 'Dominican Republic', code: '+1', iso: 'do' },
  { name: 'Ecuador', code: '+593', iso: 'ec' },
  { name: 'Egypt', code: '+20', iso: 'eg' },
  { name: 'El Salvador', code: '+503', iso: 'sv' },
  { name: 'Estonia', code: '+372', iso: 'ee' },
  { name: 'Ethiopia', code: '+251', iso: 'et' },
  { name: 'Fiji', code: '+679', iso: 'fj' },
  { name: 'Finland', code: '+358', iso: 'fi' },
  { name: 'Gabon', code: '+241', iso: 'ga' },
  { name: 'Gambia', code: '+220', iso: 'gm' },
  { name: 'Georgia', code: '+995', iso: 'ge' },
  { name: 'Ghana', code: '+233', iso: 'gh' },
  { name: 'Greece', code: '+30', iso: 'gr' },
  { name: 'Greenland', code: '+299', iso: 'gl' },
  { name: 'Grenada', code: '+1', iso: 'gd' },
  { name: 'Guatemala', code: '+502', iso: 'gt' },
  { name: 'Guinea', code: '+224', iso: 'gn' },
  { name: 'Guyana', code: '+592', iso: 'gy' },
  { name: 'Haiti', code: '+509', iso: 'ht' },
  { name: 'Honduras', code: '+504', iso: 'hn' },
  { name: 'Hong Kong', code: '+852', iso: 'hk' },
  { name: 'Hungary', code: '+36', iso: 'hu' },
  { name: 'Iceland', code: '+354', iso: 'is' },
  { name: 'Indonesia', code: '+62', iso: 'id' },
  { name: 'Iran', code: '+98', iso: 'ir' },
  { name: 'Iraq', code: '+964', iso: 'iq' },
  { name: 'Ireland', code: '+353', iso: 'ie' },
  { name: 'Israel', code: '+972', iso: 'il' },
  { name: 'Italy', code: '+39', iso: 'it' },
  { name: 'Jamaica', code: '+1', iso: 'jm' },
  { name: 'Jordan', code: '+962', iso: 'jo' },
  { name: 'Kazakhstan', code: '+7', iso: 'kz' },
  { name: 'Kenya', code: '+254', iso: 'ke' },
  { name: 'Kuwait', code: '+965', iso: 'kw' },
  { name: 'Kyrgyzstan', code: '+996', iso: 'kg' },
  { name: 'Laos', code: '+856', iso: 'la' },
  { name: 'Latvia', code: '+371', iso: 'lv' },
  { name: 'Lebanon', code: '+961', iso: 'lb' },
  { name: 'Lesotho', code: '+266', iso: 'ls' },
  { name: 'Liberia', code: '+231', iso: 'lr' },
  { name: 'Libya', code: '+218', iso: 'ly' },
  { name: 'Liechtenstein', code: '+423', iso: 'li' },
  { name: 'Lithuania', code: '+370', iso: 'lt' },
  { name: 'Luxembourg', code: '+352', iso: 'lu' },
  { name: 'Macao', code: '+853', iso: 'mo' },
  { name: 'Madagascar', code: '+261', iso: 'mg' },
  { name: 'Malawi', code: '+265', iso: 'mw' },
  { name: 'Malaysia', code: '+60', iso: 'my' },
  { name: 'Maldives', code: '+960', iso: 'mv' },
  { name: 'Mali', code: '+223', iso: 'ml' },
  { name: 'Malta', code: '+356', iso: 'mt' },
  { name: 'Mauritania', code: '+222', iso: 'mr' },
  { name: 'Mauritius', code: '+230', iso: 'mu' },
  { name: 'Mexico', code: '+52', iso: 'mx' },
  { name: 'Moldova', code: '+373', iso: 'md' },
  { name: 'Monaco', code: '+377', iso: 'mc' },
  { name: 'Mongolia', code: '+976', iso: 'mn' },
  { name: 'Montenegro', code: '+382', iso: 'me' },
  { name: 'Morocco', code: '+212', iso: 'ma' },
  { name: 'Mozambique', code: '+258', iso: 'mz' },
  { name: 'Myanmar', code: '+95', iso: 'mm' },
  { name: 'Namibia', code: '+264', iso: 'na' },
  { name: 'Nepal', code: '+977', iso: 'np' },
  { name: 'Netherlands', code: '+31', iso: 'nl' },
  { name: 'New Zealand', code: '+64', iso: 'nz' },
  { name: 'Nicaragua', code: '+505', iso: 'ni' },
  { name: 'Niger', code: '+227', iso: 'ne' },
  { name: 'Nigeria', code: '+234', iso: 'ng' },
  { name: 'North Korea', code: '+850', iso: 'kp' },
  { name: 'Norway', code: '+47', iso: 'no' },
  { name: 'Oman', code: '+968', iso: 'om' },
  { name: 'Pakistan', code: '+92', iso: 'pk' },
  { name: 'Palestine', code: '+970', iso: 'ps' },
  { name: 'Panama', code: '+507', iso: 'pa' },
  { name: 'Paraguay', code: '+595', iso: 'py' },
  { name: 'Peru', code: '+51', iso: 'pe' },
  { name: 'Philippines', code: '+63', iso: 'ph' },
  { name: 'Poland', code: '+48', iso: 'pl' },
  { name: 'Portugal', code: '+351', iso: 'pt' },
  { name: 'Qatar', code: '+974', iso: 'qa' },
  { name: 'Romania', code: '+40', iso: 'ro' },
  { name: 'Russia', code: '+7', iso: 'ru' },
  { name: 'Rwanda', code: '+250', iso: 'rw' },
  { name: 'Saudi Arabia', code: '+966', iso: 'sa' },
  { name: 'Senegal', code: '+221', iso: 'sn' },
  { name: 'Serbia', code: '+381', iso: 'rs' },
  { name: 'Seychelles', code: '+248', iso: 'sc' },
  { name: 'Sierra Leone', code: '+232', iso: 'sl' },
  { name: 'Slovakia', code: '+421', iso: 'sk' },
  { name: 'Slovenia', code: '+386', iso: 'si' },
  { name: 'Somalia', code: '+252', iso: 'so' },
  { name: 'South Africa', code: '+27', iso: 'za' },
  { name: 'South Korea', code: '+82', iso: 'kr' },
  { name: 'Spain', code: '+34', iso: 'es' },
  { name: 'Sri Lanka', code: '+94', iso: 'lk' },
  { name: 'Sudan', code: '+249', iso: 'sd' },
  { name: 'Suriname', code: '+597', iso: 'sr' },
  { name: 'Sweden', code: '+46', iso: 'se' },
  { name: 'Switzerland', code: '+41', iso: 'ch' },
  { name: 'Syria', code: '+963', iso: 'sy' },
  { name: 'Taiwan', code: '+886', iso: 'tw' },
  { name: 'Tajikistan', code: '+992', iso: 'tj' },
  { name: 'Tanzania', code: '+255', iso: 'tz' },
  { name: 'Thailand', code: '+66', iso: 'th' },
  { name: 'Tunisia', code: '+216', iso: 'tn' },
  { name: 'Turkey', code: '+90', iso: 'tr' },
  { name: 'Turkmenistan', code: '+993', iso: 'tm' },
  { name: 'Uganda', code: '+256', iso: 'ug' },
  { name: 'Ukraine', code: '+380', iso: 'ua' },
  { name: 'Uruguay', code: '+598', iso: 'uy' },
  { name: 'Uzbekistan', code: '+998', iso: 'uz' },
  { name: 'Vatican', code: '+39', iso: 'va' },
  { name: 'Venezuela', code: '+58', iso: 've' },
  { name: 'Vietnam', code: '+84', iso: 'vn' },
  { name: 'Yemen', code: '+967', iso: 'ye' },
  { name: 'Zambia', code: '+260', iso: 'zm' },
  { name: 'Zimbabwe', code: '+263', iso: 'zw' }
];

export default function AuthFlow({ initialMode = 'login', isSuspicious, message }: AuthFlowProps) {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot' | 'recoveryHelp'>(initialMode);
  const [recoveryType, setRecoveryType] = useState<'email' | 'phone'>('email');
  const [loading, setLoading] = useState(false);
  const [activeLegal, setActiveLegal] = useState<LegalSection | null>(null);
  const [showSecurityNotice, setShowSecurityNotice] = useState(false);

  // Security Hub States
  const [showAuditEntry, setShowAuditEntry] = useState(false);
  const [auditStatement, setAuditStatement] = useState('');
  const [auditStatus, setAuditStatus] = useState<'idle' | 'requesting' | 'success' | 'error'>('idle');
  const [auditError, setAuditError] = useState('');

  // Proxy States
  const [showProxyEntry, setShowProxyEntry] = useState(false);
  const [proxyHandle, setProxyHandle] = useState('');
  const [proxyStatus, setProxyStatus] = useState<'idle' | 'checking' | 'success' | 'error'>('idle');
  const [proxyError, setProxyError] = useState('');

  // Hardware States
  const [showHardwareScan, setShowHardwareScan] = useState(false);
  const [hardwareStatus, setHardwareStatus] = useState<'idle' | 'scanning' | 'success' | 'failed'>('idle');

  // Username Logic State
  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [captchaToken, setCaptchaToken] = useState<string>('');
  
  const [showTermsPopup, setShowTermsPopup] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const debouncedUsername = useDebounce(username, 500);

  // Discovery Engine States
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [recoverySuccess, setRecoverySuccess] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState('');

  // Genesis State
  const [isMaterialized, setIsMaterialized] = useState(false);

  // 🚨 GPU Compositor Fix: Force repaint when cinematic ends
  // Equivalent to Alt-Tab - flushes the fixed-position compositing layer
  useEffect(() => {
    if (!isMaterialized) return;
    const raf = requestAnimationFrame(() => {
      void document.body.offsetHeight; // synchronous reflow
      requestAnimationFrame(() => {
        void document.body.offsetHeight; // second flush to catch laggard layers
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [isMaterialized]);

  // Country Security State
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  // Identity Pulse State
  const [taglineIdx, setTaglineIdx] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const calculateMagnetic = (taglineRef: HTMLElement | null) => {
    if (!taglineRef) return { x: 0, y: 0 };
    const rect = taglineRef.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dist = Math.sqrt(Math.pow(mousePos.x - centerX, 2) + Math.pow(mousePos.y - centerY, 2));

    if (dist < 200) {
      return {
        x: (mousePos.x - centerX) * 0.1,
        y: (mousePos.y - centerY) * 0.1
      };
    }
    return { x: 0, y: 0 };
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setTaglineIdx((prev) => (prev + 1) % TAGLINES.length);
    }, 3200);
    return () => clearInterval(timer);
  }, []);

  // Birthday state
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i);
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  const toggleMode = () => {
    const nextMode = mode === 'login' ? 'signup' : 'login';
    setMode(nextMode);
    setShowTermsPopup(false);
    if (nextMode === 'login') {
      window.history.pushState(null, '', '/login');
    } else {
      window.history.pushState(null, '', '/join');
    }
  };

  const handleForgotClick = () => {
    setMode('forgot');
    setShowSecurityNotice(true);
  };

  const handleBack = () => {
    if (showAuditEntry) {
      setShowAuditEntry(false);
      setAuditStatus('idle');
      return;
    }
    if (showProxyEntry) {
      setShowProxyEntry(false);
      setProxyStatus('idle');
      return;
    }
    if (showHardwareScan) {
      setShowHardwareScan(false);
      setHardwareStatus('idle');
      return;
    }

    if (mode === 'recoveryHelp') {
      setMode('forgot');
    } else {
      setMode('login');
      setRecoveryType('email');
      setRecoverySuccess(false);
      setRecoveryMessage('');
    }
  };

  // Username Validation & Availability
  const validateUsername = (val: string) => {
    const regex = /^[a-z0-9_.]+$/;
    if (!regex.test(val)) return false;
    if (val.endsWith('.')) return false;
    if (val.length < 5) return false;
    return true;
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.toLowerCase().trim();
    val = val.replace(/[^a-z0-9_.]/g, '');
    setUsername(val);

    if (val.length === 0) {
      setUsernameStatus('idle');
      return;
    }

    if (!validateUsername(val)) {
      setUsernameStatus('invalid');
    } else {
      setUsernameStatus('checking');
    }
  };

  // Provide a safe transition bounds for Next.js actions
  const [isPending, startTransition] = useTransition();

  // Ensure loading state resets if we receive an error from the server!
  useEffect(() => {
    if (message) {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    // If the transition finishes but we are still 'loading', we should unspin.
    // This catches silent errors or navigation cancellations.
    if (!isPending && loading && !message) {
      // 500ms grace period to allow Next.js navigation to paint before removing spinner
      const timer = setTimeout(() => setLoading(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isPending, loading, message]);

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (mode === 'signup' && !termsAccepted) {
      setShowTermsPopup(true);
      return;
    }

    setLoading(true);
    const formData = new FormData(e.currentTarget);

    startTransition(() => {
      if (mode === 'login') {
        login(formData);
      } else if (mode === 'signup') {
        signup(formData);
      }
    });
  };

  useEffect(() => {
    if (debouncedUsername && usernameStatus === 'checking') {
      const check = async () => {
        const { available } = await checkUsernameAvailability(debouncedUsername);

        // Final sanity check: Do not update if the user has changed the string
        // or if the string is no longer valid (min 5 chars).
        if (debouncedUsername !== username || !validateUsername(debouncedUsername)) {
          return;
        }

        if (available) {
          setUsernameStatus('available');
          setSuggestions([]);
        } else {
          setUsernameStatus('taken');
          const sugs = await suggestUsernames(debouncedUsername);
          setSuggestions(sugs);
        }
      };
      check();
    }
  }, [debouncedUsername, usernameStatus, username]);

  const applySuggestion = (sug: string) => {
    setUsername(sug);
    setUsernameStatus('available');
    setSuggestions([]);
  };

  return (
    <div className="w-full max-w-[400px] mx-auto relative z-10 px-4">
      {/* Navigation Header */}
      <div className="flex flex-col items-center mb-10 text-center -mt-8">
        {!isMaterialized ? (
          <div>
            <CinematicLogo onComplete={() => setIsMaterialized(true)} />
          </div>
        ) : (
          <motion.div 
            key="stabilized-header"
            initial={{ opacity: 0, filter: 'blur(10px)' }}
            animate={{ opacity: 1, filter: 'blur(0px)' }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex flex-col items-center"
          >
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative flex items-end justify-center mb-2 group cursor-none"
            >
              <div className="flex items-end gap-2 text-[15px] font-bold tracking-tight">
                <div className="relative h-[22px] w-[75px] flex items-end justify-end overflow-hidden pb-[1px]">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={TAGLINES[taglineIdx].text}
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -20, opacity: 0 }}
                      transition={{ 
                        type: "spring",
                        stiffness: 400,
                        damping: 30
                      }}
                      className="absolute right-0 flex items-center justify-center translate-y-[2px]"
                    >
                      {/* Ghost Layers for Chromatic Aberration */}
                      <span className="absolute right-0 text-red-500/10 translate-x-[0.5px] blur-[3px] pointer-events-none">
                        {TAGLINES[taglineIdx].text}
                      </span>
                      <span className="absolute right-0 text-cyan-500/10 translate-x-[-0.5px] blur-[3px] pointer-events-none">
                        {TAGLINES[taglineIdx].text}
                      </span>
                      
                      <span className={`relative bg-gradient-to-r ${TAGLINES[taglineIdx].color} bg-clip-text text-transparent`}>
                        {TAGLINES[taglineIdx].text}
                      </span>
                    </motion.div>
                  </AnimatePresence>
                </div>
                <span className="text-white/30 font-bold uppercase text-[9px] tracking-[0.3em] ml-1 mb-[3.5px]">Network</span>
              </div>
            </motion.div>
            
            <div className="relative -mt-4">
              <div className="text-[84px] font-black text-white tracking-[-0.15em] transition-all duration-500 hover:scale-105 cursor-default relative z-10 leading-none">V</div>
              <div className="absolute inset-x-0 -bottom-4 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="mt-6"
            >
              <h2 className="text-xl font-bold text-white tracking-tight">
                {mode === 'forgot' && 'Find your account'}
                {mode === 'recoveryHelp' && 'Identity Escalation Hub'}
                {(mode === 'login' || mode === 'signup') && 'Welcome back'}
              </h2>
              <p className="text-neutral-500 text-[13px] mt-2 font-medium">
                {mode === 'login' && 'Access your identity'}
                {mode === 'signup' && 'Create your account'}
                {mode === 'forgot' && (recoveryType === 'email' ? 'Enter your email or username' : 'Enter your mobile number')}
                {mode === 'recoveryHelp' && 'Premium alternative recovery vectors'}
              </p>
            </motion.div>
          </motion.div>
        )}
      </div>

      <div className="relative">
        {isMaterialized && (
          <motion.div
            initial={{ opacity: 0, y: 30, filter: 'blur(15px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{
              duration: 1.2,
              ease: [0.22, 1, 0.36, 1],
              delay: 0.2
            }}
            className="relative"
          >
            <div className="bg-black/40 border border-white/5 rounded-[2.5rem] p-8 sm:p-12 shadow-2xl backdrop-blur-3xl overflow-hidden group/container">
      {message && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-[11px] font-bold uppercase tracking-widest flex items-center gap-3">
                  <div className="w-1 h-1 rounded-full bg-red-500" />
                  {message}
                </div>
              )}

              <form ref={formRef} className="space-y-4" onSubmit={handleFormSubmit}>
                <AnimatePresence mode="wait">
                  {mode === 'forgot' && (
                    <motion.div
                      key="forgot-view"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-4"
                    >
                      {/* Can't Reset Link - CREATIVE HUB TRIGGER */}
                      <div className="flex justify-start ml-1">
                        <button
                          type="button"
                          onClick={() => setMode('recoveryHelp')}
                          className="text-[10px] font-black uppercase tracking-widest text-blue-500 hover:text-blue-400 transition-all underline decoration-blue-500/30 underline-offset-4"
                        >
                          Can&apos;t reset your password?
                        </button>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <div className="relative group overflow-hidden rounded-xl">
                            <input
                              name="identifier"
                              value={forgotIdentifier}
                              onChange={(e) => setForgotIdentifier(e.target.value)}
                              type={recoveryType === 'email' ? 'text' : 'tel'}
                              required
                              placeholder={recoveryType === 'email' ? 'Email or username' : 'Mobile number'}
                              className="w-full h-12 bg-white/[0.03] border border-white/5 rounded-xl px-4 text-white placeholder:text-neutral-700 outline-none focus:border-white/20 focus:bg-white/[0.05] transition-all text-sm font-medium"
                            />
                          </div>
                        </div>

                        {recoveryMessage && (
                          <div className={`p-4 rounded-xl flex items-center gap-3 ${recoverySuccess ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-500' : 'bg-rose-500/10 border border-rose-500/20 text-rose-500'}`}>
                            {recoverySuccess ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                            <span className="text-[11px] font-bold uppercase tracking-widest">{recoveryMessage}</span>
                          </div>
                        )}

                        {recoverySuccess ? (
                          <div className="text-center py-4 space-y-4">
                            <p className="text-neutral-500 text-[11px] leading-relaxed font-medium">
                              We have dispatched a specialized security signal to the identity markers associated with this account. Please verify your inbox/messages to establish the restoration.
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                setMode('login');
                                setRecoverySuccess(false);
                                setRecoveryMessage('');
                              }}
                              className="text-[11px] font-bold text-white hover:underline transition-all"
                            >
                              Back to Login
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={async () => {
                              const cleanIdentifier = forgotIdentifier.trim();
                              if (!cleanIdentifier) return;
                              setLoading(true);
                              setRecoveryMessage('');
                              try {
                                const res = recoveryType === 'email'
                                  ? await findAccountByEmailOrUsername(cleanIdentifier)
                                  : await findAccountByPhone(cleanIdentifier);

                                if (res.success) {
                                  setRecoverySuccess(true);
                                  setRecoveryMessage('Identity located');
                                } else {
                                  setRecoveryMessage(res.error || 'Identity not found');
                                }
                              } catch (err) {
                                setRecoveryMessage('Security system timeout');
                              } finally {
                                setLoading(false);
                              }
                            }}
                            className="w-full h-12 bg-white text-black font-bold text-[13px] rounded-xl hover:bg-neutral-200 transition-all active:scale-[0.98] mt-4 flex items-center justify-center gap-2"
                          >
                            {loading ? <Loader2 className="animate-spin" size={16} /> : 'Continue'}
                          </button>
                        )}
                      </div>

                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setRecoveryType(recoveryType === 'email' ? 'phone' : 'email');
                            setRecoveryMessage('');
                          }}
                          className="w-full h-12 bg-white/[0.03] border border-white/5 rounded-xl text-neutral-400 font-bold text-[11px] uppercase tracking-widest hover:bg-white/[0.05] transition-all flex items-center justify-center gap-2"
                        >
                          {recoveryType === 'email' ? <Phone size={14} /> : <Mail size={14} />}
                          Find by {recoveryType === 'email' ? 'mobile number' : 'email or username'}
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {mode === 'recoveryHelp' && (
                    <motion.div
                      key="recovery-hub"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
                        <p className="text-[11px] font-bold text-blue-400 leading-relaxed">
                          If standard restoration signals are failing, utilize one of our high-fidelity escalation vectors to establish identity presence.
                        </p>
                      </div>

                      <div className="grid gap-3">
                        <button
                          onClick={() => {
                            setShowProxyEntry(true);
                            setProxyStatus('idle');
                          }}
                          className="w-full group p-4 bg-white/[0.03] border border-white/5 rounded-2xl text-left hover:bg-white/[0.05] transition-all"
                        >
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/[0.05] rounded-xl group-hover:scale-110 transition-transform">
                              <Users2 size={20} className="text-white" />
                            </div>
                            <div>
                              <p className="text-[13px] font-bold text-white">Trusted Identity Proxy</p>
                              <p className="text-[10px] text-neutral-500">Vouch-recovery via a nominated Security handle</p>
                            </div>
                          </div>
                        </button>

                        <button
                          onClick={() => {
                            setShowHardwareScan(true);
                            setHardwareStatus('idle');
                          }}
                          className="w-full group p-4 bg-white/[0.03] border border-white/5 rounded-2xl text-left hover:bg-white/[0.05] transition-all"
                        >
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/[0.05] rounded-xl group-hover:scale-110 transition-transform">
                              <Fingerprint size={20} className="text-white" />
                            </div>
                            <div>
                              <p className="text-[13px] font-bold text-white">Hardware Key Scan</p>
                              <p className="text-[10px] text-neutral-500">FIDO2/Security key physical identity establishment</p>
                            </div>
                          </div>
                        </button>

                        <button
                          onClick={() => {
                            setShowAuditEntry(true);
                            setAuditStatus('idle');
                          }}
                          className="w-full group p-4 bg-white/[0.03] border border-white/5 rounded-2xl text-left hover:bg-white/[0.05] transition-all"
                        >
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/[0.05] rounded-xl group-hover:scale-110 transition-transform">
                              <ShieldAlert size={20} className="text-white" />
                            </div>
                            <div>
                              <p className="text-[13px] font-bold text-white">Manual Identity Audit</p>
                              <p className="text-[10px] text-neutral-500">24-hour deep verification by the Compliance team</p>
                            </div>
                          </div>
                        </button>
                      </div>

                      <div className="pt-2">
                        <p className="text-center text-[10px] text-neutral-600 mb-4 font-bold uppercase tracking-widest">or</p>
                        <a
                          href="mailto:support.verlyn@proton.me"
                          className="w-full h-12 bg-white text-black font-bold text-[13px] rounded-xl hover:bg-neutral-200 transition-all flex items-center justify-center gap-2"
                        >
                          Contact Secure Support
                        </a>
                      </div>
                    </motion.div>
                  )}

                  {(mode === 'login' || mode === 'signup') && (
                    <motion.div
                      key="auth-view"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="space-y-4"
                    >
                      {/* Email Field */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-600 ml-1">Email</label>
                        <input
                          name="email"
                          type="email"
                          required
                          placeholder="name@example.com"
                          className="w-full h-12 bg-white/[0.03] border border-white/5 rounded-xl px-4 text-white placeholder:text-neutral-700 outline-none focus:border-white/20 focus:bg-white/[0.05] transition-all text-sm font-medium"
                        />
                      </div>

                      {/* Password Field */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center ml-1">
                          <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-600">Password</label>
                          {mode === 'login' && (
                            <button
                              type="button"
                              onClick={handleForgotClick}
                              className="text-[9px] font-bold text-neutral-600 hover:text-white transition-colors"
                            >
                              Forgot?
                            </button>
                          )}
                        </div>
                        <input
                          name="password"
                          type="password"
                          required
                          placeholder="••••••••"
                          className="w-full h-12 bg-white/[0.03] border border-white/5 rounded-xl px-4 text-white placeholder:text-neutral-700 outline-none focus:border-white/20 focus:bg-white/[0.05] transition-all text-sm font-medium"
                        />
                      </div>

                      {mode === 'signup' && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-4 pt-2"
                        >
                          {/* Birthday */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between ml-1">
                              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-600">Birthday</label>
                              <button
                                type="button"
                                onClick={() => setActiveLegal('contact')}
                                className="text-[9px] font-bold text-neutral-600 hover:text-white transition-colors flex items-center gap-1"
                              >
                                Details <HelpCircle size={10} />
                              </button>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              {[
                                { name: 'birthMonth', opts: MONTHS.map((m, i) => ({ l: m, v: i + 1 })) },
                                { name: 'birthDay', opts: days.map(d => ({ l: d, v: d })) },
                                { name: 'birthYear', opts: years.map(y => ({ l: y, v: y })) }
                              ].map((sel) => (
                                <div key={sel.name} className="relative group">
                                  <select
                                    name={sel.name}
                                    required
                                    className="w-full h-11 bg-white/[0.03] border border-white/5 rounded-xl px-3 text-neutral-400 text-[11px] appearance-none outline-none focus:border-white/20 transition-all cursor-pointer font-bold"
                                  >
                                    {sel.opts.map((o: any) => <option key={o.v} value={o.v} className="bg-[#0c0c0c]">{o.l}</option>)}
                                  </select>
                                  <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-700 pointer-events-none group-focus-within:text-white" />
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Name */}
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-600 ml-1">Full Name</label>
                            <input
                              name="fullName"
                              required
                              placeholder="Full Name"
                              className="w-full h-12 bg-white/[0.03] border border-white/5 rounded-xl px-4 text-white placeholder:text-neutral-700 outline-none focus:border-white/20 focus:bg-white/[0.05] transition-all text-sm font-medium"
                            />
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between items-center ml-1">
                              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-600">Mobile Number</label>
                              <div className="flex items-center gap-1.5 text-[9px] font-bold text-blue-500">
                                <Plus size={10} /> Mobile Security
                              </div>
                            </div>

                            <div className="relative flex gap-2">
                              {/* Country Selector Trigger */}
                              <button
                                type="button"
                                onClick={() => {
                                  setShowCountryPicker(!showCountryPicker);
                                  if (!showCountryPicker) setCountrySearch('');
                                }}
                                className="h-12 px-3 bg-white/[0.03] border border-white/5 rounded-xl hover:bg-white/[0.05] hover:border-white/10 transition-all flex items-center gap-2 min-w-[80px]"
                              >
                                <img
                                  src={`https://flagcdn.com/w40/${selectedCountry.iso}.png`}
                                  alt={selectedCountry.name}
                                  className="w-5 h-3.5 object-cover rounded-[2px] opacity-90"
                                />
                                <span className="text-[11px] font-bold text-white">{selectedCountry.code}</span>
                                <ChevronDown size={12} className={`text-neutral-700 transition-transform ${showCountryPicker ? 'rotate-180' : ''}`} />
                              </button>

                              <input
                                name="phone"
                                required
                                type="tel"
                                value={phoneNumber}
                                onChange={(e) => {
                                  const raw = e.target.value.replace(/\D/g, '');
                                  if ((selectedCountry.iso === 'in' || selectedCountry.iso === 'us') && raw.length > 10) return;
                                  const formatted = formatPhoneNumber(raw, selectedCountry.iso);
                                  setPhoneNumber(formatted);
                                }}
                                placeholder={selectedCountry.iso === 'in' ? '00000 00000' : selectedCountry.iso === 'us' ? '(000) 000-0000' : '000 000 0000'}
                                className="flex-1 h-12 bg-white/[0.03] border border-white/5 rounded-xl px-4 text-white placeholder:text-neutral-700 outline-none focus:border-white/20 focus:bg-white/[0.05] transition-all text-sm font-medium"
                              />

                              <AnimatePresence>
                                {showCountryPicker && (
                                  <>
                                    <motion.div
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      exit={{ opacity: 0 }}
                                      onClick={() => setShowCountryPicker(false)}
                                      className="fixed inset-0 z-[120]"
                                    />
                                    <motion.div
                                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                      animate={{ opacity: 1, scale: 1, y: 0 }}
                                      exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                      className="absolute left-0 bottom-full mb-2 w-[280px] bg-[#0c0c0c] border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-[130] flex flex-col"
                                    >
                                      {/* Search Bar */}
                                      <div className="p-3 border-b border-white/5 bg-white/[0.02]">
                                        <input
                                          autoFocus
                                          value={countrySearch}
                                          onChange={(e) => setCountrySearch(e.target.value)}
                                          placeholder="Search countries..."
                                          className="w-full h-9 bg-white/[0.03] border border-white/5 rounded-lg px-3 text-[11px] text-white placeholder:text-neutral-700 outline-none focus:border-blue-500/30 transition-all font-medium"
                                        />
                                      </div>

                                      <div className="p-2 grid gap-1 max-h-[260px] overflow-y-auto custom-scrollbar">
                                        {!countrySearch && <p className="text-[9px] font-black uppercase tracking-widest text-neutral-600 px-3 py-1 mt-1">Top Hubs</p>}
                                        {COUNTRIES
                                          .filter(c =>
                                            c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
                                            c.code.includes(countrySearch)
                                          )
                                          .map((country, idx) => (
                                            <button
                                              key={country.name}
                                              type="button"
                                              onClick={() => {
                                                setSelectedCountry(country);
                                                setShowCountryPicker(false);
                                              }}
                                              className={`w-full p-3 rounded-xl flex items-center justify-between transition-colors text-left ${selectedCountry.name === country.name ? 'bg-white/5 border border-white/5' : 'hover:bg-white/[0.03]'}`}
                                            >
                                              <div className="flex items-center gap-3">
                                                <img
                                                  src={`https://flagcdn.com/w40/${country.iso}.png`}
                                                  alt={country.name}
                                                  className="w-5 h-3.5 object-cover rounded-[2px] opacity-90"
                                                />
                                                <div className="flex flex-col">
                                                  <span className="text-[11px] font-bold text-white leading-none mb-1">{country.name}</span>
                                                  <span className="text-[9px] font-bold text-neutral-500">{idx < 10 && !countrySearch ? 'Top Tech Hub' : 'International'}</span>
                                                </div>
                                              </div>
                                              <span className="text-[10px] font-black text-neutral-600">{country.code}</span>
                                            </button>
                                          ))}
                                      </div>
                                    </motion.div>
                                  </>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>

                          {/* Username Intelligence */}
                          <div className="space-y-2">
                            <div className="flex justify-between items-center ml-1">
                              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-600">Username</label>
                              <AnimatePresence mode="wait">
                                {usernameStatus === 'checking' && (
                                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1.5 text-[9px] font-bold text-neutral-500">
                                    <Loader2 size={10} className="animate-spin" /> Checking
                                  </motion.div>
                                )}
                                {usernameStatus === 'available' && (
                                  <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-1.5 text-[9px] font-bold text-emerald-500">
                                    <CheckCircle2 size={10} /> Available
                                  </motion.div>
                                )}
                                {usernameStatus === 'taken' && (
                                  <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-1.5 text-[9px] font-bold text-rose-500">
                                    <AlertCircle size={10} /> Already taken
                                  </motion.div>
                                )}
                                {usernameStatus === 'invalid' && (
                                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[9px] font-bold text-neutral-700 capitalize">
                                    {username.length < 5 ? 'Min 5 characters' : 'Invalid characters'}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>

                            <div className="relative group overflow-hidden rounded-xl">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-700 group-focus-within:text-white transition-colors font-bold text-sm">@</span>
                              <input
                                name="username"
                                value={username}
                                onChange={handleUsernameChange}
                                required
                                placeholder="unique_id"
                                className={`w-full h-12 bg-white/[0.03] border ${usernameStatus === 'available' ? 'border-emerald-500/30' : 'border-white/5'} rounded-xl pl-10 pr-4 text-white placeholder:text-neutral-700 outline-none focus:border-white/20 focus:bg-white/[0.05] transition-all text-sm font-medium`}
                              />

                              {/* Holographic Pulse Success */}
                              <AnimatePresence>
                                {usernameStatus === 'available' && (
                                  <motion.div
                                    initial={{ x: '-100%' }}
                                    animate={{ x: '100%' }}
                                    transition={{ duration: 1, ease: 'easeInOut', repeat: Infinity, repeatDelay: 2 }}
                                    className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-500/10 to-transparent pointer-events-none"
                                  />
                                )}
                              </AnimatePresence>
                            </div>

                            {/* Suggestions UI */}
                            <AnimatePresence>
                              {usernameStatus === 'taken' && suggestions.length > 0 && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="space-y-2 mt-2"
                                >
                                  <p className="text-[9px] font-bold text-neutral-600 uppercase tracking-widest ml-1">Suggestions</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {suggestions.map((sug) => (
                                      <button
                                        key={sug}
                                        type="button"
                                        onClick={() => applySuggestion(sug)}
                                        className="px-2.5 py-1 bg-white/[0.03] border border-white/5 rounded-lg text-[10px] font-bold text-neutral-400 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all flex items-center gap-1.5 group"
                                      >
                                        {sug} <Plus size={10} className="text-neutral-700 group-hover:text-blue-500" />
                                      </button>
                                    ))}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>

                          <div className="pt-2">
                            <p className="text-[10px] text-neutral-600 leading-normal text-center px-4">
                              By joining, you agree to our <span onClick={() => setActiveLegal('terms')} className="text-neutral-400 font-bold hover:text-white cursor-pointer transition-colors underline underline-offset-2">Digital Governance & Privacy</span> standards.
                            </p>
                          </div>
                        </motion.div>
                      )}

                      <button
                        type="submit"
                        disabled={loading || (mode === 'signup' && usernameStatus !== 'available')}
                        className="w-full h-12 bg-white text-black font-bold text-[13px] rounded-xl hover:bg-neutral-200 transition-all active:scale-[0.98] mt-6 flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {loading ? (
                          <div className="flex gap-1.5">
                            <div className="w-1 h-1 bg-black rounded-full animate-pulse"></div>
                            <div className="w-1 h-1 bg-black rounded-full animate-pulse [animation-delay:200ms]"></div>
                            <div className="w-1 h-1 bg-black rounded-full animate-pulse [animation-delay:400ms]"></div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span>{mode === 'login' ? 'Continue' : 'Create Account'}</span>
                            <ArrowRight size={14} />
                          </div>
                        )}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </form>

              {/* Mode Switcher */}
              {(mode === 'login' || mode === 'signup') && (
                <div className="pt-8 text-center border-t border-white/5">
                  <button
                    type="button"
                    onClick={toggleMode}
                    className="text-neutral-500 text-[12px] font-bold hover:text-white transition-all"
                  >
                    {mode === 'login' ? 'Need an identity?' : 'Already have an identity?'}{' '}
                    <span className="text-white ml-2 underline underline-offset-4 decoration-neutral-800 hover:decoration-white transition-all">
                      {mode === 'login' ? 'Join Verlyn' : 'Sign In'}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>

      {/* Security Intelligence Overlay */}
      <AnimatePresence>
        {showSecurityNotice && (
          <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-12">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSecurityNotice(false)}
              className="absolute inset-0 bg-black/95 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="relative w-full max-w-[420px] bg-black border border-white/5 rounded-t-3xl sm:rounded-3xl overflow-hidden p-6 sm:p-8 space-y-6 shadow-2xl"
            >
              <div className="w-12 h-1 bg-white/10 rounded-full mx-auto sm:hidden mb-4" />

              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-white/[0.03] border border-white/5 flex items-center justify-center">
                  <ShieldAlert className="text-white" size={24} />
                </div>
                <div className="text-center space-y-2">
                  <h2 className="text-xl font-bold text-white tracking-tight">To help you find your account, we need more info</h2>
                  <p className="text-neutral-400 text-sm leading-relaxed px-4">
                    Enter your email or username so that we can use a secure process to help you get back in.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowSecurityNotice(false)}
                className="w-full h-12 bg-white text-black font-black uppercase tracking-[0.1em] text-xs rounded-xl hover:bg-neutral-200 transition-all flex items-center justify-center"
              >
                OK
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Terms Agreement Overlay (Blocks Signup) */}
      <AnimatePresence>
        {showTermsPopup && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-12">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/95 backdrop-blur-sm"
              onClick={() => setShowTermsPopup(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="relative w-full max-w-[420px] bg-[#070707] border border-white/5 rounded-3xl overflow-hidden p-6 sm:p-8 space-y-6 shadow-2xl"
            >
               <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                   <ScrollText className="text-rose-500" size={24} />
                </div>
                <div className="text-center space-y-2">
                   <h2 className="text-xl font-bold text-white tracking-tight">Governance Agreement</h2>
                   <p className="text-neutral-400 text-sm leading-relaxed">
                     Verlyn strictly enforces professional naming standards. If any admin, developer, or agent detects <span className="text-white font-bold">suspicious or impersonating activity</span> regarding your identity, we reserve the right to issue a <span className="text-rose-500 font-bold">permanent ban</span> without prior warning.
                   </p>
                </div>
               </div>

               <div className="grid grid-cols-2 gap-3 mt-8">
                 <button
                   type="button"
                   onClick={() => setShowTermsPopup(false)}
                   className="w-full h-12 bg-white/[0.03] text-neutral-400 font-black uppercase tracking-[0.1em] text-[11px] rounded-xl hover:bg-white/[0.05] hover:text-white transition-all border border-white/5"
                 >
                   Decline
                 </button>
                 <button
                   type="button"
                   onClick={() => {
                     setTermsAccepted(true);
                     setShowTermsPopup(false);
                     setTimeout(() => formRef.current?.requestSubmit(), 100);
                   }}
                   className="w-full h-12 bg-white text-black font-black uppercase tracking-[0.1em] text-[11px] rounded-xl hover:bg-neutral-200 transition-all flex items-center justify-center gap-2"
                 >
                   I Agree <CheckCircle2 size={14} />
                 </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <LegalOverlay section={activeLegal} onClose={() => setActiveLegal(null)} />
    </div>
  );
}
