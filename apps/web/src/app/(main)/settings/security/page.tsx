'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { getActiveSessions, logoutSession, getMFAStatus, updateProfileInfo, getUserSettings, updateUserSettings } from '@/app/(main)/settings/actions';
import { enrollMFA, verifyMFA, unenrollMFA } from '@/app/(main)/settings/mfa-actions';
import { createClient } from '@/lib/supabase/client';
import { 
    SettingsSection, 
    SettingsRow, 
    SettingsInput, 
    SettingsToggle,
    SettingsButton,
    ModalSystem,
    Toast 
} from '../components';
import { 
    Loader2, Shield, Mail, Smartphone, AlertOctagon, 
    Copy, Check, ShieldCheck, Lock, Eye, Map, Globe,
    Activity, Clock, UserCheck, AlertTriangle, ShieldAlert,
    ChevronRight, ArrowRight, Printer, KeyRound, Dna, Fingerprint,
    Pencil, Save, X, Phone, EyeOff
} from 'lucide-react';
import { 
    getDeviceTrustStatus, 
    getTrustedDevices, 
    checkSensitiveActionGate, 
    activateSecurityCooldown, 
    getSecurityEventsLog,
    logSecurityEvent,
    getPasskeys,
    registerPasskeyAction,
    deletePasskeyAction,
    checkPasswordLeakAction,
    revokeSessionAction,
    changePasswordSecure,
    sendForgotPasswordOtp,
    verifyForgotPasswordOtp,
    initiateRecoveryEmailChange,
    verifyRecoveryPrimaryOtp,
    sendRecoveryEmailNewOtp,
    verifyRecoveryEmailNewOtp,
    renameDeviceAction,
    getRecoveryPhoneAction,
    SecurityEvent,
    PasskeyRecord
} from './actions';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

export default function SecuritySettings() {
    const currentUser = useAppStore(s => s.currentUser);
    const setUser = useAppStore(s => s.setUser);
    
    const [sessions, setSessions] = useState<any[]>([]);
    const [mfaStatus, setMfaStatus] = useState<{ isActive: boolean; factorId?: string }>({ isActive: false });
    const [loading, setLoading] = useState(false);
    
    // Password state
    const [passData, setPassData] = useState({ current: '', new: '', verify: '' });
    const [passError, setPassError] = useState<string | null>(null);
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [passStrength, setPassStrength] = useState(0);
    const [showCurrentPasswordInput, setShowCurrentPasswordInput] = useState(false);
    const [showNewPasswordInput, setShowNewPasswordInput] = useState(false);
    const [showVerifyPasswordInput, setShowVerifyPasswordInput] = useState(false);

    // Forgot password states
    const [isForgotFlow, setIsForgotFlow] = useState(false);
    const [forgotStep, setForgotStep] = useState(1); // 1: send, 2: verify
    const [forgotCode, setForgotCode] = useState('');
    const [isForgotFlowVerified, setIsForgotFlowVerified] = useState(false);

    // Recovery Email multi-step state
    const [recoveryEmail, setRecoveryEmail] = useState('');
    const [recoveryState, setRecoveryState] = useState<'idle' | 'sending' | 'completed'>('idle');
    const [recoverySubState, setRecoverySubState] = useState<'idle' | 'password_verify' | 'otp_primary' | 'input_new_email' | 'otp_new' | 'completed'>('idle');
    const [recoveryConfirmPassword, setRecoveryConfirmPassword] = useState('');
    const [recoveryPrimaryOtp, setRecoveryPrimaryOtp] = useState('');
    const [recoveryNewEmail, setRecoveryNewEmail] = useState('');
    const [recoveryNewOtp, setRecoveryNewOtp] = useState('');

    // Recovery Phone future-ready state
    const [recoveryPhone, setRecoveryPhone] = useState('');

    // Privacy Controls state
    const [privacySettings, setPrivacySettings] = useState({
        is_private: false,
        activity_visibility: true,
        invisible_mode: false,
    });

    // MFA enrollment state
    const [showMFAModal, setShowMFAModal] = useState(false);
    const [mfaStep, setMfaStep] = useState(1); // 1: confirm password, 2: qr scan, 3: verify totp, 4: backup codes
    const [mfaEnrollPassword, setMfaEnrollPassword] = useState('');
    const [totpCode, setTotpCode] = useState('');
    const [mfaCodeError, setMfaCodeError] = useState<string | null>(null);
    const [copiedSecret, setCopiedSecret] = useState(false);
    const [copiedBackups, setCopiedBackups] = useState(false);
    const [qrCodeUri, setQrCodeUri] = useState('');
    const [mfaSecret, setMfaSecret] = useState('');
    const [mfaFactorId, setMfaFactorId] = useState('');
    const [mfaBackupCodes, setMfaBackupCodes] = useState<string[]>([]);

    // Passkeys state
    const [passkeys, setPasskeys] = useState<PasskeyRecord[]>([]);
    const [showPasskeyForm, setShowPasskeyForm] = useState(false);
    const [passkeyNickname, setPasskeyNickname] = useState('');
    const [isPasswordLeaked, setIsPasswordLeaked] = useState(false);
    const [passwordLeakCount, setPasswordLeakCount] = useState<number | null>(null);
    const [showScanningOverlay, setShowScanningOverlay] = useState(false);

    // Audit logs timeline
    const [securityTimeline, setSecurityTimeline] = useState<SecurityEvent[]>([]);
    const [deviceFingerprint, setDeviceFingerprint] = useState('dev-default');
    const [currentOS, setCurrentOS] = useState('Device');
    const [currentBrowser, setCurrentBrowser] = useState('Web Browser');
    
    // Session inline editing state
    const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
    const [editingSessionName, setEditingSessionName] = useState<string>('');

    const [toast, setToast] = useState({ show: false, message: '', type: 'success' as 'success' | 'error' });

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
    };

    // Calculate browser fingerprint
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const ua = navigator.userAgent;
        let os = 'Unknown OS';
        if (ua.includes('Windows')) os = 'Windows';
        else if (ua.includes('Macintosh') || ua.includes('Mac OS')) os = 'macOS';
        else if (ua.includes('Android')) os = 'Android';
        else if (ua.includes('Linux')) os = 'Linux';
        else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
        setCurrentOS(os);

        let browser = 'Unknown Browser';
        if (ua.includes('Chrome')) browser = 'Chrome';
        else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
        else if (ua.includes('Firefox')) browser = 'Firefox';
        else if (ua.includes('Edg')) browser = 'Edge';
        setCurrentBrowser(browser);

        const computeFingerprint = () => {
            const parts = [
                navigator.userAgent,
                navigator.language,
                screen.colorDepth,
                screen.width + 'x' + screen.height,
                new Date().getTimezoneOffset()
            ];
            const str = parts.join('|');
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = (hash << 5) - hash + char;
                hash = hash & hash;
            }
            return 'dev-' + Math.abs(hash).toString(16);
        };
        setDeviceFingerprint(computeFingerprint());
    }, []);

    // Load initial states from Supabase
    useEffect(() => {
        if (!currentUser?.id) return;

        // Fetch real sessions
        getActiveSessions(currentUser.id, deviceFingerprint === 'dev-default' ? undefined : deviceFingerprint).then(res => {
            if (res.success && res.sessions) {
                setSessions(res.sessions);
            }
        });

        // Load metadata parameters
        const metadata = currentUser.metadata || {};
        if (metadata.recovery_email) {
            setRecoveryEmail(metadata.recovery_email);
            setRecoveryState('completed');
        } else {
            const savedRecovery = localStorage.getItem(`verlyn_recovery_email_${currentUser.id}`);
            if (savedRecovery) {
                setRecoveryEmail(savedRecovery);
                setRecoveryState('completed');
            }
        }

        getRecoveryPhoneAction(currentUser.id).then(res => {
            if (res.success && res.phone) {
                setRecoveryPhone(res.phone);
            } else {
                const savedPhone = localStorage.getItem(`verlyn_recovery_phone_${currentUser.id}`);
                if (savedPhone) {
                    setRecoveryPhone(savedPhone);
                }
            }
        });

        // Load MFA status
        getMFAStatus(currentUser.id).then(res => {
            if (res.success) setMfaStatus({ isActive: res.isActive, factorId: res.factorId });
        });

        // Get WebAuthn Passkeys list
        getPasskeys(currentUser.id).then(res => {
            if (res.success && res.passkeys) {
                setPasskeys(res.passkeys);
            }
        });

        // Fetch privacy settings
        getUserSettings(currentUser.id).then(res => {
            if (res.success && res.settings) {
                setPrivacySettings({
                    is_private: res.settings.is_private,
                    activity_visibility: res.settings.activity_visibility,
                    invisible_mode: res.settings.invisible_mode,
                });
            }
        });

        // Fetch audit logs
        getSecurityEventsLog(currentUser.id).then(logs => {
            setSecurityTimeline(logs);
        });
    }, [currentUser]);

    // Handle password strength logic
    const evaluatePasswordStrength = (pw: string) => {
        let strength = 0;
        if (pw.length >= 12) strength += 25;
        else if (pw.length >= 8) strength += 10;
        if (/[A-Z]/.test(pw)) strength += 20;
        if (/[a-z]/.test(pw)) strength += 15;
        if (/[0-9]/.test(pw)) strength += 20;
        if (/[^A-Za-z0-9]/.test(pw)) strength += 20;
        setPassStrength(Math.min(100, strength));
    };

    const handlePasswordUpdate = async () => {
        if (!currentUser?.id) return;
        
        const gate = await checkSensitiveActionGate(currentUser.id, deviceFingerprint, 'password_update');
        if (!gate.allowed) {
            showToast(gate.message || 'Action restricted', 'error');
            return;
        }

        if (!isForgotFlowVerified && !passData.current) {
            setPassError('Current password is required');
            return;
        }
        if (!passData.new || !passData.verify) {
            setPassError('All password fields are required');
            return;
        }
        if (passData.new !== passData.verify) {
            setPassError('Passwords do not match');
            return;
        }
        if (passStrength < 75) {
            setPassError('Please satisfy all password strength requirements.');
            return;
        }
        
        setLoading(true);
        const res = await changePasswordSecure(
            isForgotFlowVerified ? null : passData.current,
            passData.new,
            isForgotFlowVerified
        );
        if (res.error) {
            setPassError(res.error);
        } else {
            await activateSecurityCooldown(currentUser.id, 'password_update', 24);
            
            const updatedLogs = await getSecurityEventsLog(currentUser.id);
            setSecurityTimeline(updatedLogs);

            // Re-fetch sessions to sync token rotation sign-outs
            getActiveSessions(currentUser.id, deviceFingerprint).then(sessionRes => {
                if (sessionRes.success && sessionRes.sessions) {
                    setSessions(sessionRes.sessions);
                }
            });

            showToast('Password updated successfully. Other sessions terminated.');
            setPassData({ current: '', new: '', verify: '' });
            setPassStrength(0);
            setShowPasswordForm(false);
            setPassError(null);
            setIsForgotFlow(false);
            setIsForgotFlowVerified(false);
            setForgotCode('');
            setForgotStep(1);
        }
        setLoading(false);
    };

    // Forgot Password OTP handlers
    const handleStartForgotPasswordOtp = async () => {
        setLoading(true);
        const res = await sendForgotPasswordOtp();
        setLoading(false);
        if (res.success) {
            setForgotStep(2);
            showToast('Recovery verification code sent to your email.');
        } else {
            showToast(res.error || 'Failed to send recovery code.', 'error');
        }
    };

    const handleVerifyForgotPasswordOtpCode = async () => {
        setLoading(true);
        const res = await verifyForgotPasswordOtp(forgotCode);
        setLoading(false);
        if (res.success) {
            setIsForgotFlowVerified(true);
            setForgotStep(1);
            showToast('Identity verified. Please set a new password.');
        } else {
            showToast(res.error || 'Invalid verification code.', 'error');
        }
    };

    // Double-OTP Recovery Email change flows
    const handleStartRecoverySetup = async () => {
        if (!currentUser?.id) return;
        const gate = await checkSensitiveActionGate(currentUser.id, deviceFingerprint, 'recovery_change');
        if (!gate.allowed) {
            showToast(gate.message || 'Action restricted', 'error');
            return;
        }

        setRecoveryState('sending');
        setRecoverySubState('password_verify');
        setRecoveryConfirmPassword('');
        setRecoveryPrimaryOtp('');
        setRecoveryNewEmail('');
        setRecoveryNewOtp('');
    };

    const handleVerifyRecoveryPassword = async () => {
        if (!recoveryConfirmPassword.trim()) {
            showToast('Please enter your password', 'error');
            return;
        }

        setLoading(true);
        const res = await initiateRecoveryEmailChange(recoveryConfirmPassword);
        setLoading(false);

        if (res.success) {
            setRecoverySubState('otp_primary');
            showToast('Verification code transmitted to your primary email address.');
        } else {
            showToast(res.error || 'Password verification failed.', 'error');
        }
    };

    const handleVerifyRecoveryPrimaryOtp = async () => {
        if (!recoveryPrimaryOtp.trim()) {
            showToast('Please enter verification code', 'error');
            return;
        }

        setLoading(true);
        const res = await verifyRecoveryPrimaryOtp(recoveryPrimaryOtp);
        setLoading(false);

        if (res.success) {
            setRecoverySubState('input_new_email');
            showToast('Primary email verified. Enter your new recovery email address.');
        } else {
            showToast(res.error || 'Invalid verification code.', 'error');
        }
    };

    const handleSendRecoveryNewOtp = async () => {
        if (!recoveryNewEmail || !recoveryNewEmail.includes('@')) {
            showToast('Please enter a valid email address', 'error');
            return;
        }
        if (currentUser?.email && recoveryNewEmail.trim().toLowerCase() === currentUser.email.trim().toLowerCase()) {
            showToast('Recovery email cannot be identical to your primary email', 'error');
            return;
        }

        setLoading(true);
        const res = await sendRecoveryEmailNewOtp(recoveryNewEmail);
        setLoading(false);

        if (res.success) {
            setRecoverySubState('otp_new');
            showToast('Verification code transmitted to your new recovery email.');
        } else {
            showToast(res.error || 'Failed to send verification code.', 'error');
        }
    };

    const handleVerifyRecoveryNewOtp = async () => {
        if (!recoveryNewOtp.trim()) {
            showToast('Please enter verification code', 'error');
            return;
        }

        setLoading(true);
        const res = await verifyRecoveryEmailNewOtp(recoveryNewOtp);
        setLoading(false);

        if (res.success) {
            const newMetadata = { ...currentUser?.metadata, recovery_email: recoveryNewEmail };
            setUser({
                ...currentUser!,
                metadata: newMetadata
            });
            localStorage.setItem(`verlyn_recovery_email_${currentUser?.id}`, recoveryNewEmail);
            setRecoveryEmail(recoveryNewEmail);
            setRecoverySubState('completed');
            setRecoveryState('completed');
            showToast('Recovery channel established and verified');

            const logs = await getSecurityEventsLog(currentUser?.id || '');
            setSecurityTimeline(logs);
        } else {
            showToast(res.error || 'Invalid verification code.', 'error');
        }
    };

    const handleResetRecovery = async () => {
        if (!currentUser?.id) return;
        
        const gate = await checkSensitiveActionGate(currentUser.id, deviceFingerprint, 'recovery_change');
        if (!gate.allowed) {
            showToast(gate.message || 'Action restricted', 'error');
            return;
        }

        setLoading(true);
        const supabase = createClient();
        const newMetadata = { ...currentUser?.metadata };
        delete newMetadata.recovery_email;
        const { error } = await supabase.auth.updateUser({
            data: newMetadata
        });
        
        if (error) {
            showToast(error.message, 'error');
        } else {
            setUser({
                ...currentUser!,
                metadata: newMetadata
            });
            localStorage.removeItem(`verlyn_recovery_email_${currentUser?.id}`);
            await logSecurityEvent(currentUser.id, 'recovery_reset', 'high', 'Recovery email channel reset.');

            const updatedLogs = await getSecurityEventsLog(currentUser.id);
            setSecurityTimeline(updatedLogs);

            setRecoveryEmail('');
            setRecoveryState('idle');
            showToast('Recovery email channel reset');
        }
        setLoading(false);
    };


    // Privacy toggles
    const handleTogglePrivacy = async (key: 'is_private' | 'activity_visibility' | 'invisible_mode', value: boolean) => {
        if (!currentUser?.id) return;
        setPrivacySettings(prev => ({ ...prev, [key]: value }));
        
        const res = await updateUserSettings(currentUser.id, { [key]: value });
        if (res.error) {
            showToast(res.error, 'error');
            // Revert
            setPrivacySettings(prev => ({ ...prev, [key]: !value }));
        } else {
            showToast('Privacy preferences updated successfully.');
            // Update stores/local state if needed
            const logMsg = key === 'is_private' ? `Profile visibility changed to ${value ? 'Private' : 'Public'}` :
                           key === 'invisible_mode' ? `Ghost mode ${value ? 'activated' : 'deactivated'}` :
                           `Last Seen visibility ${value ? 'enabled' : 'disabled'}`;
            await logSecurityEvent(currentUser.id, 'privacy_settings_updated', 'low', logMsg);
            const updatedLogs = await getSecurityEventsLog(currentUser.id);
            setSecurityTimeline(updatedLogs);
        }
    };

    // MFA configuration
    const initiateMFASetup = async () => {
        if (!currentUser?.id) return;
        
        const gate = await checkSensitiveActionGate(currentUser.id, deviceFingerprint, '2fa_enable');
        if (!gate.allowed) {
            showToast(gate.message || 'Action restricted', 'error');
            return;
        }

        setMfaEnrollPassword('');
        setMfaStep(1);
        setTotpCode('');
        setMfaCodeError(null);
        setCopiedSecret(false);
        setCopiedBackups(false);
        setQrCodeUri('');
        setShowMFAModal(true);
    };

    const handleVerifyMFAEnrollPassword = async () => {
        if (!mfaEnrollPassword.trim()) {
            setMfaCodeError('Please enter your account password');
            return;
        }

        setLoading(true);
        setMfaCodeError(null);
        const res = await enrollMFA(mfaEnrollPassword);
        setLoading(false);

        if (res.error) {
            setMfaCodeError(res.error);
        } else {
            setQrCodeUri(res.qrCodeUri || '');
            setMfaSecret(res.totp?.secret || '');
            setMfaFactorId(res.id || '');
            setMfaBackupCodes(res.recoveryCodes || []);
            setMfaStep(2);
        }
    };

    const copySecretKey = () => {
        navigator.clipboard.writeText(mfaSecret || 'JBSWY3DPEHPK3PXP');
        setCopiedSecret(true);
        setTimeout(() => setCopiedSecret(false), 2000);
    };

    const handleVerifyMFA = async () => {
        if (totpCode.length !== 6 || isNaN(Number(totpCode))) {
            setMfaCodeError('Please enter a valid 6-digit code');
            return;
        }
        setLoading(true);
        const res = await verifyMFA(mfaFactorId, totpCode);
        setLoading(false);
        
        if (res.error) {
            setMfaCodeError(res.error);
        } else {
            setMfaStep(4);
            setMfaStatus({ isActive: true, factorId: mfaFactorId });
            await logSecurityEvent(currentUser?.id || '', 'mfa_enabled', 'high', 'Two-factor authentication (TOTP) successfully configured.');
            
            const updatedLogs = await getSecurityEventsLog(currentUser?.id || '');
            setSecurityTimeline(updatedLogs);

            showToast('Two-factor verification enabled');
        }
    };

    const copyBackupCodes = () => {
        navigator.clipboard.writeText(mfaBackupCodes.join('\n'));
        setCopiedBackups(true);
        setTimeout(() => setCopiedBackups(false), 2000);
    };

    const handleDisableMFA = async () => {
        if (!currentUser?.id) return;
        
        const gate = await checkSensitiveActionGate(currentUser.id, deviceFingerprint, '2fa_disable');
        if (!gate.allowed) {
            showToast(gate.message || 'Action restricted', 'error');
            return;
        }

        const password = window.prompt('To confirm disabling two-factor authentication, please enter your account password:');
        if (password === null) return; // User cancelled
        if (!password.trim()) {
            showToast('Password is required to disable two-factor authentication.', 'error');
            return;
        }

        setLoading(true);
        if (mfaStatus.factorId) {
            const res = await unenrollMFA(mfaStatus.factorId, password);
            if (res.error) {
                showToast(res.error, 'error');
            } else {
                setMfaStatus({ isActive: false });
                await logSecurityEvent(currentUser.id, 'mfa_disabled', 'critical', 'Two-factor authentication disabled.');

                const updatedLogs = await getSecurityEventsLog(currentUser.id);
                setSecurityTimeline(updatedLogs);

                showToast('Two-factor verification disabled', 'error');
            }
        } else {
            showToast('No active MFA factor found', 'error');
        }
        setLoading(false);
    };

    // Sessions revocation
    const handleRevokeSession = async (sessionId: string) => {
        if (!currentUser?.id) return;

        const gate = await checkSensitiveActionGate(currentUser.id, deviceFingerprint, 'revoke_session');
        if (!gate.allowed) {
            showToast(gate.message || 'Action restricted', 'error');
            return;
        }

        if (sessionId === 'sess-current') {
            showToast('Cannot revoke current session. Use logout instead.', 'error');
            return;
        }
        
        setLoading(true);
        const res = await revokeSessionAction(currentUser.id, sessionId);
        setLoading(false);
        
        if (res.success) {
            setSessions(prev => prev.filter(s => s.id !== sessionId));
            const updatedLogs = await getSecurityEventsLog(currentUser.id);
            setSecurityTimeline(updatedLogs);
            showToast('Login session terminated');
        } else {
            showToast('Failed to terminate login session', 'error');
        }
    };

    const handleRevokeAllOthers = async () => {
        if (!currentUser?.id) return;

        const gate = await checkSensitiveActionGate(currentUser.id, deviceFingerprint, 'revoke_session');
        if (!gate.allowed) {
            showToast(gate.message || 'Action restricted', 'error');
            return;
        }

        setLoading(true);
        const supabase = createClient();
        const { error } = await supabase.auth.signOut({ scope: 'others' });
        if (error) {
            showToast(error.message, 'error');
        } else {
            setSessions(prev => prev.filter(s => s.current));
            await logSecurityEvent(currentUser.id, 'all_sessions_revoked', 'high', 'All other active sessions revoked.');

            const updatedLogs = await getSecurityEventsLog(currentUser.id);
            setSecurityTimeline(updatedLogs);

            showToast('All other active sessions revoked successfully');
        }
        setLoading(false);
    };

    // Passkeys enrollment & revocation
    const handleRegisterPasskey = async () => {
        if (!currentUser?.id) return;
        if (!passkeyNickname || passkeyNickname.trim() === '') {
            showToast('Please enter a nickname for the security key', 'error');
            return;
        }
        setLoading(true);
        setShowScanningOverlay(true);

        try {
            if (typeof window !== 'undefined' && window.crypto && navigator.credentials) {
                const challenge = new Uint8Array(32);
                window.crypto.getRandomValues(challenge);
                
                const userIdBytes = new TextEncoder().encode(currentUser.id);
                const userBuffer = new Uint8Array(16);
                userBuffer.set(userIdBytes.slice(0, 16));
                
                const rpId = window.location.hostname || 'localhost';
                
                const creationOptions: PublicKeyCredentialCreationOptions = {
                    challenge,
                    rp: {
                        name: "Verlyn Social Space",
                        id: rpId,
                    },
                    user: {
                        id: userBuffer,
                        name: currentUser.username || currentUser.email || 'user',
                        displayName: currentUser.username || currentUser.email || 'User',
                    },
                    pubKeyCredParams: [
                        { alg: -7, type: "public-key" }, // ES256 (ECDSA)
                        { alg: -257, type: "public-key" }, // RS256 (RSA)
                    ],
                    authenticatorSelection: {
                        userVerification: "preferred"
                    },
                    timeout: 60000,
                    attestation: "none",
                };

                const credential = await navigator.credentials.create({
                    publicKey: creationOptions
                }) as PublicKeyCredential;

                if (!credential) {
                    throw new Error('No credential returned');
                }

                const attResponse = credential.response as AuthenticatorAttestationResponse;
                const toBase64url = (buf: ArrayBuffer) =>
                    btoa(String.fromCharCode(...new Uint8Array(buf)))
                        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

                let publicKeyBase64 = '';
                try {
                    const pkBytes = attResponse.getPublicKey();
                    if (pkBytes) {
                        publicKeyBase64 = toBase64url(pkBytes);
                    }
                } catch {
                    // fallback
                }

                if (!publicKeyBase64) {
                    setLoading(false);
                    setShowScanningOverlay(false);
                    showToast('Your browser did not provide the public key. Please use a modern browser.', 'error');
                    return;
                }

                const res = await registerPasskeyAction(
                    currentUser.id,
                    credential.id,
                    passkeyNickname.trim(),
                    'FIDO2 Platform / Hardware Key',
                    publicKeyBase64,
                );

                setLoading(false);
                setShowScanningOverlay(false);
                if (!res.success) {
                    showToast(res.error || 'Failed to register security key', 'error');
                } else {
                    showToast(`Passkey "${passkeyNickname}" successfully enrolled`);
                    setPasskeyNickname('');
                    setShowPasskeyForm(false);
                    const keysRes = await getPasskeys(currentUser.id);
                    if (keysRes.success && keysRes.passkeys) setPasskeys(keysRes.passkeys);
                    const updatedLogs = await getSecurityEventsLog(currentUser.id);
                    setSecurityTimeline(updatedLogs);
                }
            } else {
                throw new Error('WebAuthn not supported on this browser.');
            }
        } catch (err: any) {
            setLoading(false);
            setShowScanningOverlay(false);
            if (err?.name === 'NotAllowedError') {
                showToast('Passkey registration was cancelled.', 'error');
            } else {
                console.error('[handleRegisterPasskey]', err);
                showToast(err?.message || 'Passkey registration failed.', 'error');
            }
        }
    };

    const handleRevokePasskey = async (passkeyId: string, name: string) => {
        if (!currentUser?.id) return;
        
        const gate = await checkSensitiveActionGate(currentUser.id, deviceFingerprint, 'passkey_delete');
        if (!gate.allowed) {
            showToast(gate.message || 'Action restricted', 'error');
            return;
        }

        if (window.confirm(`Revoke hardware security key "${name}"? You will no longer be able to use it for authentication.`)) {
            setLoading(true);
            const res = await deletePasskeyAction(currentUser.id, passkeyId);
            setLoading(false);
            if (!res.success) {
                showToast(res.error || 'Failed to revoke security key', 'error');
            } else {
                showToast(`Hardware key "${name}" successfully revoked`);
                
                const keysRes = await getPasskeys(currentUser.id);
                if (keysRes.success && keysRes.passkeys) setPasskeys(keysRes.passkeys);
                
                const updatedLogs = await getSecurityEventsLog(currentUser.id);
                setSecurityTimeline(updatedLogs);
            }
        }
    };

    // Rename Session handler
    const handleRenameSession = async (fingerprint: string) => {
        if (!currentUser?.id || !editingSessionName.trim()) return;

        setLoading(true);
        const res = await renameDeviceAction(currentUser.id, fingerprint, editingSessionName.trim());
        setLoading(false);

        if (res.success) {
            showToast('Device renamed');
            
            // Sync user state in client store so nicknames updates reactively
            const nicknames = { ...(currentUser.metadata?.device_nicknames || {}) };
            nicknames[fingerprint] = editingSessionName.trim();
            setUser({
                ...currentUser,
                metadata: {
                    ...currentUser.metadata,
                    device_nicknames: nicknames
                }
            });

            setEditingSessionId(null);
            setEditingSessionName('');
            
            // Re-fetch sessions to update UI
            getActiveSessions(currentUser.id, deviceFingerprint).then(sessionRes => {
                if (sessionRes.success && sessionRes.sessions) {
                    setSessions(sessionRes.sessions);
                }
            });
            const updatedLogs = await getSecurityEventsLog(currentUser.id);
            setSecurityTimeline(updatedLogs);
        } else {
            showToast(res.error || 'Failed to rename device', 'error');
        }
    };

    // Calculate password strength parameters
    const strengthColor = passStrength >= 80 ? '#10b981' : passStrength >= 50 ? '#3b82f6' : passStrength >= 25 ? '#f59e0b' : '#ef4444';
    const strengthLabel = passStrength >= 80 ? 'Strong' : passStrength >= 50 ? 'Moderate' : passStrength >= 25 ? 'Weak' : 'Very Weak';

    // Account protection health state
    const isHealthy = mfaStatus.isActive && !!recoveryEmail;
    const recommendation = !mfaStatus.isActive 
        ? 'Enable Two-Step Verification to secure your credentials.' 
        : !recoveryEmail 
        ? 'Set up a backup recovery email channel to prevent account lockouts.' 
        : 'All core settings verified.';

    return (
        <div className="max-w-3xl mx-auto pb-24 space-y-10 font-sans text-neutral-200 px-4 pt-6">
            
            {/* Header */}
            <div className="space-y-1.5 border-b border-white/5 pb-6">
                <h2 className="text-2xl font-bold text-white tracking-tight">Security & Logins</h2>
                <p className="text-[13px] text-neutral-500 leading-normal">
                    Redesign security configuration and audit access parameters for your Sovereign Node.
                </p>
            </div>

            {/* SECTION 1: Security Overview */}
            <div className={clsx(
                "rounded-3xl border p-6 shadow-[0_8px_30px_rgb(0,0,0,0.5)] backdrop-blur-xl transition-all relative overflow-hidden",
                isHealthy ? "bg-emerald-950/5 border-emerald-500/10" : "bg-amber-950/5 border-amber-500/15"
            )}>
                {/* Visual Accent Glow */}
                <div className={clsx(
                    "absolute -right-16 -top-16 w-32 h-32 rounded-full blur-[80px]",
                    isHealthy ? "bg-emerald-500/20" : "bg-amber-500/20"
                )} />

                <div className="flex items-start gap-4">
                    <div className={clsx(
                        "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border",
                        isHealthy ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                    )}>
                        {isHealthy ? <ShieldCheck size={20} /> : <ShieldAlert size={20} />}
                    </div>
                    
                    <div className="space-y-3 flex-1 min-w-0">
                        <div className="space-y-1">
                            <h3 className="text-[15px] font-bold text-white leading-none">
                                {isHealthy ? 'Your account is fully protected.' : 'Action recommended'}
                            </h3>
                            <p className="text-[12.5px] text-neutral-400 leading-normal">
                                {isHealthy ? 'All major account integrity shields are active and verifying credentials.' : recommendation}
                            </p>
                        </div>

                        {/* Sub-stats Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t border-white/5 text-[12px]">
                            <div className="space-y-0.5">
                                <span className="text-neutral-500 block text-[10.5px] uppercase font-bold tracking-wider leading-none">Protection Status</span>
                                <span className={clsx("font-bold", isHealthy ? "text-emerald-400" : "text-amber-400")}>
                                    {isHealthy ? "Premium" : "Standard"}
                                </span>
                            </div>
                            <div className="space-y-0.5">
                                <span className="text-neutral-500 block text-[10.5px] uppercase font-bold tracking-wider leading-none">2FA Verification</span>
                                <span className={clsx("font-bold", mfaStatus.isActive ? "text-emerald-400" : "text-neutral-500")}>
                                    {mfaStatus.isActive ? "Active" : "Inactive"}
                                </span>
                            </div>
                            <div className="space-y-0.5">
                                <span className="text-neutral-500 block text-[10.5px] uppercase font-bold tracking-wider leading-none">Recovery Channel</span>
                                <span className={clsx("font-bold", recoveryEmail ? "text-emerald-400" : "text-neutral-500")}>
                                    {recoveryEmail ? "Verified" : "Missing"}
                                </span>
                            </div>
                            <div className="space-y-0.5">
                                <span className="text-neutral-500 block text-[10.5px] uppercase font-bold tracking-wider leading-none">Active Sessions</span>
                                <span className="text-white font-bold">{sessions.length} Current</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* SECTION 2: Password & Authentication */}
            <div className="space-y-5">
                <div className="px-1">
                    <h4 className="text-[11px] font-extrabold text-neutral-400 uppercase tracking-widest select-none">
                        Password & Credentials
                    </h4>
                </div>

                <div className="bg-[#0B0B0B] border border-white/5 rounded-3xl overflow-hidden divide-y divide-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.3)]">
                    
                    {/* Change Password row */}
                    {!showPasswordForm ? (
                        <SettingsRow
                            icon={Lock}
                            title="Account password"
                            desc="Update your authentication phrase. Destroys older cookies and rotates session credentials."
                            right={
                                <SettingsButton
                                    variant="secondary"
                                    height={36}
                                    onClick={() => setShowPasswordForm(true)}
                                >
                                    Change
                                </SettingsButton>
                            }
                        />
                    ) : (
                        <div className="p-6 space-y-4 bg-[#09090b] animate-fade-in text-[13px]">
                            <div className="flex items-center justify-between">
                                <h4 className="font-bold text-white">Update password credentials</h4>
                                {!isForgotFlowVerified && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsForgotFlow(!isForgotFlow);
                                            setForgotStep(1);
                                            setPassError(null);
                                        }}
                                        className="text-xs text-purple-400 hover:text-purple-300 font-bold transition-colors"
                                    >
                                        {isForgotFlow ? 'Use regular password change' : 'Forgot Password?'}
                                    </button>
                                )}
                            </div>
                            
                            {isForgotFlow && !isForgotFlowVerified ? (
                                <div className="space-y-4 bg-neutral-900/30 border border-white/5 p-5 rounded-2xl">
                                    {forgotStep === 1 ? (
                                        <div className="space-y-3">
                                            <p className="text-neutral-400 text-xs leading-normal">
                                                We will transmit a secure 6-digit OTP code to your account's primary email address to verify your identity.
                                            </p>
                                            <SettingsButton
                                                variant="primary"
                                                height={36}
                                                onClick={handleStartForgotPasswordOtp}
                                                loading={loading}
                                            >
                                                Send Verification Code
                                            </SettingsButton>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <p className="text-neutral-400 text-xs leading-normal">
                                                Enter the 6-digit verification code sent to your primary email address.
                                            </p>
                                            <div className="flex gap-2 max-w-[200px]">
                                                <input
                                                    type="text"
                                                    maxLength={6}
                                                    placeholder="000000"
                                                    value={forgotCode}
                                                    onChange={e => setForgotCode(e.target.value.replace(/[^0-9]/g, ''))}
                                                    className="w-full bg-black border border-white/5 focus:border-white/10 rounded-xl px-4 py-2.5 text-[14px] text-center font-mono text-white tracking-[2px] focus:outline-none"
                                                />
                                            </div>
                                            <div className="flex gap-3">
                                                <SettingsButton
                                                    variant="primary"
                                                    height={36}
                                                    onClick={handleVerifyForgotPasswordOtpCode}
                                                    loading={loading}
                                                >
                                                    Verify Code
                                                </SettingsButton>
                                                <SettingsButton
                                                    variant="ghost"
                                                    height={36}
                                                    onClick={() => setForgotStep(1)}
                                                >
                                                    Resend
                                                </SettingsButton>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {!isForgotFlowVerified ? (
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-extrabold text-neutral-400 uppercase tracking-wider block ml-1">Current Password</label>
                                            <div className="relative">
                                                <input
                                                    type={showCurrentPasswordInput ? "text" : "password"}
                                                    placeholder="Enter current password"
                                                    value={passData.current}
                                                    onChange={(e) => setPassData({ ...passData, current: e.target.value })}
                                                    disabled={loading}
                                                    className="w-full bg-[#121214] border border-white/5 focus:border-white/10 rounded-xl pl-4 pr-12 py-3 text-[14px] text-neutral-100 placeholder-neutral-600 focus:outline-none"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowCurrentPasswordInput(!showCurrentPasswordInput)}
                                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors"
                                                >
                                                    {showCurrentPasswordInput ? <EyeOff size={16} /> : <Eye size={16} />}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-3 bg-green-500/5 border border-green-500/10 rounded-xl text-green-400 text-[11px] font-bold uppercase tracking-wider">
                                            Identity verified via Recovery OTP. Enter new password below.
                                        </div>
                                    )}

                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-extrabold text-neutral-400 uppercase tracking-wider block ml-1">New Password</label>
                                        <div className="relative">
                                            <input
                                                type={showNewPasswordInput ? "text" : "password"}
                                                placeholder="Enter new password"
                                                value={passData.new}
                                                onChange={async e => {
                                                    const val = e.target.value;
                                                    setPassData({ ...passData, new: val });
                                                    evaluatePasswordStrength(val);
                                                    
                                                    if (val.trim().length >= 4) {
                                                        const leak = await checkPasswordLeakAction(val);
                                                        if (leak.leaked) {
                                                            setIsPasswordLeaked(true);
                                                            setPasswordLeakCount(leak.count || 5000);
                                                        } else {
                                                            setIsPasswordLeaked(false);
                                                            setPasswordLeakCount(null);
                                                        }
                                                    } else {
                                                        setIsPasswordLeaked(false);
                                                        setPasswordLeakCount(null);
                                                    }
                                                }}
                                                className="w-full bg-[#121214] border border-white/5 focus:border-white/10 rounded-xl pl-4 pr-12 py-3 text-[14px] text-neutral-100 placeholder-neutral-600 focus:outline-none"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowNewPasswordInput(!showNewPasswordInput)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors"
                                            >
                                                {showNewPasswordInput ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Strength requirements checklist */}
                                    <div className="bg-[#121214] border border-white/5 rounded-2xl p-4 space-y-2.5">
                                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 block mb-1">Strength Requirements</span>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11.5px]">
                                            <div className="flex items-center gap-2">
                                                {passData.new.length >= 12 ? <Check size={14} className="text-emerald-500" /> : <AlertTriangle size={14} className="text-neutral-600" />}
                                                <span className={passData.new.length >= 12 ? "text-neutral-300" : "text-neutral-500"}>At least 12 characters</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {/[A-Z]/.test(passData.new) ? <Check size={14} className="text-emerald-500" /> : <AlertTriangle size={14} className="text-neutral-600" />}
                                                <span className={/[A-Z]/.test(passData.new) ? "text-neutral-300" : "text-neutral-500"}>Uppercase letter</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {/[a-z]/.test(passData.new) ? <Check size={14} className="text-emerald-500" /> : <AlertTriangle size={14} className="text-neutral-600" />}
                                                <span className={/[a-z]/.test(passData.new) ? "text-neutral-300" : "text-neutral-500"}>Lowercase letter</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {/[0-9]/.test(passData.new) ? <Check size={14} className="text-emerald-500" /> : <AlertTriangle size={14} className="text-neutral-600" />}
                                                <span className={/[0-9]/.test(passData.new) ? "text-neutral-300" : "text-neutral-500"}>Number</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {/[^A-Za-z0-9]/.test(passData.new) ? <Check size={14} className="text-emerald-500" /> : <AlertTriangle size={14} className="text-neutral-600" />}
                                                <span className={/[^A-Za-z0-9]/.test(passData.new) ? "text-neutral-300" : "text-neutral-500"}>Special character</span>
                                            </div>
                                        </div>

                                        {passData.new && (
                                            <div className="space-y-1.5 pt-2 border-t border-white/5">
                                                <div className="h-1 rounded-full bg-neutral-800 overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full transition-all duration-500"
                                                        style={{ width: `${passStrength}%`, backgroundColor: strengthColor }}
                                                    />
                                                </div>
                                                <div className="flex items-center justify-between gap-2 text-xs">
                                                    <p className="font-semibold" style={{ color: strengthColor }}>
                                                        Password strength: {strengthLabel} ({passStrength}%)
                                                    </p>
                                                    {isPasswordLeaked && (
                                                        <span className="text-red-400 font-bold flex items-center gap-1">
                                                            <AlertTriangle size={12} /> Leaked in data breach
                                                        </span>
                                                    )}
                                                </div>
                                                {isPasswordLeaked && (
                                                    <p className="text-[11.5px] text-red-400 font-medium leading-relaxed pt-1.5 flex items-start gap-1">
                                                        <AlertOctagon size={13} className="shrink-0 mt-0.5" />
                                                        <span>
                                                            Warning: This password appeared in over <b>{passwordLeakCount?.toLocaleString()}</b> leaks. Please select a unique phrase.
                                                        </span>
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-extrabold text-neutral-400 uppercase tracking-wider block ml-1">Confirm New Password</label>
                                        <div className="relative">
                                            <input
                                                type={showVerifyPasswordInput ? "text" : "password"}
                                                placeholder="Verify new password"
                                                value={passData.verify}
                                                onChange={(e) => setPassData({ ...passData, verify: e.target.value })}
                                                disabled={loading}
                                                className="w-full bg-[#121214] border border-white/5 focus:border-white/10 rounded-xl pl-4 pr-12 py-3 text-[14px] text-neutral-100 placeholder-neutral-600 focus:outline-none"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowVerifyPasswordInput(!showVerifyPasswordInput)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors"
                                            >
                                                {showVerifyPasswordInput ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </div>
                                    {passError && (
                                        <p className="text-[12px] text-red-400 flex items-center gap-1.5 font-medium pl-1">
                                            <AlertTriangle size={13} /> {passError}
                                        </p>
                                    )}
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-3 border-t border-white/5">
                                <SettingsButton
                                    variant="ghost"
                                    height={36}
                                    onClick={() => {
                                        setShowPasswordForm(false);
                                        setPassError(null);
                                        setPassStrength(0);
                                        setIsForgotFlow(false);
                                        setIsForgotFlowVerified(false);
                                    }}
                                >
                                    Cancel
                                </SettingsButton>
                                {(!isForgotFlow || isForgotFlowVerified) && (
                                    <SettingsButton
                                        variant="primary"
                                        height={36}
                                        onClick={handlePasswordUpdate}
                                        loading={loading}
                                    >
                                        Update Password
                                    </SettingsButton>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Two-Step Verification TOTP row */}
                    <SettingsRow
                        icon={Smartphone}
                        title="Two-step verification (2FA)"
                        desc={mfaStatus.isActive
                            ? 'Enforced. Authentication codes from your secure app protect sign-ins.'
                            : 'Enforce single-use OTP codes from authenticators like Google Authenticator or Authy.'}
                        right={
                            <SettingsButton
                                variant={mfaStatus.isActive ? 'danger' : 'primary'}
                                height={36}
                                onClick={mfaStatus.isActive ? handleDisableMFA : initiateMFASetup}
                            >
                                {mfaStatus.isActive ? 'Disable' : 'Set Up'}
                            </SettingsButton>
                        }
                    />

                    {/* Passkeys / Security Keys row */}
                    <div className="p-5 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-neutral-900/80 border border-white/5 flex items-center justify-center text-neutral-400">
                                    <KeyRound size={18} />
                                </div>
                                <div>
                                    <span className="text-[14px] font-bold text-neutral-200 block">Passkeys & Security Keys</span>
                                    <span className="text-[12px] text-neutral-500 block leading-normal">
                                        Use biometrics (Touch ID / Face ID) or USB security keys for zero-phishing logins.
                                    </span>
                                </div>
                            </div>
                            {!showPasskeyForm && (
                                <SettingsButton
                                    variant="secondary"
                                    height={36}
                                    onClick={() => setShowPasskeyForm(true)}
                                >
                                    Add Key
                                </SettingsButton>
                            )}
                        </div>

                        {showPasskeyForm && (
                            <div className="p-4 space-y-3 bg-[#09090b] rounded-2xl border border-white/5 animate-fade-in">
                                <div className="space-y-1">
                                    <span className="text-[12.5px] font-bold text-white block">Register Hardware Security Key</span>
                                    <span className="text-[11.5px] text-neutral-500 block leading-normal">
                                        Label this key so you can recognize it later (e.g. "Touch ID Mac" or "YubiKey 5C").
                                    </span>
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Key label..."
                                        value={passkeyNickname}
                                        onChange={e => setPasskeyNickname(e.target.value)}
                                        className="flex-1 bg-black border border-white/5 focus:border-white/10 rounded-xl px-4 py-2 text-[13px] text-neutral-200 focus:outline-none"
                                    />
                                </div>
                                <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
                                    <SettingsButton variant="ghost" height={36} onClick={() => { setShowPasskeyForm(false); setPasskeyNickname(''); }}>
                                        Cancel
                                    </SettingsButton>
                                    <SettingsButton variant="primary" height={36} onClick={handleRegisterPasskey} loading={loading}>
                                        Register
                                    </SettingsButton>
                                </div>
                            </div>
                        )}

                        {/* List of registered keys */}
                        {passkeys.length > 0 && (
                            <div className="space-y-2 pt-2 border-t border-white/5">
                                {passkeys.map(key => (
                                    <div key={key.id} className="p-3 bg-black/40 border border-white/5 rounded-2xl flex items-center justify-between gap-4 text-[12.5px]">
                                        <div className="flex items-center gap-3">
                                            <Fingerprint size={16} className="text-purple-400 shrink-0" />
                                            <div>
                                                <span className="font-bold text-white block">{key.nickname}</span>
                                                <span className="text-[11px] text-neutral-500 block">Registered {new Date(key.created_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleRevokePasskey(key.id, key.nickname)}
                                            className="text-[11px] font-bold text-red-400 hover:text-red-300 transition-colors"
                                        >
                                            Revoke
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </div>
            </div>

            {/* SECTION 3: Devices & Sessions */}
            <div className="space-y-5">
                <div className="px-1 flex items-center justify-between">
                    <h4 className="text-[11px] font-extrabold text-neutral-400 uppercase tracking-widest select-none">
                        Active Devices & Sessions
                    </h4>
                    {sessions.length > 1 && (
                        <button
                            type="button"
                            onClick={handleRevokeAllOthers}
                            className="text-[11px] font-bold text-red-400 hover:text-red-300 transition-colors"
                        >
                            Sign out other devices
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {sessions.map(s => {
                        const customName = currentUser?.metadata?.device_nicknames?.[s.deviceFingerprint];
                        const displayName = customName ? `${customName} (${s.device.replace(' (Current)', '')})` : s.device;
                        const isEditing = editingSessionId === s.id;

                        return (
                            <div 
                                key={s.id} 
                                className={clsx(
                                    "p-5 rounded-3xl border flex flex-col justify-between min-h-[145px] transition-all duration-300 bg-[#0B0B0B] hover:border-white/10 relative overflow-hidden",
                                    s.current ? "border-emerald-500/10" : "border-white/5"
                                )}
                            >
                                <div className="space-y-2">
                                    <div className="flex items-start justify-between gap-2">
                                        {isEditing ? (
                                            <div className="flex items-center gap-1.5 w-full mr-2">
                                                <input
                                                    type="text"
                                                    value={editingSessionName}
                                                    onChange={e => setEditingSessionName(e.target.value)}
                                                    className="bg-black border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none w-full"
                                                    placeholder="Nickname..."
                                                    autoFocus
                                                />
                                                <button
                                                    onClick={() => handleRenameSession(s.deviceFingerprint)}
                                                    className="p-1 hover:text-white text-emerald-400 transition-colors"
                                                >
                                                    <Save size={13} />
                                                </button>
                                                <button
                                                    onClick={() => setEditingSessionId(null)}
                                                    className="p-1 hover:text-white text-red-400 transition-colors"
                                                >
                                                    <X size={13} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <span className="text-[13.5px] font-bold text-white truncate">
                                                    {displayName}
                                                </span>
                                                <button
                                                    onClick={() => {
                                                        setEditingSessionId(s.id);
                                                        setEditingSessionName(customName || s.device.replace(' (Current)', ''));
                                                    }}
                                                    className="p-1 text-neutral-600 hover:text-neutral-300 transition-colors"
                                                >
                                                    <Pencil size={11} />
                                                </button>
                                            </div>
                                        )}
                                        {s.current ? (
                                            <span className="text-[9px] font-extrabold uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/15 px-2 py-0.5 rounded-full shrink-0">
                                                This device
                                            </span>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => handleRevokeSession(s.id)}
                                                className="text-[9px] font-extrabold uppercase text-neutral-400 hover:text-red-400 bg-neutral-900 border border-white/5 px-2 py-0.5 rounded-full shrink-0 transition-all"
                                            >
                                                Revoke
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-neutral-500 font-medium">IP: {s.ip} • {s.location || 'Unknown Location'}</p>
                                </div>

                                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-neutral-500">
                                    <span>Last Active: {s.lastActive.split(',')[0]}</span>
                                    {s.deviceFingerprint === deviceFingerprint ? (
                                        <span className="text-[9px] font-bold text-emerald-500/80 uppercase tracking-wider flex items-center gap-1">
                                            <ShieldCheck size={10} /> Bound
                                        </span>
                                    ) : (
                                        <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1">
                                            <Globe size={10} /> Remote
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* SECTION 4: Recovery Channels */}
            <div className="space-y-5">
                <div className="px-1">
                    <h4 className="text-[11px] font-extrabold text-neutral-400 uppercase tracking-widest select-none">
                        Recovery Channels
                    </h4>
                </div>

                <div className="bg-[#0B0B0B] border border-white/5 rounded-3xl overflow-hidden divide-y divide-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.3)]">
                    
                    {/* Recovery Email */}
                    <div className="p-5 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-neutral-900/80 border border-white/5 flex items-center justify-center text-neutral-400">
                                <Mail size={18} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <span className="text-[14px] font-bold text-neutral-200 block">Backup recovery email</span>
                                <span className="text-[12px] text-neutral-500 block leading-normal">
                                    Receive verified authorization keys in the event of primary account locks.
                                </span>
                            </div>
                            {recoveryState === 'completed' && (
                                <SettingsButton
                                    variant="secondary"
                                    height={36}
                                    onClick={handleResetRecovery}
                                >
                                    Modify
                                </SettingsButton>
                            )}
                        </div>

                        {recoveryState === 'idle' && (
                            <div className="pt-1">
                                <SettingsButton
                                    variant="secondary"
                                    height={36}
                                    onClick={handleStartRecoverySetup}
                                >
                                    Bind Recovery Email
                                </SettingsButton>
                            </div>
                        )}

                        {recoveryState === 'sending' && (
                            <div className="space-y-4 p-5 bg-[#09090b] rounded-2xl border border-white/5 animate-fade-in text-[13px]">
                                {recoverySubState === 'password_verify' && (
                                    <div className="space-y-3">
                                        <div>
                                            <span className="text-[13px] font-bold text-white block">Step 1: Confirm Password</span>
                                            <span className="text-[11.5px] text-neutral-500 mt-1 block">Confirm your credentials to bind a recovery address.</span>
                                        </div>
                                        <div className="relative">
                                            <input
                                                type={showCurrentPasswordInput ? "text" : "password"}
                                                placeholder="Confirm password..."
                                                value={recoveryConfirmPassword}
                                                onChange={e => setRecoveryConfirmPassword(e.target.value)}
                                                className="w-full bg-black border border-white/5 focus:border-white/10 rounded-xl pl-4 pr-12 py-2.5 text-[13.5px] text-neutral-100 placeholder-neutral-600 focus:outline-none"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowCurrentPasswordInput(!showCurrentPasswordInput)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors"
                                            >
                                                {showCurrentPasswordInput ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                        <div className="flex gap-2">
                                            <SettingsButton variant="ghost" height={36} onClick={() => setRecoveryState('idle')}>
                                                Cancel
                                            </SettingsButton>
                                            <SettingsButton variant="primary" height={36} onClick={handleVerifyRecoveryPassword} loading={loading}>
                                                Verify
                                            </SettingsButton>
                                        </div>
                                    </div>
                                )}

                                {recoverySubState === 'otp_primary' && (
                                    <div className="space-y-3">
                                        <div>
                                            <span className="text-[13px] font-bold text-white block">Step 2: Verify Primary Email</span>
                                            <span className="text-[11.5px] text-neutral-500 mt-1 block">A 6-digit code has been sent to your primary address.</span>
                                        </div>
                                        <input
                                            type="text"
                                            maxLength={6}
                                            placeholder="000000"
                                            value={recoveryPrimaryOtp}
                                            onChange={e => setRecoveryPrimaryOtp(e.target.value.replace(/[^0-9]/g, ''))}
                                            className="w-full text-center tracking-[8px] bg-black border border-white/5 focus:border-white/10 rounded-xl py-2.5 text-lg font-bold font-mono text-white focus:outline-none"
                                        />
                                        <div className="flex gap-2">
                                            <SettingsButton variant="ghost" height={36} onClick={() => setRecoveryState('idle')}>
                                                Cancel
                                            </SettingsButton>
                                            <SettingsButton variant="primary" height={36} onClick={handleVerifyRecoveryPrimaryOtp} loading={loading} disabled={recoveryPrimaryOtp.length !== 6}>
                                                Verify Code
                                            </SettingsButton>
                                        </div>
                                    </div>
                                )}

                                {recoverySubState === 'input_new_email' && (
                                    <div className="space-y-3">
                                        <div>
                                            <span className="text-[13px] font-bold text-white block">Step 3: Enter Recovery Email</span>
                                            <span className="text-[11.5px] text-neutral-500 mt-1 block">Specify the backup address you want to link.</span>
                                        </div>
                                        <input
                                            type="email"
                                            placeholder="recovery@example.com"
                                            value={recoveryNewEmail}
                                            onChange={e => setRecoveryNewEmail(e.target.value)}
                                            className="w-full bg-black border border-white/5 focus:border-white/10 rounded-xl px-4 py-2.5 text-[13.5px] text-neutral-100 placeholder-neutral-600 focus:outline-none"
                                        />
                                        <div className="flex gap-2">
                                            <SettingsButton variant="ghost" height={36} onClick={() => setRecoveryState('idle')}>
                                                Cancel
                                            </SettingsButton>
                                            <SettingsButton variant="primary" height={36} onClick={handleSendRecoveryNewOtp} loading={loading}>
                                                Send OTP
                                            </SettingsButton>
                                        </div>
                                    </div>
                                )}

                                {recoverySubState === 'otp_new' && (
                                    <div className="space-y-3">
                                        <div>
                                            <span className="text-[13px] font-bold text-white block">Step 4: Verify Recovery Email</span>
                                            <span className="text-[11.5px] text-neutral-500 mt-1 block">Enter the code sent to <b>{recoveryNewEmail}</b>.</span>
                                        </div>
                                        <input
                                            type="text"
                                            maxLength={6}
                                            placeholder="000000"
                                            value={recoveryNewOtp}
                                            onChange={e => setRecoveryNewOtp(e.target.value.replace(/[^0-9]/g, ''))}
                                            className="w-full text-center tracking-[8px] bg-black border border-white/5 focus:border-white/10 rounded-xl py-2.5 text-lg font-bold font-mono text-white focus:outline-none"
                                        />
                                        <div className="flex gap-2">
                                            <SettingsButton variant="ghost" height={36} onClick={() => setRecoveryState('idle')}>
                                                Cancel
                                            </SettingsButton>
                                            <SettingsButton variant="primary" height={36} onClick={handleVerifyRecoveryNewOtp} loading={loading} disabled={recoveryNewOtp.length !== 6}>
                                                Confirm & Bind
                                            </SettingsButton>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {recoveryState === 'completed' && (
                            <div className="p-4 bg-black/40 border border-white/5 rounded-2xl flex items-center justify-between text-[13px]">
                                <div className="space-y-1">
                                    <span className="text-neutral-400 block font-semibold">Active Backup Address</span>
                                    <span className="font-mono text-emerald-400 block">{recoveryEmail}</span>
                                </div>
                                <span className="text-[10px] font-extrabold uppercase text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full select-none border border-emerald-500/20">
                                    Verified
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Recovery Phone */}
                    <div className="p-5 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-neutral-900/80 border border-white/5 flex items-center justify-center text-neutral-400">
                                <Phone size={18} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <span className="text-[14px] font-bold text-neutral-200 block">Backup recovery phone</span>
                                <span className="text-[12px] text-neutral-500 block leading-normal">
                                    Registered phone number. This is locked and cannot be changed until verified.
                                </span>
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-wider text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full select-none shrink-0">
                                Future Ready
                            </span>
                        </div>
                        <div className="flex gap-2 items-center">
                            <div className="relative flex-1">
                                <input
                                    type="tel"
                                    placeholder="No phone number registered"
                                    value={recoveryPhone}
                                    readOnly
                                    className="w-full bg-neutral-900/40 border border-white/[0.04] rounded-xl pl-4 pr-10 py-2.5 text-[13px] text-neutral-400 cursor-not-allowed outline-none select-none"
                                />
                                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500">
                                    <Lock size={14} />
                                </div>
                            </div>
                            <span className="text-[9.5px] font-black uppercase tracking-wider text-amber-500/80 bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-xl select-none shrink-0 flex items-center gap-1.5 h-[38px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                Locked (Unverified)
                            </span>
                        </div>
                    </div>

                </div>
            </div>

            {/* SECTION 5: Privacy Protection */}
            <div className="space-y-5">
                <div className="px-1">
                    <h4 className="text-[11px] font-extrabold text-neutral-400 uppercase tracking-widest select-none">
                        Privacy Protection
                    </h4>
                </div>

                <div className="bg-[#0B0B0B] border border-white/5 rounded-3xl overflow-hidden divide-y divide-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.3)]">
                    <SettingsRow
                        icon={EyeOff}
                        title="Ghost mode"
                        desc="Browse without publishing online status or registering activity events."
                        right={
                            <SettingsToggle 
                                checked={privacySettings.invisible_mode} 
                                onChange={v => handleTogglePrivacy('invisible_mode', v)} 
                            />
                        }
                    />
                    <SettingsRow
                        icon={Globe}
                        title="Profile visibility"
                        desc="Restrict profile access and node connections to approved followers."
                        right={
                            <SettingsToggle 
                                checked={privacySettings.is_private} 
                                onChange={v => handleTogglePrivacy('is_private', v)} 
                            />
                        }
                    />
                    <SettingsRow
                        icon={Activity}
                        title="Last active details"
                        desc="Let contacts verify your relative active time handles in chats."
                        right={
                            <SettingsToggle 
                                checked={privacySettings.activity_visibility} 
                                onChange={v => handleTogglePrivacy('activity_visibility', v)} 
                            />
                        }
                    />
                </div>
            </div>

            {/* SECTION 6: Recent Security Activity */}
            <div className="space-y-5">
                <div className="px-1">
                    <h4 className="text-[11px] font-extrabold text-neutral-400 uppercase tracking-widest select-none">
                        Access history & audit logs
                    </h4>
                </div>

                <div className="bg-[#0B0B0B] border border-white/5 rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.3)] max-h-[320px] overflow-y-auto inner-scroll">
                    {securityTimeline.length === 0 ? (
                        <div className="text-center py-6 text-[12px] text-neutral-500 italic">No security events logged.</div>
                    ) : (
                        <div className="space-y-4">
                            {securityTimeline.slice(0, 10).map((evt) => (
                                <div key={evt.id} className="flex gap-4 items-start text-[12px]">
                                    <div className="w-2.5 h-2.5 rounded-full bg-neutral-800 border border-neutral-700 mt-1 shrink-0 flex items-center justify-center relative">
                                        <span className={clsx(
                                            "w-1.5 h-1.5 rounded-full",
                                            evt.severity === 'critical' ? "bg-purple-500 shadow-[0_0_8px_#a855f7]" : 
                                            evt.severity === 'high' ? "bg-red-500 shadow-[0_0_8px_#ef4444]" : 
                                            evt.severity === 'medium' ? "bg-amber-500 shadow-[0_0_8px_#f59e0b]" : 
                                            "bg-blue-400 shadow-[0_0_8px_#60a5fa]"
                                        )} />
                                    </div>
                                    <div className="flex-1 space-y-0.5">
                                        <div className="flex items-center justify-between text-neutral-500 text-[9.5px] font-bold uppercase tracking-wider">
                                            <span className="text-neutral-400">{evt.event_type.replace(/_/g, ' ')}</span>
                                            <span>{new Date(evt.created_at).toLocaleTimeString() + ' ' + new Date(evt.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <p className="text-[12px] text-neutral-200 font-medium leading-normal break-words">
                                            {evt.description}
                                        </p>
                                        <span className="text-[10.5px] text-neutral-500 block font-mono">IP: {evt.ip_address}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* TOTP 2FA SETUP MODAL */}
            <ModalSystem
                isOpen={showMFAModal}
                onClose={() => setShowMFAModal(false)}
                title="Authenticator Enrolment"
            >
                {mfaStep === 1 && (
                    <div className="space-y-4 animate-fade-in text-[13px]">
                        <div className="space-y-1">
                            <span className="text-[13px] font-bold text-white block">Step 1: Confirm Password</span>
                            <span className="text-[11.5px] text-neutral-500 block leading-normal">
                                Confirm your credentials to enroll a new verification factor.
                            </span>
                        </div>
                        <div className="relative">
                            <input
                                type={showCurrentPasswordInput ? "text" : "password"}
                                placeholder="Account password..."
                                value={mfaEnrollPassword}
                                onChange={e => setMfaEnrollPassword(e.target.value)}
                                className="w-full bg-[#121214] border border-white/5 focus:border-white/10 rounded-xl pl-4 pr-12 py-2.5 text-[13.5px] text-neutral-100 placeholder-neutral-600 focus:outline-none"
                            />
                            <button
                                type="button"
                                onClick={() => setShowCurrentPasswordInput(!showCurrentPasswordInput)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors"
                            >
                                {showCurrentPasswordInput ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                        {mfaCodeError && (
                            <p className="text-[12px] text-red-500 flex items-center gap-1">
                                <AlertOctagon size={12} /> {mfaCodeError}
                            </p>
                        )}
                        <div className="pt-3 flex justify-end gap-2 border-t border-white/5">
                            <SettingsButton variant="ghost" height={36} onClick={() => setShowMFAModal(false)}>
                                Cancel
                            </SettingsButton>
                            <SettingsButton variant="primary" height={36} onClick={handleVerifyMFAEnrollPassword} loading={loading}>
                                Confirm
                            </SettingsButton>
                        </div>
                    </div>
                )}

                {mfaStep === 2 && (
                    <div className="space-y-5 animate-fade-in text-[13px]">
                        <div className="text-center py-2">
                            <div className="w-40 h-40 bg-white p-2 rounded-2xl mx-auto mb-3 border border-neutral-800 flex items-center justify-center overflow-hidden">
                                {qrCodeUri ? (
                                    <img 
                                        src={qrCodeUri}
                                        alt="MFA QR Code" 
                                        className="w-full h-full object-contain"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-neutral-400 text-xs">Loading...</div>
                                )}
                            </div>
                            <p className="text-[12.5px] text-neutral-400 max-w-sm mx-auto leading-normal">
                                Scan this QR code with an authenticator app (Google Authenticator, Authy, Microsoft Authenticator).
                            </p>
                        </div>
                        <div className="space-y-2">
                            <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Or enter key manually</label>
                            <div className="flex gap-2">
                                <div className="flex-1 bg-black border border-white/5 rounded-xl px-4 py-2.5 text-[13.5px] font-mono text-purple-400 font-bold select-all flex items-center">
                                    {mfaSecret || 'JBSWY3DPEHPK3PXP'}
                                </div>
                                <button
                                    type="button"
                                    onClick={copySecretKey}
                                    className="px-3 bg-white/5 hover:bg-white/10 text-neutral-300 rounded-xl transition-all border border-white/5 flex items-center gap-1.5 text-xs font-semibold"
                                >
                                    {copiedSecret ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                                    {copiedSecret ? 'Copied' : 'Copy'}
                                </button>
                            </div>
                        </div>
                        <div className="pt-4 border-t border-white/5 flex justify-end">
                            <SettingsButton
                                variant="primary"
                                height={36}
                                onClick={() => setMfaStep(3)}
                            >
                                Next: Verify Code →
                            </SettingsButton>
                        </div>
                    </div>
                )}

                {mfaStep === 3 && (
                    <div className="space-y-5 animate-fade-in text-[13px]">
                        <div className="text-center py-2">
                            <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400 mx-auto mb-3 border border-purple-500/20">
                                <Shield size={20} />
                            </div>
                            <h4 className="text-[14px] font-bold text-white mb-1">Verify Authenticator Code</h4>
                            <p className="text-[12.5px] text-neutral-400 max-w-xs mx-auto">
                                Enter the 6-digit code currently shown in your authenticator app.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <input
                                type="text"
                                maxLength={6}
                                placeholder="000000"
                                value={totpCode}
                                onChange={e => setTotpCode(e.target.value.replace(/\s/g, '').replace(/[^0-9]/g, ''))}
                                onKeyDown={e => e.key === 'Enter' && handleVerifyMFA()}
                                className="w-full text-center tracking-[12px] bg-black border border-white/5 focus:border-white/10 rounded-xl py-3 text-xl font-bold font-mono text-white focus:outline-none"
                            />
                            {mfaCodeError && (
                                <p className="text-[12px] text-red-500 text-center flex items-center justify-center gap-1">
                                    <AlertOctagon size={12} /> {mfaCodeError}
                                </p>
                            )}
                        </div>
                        <div className="pt-4 border-t border-white/5 flex gap-3">
                            <SettingsButton variant="secondary" height={36} onClick={() => setMfaStep(2)} className="flex-1">
                                Back
                            </SettingsButton>
                            <SettingsButton
                                variant="primary"
                                height={36}
                                onClick={handleVerifyMFA}
                                disabled={totpCode.length !== 6 || loading}
                                loading={loading}
                                className="flex-1"
                            >
                                Verify & Enroll
                            </SettingsButton>
                        </div>
                    </div>
                )}

                {mfaStep === 4 && (
                    <div className="space-y-5 animate-fade-in text-[13px]">
                        <div className="p-4 bg-emerald-500/5 border border-emerald-500/15 rounded-2xl flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 mt-0.5 shrink-0">
                                <Check size={16} strokeWidth={3} />
                            </div>
                            <div>
                                <h4 className="text-[13.5px] font-bold text-white">2FA Enrollment Complete</h4>
                                <p className="text-[12px] text-neutral-400 mt-0.5 leading-normal">
                                    Emergency backup codes generated. Save these in a password manager.
                                </p>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Emergency Backup Codes</label>
                            <div className="bg-black border border-white/5 rounded-2xl p-4 font-mono text-[12.5px] text-neutral-300 grid grid-cols-2 gap-y-2 gap-x-4 border-dashed select-all">
                                {mfaBackupCodes.map(code => (
                                    <div key={code} className="hover:text-white transition-colors">{code}</div>
                                ))}
                            </div>
                        </div>
                        <div className="pt-3 flex gap-2 border-t border-white/5">
                            <SettingsButton
                                variant="secondary"
                                height={36}
                                onClick={copyBackupCodes}
                                icon={Copy}
                                className="flex-1"
                            >
                                {copiedBackups ? 'Copied!' : 'Copy Codes'}
                            </SettingsButton>
                            <SettingsButton
                                variant="primary"
                                height={36}
                                onClick={() => setShowMFAModal(false)}
                                className="flex-1"
                            >
                                Done
                            </SettingsButton>
                        </div>
                    </div>
                )}
            </ModalSystem>

            {/* Notification Toast */}
            <Toast 
                show={toast.show}
                message={toast.message} 
                type={toast.type} 
            />

            {/* Scanning Overlay for Passkeys WebAuthn */}
            {showScanningOverlay && (
                <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex flex-col items-center justify-center text-center p-6 animate-fade-in">
                    <div className="w-16 h-16 rounded-full border-2 border-purple-500/20 border-t-purple-500 animate-spin flex items-center justify-center mb-6">
                        <Fingerprint size={28} className="text-purple-400 animate-pulse" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">Verifying Security Key</h3>
                    <p className="text-[13px] text-neutral-400 max-w-sm leading-normal">
                        Please follow your browser's instructions to authenticate your biometric key or hardware token.
                    </p>
                </div>
            )}

        </div>
    );
}
