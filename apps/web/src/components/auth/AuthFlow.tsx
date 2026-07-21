'use client';

import React, { useState, useEffect, useRef, useTransition } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  login,
  signup,
  checkUsernameAvailability,
  suggestUsernames,
  findAccountByEmailOrUsername,
  findAccountByPhone,
  sendEmailOTP,
  verifyEmailOTP,
  generatePasskeyChallengeAction,
  authenticatePasskeyAction
} from '@/app/login/actions';
import {
  serverCompleteBasics,
  serverCompleteEmailVerify,
  serverSendPhoneOTP,
  serverVerifyPhoneOTP,
  serverCompleteUsername,
  serverCompleteCaptcha
} from '@/app/login/step-actions';
import { validatePasswordStrength } from '@/lib/security/password';
import {
  Plus,
  ArrowRight,
  ChevronDown,
  Info,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  ArrowLeft,
  Phone,
  Mail,
  ShieldAlert,
  Fingerprint,
  ShieldCheck,
  Users2,
  ScrollText,
  ExternalLink,
  RotateCw,
  Eye,
  EyeOff
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

// ── Client-side Rate Limiter ───────────────────────────────────────────────────
function checkRateLimit(key: string, maxAttempts: number, windowMs: number): { allowed: boolean; retryAfterMs: number } {
  if (typeof window === 'undefined') return { allowed: true, retryAfterMs: 0 };
  const now = Date.now();
  const raw = localStorage.getItem(`rl_${key}`);
  const timestamps: number[] = raw ? JSON.parse(raw) : [];
  const recent = timestamps.filter(t => now - t < windowMs);
  if (recent.length >= maxAttempts) {
    const oldest = recent[0];
    return { allowed: false, retryAfterMs: windowMs - (now - oldest) };
  }
  recent.push(now);
  localStorage.setItem(`rl_${key}`, JSON.stringify(recent));
  return { allowed: true, retryAfterMs: 0 };
}
function clearRateLimit(key: string) {
  if (typeof window !== 'undefined') localStorage.removeItem(`rl_${key}`);
}
// ─────────────────────────────────────────────────────────────────────────────

// ── Verlyn Whitelist: 197 trusted email domains ─────────────────────────────
const WHITELISTED_DOMAINS = new Set([
  'gmail.com','googlemail.com',
  'outlook.com','outlook.in','outlook.co.uk','outlook.com.au','outlook.de','outlook.fr','outlook.es','outlook.it','outlook.jp',
  'hotmail.com','hotmail.co.uk','hotmail.fr','hotmail.de','hotmail.it','hotmail.es','hotmail.co.jp',
  'live.com','live.co.uk','live.in','live.fr','live.de','live.com.au',
  'msn.com',
  'yahoo.com','yahoo.co.uk','yahoo.co.in','yahoo.ca','yahoo.com.au','yahoo.co.jp','yahoo.de','yahoo.fr','yahoo.it','yahoo.es','yahoo.com.br','yahoo.com.mx',
  'ymail.com','rocketmail.com','myyahoo.com',
  'icloud.com','me.com','mac.com',
  'aol.com','aim.com','verizon.net',
  'zoho.com','zohomail.com','zohomail.in',
  'protonmail.com','protonmail.ch','proton.me','pm.me',
  'tutanota.com','tutanota.de','tutamail.com','tuta.io','tuta.com','keemail.me',
  'gmx.com','gmx.net','gmx.de','gmx.at','gmx.ch',
  'web.de','mail.com','email.com',
  'fastmail.com','fastmail.fm',
  'rediffmail.com','rediff.com','sify.com',
  'yandex.com','yandex.ru','mail.ru','inbox.ru','bk.ru','list.ru',
  'rambler.ru','lenta.ru','autorambler.ru','myrambler.ru','ro.ru',
  'qq.com','163.com','126.com','yeah.net','sina.com','sina.cn','sohu.com','foxmail.com','aliyun.com',
  'naver.com','daum.net','hanmail.net',
  'nifty.com','biglobe.ne.jp','excite.co.jp',
  'laposte.net','orange.fr','free.fr','sfr.fr','wanadoo.fr',
  'libero.it','virgilio.it','alice.it','tin.it','tiscali.it',
  'terra.com.br','bol.com.br','uol.com.br','ig.com.br',
  'terra.es','telefonica.net',
  'btinternet.com','sky.com','virginmedia.com','talktalk.net',
  'comcast.net','sbcglobal.net','att.net','bellsouth.net','charter.net','cox.net','earthlink.net','juno.com','optonline.net',
  'rogers.com','shaw.ca','sympatico.ca','telus.net',
  'mailfence.com','disroot.org','posteo.de','posteo.net','mailbox.org','runbox.com',
  'startmail.com','hushmail.com','countermail.com','ctemplar.com',
  'hey.com','duck.com',
  'eclipso.de','eclipso.eu',
  'lycos.com','usa.com'
]);
// ─────────────────────────────────────────────────────────────────────────────

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const COUNTRIES = [
  { name: 'India', code: '+91', iso: 'in' },
  { name: 'United States', code: '+1', iso: 'us' },
  { name: 'United Kingdom', code: '+44', iso: 'gb' },
  { name: 'Canada', code: '+1', iso: 'ca' },
  { name: 'Australia', code: '+61', iso: 'au' },
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

const TAGLINES = [
  { text: 'Establish', color: 'from-emerald-400 to-emerald-200', glow: 'shadow-emerald-500/20' },
  { text: 'Secure', color: 'from-blue-400 to-blue-200', glow: 'shadow-blue-500/20' },
  { text: 'Verify', color: 'from-purple-400 to-purple-200', glow: 'shadow-purple-500/20' },
  { text: 'Restore', color: 'from-rose-400 to-rose-200', glow: 'shadow-rose-500/20' }
];

interface AuthFlowProps {
  initialMode?: 'login' | 'signup';
  isSuspicious: boolean;
  message?: string;
}

export default function AuthFlow({ initialMode = 'login', isSuspicious, message }: AuthFlowProps) {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot' | 'recoveryHelp'>(initialMode === 'signup' ? 'signup' : 'login');
  const [loading, setLoading] = useState(false);
  const [activeLegal, setActiveLegal] = useState<LegalSection | null>(null);
  const [showSecurityNotice, setShowSecurityNotice] = useState(false);

  // ── 6-Step Signup Wizard State ──────────────────────────────────────────────
  const [signupStep, setSignupStep] = useState<'basics' | 'email_verify' | 'phone_trust' | 'username_check' | 'human_captcha' | 'password_security'>('basics');
  // Step 1 – basics
  const [signupEmail, setSignupEmail] = useState('');
  const [signupFullName, setSignupFullName] = useState('');
  const [signupBirthMonth, setSignupBirthMonth] = useState('1');
  const [signupBirthDay, setSignupBirthDay] = useState('1');
  const [signupBirthYear, setSignupBirthYear] = useState(String(new Date().getFullYear() - 18));
  const [basicsError, setBasicsError] = useState('');
  // Step 2 – email OTP
  const [emailOtpCode, setEmailOtpCode] = useState('');
  const [emailOtpError, setEmailOtpError] = useState('');
  const [emailVerifying, setEmailVerifying] = useState(false);
  const [verifyAttempts, setVerifyAttempts] = useState(0);
  // Rate limiting & cooldown states
  const [otpCooldownSecs, setOtpCooldownSecs] = useState(0);
  const [otpRateLocked, setOtpRateLocked] = useState(false);
  const [otpSendCount, setOtpSendCount] = useState(0);
  // Whitelist Warning States
  const [showDomainBlockModal, setShowDomainBlockModal] = useState(false);
  const [blockedDomain, setBlockedDomain] = useState('');

  // Step 3 – phone
  const [signupPhone, setSignupPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  // Step 3 – phone OTP verification
  const [phoneOtpCode, setPhoneOtpCode] = useState('');
  const [phoneOtpError, setPhoneOtpError] = useState('');
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneOtpVerifying, setPhoneOtpVerifying] = useState(false);
  const [phoneOtpCooldownSecs, setPhoneOtpCooldownSecs] = useState(0);
  const [phoneOtpSendCount, setPhoneOtpSendCount] = useState(0);

  // Step 4 – username
  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [usernameMessage, setUsernameMessage] = useState('');
  const [usernameStepError, setUsernameStepError] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  // Step 5 – hCaptcha
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaError, setCaptchaError] = useState('');
  
  // Step 6 – password
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passkeyError, setPasskeyError] = useState('');
  const [loginError, setLoginError] = useState('');
  // ────────────────────────────────────────────────────────────────────────────

  const [showTermsPopup, setShowTermsPopup] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const phoneOtpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const debouncedUsername = useDebounce(username, 500);
  const debouncedEmail = useDebounce(signupEmail, 500);

  // Discovery Engine States
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [recoverySuccess, setRecoverySuccess] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState('');
  const [recoveryType, setRecoveryType] = useState<'email' | 'phone'>('email');

  // Genesis State
  const [isMaterialized, setIsMaterialized] = useState(false);

  // Country Security State
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [showPhonePolicy, setShowPhonePolicy] = useState(false);
  const [showPhoneConfirmWarning, setShowPhoneConfirmWarning] = useState(false);
  const [confirmPhoneChecked, setConfirmPhoneChecked] = useState(false);
  const [showUsernameConfirmWarning, setShowUsernameConfirmWarning] = useState(false);
  const [confirmUsernameChecked, setConfirmUsernameChecked] = useState(false);

  // Step completion tokens tracker
  const [stepTokens, setStepTokens] = useState<Record<string, string>>({});
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  const storeToken = (step: string, token: string) =>
    setStepTokens(prev => ({ ...prev, [step]: token }));

  const markStepDone = (step: string) => {
    setCompletedSteps(prev => {
      const next = new Set(prev);
      next.add(step);
      return next;
    });
  };

  const [isPending, startTransition] = useTransition();

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

  // Cooldown timer ticker
  useEffect(() => {
    if (otpCooldownSecs <= 0) return;
    const t = setTimeout(() => setOtpCooldownSecs(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [otpCooldownSecs]);

  // Phone OTP Cooldown timer ticker
  useEffect(() => {
    if (phoneOtpCooldownSecs <= 0) return;
    const t = setTimeout(() => setPhoneOtpCooldownSecs(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phoneOtpCooldownSecs]);

  useEffect(() => {
    if (message) {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    if (!isPending && loading && !message) {
      const timer = setTimeout(() => setLoading(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isPending, loading, message]);

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

  // ── Auto domain check on email input ────────────────────────────────────────
  useEffect(() => {
    if (mode !== 'signup' || signupStep !== 'basics') return;
    if (!debouncedEmail.includes('@')) return;
    const parts = debouncedEmail.split('@');
    const domain = parts[1]?.toLowerCase().trim() ?? '';
    const tldMatch = /\.[a-z]{2,}$/.test(domain);
    if (!tldMatch) return;
    if (!WHITELISTED_DOMAINS.has(domain)) {
      checkRateLimit('domain_block', 8, 15 * 60 * 1000);
      setBlockedDomain(domain);
      setShowDomainBlockModal(true);
    }
  }, [debouncedEmail, mode, signupStep]);

  // 🚨 GPU Compositor Fix: Force repaint when cinematic ends
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

  // Username validation useEffect
  useEffect(() => {
    if (debouncedUsername && usernameStatus === 'checking') {
      const check = async () => {
        const { available, message, layer } = await checkUsernameAvailability(debouncedUsername, true);
        if (debouncedUsername !== username || !validateUsername(debouncedUsername)) {
          return;
        }
        if (available) {
          setUsernameStatus('available');
          setUsernameStepError('');
          setSuggestions([]);
        } else {
          const isSecurityBlock = ['L10_HARD_BAN', 'L10_SOFT_BAN', 'L9_RATE_LIMIT', 'L8_ADAPTIVE', 'L7_AI'].includes(layer || '');
          setUsernameStatus(isSecurityBlock ? 'invalid' : 'taken');
          setUsernameStepError(message || 'This username is already taken.');
          if (!isSecurityBlock) {
            const sugs = await suggestUsernames(debouncedUsername);
            setSuggestions(sugs);
          } else {
            setSuggestions([]);
          }
        }
      };
      check();
    }
  }, [debouncedUsername, usernameStatus, username]);

  const handlePasskeyLogin = async () => {
    if (typeof window === 'undefined' || !navigator.credentials) {
      setPasskeyError('Passkeys are not supported on this browser.');
      return;
    }
    setLoading(true);
    setPasskeyError('');
    try {
      const challengeRes = await generatePasskeyChallengeAction();
      if (!challengeRes.success || !challengeRes.challenge) {
        setPasskeyError(challengeRes.error || 'Failed to start passkey sign-in.');
        setLoading(false);
        return;
      }

      const challengeBuffer = Uint8Array.from(
        atob(challengeRes.challenge.replace(/-/g, '+').replace(/_/g, '/')),
        c => c.charCodeAt(0)
      );

      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: challengeBuffer,
          rpId: window.location.hostname,
          userVerification: 'required',
          timeout: 60000,
        }
      }) as PublicKeyCredential;

      if (!assertion) {
        setPasskeyError('No passkey selected.');
        setLoading(false);
        return;
      }

      const authResponse = assertion.response as AuthenticatorAssertionResponse;
      const toBase64url = (buf: ArrayBuffer) =>
        btoa(String.fromCharCode(...new Uint8Array(buf)))
          .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

      const res = await authenticatePasskeyAction({
        id: assertion.id,
        rawId: toBase64url(assertion.rawId),
        response: {
          clientDataJSON: toBase64url(authResponse.clientDataJSON),
          authenticatorData: toBase64url(authResponse.authenticatorData),
          signature: toBase64url(authResponse.signature),
          userHandle: authResponse.userHandle ? toBase64url(authResponse.userHandle) : undefined,
        },
        type: assertion.type,
      });

      if (res.success && res.actionLink) {
        window.location.href = res.actionLink;
      } else {
        setPasskeyError(res.error || 'Passkey not recognized. Make sure you registered this device.');
      }
    } catch (err: any) {
      if (err?.name !== 'NotAllowedError') {
        setPasskeyError('Passkey sign-in failed. Please try again or use your password.');
        console.error('Passkey authentication failed:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (mode === 'signup') {
      // TODO: phone_trust step hidden temporarily — re-enable when Twilio is on a paid plan
      const REQUIRED_STEPS = ['email_verify', 'username_check', 'human_captcha'] as const;
      const missing = REQUIRED_STEPS.filter(s => !completedSteps.has(s));
      if (missing.length > 0) {
        setPasswordError('Security violation: incomplete registration flow. Please restart.');
        return;
      }

      if (signupStep !== 'password_security') return;

      const domain = signupEmail.split('@')[1]?.toLowerCase().trim() || '';
      if (!domain || !WHITELISTED_DOMAINS.has(domain)) {
        setPasswordError('Email domain is not permitted. Please use a whitelisted provider.');
        return;
      }

      const strength = validatePasswordStrength(signupPassword, signupEmail, username);
      if (!strength.valid) {
        setPasswordError(strength.reason || 'Invalid password.');
        return;
      }
      if (signupPassword !== signupConfirmPassword) {
        setPasswordError('Passwords do not match.');
        return;
      }

      if (!captchaToken || captchaToken.trim() === '') {
        setPasswordError('Security verification is missing. Please restart from Step 5.');
        return;
      }

      if (usernameStatus !== 'available') {
        setPasswordError('Username is no longer valid. Please go back and choose another.');
        return;
      }

      if (!termsAccepted) {
        setShowTermsPopup(true);
        return;
      }
    }

    setLoading(true);
    const formData = new FormData(e.currentTarget);

    if (mode === 'signup') {
      formData.set('email', signupEmail);
      formData.set('fullName', signupFullName);
      formData.set('birthMonth', signupBirthMonth);
      formData.set('birthDay', signupBirthDay);
      formData.set('birthYear', signupBirthYear);
      formData.set('phone', `${selectedCountry.code}${signupPhone}`);
      formData.set('username', username);
      formData.set('password', signupPassword);
      formData.set('hcaptchaToken', captchaToken);

      const STEPS = ['basics', 'email_verify', 'phone_trust', 'username_check', 'human_captcha'] as const;
      for (const step of STEPS) {
        const tok = stepTokens[step];
        // TODO: phone_trust OTP skipped — no server token issued, skip check
        if (step === 'phone_trust') continue;
        if (!tok) {
          setPasswordError(`Security token missing for step: ${step}. Please restart.`);
          setLoading(false);
          return;
        }
        formData.set(`step_token_${step}`, tok);
      }
      formData.set('_stepsCompleted', Array.from(completedSteps).join(','));
    }

    startTransition(async () => {
      try {
        if (mode === 'login') {
          const res = await login(formData);
          if (res && 'error' in res) {
            setLoginError(res.error);
            setLoading(false);
          }
        } else if (mode === 'signup') {
          if (typeof window !== 'undefined') {
            localStorage.setItem('verlyn_device_trust', JSON.stringify({
              deviceId: Math.random().toString(36).substring(2, 15),
              registeredAt: new Date().toISOString(),
              fingerprint: navigator.userAgent
            }));
          }
          const res = await signup(formData);
          if (res && 'error' in res) {
            setPasswordError(res.error);
            setLoading(false);
          }
        }
      } catch (err: any) {
        // If it's a Next.js redirect exception, bubble it up so Next.js handles the client navigation
        if (err && (err.message === 'NEXT_REDIRECT' || err.digest?.startsWith('NEXT_REDIRECT'))) {
          throw err;
        }
        console.error('[AuthFlow Submit Error]', err);
        const errMsg = err?.message || 'An unexpected error occurred during authentication.';
        if (mode === 'login') {
          setLoginError(errMsg);
        } else {
          setPasswordError(errMsg);
        }
        setLoading(false);
      }
    });
  };

  const handleNextBasics = async () => {
    if (!signupEmail || !signupFullName) return;
    setBasicsError('');

    // Email format validation
    const emailRe = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    if (!emailRe.test(signupEmail)) {
      setBasicsError('Invalid email address format.');
      return;
    }

    // Date of Birth Validation (min 16 years old)
    const dob = new Date(Number(signupBirthYear), Number(signupBirthMonth) - 1, Number(signupBirthDay));
    if (isNaN(dob.getTime())) {
      setBasicsError('Please enter a valid Date of Birth.');
      return;
    }
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }

    if (age < 16) {
      setBasicsError('You must be at least 16 years old to join Verlyn.');
      return;
    }

    const domain = signupEmail.split('@')[1]?.toLowerCase().trim() || '';
    if (!domain || !WHITELISTED_DOMAINS.has(domain)) {
      checkRateLimit('domain_block', 8, 15 * 60 * 1000);
      setBlockedDomain(domain);
      setShowDomainBlockModal(true);
      return;
    }

    const rl = checkRateLimit(`otp_send_${signupEmail}`, 3, 10 * 60 * 1000);
    if (!rl.allowed) {
      const secs = Math.ceil(rl.retryAfterMs / 1000);
      setOtpRateLocked(true);
      setOtpCooldownSecs(secs);
      setSignupStep('email_verify');
      return;
    }

    setOtpRateLocked(false);
    setOtpSendCount(c => c + 1);
    setOtpCooldownSecs(60);
    setLoading(true);
    setEmailOtpError('');
    setBasicsError('');
    try {
      // Complete basics step token first (fast, no email needed)
      const basicsRes = await serverCompleteBasics(
        signupEmail,
        signupFullName,
        signupBirthYear,
        signupBirthMonth,
        signupBirthDay
      );
      if ('error' in basicsRes) {
        setBasicsError(basicsRes.error);
        setOtpCooldownSecs(0);
        return;
      }
      storeToken('basics', basicsRes.token);
      markStepDone('basics');

      // Send OTP — advance to step 2 regardless so user sees any error there
      const res = await sendEmailOTP(signupEmail);
      if (!res.success) {
        // Show error on step 2 where the Resend/retry UI lives
        setEmailOtpError(res.error || 'Failed to send verification code. Please try resending.');
        setOtpCooldownSecs(0);
        setOtpRateLocked(false);
      }
      // Always advance — step 2 has a Resend button so user can retry
      setSignupStep('email_verify');
    } catch (err: any) {
      setBasicsError(err.message || 'An unexpected error occurred. Please try again.');
      setOtpCooldownSecs(0);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (otpCooldownSecs > 0 || otpRateLocked) return;
    const rl = checkRateLimit(`otp_send_${signupEmail}`, 3, 10 * 60 * 1000);
    if (!rl.allowed) {
      setOtpRateLocked(true);
      setOtpCooldownSecs(Math.ceil(rl.retryAfterMs / 1000));
      return;
    }
    setOtpCooldownSecs(60);
    setEmailOtpError('');
    try {
      const res = await sendEmailOTP(signupEmail);
      if (!res.success) {
        setEmailOtpError(res.error || 'Failed to resend verification code.');
        setOtpCooldownSecs(0);
      }
    } catch (err: any) {
      setEmailOtpError(err.message || 'Failed to resend verification code.');
      setOtpCooldownSecs(0);
    }
  };

  const handleOtpChange = (index: number, val: string) => {
    const cleanVal = val.replace(/\D/g, '');
    if (!cleanVal) {
      const updated = emailOtpCode.split('');
      updated[index] = '';
      setEmailOtpCode(updated.join(''));
      return;
    }
    const char = cleanVal.slice(-1);
    const updated = emailOtpCode.split('').concat(Array(6).fill('')).slice(0, 6);
    updated[index] = char;
    setEmailOtpCode(updated.join(''));
    if (char && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      const updated = emailOtpCode.split('').concat(Array(6).fill('')).slice(0, 6);
      if (!updated[index] && index > 0) {
        updated[index - 1] = '';
        setEmailOtpCode(updated.join(''));
        otpRefs.current[index - 1]?.focus();
      } else {
        updated[index] = '';
        setEmailOtpCode(updated.join(''));
      }
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData) {
      setEmailOtpCode(pastedData);
      const nextFocusIndex = Math.min(pastedData.length, 5);
      otpRefs.current[nextFocusIndex]?.focus();
    }
  };

  const handlePhoneOtpChange = (index: number, value: string) => {
    const char = value.replace(/\D/g, '').slice(-1);
    const updated = phoneOtpCode.split('').concat(Array(6).fill('')).slice(0, 6);
    updated[index] = char;
    setPhoneOtpCode(updated.join(''));
    if (char && index < 5) {
      phoneOtpRefs.current[index + 1]?.focus();
    }
  };

  const handlePhoneOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      const updated = phoneOtpCode.split('').concat(Array(6).fill('')).slice(0, 6);
      if (!updated[index] && index > 0) {
        updated[index - 1] = '';
        setPhoneOtpCode(updated.join(''));
        phoneOtpRefs.current[index - 1]?.focus();
      } else {
        updated[index] = '';
        setPhoneOtpCode(updated.join(''));
      }
    }
  };

  const handlePhoneOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData) {
      setPhoneOtpCode(pastedData);
      const nextFocusIndex = Math.min(pastedData.length, 5);
      phoneOtpRefs.current[nextFocusIndex]?.focus();
    }
  };

  const handleVerifyEmail = async () => {
    if (!emailOtpCode || emailOtpCode.length < 6) {
      setEmailOtpError('Please enter the complete 6-digit code sent to your email.');
      return;
    }
    const rl = checkRateLimit(`otp_verify_${signupEmail}`, 5, 5 * 60 * 1000);
    if (!rl.allowed) {
      const mins = Math.ceil(rl.retryAfterMs / 60000);
      setEmailOtpError(`Too many incorrect attempts. Please wait ${mins} minute${mins !== 1 ? 's' : ''} before trying again.`);
      return;
    }
    setEmailVerifying(true);
    setEmailOtpError('');
    try {
      const res = await verifyEmailOTP(signupEmail, emailOtpCode);
      if (res && res.success) {
        clearRateLimit(`otp_verify_${signupEmail}`);
        const step2Result = await serverCompleteEmailVerify(signupEmail);
        if ('error' in step2Result) {
          setEmailOtpError(`Verification confirmed but token issuance failed: ${step2Result.error}`);
          return;
        }
        storeToken('email_verify', step2Result.token);
        markStepDone('email_verify');
        setSignupStep('phone_trust');
      } else {
        const attempts = verifyAttempts + 1;
        setVerifyAttempts(attempts);
        if (attempts >= 4) {
          setEmailOtpError(`Invalid verification code. ${5 - attempts} attempt${5 - attempts !== 1 ? 's' : ''} remaining prior to security lockout.`);
        } else {
          setEmailOtpError('Invalid verification code. Please check your inbox and try again.');
        }
      }
    } catch (e) {
      setEmailOtpError('Verification failed. Please check your connection and try again.');
    } finally {
      setEmailVerifying(false);
    }
  };

  const handleNextPhone = async () => {
    const digits = signupPhone.replace(/\D/g, '');
    if (digits.length < 6) {
      setPhoneError('Please enter a valid phone number (at least 6 digits).');
      return;
    }
    // Show the confirmation warning/agreement modal
    setShowPhoneConfirmWarning(true);
  };

  const handleConfirmAndProceedPhone = async () => {
    setShowPhoneConfirmWarning(false);
    markStepDone('phone_trust');
    setSignupStep('username_check');
  };

  const handleResendPhoneOTP = async () => {
    if (phoneOtpCooldownSecs > 0) return;
    setPhoneOtpError('');
    setLoading(true);
    try {
      const result = await serverSendPhoneOTP(signupEmail, `${selectedCountry.code}${signupPhone}`);
      if (!result.success) {
        setPhoneOtpError(result.error || 'Failed to resend verification SMS.');
        return;
      }
      setPhoneOtpCooldownSecs(60);
      setPhoneOtpSendCount(s => s + 1);
    } catch (e) {
      setPhoneOtpError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPhone = async () => {
    if (!phoneOtpCode || phoneOtpCode.length < 6) {
      setPhoneOtpError('Please enter the complete 6-digit code sent to your phone.');
      return;
    }
    setPhoneOtpVerifying(true);
    setPhoneOtpError('');
    try {
      const result = await serverVerifyPhoneOTP(signupEmail, `${selectedCountry.code}${signupPhone}`, phoneOtpCode);
      if ('error' in result) {
        setPhoneOtpError(result.error);
        return;
      }
      storeToken('phone_trust', result.token);
      setPhoneOtpError('');
      markStepDone('phone_trust');
      setSignupStep('username_check');
    } catch (e) {
      setPhoneOtpError('Verification failed. Please check your connection and try again.');
    } finally {
      setPhoneOtpVerifying(false);
    }
  };

  const handleNextUsername = async () => {
    console.log('[Verlyn Auth] handleNextUsername called. Username:', username, 'Status:', usernameStatus);
    if (usernameStatus !== 'available') {
      console.log('[Verlyn Auth] Username status is not available. Aborting.');
      setUsernameStepError(
        usernameStatus === 'taken'
          ? 'This username is already taken. Please choose another.'
          : usernameStatus === 'invalid'
          ? 'Username is invalid. Use 5+ letters, numbers, underscores or dots only.'
          : usernameStatus === 'checking'
          ? 'Please wait while we check availability.'
          : 'Please enter a valid username.'
      );
      return;
    }

    setLoading(true);
    setUsernameStepError('');

    try {
      console.log('[Verlyn Auth] Calling checkUsernameAvailability API...');
      const checkRes = await checkUsernameAvailability(username, false);
      console.log('[Verlyn Auth] API Response:', checkRes);
      if (!checkRes.available) {
        setUsernameStatus('taken');
        setUsernameStepError(checkRes.message || 'This username is flagged by our security policy.');
        setLoading(false);
        return;
      }

      console.log('[Verlyn Auth] Validation successful. Showing username warning modal.');
      setLoading(false);
      setShowUsernameConfirmWarning(true);
    } catch (err) {
      console.error('[Verlyn Auth] Error in handleNextUsername:', err);
      setUsernameStepError('Verification system timeout. Please try again.');
      setLoading(false);
    }
  };

  const handleConfirmAndProceedUsername = async () => {
    setLoading(true);
    try {
      const result = await serverCompleteUsername(signupEmail, username);
      if ('error' in result) {
        setUsernameStepError(result.error);
        setShowUsernameConfirmWarning(false);
        setLoading(false);
        return;
      }

      storeToken('username_check', result.token);
      setUsernameStepError('');
      setShowUsernameConfirmWarning(false);
      markStepDone('username_check');
      setSignupStep('human_captcha');
    } catch (err: any) {
      console.error('[Verlyn Auth] handleConfirmAndProceedUsername failed:', err);
      setUsernameStepError(`System error: ${err?.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleNextCaptcha = async () => {
    if (!captchaToken || captchaToken.trim() === '') {
      setCaptchaError('Please complete the security verification before continuing.');
      return;
    }
    const result = await serverCompleteCaptcha(signupEmail, captchaToken);
    if ('error' in result) {
      setCaptchaError(result.error);
      return;
    }
    storeToken('human_captcha', result.token);
    setCaptchaError('');
    markStepDone('human_captcha');
    setSignupStep('password_security');
  };

  const getUsernameInvalidReason = (val: string) => {
    if (val.length > 0 && val.length < 5) return 'Minimum 5 characters';
    if (val.length > 20) return 'Maximum 20 characters';
    if (/^[._]/.test(val)) return 'Cannot start with dot or underscore';
    if (/\.$|_\.$/.test(val) || /_$/.test(val)) return 'Cannot end with dot or underscore';
    if (/[._]{2,}/.test(val) || /\._|_\./.test(val)) return 'Cannot contain adjacent special characters';
    if (!/^[a-z0-9_.]+$/.test(val)) return 'Allowed: a-z, 0-9, dot (.), underscore (_)';
    return '';
  };

  const validateUsername = (val: string) => {
    return getUsernameInvalidReason(val) === '';
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.toLowerCase().replace(/\s/g, '');
    setUsername(val);
    setUsernameMessage('');
    setUsernameStepError('');
    if (!val) {
      setUsernameStatus('idle');
      setSuggestions([]);
      return;
    }
    const invalidReason = getUsernameInvalidReason(val);
    if (invalidReason) {
      setUsernameStatus('invalid');
      setUsernameStepError(invalidReason);
      setSuggestions([]);
      return;
    }
    setUsernameStatus('checking');
  };

  const applySuggestion = (sug: string) => {
    setUsername(sug);
    setUsernameStatus('available');
    setSuggestions([]);
  };

  const toggleMode = () => {
    const nextMode = mode === 'login' ? 'signup' : 'login';
    setMode(nextMode);
    setShowTermsPopup(false);
    setSignupStep('basics');
    if (nextMode === 'login') {
      window.history.pushState(null, '', '/login');
    } else {
      window.history.pushState(null, '', '/join');
    }
  };

  const handleForgotClick = () => {
    setMode('forgot');
    setForgotIdentifier('');
    setRecoverySuccess(false);
    setRecoveryMessage('');
  };

  const handleBack = () => {
    if (mode === 'signup') {
      if (signupStep === 'email_verify') { setSignupStep('basics'); return; }
      if (signupStep === 'phone_trust') { setSignupStep('email_verify'); return; }
      if (signupStep === 'username_check') { setSignupStep('phone_trust'); return; }
      if (signupStep === 'human_captcha') { setSignupStep('username_check'); return; }
      if (signupStep === 'password_security') { setSignupStep('human_captcha'); return; }
    }
    setMode('login');
  };

  return (
    <div className="w-full max-w-[420px] mx-auto my-auto relative z-10 px-4">
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
                {mode === 'login' && 'Welcome back'}
                {mode === 'signup' && 'Create your account'}
              </h2>
              <p className="text-neutral-500 text-[13px] mt-2 font-medium">
                {mode === 'login' && 'Access your identity'}
                {mode === 'signup' && 'Establish your secure identity'}
                {mode === 'forgot' && (recoveryType === 'email' ? 'Enter your email or username' : 'Enter your mobile number')}
                {mode === 'recoveryHelp' && 'Premium alternative recovery vectors'}
              </p>
            </motion.div>
          </motion.div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {isMaterialized && (
          <motion.div
            key="auth-card"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Outer Box */}
            <div className="relative bg-[#060606]/80 border border-white/5 rounded-[2rem] p-7 sm:p-9 shadow-2xl backdrop-blur-xl overflow-hidden group">
              {/* Subtle ambient gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-white/[0.01] to-transparent pointer-events-none" />

              <form ref={formRef} className="space-y-5" onSubmit={handleFormSubmit}>
                <AnimatePresence mode="wait">

                  {/* ═══════════════ LOGIN MODE ═══════════════ */}
                  {mode === 'login' && (
                    <motion.div
                      key="login-view"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="space-y-4"
                    >
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-600 ml-1">Email or Username</label>
                        <input name="email" type="text" required placeholder="name@example.com or username"
                          className="w-full h-12 bg-white/[0.03] border border-white/5 rounded-xl px-4 text-white placeholder:text-neutral-700 outline-none focus:border-white/20 focus:bg-white/[0.05] transition-all text-sm font-medium" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center ml-1">
                          <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-600">Password</label>
                          <Link href="/forgot" className="text-[9px] font-bold text-neutral-600 hover:text-white transition-colors">Forgot?</Link>
                        </div>
                        <div className="relative flex items-center">
                          <input name="password" type={showLoginPassword ? "text" : "password"} required placeholder="••••••••"
                            className="w-full h-12 bg-white/[0.03] border border-white/5 rounded-xl pl-4 pr-11 text-white placeholder:text-neutral-700 outline-none focus:border-white/20 focus:bg-white/[0.05] transition-all text-sm font-medium" />
                          <button type="button" onClick={() => setShowLoginPassword(!showLoginPassword)} className="absolute right-3.5 text-neutral-500 hover:text-white transition-colors p-1" tabIndex={-1} aria-label={showLoginPassword ? "Hide password" : "Show password"}>
                            {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>
                      
                      {message && (
                        <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-2 rounded-xl text-[11px] font-bold mt-2">
                          <AlertCircle size={14} className="shrink-0" />
                          <span>{message}</span>
                        </div>
                      )}
                      
                      {loginError && (
                        <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-2 rounded-xl text-[11px] font-bold mt-2">
                          <AlertCircle size={14} className="shrink-0" />
                          <span>{loginError}</span>
                        </div>
                      )}
                      
                      {passkeyError && <p className="text-[11px] text-rose-400 font-bold text-center mt-2">{passkeyError}</p>}
                      
                      <button type="submit" disabled={loading}
                        className="w-full h-12 bg-white text-black font-bold text-[13px] rounded-xl hover:bg-neutral-200 transition-all active:scale-[0.98] mt-2 flex items-center justify-center gap-2 disabled:opacity-50">
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <><span>Sign In</span><ArrowRight size={14} /></>}
                      </button>

                      <div className="flex items-center gap-3 my-4">
                        <div className="h-px bg-white/5 flex-1" />
                        <span className="text-[10px] text-neutral-600 font-extrabold uppercase tracking-wider">or</span>
                        <div className="h-px bg-white/5 flex-1" />
                      </div>

                      <button
                        type="button"
                        onClick={handlePasskeyLogin}
                        disabled={loading}
                        className="w-full h-12 bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 text-purple-400 font-bold text-[13px] rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                      >
                        <Fingerprint size={16} />
                        Sign in with Passkey
                      </button>
                    </motion.div>
                  )}

                  {/* ═══════════════ FORGOT ACCOUNT VIEW ═══════════════ */}
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

                  {/* ═══════════════ RECOVERY HELP MODE ═══════════════ */}
                  {mode === 'recoveryHelp' && (
                    <motion.div
                      key="recovery-hub"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-5"
                    >
                      <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-3">
                        <div className="flex items-center gap-2.5 text-neutral-400">
                          <ShieldAlert size={15} className="text-amber-500" />
                          <span className="text-[10px] font-black uppercase tracking-[0.15em]">Lost Credentials Protocol</span>
                        </div>
                        <p className="text-[12px] text-neutral-400 leading-relaxed font-medium">
                          If you have lost access to your registered email address, mobile number, and security credentials, our customer help desk is authorized to handle identity reclamation manually.
                        </p>
                        <p className="text-[12px] text-neutral-400 leading-relaxed font-medium">
                          Please email our verification desk with your full legal name, date of birth, and any proof of ownership.
                        </p>
                      </div>

                      <Link
                        href="mailto:helpline@shinken.in"
                        className="w-full h-12 bg-white text-black font-bold text-[13px] rounded-xl hover:bg-neutral-200 transition-all flex items-center justify-center gap-2"
                      >
                        <Mail size={14} />
                        Contact Verification Desk
                      </Link>
                    </motion.div>
                  )}

                  {/* ═══════════════ SIGNUP — 6-STEP WIZARD ═══════════════ */}

                  {/* Step 1 — Profile Basics */}
                  {mode === 'signup' && signupStep === 'basics' && (
                    <motion.div key="step-basics" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-4">
                      {/* Progress bar */}
                      <div className="flex gap-1 mb-2">
                        {['basics','email_verify','phone_trust','username_check','human_captcha','password_security'].map((s, i) => (
                          <div key={s} className={`h-0.5 flex-1 rounded-full transition-all duration-500 ${i === 0 ? 'bg-emerald-500' : 'bg-white/10'}`} />
                        ))}
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-600 ml-1">Full Name</label>
                        <input type="text" value={signupFullName} onChange={e => setSignupFullName(e.target.value)} required placeholder="Your full name"
                          className="w-full h-12 bg-white/[0.03] border border-white/5 rounded-xl px-4 text-white placeholder:text-neutral-700 outline-none focus:border-white/20 focus:bg-white/[0.05] transition-all text-sm font-medium" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between ml-1">
                          <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-600">Email Address</label>
                          <button type="button" onClick={() => setActiveLegal('contact')} className="text-[9px] font-bold text-neutral-600 hover:text-white transition-colors flex items-center gap-1">Why? <HelpCircle size={10} /></button>
                        </div>
                        <input type="email" value={signupEmail} onChange={e => setSignupEmail(e.target.value)} required placeholder="name@example.com"
                          className="w-full h-12 bg-white/[0.03] border border-white/5 rounded-xl px-4 text-white placeholder:text-neutral-700 outline-none focus:border-white/20 focus:bg-white/[0.05] transition-all text-sm font-medium" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between ml-1">
                          <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-600">Date of Birth</label>
                          <button type="button" onClick={() => setActiveLegal('contact')} className="text-[9px] font-bold text-neutral-600 hover:text-white transition-colors flex items-center gap-1">Why? <HelpCircle size={10} /></button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { label: 'Month', value: signupBirthMonth, setter: setSignupBirthMonth, opts: MONTHS.map((m, i) => ({ l: m, v: String(i + 1) })) },
                            { label: 'Day', value: signupBirthDay, setter: setSignupBirthDay, opts: days.map(d => ({ l: String(d), v: String(d) })) },
                            { label: 'Year', value: signupBirthYear, setter: setSignupBirthYear, opts: years.map(y => ({ l: String(y), v: String(y) })) }
                          ].map(sel => (
                            <div key={sel.label} className="relative group">
                              <select value={sel.value} onChange={e => sel.setter(e.target.value)}
                                className="w-full h-11 bg-white/[0.03] border border-white/5 rounded-xl px-3 text-neutral-400 text-[11px] appearance-none outline-none focus:border-white/20 transition-all cursor-pointer font-bold">
                                {sel.opts.map(o => <option key={o.v} value={o.v} className="bg-[#0c0c0c]">{o.l}</option>)}
                              </select>
                              <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-700 pointer-events-none" />
                            </div>
                          ))}
                        </div>
                      </div>
                      {basicsError && <p className="text-[11px] text-rose-400 font-bold text-center mt-1">{basicsError}</p>}
                      <button type="button" disabled={loading || !signupEmail || !signupFullName} onClick={handleNextBasics}
                        className="w-full h-12 bg-white text-black font-bold text-[13px] rounded-xl hover:bg-neutral-200 transition-all active:scale-[0.98] mt-2 flex items-center justify-center gap-2 disabled:opacity-50">
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <><span>Continue</span><ArrowRight size={14} /></>}
                      </button>
                    </motion.div>
                  )}

                  {/* Step 2 — Email Verification */}
                  {mode === 'signup' && signupStep === 'email_verify' && (
                    <motion.div key="step-email-verify" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-5">
                      <div className="flex gap-1 mb-2">
                        {['basics','email_verify','phone_trust','username_check','human_captcha','password_security'].map((s, i) => (
                          <div key={s} className={`h-0.5 flex-1 rounded-full transition-all duration-500 ${i <= 1 ? 'bg-emerald-500' : 'bg-white/10'}`} />
                        ))}
                      </div>
                      <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl">
                        <p className="text-[11px] text-emerald-400 font-bold leading-relaxed">
                          A secure verification code has been dispatched to <span className="text-white">{signupEmail}</span>. Please verify your inbox to proceed.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-600 ml-1">Verification Code</label>
                        <div className="flex gap-2.5 justify-center py-2">
                          {Array.from({ length: 6 }).map((_, idx) => {
                            const val = emailOtpCode[idx] || '';
                            return (
                              <input
                                key={idx}
                                ref={el => { otpRefs.current[idx] = el; }}
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={1}
                                value={val}
                                onChange={e => handleOtpChange(idx, e.target.value)}
                                onKeyDown={e => handleOtpKeyDown(idx, e)}
                                onPaste={handleOtpPaste}
                                className="w-12 h-14 bg-white/[0.03] border border-white/5 rounded-xl text-center text-lg font-bold text-white outline-none focus:border-violet-500 focus:bg-white/[0.06] focus:ring-1 focus:ring-violet-500/20 transition-all select-none"
                              />
                            );
                          })}
                        </div>
                      </div>
                      {emailOtpError && <p className="text-[11px] text-rose-400 font-bold text-center">{emailOtpError}</p>}
                      <button type="button" disabled={emailVerifying} onClick={handleVerifyEmail}
                        className="w-full h-12 bg-white text-black font-bold text-[13px] rounded-xl hover:bg-neutral-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50">
                        {emailVerifying ? <Loader2 size={16} className="animate-spin" /> : <><span>Verify & Continue</span><ArrowRight size={14} /></>}
                      </button>
                      <div className="flex flex-col gap-2.5 items-center justify-center pt-2">
                        <button 
                          type="button" 
                          disabled={otpCooldownSecs > 0 || otpRateLocked} 
                          onClick={handleResendOTP} 
                          className="text-[11.5px] font-bold text-violet-400 hover:text-violet-300 disabled:text-neutral-600 transition-colors disabled:cursor-not-allowed"
                        >
                          {otpCooldownSecs > 0 
                            ? `Resend code in ${otpCooldownSecs}s` 
                            : otpRateLocked 
                              ? 'Too many attempts. Locked.' 
                              : 'Resend verification code'}
                        </button>
                        <button type="button" onClick={() => setSignupStep('basics')} className="text-center text-[11.5px] text-neutral-500 hover:text-white transition-colors font-bold">
                          ← Change email address
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 3 — Mobile Number */}
                  {mode === 'signup' && signupStep === 'phone_trust' && (
                    <motion.div key={phoneOtpSent ? "step-phone-verify" : "step-phone"} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-4">
                      <div className="flex gap-1 mb-2">
                        {['basics','email_verify','phone_trust','username_check','human_captcha','password_security'].map((s, i) => (
                          <div key={s} className={`h-0.5 flex-1 rounded-full transition-all duration-500 ${i <= 2 ? 'bg-emerald-500' : 'bg-white/10'}`} />
                        ))}
                      </div>

                      {phoneOtpSent ? (
                        <>
                          <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl">
                            <p className="text-[11px] text-emerald-400 font-bold leading-relaxed">
                              A secure verification code has been sent to <span className="text-white">{selectedCountry.code} {signupPhone}</span>.
                            </p>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-600 ml-1">Verification Code</label>
                            <div className="flex gap-2.5 justify-center py-2">
                              {Array.from({ length: 6 }).map((_, idx) => {
                                const val = phoneOtpCode[idx] || '';
                                return (
                                  <input
                                    key={idx}
                                    ref={el => { phoneOtpRefs.current[idx] = el; }}
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    maxLength={1}
                                    value={val}
                                    onChange={e => handlePhoneOtpChange(idx, e.target.value)}
                                    onKeyDown={e => handlePhoneOtpKeyDown(idx, e)}
                                    onPaste={handlePhoneOtpPaste}
                                    className="w-12 h-14 bg-white/[0.03] border border-white/5 rounded-xl text-center text-lg font-bold text-white outline-none focus:border-violet-500 focus:bg-white/[0.06] focus:ring-1 focus:ring-violet-500/20 transition-all select-none"
                                  />
                                );
                              })}
                            </div>
                          </div>
                          {phoneOtpError && <p className="text-[11px] text-rose-400 font-bold text-center">{phoneOtpError}</p>}
                          <button type="button" disabled={phoneOtpVerifying} onClick={handleVerifyPhone}
                            className="w-full h-12 bg-white text-black font-bold text-[13px] rounded-xl hover:bg-neutral-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50">
                            {phoneOtpVerifying ? <Loader2 size={16} className="animate-spin" /> : <><span>Verify & Continue</span><ArrowRight size={14} /></>}
                          </button>
                          <div className="flex flex-col gap-2.5 items-center justify-center pt-2">
                            <button
                              type="button"
                              disabled={phoneOtpCooldownSecs > 0}
                              onClick={handleResendPhoneOTP}
                              className="text-[11.5px] font-bold text-violet-400 hover:text-violet-300 disabled:text-neutral-600 transition-colors disabled:cursor-not-allowed"
                            >
                              {phoneOtpCooldownSecs > 0
                                ? `Resend code in ${phoneOtpCooldownSecs}s`
                                : 'Resend verification code'}
                            </button>
                            <button type="button" onClick={() => setPhoneOtpSent(false)} className="text-center text-[11.5px] text-neutral-500 hover:text-white transition-colors font-bold">
                              ← Change mobile number
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          {/* Input */}
                          <div className="space-y-2">
                            <div className="flex justify-between items-center ml-1">
                              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-600">Mobile Number</label>
                              <button type="button" onClick={() => setShowPhonePolicy(true)} className="flex items-center gap-1.5 text-[9px] font-bold text-blue-500 hover:text-blue-400 transition-colors"><Plus size={10} /> Mobile Security</button>
                            </div>
                            <div className="relative flex gap-2">
                              <button type="button" onClick={() => { setShowCountryPicker(!showCountryPicker); if (!showCountryPicker) setCountrySearch(''); }}
                                className="h-12 px-3 bg-white/[0.03] border border-white/5 rounded-xl hover:bg-white/[0.05] hover:border-white/10 transition-all flex items-center gap-2 min-w-[96px]">
                                <img
                                  src={`https://flagcdn.com/w40/${selectedCountry.iso}.png`}
                                  alt={selectedCountry.name}
                                  className="w-6 h-4 object-cover rounded-sm opacity-90"
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                                <span className="text-[11px] font-black text-white">{selectedCountry.code}</span>
                                <ChevronDown size={11} className={`text-neutral-600 transition-transform flex-shrink-0 ${showCountryPicker ? 'rotate-180' : ''}`} />
                              </button>
                              <input type="tel" value={signupPhone} onChange={e => { const raw = e.target.value.replace(/\D/g, ''); if ((selectedCountry.iso === 'in' || selectedCountry.iso === 'us') && raw.length > 10) return; setSignupPhone(formatPhoneNumber(raw, selectedCountry.iso)); }}
                                placeholder={selectedCountry.iso === 'in' ? '00000 00000' : selectedCountry.iso === 'us' ? '(000) 000-0000' : '000 000 0000'}
                                className="flex-1 h-12 bg-white/[0.03] border border-white/5 rounded-xl px-4 text-white placeholder:text-neutral-700 outline-none focus:border-white/20 focus:bg-white/[0.05] transition-all text-sm font-medium" />
                              <AnimatePresence>
                                {showCountryPicker && (
                                  <>
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCountryPicker(false)} className="fixed inset-0 z-[120]" />
                                    <motion.div initial={{ opacity: 0, scale: 0.95, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                      className="absolute left-0 top-full mt-2 w-[300px] bg-[#0c0c0c] border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-[130] flex flex-col">
                                      <div className="p-3 border-b border-white/5 bg-white/[0.02]"><input autoFocus value={countrySearch} onChange={e => setCountrySearch(e.target.value)} placeholder="Search countries..." className="w-full h-9 bg-white/[0.03] border border-white/5 rounded-lg px-3 text-[11px] text-white placeholder:text-neutral-700 outline-none focus:border-blue-500/30 transition-all font-medium" /></div>
                                      <div className="p-2 grid gap-1 max-h-[260px] overflow-y-auto custom-scrollbar">
                                        {!countrySearch && <p className="text-[9px] font-black uppercase tracking-widest text-neutral-600 px-3 py-1 mt-1">Top Hubs</p>}
                                        {COUNTRIES.filter(c => c.name.toLowerCase().includes(countrySearch.toLowerCase()) || c.code.includes(countrySearch)).map((country, idx) => (
                                          <button key={country.name} type="button" onClick={() => { setSelectedCountry(country); setShowCountryPicker(false); }}
                                            className={`w-full p-3 rounded-xl flex items-center justify-between text-left transition-colors ${selectedCountry.name === country.name ? 'bg-white/5 border border-white/5' : 'hover:bg-white/[0.03]'}`}>
                                            <div className="flex items-center gap-3">
                                              <img src={`https://flagcdn.com/w40/${country.iso}.png`} alt={country.name} className="w-6 h-4 object-cover rounded-sm opacity-90" onError={(e) => { (e.target as HTMLImageElement).style.display='none'; }} />
                                              <div className="flex flex-col">
                                                <span className="text-[11px] font-bold text-white leading-none mb-0.5">{country.name}</span>
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

                          {phoneError && <p className="text-[11px] text-rose-400 font-bold text-center">{phoneError}</p>}

                          <div className="flex items-start gap-2 px-1">
                            <ShieldCheck size={11} className="text-neutral-600 flex-shrink-0 mt-0.5" />
                            <p className="text-[10px] text-neutral-600 leading-relaxed">Your mobile number is used only for account security and is never shared publicly. <button type="button" onClick={() => setShowPhonePolicy(true)} className="text-blue-500 hover:text-blue-400 transition-colors underline underline-offset-2">Learn more</button></p>
                          </div>

                          <button type="button" onClick={handleNextPhone} disabled={!signupPhone}
                            className="w-full h-12 bg-white text-black font-bold text-[13px] rounded-xl hover:bg-neutral-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50">
                            <span>Continue</span><ArrowRight size={14} />
                          </button>
                        </>
                      )}
                    </motion.div>
                  )}

                  {/* Step 4 — Username */}
                  {mode === 'signup' && signupStep === 'username_check' && (
                    <motion.div key="step-username" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-4">
                      <div className="flex gap-1 mb-2">
                        {['basics','email_verify','phone_trust','username_check','human_captcha','password_security'].map((s, i) => (
                          <div key={s} className={`h-0.5 flex-1 rounded-full transition-all duration-500 ${i <= 3 ? 'bg-emerald-500' : 'bg-white/10'}`} />
                        ))}
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center ml-1">
                          <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-600">Username</label>
                          <AnimatePresence mode="wait">
                            {usernameStatus === 'checking' && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1.5 text-[9px] font-bold text-neutral-500"><Loader2 size={10} className="animate-spin" /> Checking</motion.div>}
                            {usernameStatus === 'available' && <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-1.5 text-[9px] font-bold text-emerald-500"><CheckCircle2 size={10} /> Available</motion.div>}
                            {usernameStatus === 'taken' && <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-1.5 text-[9px] font-bold text-rose-500"><AlertCircle size={10} /> Taken</motion.div>}
                            {usernameStatus === 'invalid' && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[9px] font-bold text-neutral-700">{username.length < 5 ? 'Min 5 chars' : 'Invalid characters'}</motion.div>}
                          </AnimatePresence>
                        </div>
                        <div className="relative group overflow-hidden rounded-xl">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-700 group-focus-within:text-white transition-colors font-bold text-sm">@</span>
                          <input value={username} onChange={handleUsernameChange} placeholder="unique_handle"
                            className={`w-full h-12 bg-white/[0.03] border ${usernameStatus === 'available' ? 'border-emerald-500/30' : 'border-white/5'} rounded-xl pl-10 pr-4 text-white placeholder:text-neutral-700 outline-none focus:border-white/20 focus:bg-white/[0.05] transition-all text-sm font-medium`} />
                          <AnimatePresence>
                            {usernameStatus === 'available' && (
                              <motion.div initial={{ x: '-100%' }} animate={{ x: '100%' }} transition={{ duration: 1, ease: 'easeInOut', repeat: Infinity, repeatDelay: 2 }}
                                className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-500/10 to-transparent pointer-events-none" />
                            )}
                          </AnimatePresence>
                        </div>
                        {usernameStepError && <p className="text-[11px] text-rose-400 font-bold text-center">{usernameStepError}</p>}
                        <AnimatePresence>
                          {usernameStatus === 'taken' && suggestions.length > 0 && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-2 mt-2">
                              <p className="text-[9px] font-bold text-neutral-600 uppercase tracking-widest">Suggestions</p>
                              <div className="flex flex-wrap gap-1.5">
                                {suggestions.map(sug => (
                                  <button key={sug} type="button" onClick={() => applySuggestion(sug)}
                                    className="px-2.5 py-1 bg-white/[0.03] border border-white/5 rounded-lg text-[10px] font-bold text-neutral-400 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all flex items-center gap-1.5">
                                    {sug} <Plus size={10} />
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      <button type="button" disabled={loading || usernameStatus !== 'available'} onClick={handleNextUsername}
                        className="w-full h-12 bg-white text-black font-bold text-[13px] rounded-xl hover:bg-neutral-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50">
                        {loading ? (
                          <div className="flex gap-1.5">
                            <div className="w-1 h-1 bg-black rounded-full animate-pulse" />
                            <div className="w-1 h-1 bg-black rounded-full animate-pulse [animation-delay:200ms]" />
                            <div className="w-1 h-1 bg-black rounded-full animate-pulse [animation-delay:400ms]" />
                          </div>
                        ) : (
                          <><span>Continue</span><ArrowRight size={14} /></>
                        )}
                      </button>
                    </motion.div>
                  )}

                  {/* Step 5 — hCaptcha */}
                  {mode === 'signup' && signupStep === 'human_captcha' && (
                    <motion.div key="step-captcha" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-5">
                      <div className="flex gap-1 mb-2">
                        {['basics','email_verify','phone_trust','username_check','human_captcha','password_security'].map((s, i) => (
                          <div key={s} className={`h-0.5 flex-1 rounded-full transition-all duration-500 ${i <= 4 ? 'bg-emerald-500' : 'bg-white/10'}`} />
                        ))}
                      </div>
                      <div className="text-center space-y-2 pb-2">
                        <p className="text-[12px] text-neutral-400 font-medium">Complete the challenge below to confirm you are human.</p>
                      </div>
                      <div className="flex justify-center">
                        <HCaptchaWidget onVerify={(token: string) => setCaptchaToken(token)} />
                      </div>
                      {captchaError && <p className="text-[11px] text-rose-400 font-bold text-center">{captchaError}</p>}
                      <button type="button" disabled={!captchaToken} onClick={handleNextCaptcha}
                        className="w-full h-12 bg-white text-black font-bold text-[13px] rounded-xl hover:bg-neutral-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50">
                        <span>Continue</span><ArrowRight size={14} />
                      </button>
                    </motion.div>
                  )}

                  {/* Step 6 — Secure Password */}
                  {mode === 'signup' && signupStep === 'password_security' && (
                    <motion.div key="step-password" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-4">
                      <div className="flex gap-1 mb-2">
                        {['basics','email_verify','phone_trust','username_check','human_captcha','password_security'].map((s, i) => (
                          <div key={s} className={`h-0.5 flex-1 rounded-full transition-all duration-500 bg-emerald-500`} />
                        ))}
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-600 ml-1">Create Password</label>
                        <div className="relative flex items-center">
                          <input type={showSignupPassword ? "text" : "password"} value={signupPassword} onChange={e => { setSignupPassword(e.target.value); setPasswordError(''); }}
                            placeholder="Minimum 8 characters"
                            className="w-full h-12 bg-white/[0.03] border border-white/5 rounded-xl pl-4 pr-11 text-white placeholder:text-neutral-700 outline-none focus:border-white/20 focus:bg-white/[0.05] transition-all text-sm font-medium" />
                          <button type="button" onClick={() => setShowSignupPassword(!showSignupPassword)} className="absolute right-3.5 text-neutral-500 hover:text-white transition-colors p-1" tabIndex={-1} aria-label={showSignupPassword ? "Hide password" : "Show password"}>
                            {showSignupPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-600 ml-1">Confirm Password</label>
                        <div className="relative flex items-center">
                          <input type={showSignupConfirmPassword ? "text" : "password"} value={signupConfirmPassword} onChange={e => { setSignupConfirmPassword(e.target.value); setPasswordError(''); }}
                            placeholder="Re-enter password"
                            className="w-full h-12 bg-white/[0.03] border border-white/5 rounded-xl pl-4 pr-11 text-white placeholder:text-neutral-700 outline-none focus:border-white/20 focus:bg-white/[0.05] transition-all text-sm font-medium" />
                          <button type="button" onClick={() => setShowSignupConfirmPassword(!showSignupConfirmPassword)} className="absolute right-3.5 text-neutral-500 hover:text-white transition-colors p-1" tabIndex={-1} aria-label={showSignupConfirmPassword ? "Hide password" : "Show password"}>
                            {showSignupConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>
                      {passwordError && <p className="text-[11px] text-rose-400 font-bold text-center">{passwordError}</p>}
                      <p className="text-[10px] text-neutral-600 text-center px-4">
                        By joining, you agree to our <span onClick={() => setActiveLegal('terms')} className="text-neutral-400 font-bold hover:text-white cursor-pointer underline underline-offset-2">Digital Governance & Privacy</span> standards.
                      </p>
                      <button type="submit" disabled={loading || !signupPassword || !signupConfirmPassword}
                        className="w-full h-12 bg-white text-black font-bold text-[13px] rounded-xl hover:bg-neutral-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50">
                        {loading ? <div className="flex gap-1.5"><div className="w-1 h-1 bg-black rounded-full animate-pulse" /><div className="w-1 h-1 bg-black rounded-full animate-pulse [animation-delay:200ms]" /><div className="w-1 h-1 bg-black rounded-full animate-pulse [animation-delay:400ms]" /></div>
                          : <><span>Create Account</span><ArrowRight size={14} /></>}
                      </button>
                    </motion.div>
                  )}

                </AnimatePresence>
              </form>

              {/* Card Footer toggle mode */}
              <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between text-[11px] font-medium text-neutral-500">
                <span>
                  {mode === 'login' ? "Don't have an account?" :
                   mode === 'forgot' || mode === 'recoveryHelp' ? "Ready to authenticate?" : "Already registered?"}
                </span>
                <button
                  type="button"
                  onClick={toggleMode}
                  className="font-bold text-white hover:underline transition-all"
                >
                  {mode === 'login' ? 'Create Account' : 'Back to Sign In'}
                </button>
              </div>
            </div>

            {/* Back Button */}
            {mode !== 'login' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-6 flex justify-center"
              >
                <button
                  type="button"
                  onClick={handleBack}
                  className="h-10 px-5 bg-white/[0.02] border border-white/5 rounded-xl text-[10px] font-bold uppercase tracking-widest text-neutral-400 hover:text-white hover:bg-white/[0.05] transition-all flex items-center gap-2"
                >
                  <ArrowLeft size={12} />
                  <span>Go Back</span>
                </button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <LegalOverlay section={activeLegal} onClose={() => setActiveLegal(null)} />

      {/* ═════════════ PHONE POLICY MODAL ═════════════ */}
      <AnimatePresence>
        {showPhonePolicy && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowPhonePolicy(false)}
              className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm"
            />
            {/* Bottom Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 38 }}
              className="fixed inset-x-0 bottom-0 z-[210] max-w-[520px] mx-auto"
            >
              <div className="bg-[#0a0a0a] border-t border-white/10 rounded-t-3xl overflow-hidden shadow-2xl">
                {/* Drag handle */}
                <div className="flex justify-center pt-3 pb-1">
                  <div className="w-10 h-1 rounded-full bg-white/10" />
                </div>
                {/* Header */}
                <div className="relative px-6 pt-4 pb-4 border-b border-white/5">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                      <ShieldCheck size={15} className="text-blue-400" />
                    </div>
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-400">Verlyn Network</p>
                      <h2 className="text-[15px] font-black text-white leading-tight">Mobile Number Policy</h2>
                    </div>
                  </div>
                  <p className="text-[10px] text-neutral-500 mt-2 leading-relaxed">
                    Please read carefully before submitting your number.
                  </p>
                  <button onClick={() => setShowPhonePolicy(false)}
                    className="absolute top-5 right-5 w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all text-neutral-500 hover:text-white text-[14px] font-bold">
                    ✕
                  </button>
                </div>

                {/* Body */}
                <div className="px-6 py-5 space-y-4 max-h-[55vh] overflow-y-auto custom-scrollbar">
                  {/* Welcome note */}
                  <div className="p-3.5 bg-blue-500/5 border border-blue-500/15 rounded-xl">
                    <p className="text-[11px] text-blue-300 leading-relaxed font-medium">
                      Hello! We store your mobile number to secure your account and enable identity verification. We appreciate your trust — your privacy is our highest priority.
                    </p>
                  </div>

                  {/* Policy items */}
                  {[
                    {
                      icon: <Phone size={12} className="text-emerald-400" />,
                      title: 'Use Your Real, Active Number',
                      color: 'emerald',
                      body: 'You must provide a genuine mobile number that is currently active and registered in your name. This number should be active on WhatsApp or reachable via SMS for future verification purposes.'
                    },
                    {
                      icon: <ShieldCheck size={12} className="text-blue-400" />,
                      title: 'Secure & Private Storage',
                      color: 'blue',
                      body: 'Your number is encrypted, stored securely, and never shared with third parties, advertisers, or other users. It is used exclusively for account security, two-factor authentication, and identity verification.'
                    },
                    {
                      icon: <Info size={12} className="text-amber-400" />,
                      title: 'Number Lock After Confirmation',
                      color: 'amber',
                      body: 'Once you tap "Continue" and your number is confirmed, it cannot be changed until our team has fully verified your identity. This measure prevents account hijacking and protects your identity.'
                    },
                    {
                      icon: <ShieldAlert size={12} className="text-rose-400" />,
                      title: 'Zero Tolerance for False Numbers',
                      color: 'rose',
                      body: 'If our verification team discovers that you submitted a fake, recycled, or fraudulent number, your account will be permanently terminated and you will be restricted from accessing Verlyn across all platforms and devices.'
                    },
                  ].map((item) => (
                    <div key={item.title} className="p-4 bg-white/[0.01] border border-white/[0.03] rounded-2xl space-y-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-lg bg-white/[0.03] flex items-center justify-center flex-shrink-0 text-neutral-400 border border-white/5">
                          {item.icon}
                        </div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-neutral-300">{item.title}</p>
                      </div>
                      <p className="text-[11.5px] text-neutral-500 leading-relaxed pl-8.5">{item.body}</p>
                    </div>
                  ))}

                  {/* Commitment banner */}
                  <div className="p-3.5 bg-white/[0.03] border border-white/8 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Users2 size={12} className="text-neutral-300" />
                      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-neutral-300">Our Commitment to You</p>
                    </div>
                    <p className="text-[11px] text-neutral-500 leading-relaxed">
                      Verlyn is built on three non-negotiable pillars:{' '}
                      <span className="text-white font-bold">Privacy</span>,{' '}
                      <span className="text-white font-bold">Safety</span>, and{' '}
                      <span className="text-white font-bold">Real Accounts</span>.
                      Every policy we enforce exists to protect you and the community around you.
                    </p>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 pb-8 pt-4 border-t border-white/5 space-y-2.5">
                  <button
                    type="button"
                    onClick={() => { setShowPhonePolicy(false); setActiveLegal('terms'); }}
                    className="w-full h-10 rounded-xl border border-white/8 bg-white/[0.03] hover:bg-white/[0.06] text-[11px] font-bold text-neutral-300 hover:text-white transition-all flex items-center justify-center gap-2"
                  >
                    <ScrollText size={12} />
                    Read Full Terms & Privacy Policy
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPhonePolicy(false)}
                    className="w-full h-11 rounded-xl bg-white text-black font-black text-[12px] hover:bg-neutral-200 transition-all active:scale-[0.98]"
                  >
                    I Understand — Continue
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ═════════════ PHONE WARNING CONFIRMATION MODAL ═════════════ */}
      <AnimatePresence>
        {showPhoneConfirmWarning && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowPhoneConfirmWarning(false)}
              className="absolute inset-0 bg-black/85 backdrop-blur-sm"
            />
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="relative w-full max-w-[440px] flex flex-col max-h-[90vh] z-10"
            >
              <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="relative px-6 pt-6 pb-4 border-b border-white/5 flex-shrink-0">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
                      <ShieldAlert size={15} className="text-violet-400" />
                    </div>
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-violet-400">Verlyn Security</p>
                      <h2 className="text-[15px] font-black text-white leading-tight">Verification Integrity Check</h2>
                    </div>
                  </div>
                  <button onClick={() => setShowPhoneConfirmWarning(false)}
                    className="absolute top-5 right-5 w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all text-neutral-500 hover:text-white text-[14px] font-bold">
                    ✕
                  </button>
                </div>

                {/* Body */}
                <div className="px-6 py-5 space-y-4 flex-1 overflow-y-auto custom-scrollbar">
                  {/* Warning statement */}
                  <div className="p-3.5 bg-violet-500/5 border border-violet-500/15 rounded-xl space-y-2">
                    <p className="text-[11px] text-violet-300 leading-relaxed font-bold">
                      Attention Required:
                    </p>
                    <p className="text-[11px] text-neutral-300 leading-relaxed">
                      Hello user, we store your number for future verification. Make sure you enter your original number that is active on WhatsApp and active in general.
                    </p>
                    <p className="text-[11px] text-neutral-300 leading-relaxed">
                      Make sure you provide us your original number. We store it properly and safely. We appreciate your kindness.
                    </p>
                    <p className="text-[11px] text-neutral-300 leading-relaxed font-bold">
                      You cannot change the number once you tap confirm until we have verified this number.
                    </p>
                    <p className="text-[11px] text-violet-300 leading-relaxed font-bold">
                      If in the future during verification our team finds you use a fake or false number, we will terminate your account and restrict you from our website and app.
                    </p>
                  </div>

                  {/* Commitment statement */}
                  <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                    <p className="text-[10px] text-neutral-400 leading-normal">
                      Our first priority is <span className="text-white font-bold">Privacy + Safety + Real Accounts</span>.
                    </p>
                  </div>

                  {/* Checkbox Acknowledge */}
                  <label className="flex items-start gap-3 p-3 bg-white/[0.02] border border-white/5 rounded-xl cursor-pointer hover:bg-white/[0.04] transition-all">
                    <input
                      type="checkbox"
                      checked={confirmPhoneChecked}
                      onChange={(e) => setConfirmPhoneChecked(e.target.checked)}
                      className="mt-0.5 rounded border-white/10 bg-white/5 text-violet-500 focus:ring-0 focus:ring-offset-0"
                    />
                    <span className="text-[11px] text-neutral-300 leading-relaxed font-medium">
                      I confirm this is my original, active number and I accept the verification terms.
                    </span>
                  </label>

                  {phoneError && (
                    <p className="text-[11px] text-rose-400 font-bold text-center bg-rose-500/5 border border-rose-500/10 p-2.5 rounded-xl">
                      {phoneError}
                    </p>
                  )}
                </div>

                {/* Footer */}
                <div className="px-6 pb-6 pt-4 border-t border-white/5 space-y-2 flex-shrink-0">
                  <button
                    type="button"
                    disabled={loading || !confirmPhoneChecked}
                    onClick={handleConfirmAndProceedPhone}
                    className="w-full h-11 rounded-xl bg-white text-black font-black text-[12px] hover:bg-neutral-200 transition-all active:scale-[0.98] disabled:opacity-50 disabled:hover:bg-white flex items-center justify-center gap-1.5"
                  >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : 'Confirm & Proceed'}
                  </button>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setShowPhoneConfirmWarning(false); setShowPhonePolicy(true); }}
                      className="flex-1 h-9 rounded-lg border border-white/8 bg-white/[0.02] hover:bg-white/[0.05] text-[10px] font-bold text-neutral-400 hover:text-white transition-all"
                    >
                      Read Policy Details
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPhoneConfirmWarning(false)}
                      className="flex-1 h-9 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-bold text-neutral-400 hover:text-white transition-all"
                    >
                      Edit Number
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═════════════ USERNAME WARNING CONFIRMATION MODAL ═════════════ */}
      <AnimatePresence>
        {showUsernameConfirmWarning && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowUsernameConfirmWarning(false)}
              className="absolute inset-0 bg-black/85 backdrop-blur-sm"
            />
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="relative w-full max-w-[440px] flex flex-col max-h-[90vh] z-10"
            >
              <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="relative px-6 pt-6 pb-4 border-b border-white/5 flex-shrink-0">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
                      <ShieldAlert size={15} className="text-violet-400" />
                    </div>
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-violet-400">Verlyn Security</p>
                      <h2 className="text-[15px] font-black text-white leading-tight">Username Integrity Check</h2>
                    </div>
                  </div>
                  <button onClick={() => setShowUsernameConfirmWarning(false)}
                    className="absolute top-5 right-5 w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all text-neutral-500 hover:text-white text-[14px] font-bold">
                    ✕
                  </button>
                </div>

                {/* Body */}
                <div className="px-6 py-5 space-y-4 flex-1 overflow-y-auto custom-scrollbar">
                  {/* Warning statement */}
                  <div className="p-3.5 bg-violet-500/5 border border-violet-500/15 rounded-xl space-y-2">
                    <p className="text-[11px] text-violet-300 leading-relaxed font-bold">
                      Identity Representation Rules:
                    </p>
                    <p className="text-[11px] text-neutral-300 leading-relaxed">
                      Hello user, the username <span className="text-white font-bold">@{username}</span> is for personal/normal user accounts.
                    </p>
                    <p className="text-[11px] text-neutral-300 leading-relaxed">
                      If our verification team discovers that this username is related to any registered company, brand, government body, politician, organization, forbidden words, 18+ content, or anything harmful/impersonating, we will instantly suspend your account without prior notice.
                    </p>
                    <p className="text-[11px] text-violet-300 leading-relaxed font-bold">
                      Please make sure you use a normal, personal username.
                    </p>
                    <p className="text-[11px] text-neutral-300 leading-relaxed">
                      If you are trying to verify or claim a username on behalf of a company, organization, or brand, please register using our corporate channel or contact our support team.
                    </p>
                  </div>

                  {/* Checkbox Acknowledge */}
                  <label className="flex items-start gap-3 p-3 bg-white/[0.02] border border-white/5 rounded-xl cursor-pointer hover:bg-white/[0.04] transition-all">
                    <input
                      type="checkbox"
                      checked={confirmUsernameChecked}
                      onChange={(e) => setConfirmUsernameChecked(e.target.checked)}
                      className="mt-0.5 rounded border-white/10 bg-white/5 text-violet-500 focus:ring-0 focus:ring-offset-0"
                    />
                    <span className="text-[11px] text-neutral-300 leading-relaxed font-medium">
                      I confirm this is a personal username and accept the identity representation terms.
                    </span>
                  </label>

                  {usernameStepError && (
                    <p className="text-[11px] text-rose-400 font-bold text-center bg-rose-500/5 border border-rose-500/10 p-2.5 rounded-xl">
                      {usernameStepError}
                    </p>
                  )}
                </div>

                {/* Footer */}
                <div className="px-6 pb-6 pt-4 border-t border-white/5 space-y-2 flex-shrink-0">
                  <button
                    type="button"
                    disabled={loading || !confirmUsernameChecked}
                    onClick={handleConfirmAndProceedUsername}
                    className="w-full h-11 rounded-xl bg-white text-black font-black text-[12px] hover:bg-neutral-200 transition-all active:scale-[0.98] disabled:opacity-50 disabled:hover:bg-white flex items-center justify-center gap-1.5"
                  >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : 'Confirm & Proceed'}
                  </button>
                  <div className="flex gap-2">
                    <a
                      href="https://verlyn.in/support"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 h-9 rounded-lg border border-white/8 bg-white/[0.02] hover:bg-white/[0.05] text-[10px] font-bold text-neutral-400 hover:text-white transition-all flex items-center justify-center gap-1"
                    >
                      Support <ExternalLink size={10} />
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        setShowUsernameConfirmWarning(false);
                        setActiveLegal('terms');
                      }}
                      className="flex-1 h-9 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-bold text-neutral-400 hover:text-white transition-all"
                    >
                      Terms & Conditions
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowUsernameConfirmWarning(false)}
                    className="w-full h-9 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-bold text-neutral-400 hover:text-white transition-all"
                  >
                    Edit Username
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Domain Restricted Modal ── */}
      <AnimatePresence>
        {showDomainBlockModal && (
          <div className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center p-0 sm:p-6">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setShowDomainBlockModal(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-[3px]"
            />

            {/* Pure glass card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 14 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-full max-w-[400px] rounded-t-2xl sm:rounded-2xl overflow-hidden
                         bg-[#060606]/90 backdrop-blur-2xl
                         border border-white/[0.07]
                         shadow-[0_32px_80px_rgba(0,0,0,0.7)]"
            >
              {/* Violet top rule */}
              <div className="h-px bg-gradient-to-r from-transparent via-violet-500/60 to-transparent" />

              {/* Mobile handle */}
              <div className="w-8 h-[3px] bg-white/10 rounded-full mx-auto mt-4 sm:hidden" />

              <div className="p-6 sm:p-7 space-y-5">
                {/* Icon row + title */}
                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-violet-500/[0.12] border border-violet-500/20
                                  flex items-center justify-center shrink-0 mt-0.5">
                    <ShieldAlert size={15} className="text-violet-400" />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-violet-400/60 mb-0.5">
                      Security Compliance
                    </p>
                    <h2 className="text-[15px] font-bold text-white leading-snug tracking-tight">
                      Restricted Identity Domain
                    </h2>
                  </div>
                </div>

                {/* Rule */}
                <div className="h-px bg-white/[0.06]" />

                {/* Copy */}
                <div className="space-y-3">
                  <p className="text-[12px] text-neutral-400 leading-relaxed">
                    To protect the security, privacy, and integrity of our communication network, Verlyn enforces strict domain verification checks for all new accounts. The email domain{' '}
                    {blockedDomain && (
                      <span className="font-mono text-[11px] text-violet-300
                                       bg-violet-500/10 border border-violet-500/15
                                       px-1.5 py-0.5 rounded-md mx-1">
                        @{blockedDomain}
                      </span>
                    )}{' '}
                    is not currently recognized under our global security standards. In order to prevent spam, bot registrations, and unauthorized access, we exclusively support verified corporate, institutional, and major public email networks.
                  </p>
                  <p className="text-[11px] text-neutral-500 leading-relaxed font-medium">
                    If you are registering on behalf of a company, educational institution, or custom organization and wish to use a private domain, you can request manual clearance. Our compliance and operations desk will audit your domain configuration, review its signature, and provision authorization to access our network as soon as the verification process is complete.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 pt-1">
                  <Link
                    href="https://verlyn.in/support"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full h-11 rounded-xl
                               bg-violet-600 hover:bg-violet-500
                               text-white font-bold text-[12px] tracking-wide
                               transition-all duration-150 active:scale-[0.98]
                               flex items-center justify-center gap-2"
                  >
                    Request Domain Clearance
                    <ArrowRight size={12} />
                  </Link>
                  <button
                    type="button"
                    onClick={() => setShowDomainBlockModal(false)}
                    className="w-full h-10 text-neutral-600 hover:text-neutral-300
                               text-[11px] font-medium transition-colors"
                  >
                    ← Modify email address
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═════════════ TERMS POPUP MODAL ═════════════ */}
      <AnimatePresence>
        {showTermsPopup && (
          <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-8">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTermsPopup(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 100, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.95 }}
              className="relative w-full max-w-[440px] bg-[#0c0c0c] border border-white/10 rounded-t-3xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl z-10"
            >
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2.5 text-neutral-400">
                  <ScrollText size={16} className="text-white" />
                  <span className="text-[10px] font-black uppercase tracking-[0.25em]">Governance & Privacy Pledge</span>
                </div>
                <div className="space-y-3 text-[11px] leading-relaxed text-neutral-400 font-medium">
                  <p>
                    By creating your identity on the Verlyn Network, you acknowledge and agree to our decentralized system architecture, digital sovereignty governance, and privacy protection protocols.
                  </p>
                  <p>
                    All communication traces are securely sealed, and you retain absolute ownership and control over your keys and records.
                  </p>
                </div>
                <div className="flex gap-3 mt-4">
                  <button
                    type="button"
                    onClick={() => setShowTermsPopup(false)}
                    className="flex-1 h-11 bg-white/5 border border-white/10 hover:bg-white/10 text-neutral-400 hover:text-white font-bold text-[12px] rounded-xl transition-all"
                  >
                    Decline
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTermsAccepted(true);
                      setShowTermsPopup(false);
                      setTimeout(() => {
                        if (formRef.current) {
                          formRef.current.requestSubmit();
                        }
                      }, 50);
                    }}
                    className="flex-1 h-11 bg-white text-black font-black text-[12px] rounded-xl hover:bg-neutral-200 transition-all"
                  >
                    Accept & Join
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
