'use client';

import { useState, useEffect, useRef } from 'react';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from 'qrcode';

import { IconActivity, IconCheckCircle, IconRisk, IconShield } from './Icons';

type GatewayStep = 'pin' | 'setup' | 'login' | 'dashboard';

const CONFIG_METADATA = [
  // 1. SYSTEM & TRAFFIC CONTROL
  { key: 'maintenance_mode', label: 'Maintenance Mode', description: 'Lock public site and show maintenance screen.', type: 'toggle', category: 'System & Traffic' },
  { key: 'registration_locked', label: 'Registration Lock', description: 'Require admin invite codes for new registrations.', type: 'toggle', category: 'System & Traffic' },
  { key: 'public_signup_allowed', label: 'Public Signup Allowed', description: 'Enable direct signup without invite validations.', type: 'toggle', category: 'System & Traffic' },
  { key: 'global_rate_limit_enabled', label: 'Rate Limiting Gate', description: 'Enable high-velocity IP threshold controls.', type: 'toggle', category: 'System & Traffic' },
  { key: 'global_rate_limit_max', label: 'Rate Limit Max Request', description: 'Maximum requests allowed per IP address per minute.', type: 'number', min: 10, max: 1000, category: 'System & Traffic' },
  { key: 'ddos_protection_level', label: 'DDoS Shield Profile', description: 'Set defensive shield aggressiveness level.', type: 'select', options: ['Off', 'Moderate', 'Aggressive', 'Under Attack'], category: 'System & Traffic' },
  { key: 'ip_blacklisting_enabled', label: 'IP Blacklisting Engine', description: 'Instantly block requests matching threat logs.', type: 'toggle', category: 'System & Traffic' },
  { key: 'tor_exit_node_blocking', label: 'Block TOR Exit Nodes', description: 'Reject and drop traffic originating from TOR relays.', type: 'toggle', category: 'System & Traffic' },

  // 2. AUTH & IDENTITY SECURITY
  { key: 'pow_difficulty', label: 'PoW Proof Difficulty', description: 'Required Proof-of-Work complexity level.', type: 'slider', min: 3, max: 8, category: 'Auth & Identity' },
  { key: 'otp_expiry_mins', label: 'OTP Expiry Minutes', description: 'Lifetime of transient email verification codes.', type: 'number', min: 2, max: 60, category: 'Auth & Identity' },
  { key: 'two_factor_auth_required', label: 'Mandatory 2FA Tiers', description: 'Enforce multi-factor verification for all active accounts.', type: 'toggle', category: 'Auth & Identity' },
  { key: 'password_min_length', label: 'Password Min Length', description: 'Minimum characters required for account password.', type: 'number', min: 6, max: 32, category: 'Auth & Identity' },
  { key: 'max_login_attempts', label: 'Max Login Strikes', description: 'Max password attempts before security lockout.', type: 'number', min: 3, max: 10, category: 'Auth & Identity' },
  { key: 'session_idle_timeout_mins', label: 'Idle Timeout Minutes', description: 'Auto-logout sessions after inactive duration.', type: 'number', min: 5, max: 120, category: 'Auth & Identity' },
  { key: 'jwt_session_duration_hours', label: 'JWT Lifetime Hours', description: 'Lifespan of issued JSON Web Tokens.', type: 'number', min: 1, max: 720, category: 'Auth & Identity' },
  { key: 'password_complexity_check', label: 'Password Complexity', description: 'Require uppercase, lowercase, numbers, and symbols.', type: 'toggle', category: 'Auth & Identity' },

  // 3. AUDIT & THREAT LOGS
  { key: 'threat_scoring_enabled', label: 'Threat Scoring Engine', description: 'Analyze threat scores dynamically per request.', type: 'toggle', category: 'Audit & Threat Logs' },
  { key: 'geo_fencing_enabled', label: 'Country Geofencing', description: 'Restrict access from high-risk locations.', type: 'toggle', category: 'Audit & Threat Logs' },
  { key: 'vpn_detection_enabled', label: 'VPN Flag & Block', description: 'Detect and isolate commercial proxy IP pools.', type: 'toggle', category: 'Audit & Threat Logs' },
  { key: 'anomalous_login_detection', label: 'Anomalous Logins', description: 'Flag concurrent logins from distant geographies.', type: 'toggle', category: 'Audit & Threat Logs' },
  { key: 'detailed_audit_logging', label: 'Detailed Request Logging', description: 'Record request headers and body payload structure.', type: 'toggle', category: 'Audit & Threat Logs' },
  { key: 'tamper_detection', label: 'Client State Validation', description: 'Monitor client-side JS memory for manipulation.', type: 'toggle', category: 'Audit & Threat Logs' },
  { key: 'automatic_threat_mitigation', label: 'Autonomous Mitigation', description: 'Auto-ban IPs hitting multiple API errors.', type: 'toggle', category: 'Audit & Threat Logs' },
  { key: 'risk_assessment_threshold', label: 'Risk Gate Threshold', description: 'Risk score boundary before mandatory 2FA prompt.', type: 'slider', min: 10, max: 95, category: 'Audit & Threat Logs' },

  // 4. DATA INTEGRITY & PRIVACY
  { key: 'e2ee_mandatory', label: 'Mandatory E2EE Chats', description: 'Require public-key verification for channel messages.', type: 'toggle', category: 'Data & Privacy' },
  { key: 'chat_message_expiry_days', label: 'Auto-Purge Chats (Days)', description: 'Retain group chat history for N days (0 to disable).', type: 'number', min: 0, max: 365, category: 'Data & Privacy' },
  { key: 'allow_device_fingerprinting', label: 'Device Fingerprinting', description: 'Generate browser canvas hash for session locking.', type: 'toggle', category: 'Data & Privacy' },
  { key: 'anonymize_ip_addresses', label: 'Anonymize Logged IPs', description: 'Mask the final octet of IP addresses in database.', type: 'toggle', category: 'Data & Privacy' },
  { key: 'gdpr_purge_enabled', label: 'Automatic Data Pruning', description: 'Purge orphan/inactive accounts older than 180 days.', type: 'toggle', category: 'Data & Privacy' },
  { key: 'export_data_allow', label: 'Self-Serve Data Exports', description: 'Allow users to download their complete profile log.', type: 'toggle', category: 'Data & Privacy' },
  { key: 'metadata_stripping', label: 'EXIF Image Stripping', description: 'Remove location metadata from user image uploads.', type: 'toggle', category: 'Data & Privacy' },
  { key: 'double_encryption_at_rest', label: 'At-Rest Double Encryption', description: 'Encrypt stored payloads using local KMS keys.', type: 'toggle', category: 'Data & Privacy' },

  // 5. API & SYSTEM TUNING
  { key: 'api_caching_enabled', label: 'Edge API Caching', description: 'Cache GET request outputs on Vercel CDN nodes.', type: 'toggle', category: 'API & Performance' },
  { key: 'websocket_max_connections_per_user', label: 'WebSocket Sockets Limit', description: 'Max concurrent socket streams open per account.', type: 'number', min: 1, max: 20, category: 'API & Performance' },
  { key: 'media_upload_max_mb', label: 'Upload Size Limit (MB)', description: 'Maximum file size permitted for static uploads.', type: 'number', min: 1, max: 250, category: 'API & Performance' },
  { key: 'enable_telemetry', label: 'Telemetry & Profiling', description: 'Send performance signals to engineering cluster.', type: 'toggle', category: 'API & Performance' },
  { key: 'background_indexing_interval_hours', label: 'Indexing Interval (Hours)', description: 'Database schema indexing check frequency.', type: 'number', min: 1, max: 168, category: 'API & Performance' },
  { key: 'max_request_payload_kb', label: 'Payload Max Limit (KB)', description: 'Reject HTTP POST requests larger than N kilobytes.', type: 'number', min: 10, max: 10240, category: 'API & Performance' },
  { key: 'third_party_webhooks_enabled', label: 'Third-Party Webhooks', description: 'Permit integration callbacks to target URLs.', type: 'toggle', category: 'API & Performance' },
  { key: 'system_debug_mode', label: 'Debug Verbose Logging', description: 'Output source stack traces on API 500 crashes.', type: 'toggle', category: 'API & Performance' },
];

export default function AdminGateway({ onClose }: { onClose: () => void }) {
  // Scroll Lock
  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);
  
  const [step, setStep] = useState<GatewayStep>('pin');
  const [attempts, setAttempts] = useState(0);
  const [isBanned, setIsBanned] = useState(false);

  // Pin State
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);



  // Auth State
  const [password, setPassword] = useState('');
  const [token2FA, setToken2FA] = useState('');
  const [authKey, setAuthKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isGhostMode, setIsGhostMode] = useState(false);
  const [ghostToken, setGhostToken] = useState<string | null>(null);

  // Setup State
  const [secret, setSecret] = useState('');
  const [qr, setQr] = useState('');
  const [setupToken, setSetupToken] = useState('');
  const [setupError, setSetupError] = useState('');
  const [setupSuccess, setSetupSuccess] = useState(false);
  const [verifyingSetup, setVerifyingSetup] = useState(false);

  // Dashboard State
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'overwatch' | 'triage' | 'prereg' | 'security' | 'invitations'>('overwatch');
  const [preRegs, setPreRegs] = useState<any[]>([]);
  // Live chat state
  const [adminName, setAdminName] = useState('');
  const [adminNameInput, setAdminNameInput] = useState('');
  const [joinStep, setJoinStep] = useState<'idle' | 'enter_name' | 'chat'>('idle');
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isWhisper, setIsWhisper] = useState(false);

  // Advanced features state
  const [quickReplyOpen, setQuickReplyOpen] = useState(false);
  const [ticketPriorities, setTicketPriorities] = useState<Record<string, 'Low' | 'Medium' | 'High'>>({});
  const [pausedTickets, setPausedTickets] = useState<Record<string, boolean>>({});
  const [lockedTickets, setLockedTickets] = useState<Record<string, boolean>>({});

  // Load saved admin name on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('vrl_admin_chat_name');
      if (saved) {
        setAdminName(saved);
        setAdminNameInput(saved);
        setJoinStep('chat');
      }
    }
  }, []);

  const handleSaveName = (name: string) => {
    setAdminName(name);
    setAdminNameInput(name);
    setJoinStep('chat');
    if (typeof window !== 'undefined') {
      localStorage.setItem('vrl_admin_chat_name', name);
    }
  };

  const blacklistIp = async (ip: string) => {
    if (isGhostMode) return;
    if (!window.confirm(`Are you sure you want to permanently blacklist IP ${ip}? This will block all early access registrations and OTP requests from this connection.`)) return;
    
    try {
      const authHeader = `Bearer ${authKey}`;
      const res = await fetch('/api/admin/blacklist', {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ip, reason: `Spamming/Abuse reported by ${adminName}` })
      });
      if (res.ok) {
        alert(`IP ${ip} has been successfully blacklisted.`);
        sendAdminMsg(`[SYSTEM NOTICE]: Spammer IP ${ip} has been blacklisted by ${adminName}.`, 'SYSTEM', true);
      } else {
        const d = await res.json().catch(() => ({}));
        alert(d.error || 'Failed to blacklist IP');
      }
    } catch (e) {
      alert('Network error');
    }
  };

  const exportTranscript = () => {
    if (!selectedTicket || chatMessages.length === 0) return;
    let transcriptText = `VERLYN CHAT TRANSCRIPT\n`;
    transcriptText += `Case ID: ${selectedTicket.case_id}\n`;
    transcriptText += `Subject: ${selectedTicket.subject}\n`;
    transcriptText += `Customer: ${selectedTicket.full_name} (${selectedTicket.email})\n`;
    transcriptText += `Date: ${new Date(selectedTicket.created_at).toLocaleString()}\n`;
    transcriptText += `--------------------------------------------------\n\n`;
    
    chatMessages.forEach(m => {
      const time = new Date(m.created_at).toLocaleTimeString();
      const sender = m.sender_type === 'user' ? selectedTicket.full_name : (m.agent_name || 'Agent');
      const prefix = m.is_internal ? '[WHISPER] ' : '';
      transcriptText += `[${time}] ${prefix}${sender}: ${m.content}\n`;
    });
    
    const blob = new Blob([transcriptText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `transcript-${selectedTicket.case_id}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Security Tab state
  const [systemConfig, setSystemConfig] = useState<any>(null);
  const [securityCategory, setSecurityCategory] = useState<'System & Traffic' | 'Auth & Identity' | 'Audit & Threat Logs' | 'Data & Privacy' | 'API & Performance'>('System & Traffic');
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [configError, setConfigError] = useState('');
  const [updatingConfig, setUpdatingConfig] = useState<string | null>(null);

  // Fetch security configs and audit logs
  useEffect(() => {
    if (activeTab !== 'security' || step !== 'dashboard') return;
    
    const loadSecurityData = async () => {
      const authHeader = isGhostMode ? `Ghost ${authKey}` : `Bearer ${authKey}`;
      try {
        // Fetch config
        const confRes = await fetch('/api/admin/config', { headers: { Authorization: authHeader } });
        if (confRes.ok) {
          const confData = await confRes.json();
          setSystemConfig(confData.config);
        }
        
        // Fetch audit logs
        const auditRes = await fetch('/api/admin/audit', { headers: { Authorization: authHeader } });
        if (auditRes.ok) {
          const auditData = await auditRes.json();
          setAuditLogs(auditData.logs || []);
        }
      } catch (err) {
        console.error('Failed to load security tab data', err);
      }
    };
    
    loadSecurityData();
    const interval = setInterval(loadSecurityData, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, [activeTab, step, authKey, isGhostMode]);

  const updateConfig = async (key: string, value: any) => {
    if (isGhostMode) return;
    setUpdatingConfig(key);
    setConfigError('');
    const authHeader = `Bearer ${authKey}`;
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ key, value })
      });
      if (res.ok) {
        // Reload configuration completely
        const confRes = await fetch('/api/admin/config', { headers: { Authorization: authHeader } });
        if (confRes.ok) {
          const confData = await confRes.json();
          setSystemConfig(confData.config);
        }
      } else {
        const d = await res.json().catch(() => ({}));
        setConfigError(d.error || 'Failed to update configuration');
      }
    } catch {
      setConfigError('Network error');
    } finally {
      setUpdatingConfig(null);
    }
  };

  // 1. Check PIN
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('unblock') === '1' || urlParams.get('clear_admin') === '1') {
        localStorage.removeItem('vrl_admin_blocked');
        localStorage.removeItem('vrl_admin_attempts');
        setIsBanned(false);
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }
    }

    if (localStorage.getItem('vrl_admin_blocked') === '1') {
      setIsBanned(true);
      return;
    }

    if (pin.length === 6) {
      if (pin === '021008') {
        checkSetup();
      } else {
        const nextAttempts = attempts + 1;
        setAttempts(nextAttempts);
        if (nextAttempts >= 3) {
          localStorage.setItem('vrl_admin_blocked', '1');
          setIsBanned(true);
        }
        setPinError(true);
        setTimeout(() => {
          setPin('');
          setPinError(false);
        }, 800);
      }
    }
  }, [pin, attempts]);

  // 2. Check Setup
  const checkSetup = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/setup-2fa');
      if (res.status === 403) {
        setStep('login');
      } else {
        const data = await res.json();
        if (data.secret) {
          setSecret(data.secret);
          if (data.otpauth_url) {
            const qrCodeDataUrl = await QRCode.toDataURL(data.otpauth_url);
            setQr(qrCodeDataUrl);
          }
          setStep('setup');
        }
      }
    } catch (err) {
      console.error(err);
      setStep('login');
    } finally {
      setLoading(false);
    }
  };

  // 2.5 Verify Setup Token
  const verifySetupToken = async () => {
    if (setupToken.length !== 6) return;
    setVerifyingSetup(true);
    setSetupError('');
    try {
      const res = await fetch('/api/admin/setup-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret, token: setupToken })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSetupSuccess(true);
      } else {
        setSetupError(data.error || 'Invalid code');
      }
    } catch (err) {
      setSetupError('Verification failed');
    } finally {
      setVerifyingSetup(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setIsGhostMode(false);
    try {
      const authPayload = token2FA ? `${password}:${token2FA}` : password;
      const res = await fetch('/api/admin/tickets', {
        headers: { 'Authorization': `Bearer ${authPayload}` }
      });
      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(text || `HTTP ${res.status}`);
      }
      if (!res.ok) throw new Error(data.error || `Authentication failed (${res.status})`);
      setTickets(data.tickets || []);
      // Store only password for subsequent session requests (TOTP expires in 30s)
      setAuthKey(password);

      const prRes = await fetch('/api/admin/preregistrations', { headers: { 'Authorization': `Bearer ${authPayload}` } });
      if (prRes.ok) {
        try {
          const prData = await prRes.json();
          setPreRegs(prData.registrations || []);
        } catch (e) {}
      }

      setStep('dashboard');
    } catch (err: any) {
      const nextAttempts = attempts + 1;
      setAttempts(nextAttempts);
      if (nextAttempts >= 3) {
        localStorage.setItem('vrl_admin_blocked', '1');
        setIsBanned(true);
      }
      setError(err.message || 'Authentication failed. Check credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  // 3.5 Ghost Mode Action
  const handleGhostMode = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/ghost-session', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Shadow Access Denied');
      
      setGhostToken(data.token);
      setIsGhostMode(true);
      setAuthKey(data.token); // Ghost token as authKey
      
      // Fetch data for ghost view
      const authHeader = `Ghost ${data.token}`;
      const [tkRes, prRes] = await Promise.all([
        fetch('/api/admin/tickets', { headers: { 'Authorization': authHeader } }),
        fetch('/api/admin/preregistrations', { headers: { 'Authorization': authHeader } })
      ]);
      
      if (tkRes.ok) { const tkData = await tkRes.json(); setTickets(tkData.tickets || []); }
      if (prRes.ok) { const prData = await prRes.json(); setPreRegs(prData.registrations || []); }
      
      setStep('dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 4. Update Ticket Status
  const updateStatus = async (id: string, status: string) => {
    if (isGhostMode) return;
    try {
      const res = await fetch('/api/admin/tickets', {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${authKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed');
      }
      setTickets(tickets.map(t => t.id === id ? { ...t, status } : t));
      if (selectedTicket?.id === id) setSelectedTicket((p: any) => ({ ...p, status }));
    } catch (err: any) { alert(err.message); }
  };

  // 5. Fetch live chat messages for selected ticket (Always visible, no join gate)
  useEffect(() => {
    if (!selectedTicket) return;
    const load = async () => {
      try {
        const authHeader = isGhostMode ? `Ghost ${ghostToken}` : `Bearer ${authKey}`;
        const res = await fetch(`/api/support/messages?ticket_id=${selectedTicket.id}`, {
          headers: { 'Authorization': authHeader }
        });
        if (!res.ok) return;
        const data = await res.json();
        setChatMessages(data.messages || []);
        setTimeout(() => { chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: 'smooth' }); }, 80);
      } catch {}
    };
    load();
    const iv = setInterval(load, 3000);
    return () => clearInterval(iv);
  }, [selectedTicket, authKey]);

  // 6. Admin send message
  const sendAdminMsg = async (overrideText?: string, overrideName?: string, overrideInternal?: boolean) => {
    if (isGhostMode) return; // Prevent any modifications in ghost mode
    const text = overrideText || chatInput;
    const name = overrideName || adminName;
    const isInternal = overrideInternal !== undefined ? overrideInternal : isWhisper;
    
    if (!text.trim() || !selectedTicket || chatSending) return;
    if (!overrideText) setChatInput('');
    setChatSending(true);
    setChatMessages(prev => [...prev, { 
      id: Date.now(), 
      sender_type: 'agent', 
      agent_name: name, 
      content: text, 
      is_internal: isInternal,
      created_at: new Date().toISOString() 
    }]);
    setTimeout(() => { chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: 'smooth' }); }, 80);
    try {
      await fetch('/api/support/messages', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ticket_id: selectedTicket.id, 
          content: text, 
          sender_type: 'agent', 
          agent_name: name,
          is_internal: isInternal
        })
      });
      
      // Update ticket status to In progress only if not internal
      if (!isInternal) {
        await fetch('/api/admin/tickets', {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${authKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: selectedTicket.id, status: 'In progress' })
        });
        setTickets(ts => ts.map(t => t.id === selectedTicket.id ? { ...t, status: 'In progress' } : t));
      }
    } catch { } finally { setChatSending(false); }
  };

  const getCategoryLabel = (cat: string) => {
    if (cat.startsWith('Custom:')) return cat;
    const labels: Record<string, string> = {
      general: 'General Inquiries',
      tech: 'Technical Support',
      security: 'Security & Privacy',
      account: 'Account Access',
      billing: 'Payment & Billing',
      bug: 'Bug Reports',
      legal: 'Legal & Compliance',
      partnership: 'Partnership Inquiry',
      suggestion: 'Feature Suggestions'
    };
    return labels[cat] || cat;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Received': return '#10b981';
      case 'In progress': return '#3b82f6';
      case 'In review': return '#f59e0b';
      case 'Completed': return '#8b5cf6';
      case 'Resolved': return '#8b5cf6';
      case 'Closed': return '#6b7280';
      default: return '#888';
    }
  };

  const renderChatLog = (desc: string) => {
    const blocks = desc.split('[USER_REPLY]');
    const initialMessage = blocks[0].trim();
    const userReplies = blocks.slice(1).map(r => r.trim());

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '10px', color: '#8b5cf6', background: 'rgba(139,92,246,0.15)', padding: '4px 8px', borderRadius: '6px', fontWeight: 600, textTransform: 'uppercase' }}>Original Ticket</span>
          </div>
          <p style={{ fontSize: '13px', color: '#e5e5e5', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{initialMessage}</p>
        </div>

        {userReplies.map((reply, idx) => (
          <div key={`reply-${idx}`} style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '10px', color: '#10b981', background: 'rgba(16,185,129,0.15)', padding: '4px 8px', borderRadius: '6px', fontWeight: 600, textTransform: 'uppercase' }}>User Reply</span>
            </div>
            <p style={{ fontSize: '13px', color: '#e5e5e5', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{reply}</p>
          </div>
        ))}
      </div>
    );
  };

  if (isBanned) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 200000,
          background: '#000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          backdropFilter: 'blur(40px)',
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'inline-block', padding: '12px 24px', background: 'rgba(255, 59, 48, 0.1)', border: '1px solid #ff3b30', borderRadius: '12px', marginBottom: '32px' }}>
            <span style={{ fontSize: '10px', fontWeight: 800, color: '#ff3b30', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Security Breach Detected</span>
          </motion.div>
          <h1 style={{ fontSize: '32px', color: '#fff', fontWeight: 400, marginBottom: '16px', letterSpacing: '-0.03em' }}>Access Permanently Revoked</h1>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, marginBottom: '40px' }}>
            Multiple unauthorized attempts detected. This device has been blacklisted from the administrative gateway.
          </p>
          <div style={{ padding: '12px', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', fontFamily: 'monospace', fontSize: '10px', color: 'rgba(255,255,255,0.2)', textAlign: 'left' }}>
            ERR_GATEWAY_BLACKLISTED_PERSISTENT<br/>
            TRACE: {Date.now().toString(16)}<br/>
            STATUS: PERMANENT_DENIAL
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 99999,
      background: 'rgba(0,0,0,0.9)',
      backdropFilter: 'blur(40px)',
      WebkitBackdropFilter: 'blur(40px)',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      padding: '60px 24px',
      overflowY: 'auto',
    }}>
      <AnimatePresence mode="wait">

        {/* ========================================================= */}
        {/* STEP 1: PIN ENTRY                                         */}
        {/* ========================================================= */}
        {step === 'pin' && (
          <motion.div key="pin" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            style={{ textAlign: 'center', position: 'relative', margin: 'auto 0' }}>
            <button onClick={onClose} style={{ position: 'absolute', top: '-60px', right: '-40px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
            <h2 style={{ fontSize: '12px', letterSpacing: '0.4em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: '40px', fontWeight: 600 }}>Command Authorization</h2>
            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
              {[0, 1, 2, 3, 4, 5].map(idx => (
                <div key={idx} style={{
                  width: '18px', height: '18px', borderRadius: '50%',
                  background: pinError ? '#ef4444' : pin.length > idx ? '#fff' : 'rgba(255,255,255,0.1)',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: pin.length > idx && !pinError ? '0 0 20px rgba(255,255,255,0.6)' : 'none'
                }} />
              ))}
            </div>
            <input
              type="password" autoFocus maxLength={6}
              value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              style={{ position: 'absolute', opacity: 0, top: 0, left: 0, right: 0, bottom: 0, cursor: 'text' }}
            />
            {loading && <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', marginTop: '40px', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Initializing Secure Connection...</p>}
          </motion.div>
        )}

        {/* ========================================================= */}
        {/* STEP 2: SETUP 2FA                                         */}
        {/* ========================================================= */}
        {step === 'setup' && (
          <motion.div key="setup" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            style={{ margin: 'auto 0', background: '#0a0a0a', padding: '48px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)', maxWidth: '460px', width: '100%', textAlign: 'center', boxShadow: '0 40px 100px rgba(0,0,0,0.8)' }}>
            <h1 style={{ fontSize: '20px', fontWeight: 600, color: '#fff', marginBottom: '12px' }}>Security Initialization</h1>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '32px', lineHeight: 1.5 }}>
              Scan this QR code with your authenticator app to secure the command gateway.
            </p>
            {qr && <img src={qr} alt="2FA QR Code" style={{ border: '8px solid white', borderRadius: '12px', marginBottom: '32px', width: '220px', background: '#fff' }} />}

            {!setupSuccess ? (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px', fontWeight: 600 }}>Verify Configuration Token</label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <input
                    type="text" value={setupToken} onChange={e => setSetupToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    style={{ flex: 1, padding: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', outline: 'none', textAlign: 'center', letterSpacing: '8px', fontSize: '24px', fontWeight: 600, fontFamily: 'monospace' }}
                  />
                  <button onClick={verifySetupToken} disabled={verifyingSetup || setupToken.length !== 6} style={{ 
                    padding: '0 32px', background: '#fff', color: '#000', fontWeight: 800, border: 'none', 
                    borderRadius: '12px', cursor: (verifyingSetup || setupToken.length !== 6) ? 'not-allowed' : 'pointer', 
                    opacity: (verifyingSetup || setupToken.length !== 6) ? 0.5 : 1, transition: 'all 0.3s ease',
                    textTransform: 'uppercase', letterSpacing: '0.1em', boxShadow: '0 10px 30px rgba(255,255,255,0.1)'
                  }}>
                    {verifyingSetup ? '...' : 'Verify'}
                  </button>
                </div>
                {setupError && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '12px' }}>{setupError}</p>}
              </div>
            ) : (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: 'left' }}>
                <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', padding: '16px', borderRadius: '12px', marginBottom: '24px', textAlign: 'center', color: '#10b981', fontWeight: 600, fontSize: '13px' }}>
                  Verification Successful
                </div>
                <div style={{ background: '#000', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '24px', textAlign: 'center' }}>
                  <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Root Secret Key</p>
                  <code style={{ fontSize: '15px', color: '#fff', letterSpacing: '2px', wordBreak: 'break-all' }}>{secret}</code>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
                    1. Add to Vercel Environment Variables:<br />
                    <strong style={{ color: '#fff', display: 'block', margin: '8px 0' }}>ADMIN_2FA_SECRET="{secret}"</strong>
                    2. Redeploy the application.<br />
                    3. This setup will be locked permanently.
                  </p>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ========================================================= */}
        {/* STEP 3: LOGIN                                             */}
        {/* ========================================================= */}
        {step === 'login' && (
          <motion.div key="login" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            style={{ width: '100%', maxWidth: '400px' }}>
            <form onSubmit={handleLogin} style={{ padding: '48px 40px', background: '#0a0a0a', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 40px 100px rgba(0,0,0,0.8)', position: 'relative' }}>
              <button type="button" onClick={onClose} style={{ position: 'absolute', top: '24px', right: '24px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', transition: 'color 0.2s' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>

              <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <h1 style={{ fontSize: '20px', fontWeight: 600, color: '#fff', letterSpacing: '0.2em', textTransform: 'uppercase' }}>System Override</h1>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', fontWeight: 600 }}>Master Identity</label>
                <input
                  type="password" autoFocus
                  value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••••••" required
                  style={{ width: '100%', padding: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', outline: 'none', letterSpacing: '2px', fontFamily: 'monospace' }}
                />
              </div>

              <div style={{ marginBottom: '32px' }}>
                <label style={{ display: 'block', fontSize: '10px', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', fontWeight: 600 }}>Authentication Token</label>
                <input
                  type="text"
                  value={token2FA} onChange={e => setToken2FA(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000" required
                  style={{ width: '100%', padding: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', outline: 'none', textAlign: 'center', letterSpacing: '8px', fontSize: '24px', fontWeight: 600, fontFamily: 'monospace' }}
                />
              </div>

              {error && <p style={{ color: '#ef4444', fontSize: '12px', textAlign: 'center', marginBottom: '24px', background: 'rgba(239,68,68,0.1)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)' }}>{error}</p>}

              <button type="submit" disabled={loading} style={{ 
                width: '100%', padding: '20px', background: '#fff', color: '#000', fontWeight: 800, 
                border: 'none', borderRadius: '14px', cursor: loading ? 'wait' : 'pointer', 
                textTransform: 'uppercase', letterSpacing: '0.15em', transition: 'all 0.3s ease',
                boxShadow: '0 10px 40px rgba(255,255,255,0.15)', marginBottom: '16px'
              }}>
                {loading ? 'Authenticating...' : 'Access Command'}
              </button>

              <button type="button" onClick={handleGhostMode} disabled={loading} style={{ 
                width: '100%', padding: '16px', background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.4)', 
                fontWeight: 600, border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', 
                cursor: loading ? 'wait' : 'pointer', textTransform: 'uppercase', letterSpacing: '0.1em',
                fontSize: '11px', transition: 'all 0.2s ease'
              }}>
                Request Shadow Access (Trial)
              </button>
            </form>
          </motion.div>
        )}

        {/* ========================================================= */}
        {/* STEP 4: DASHBOARD                                         */}
        {/* ========================================================= */}
        {step === 'dashboard' && (
          <motion.div key="dashboard" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            style={{ width: '100%', height: '100dvh', background: '#050505', color: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* COMMAND CENTER HEADER */}
            <header style={{
              padding: '20px 32px', borderBottom: '1px solid rgba(255,255,255,0.05)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: 'rgba(10,10,10,0.95)', backdropFilter: 'blur(20px)', position: 'relative', zIndex: 10
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '40px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isGhostMode ? '#f59e0b' : '#10b981', boxShadow: `0 0 12px ${isGhostMode ? 'rgba(245,158,11,0.5)' : 'rgba(16,185,129,0.5)'}`, animation: 'vrlBlink 2s infinite' }} />
                  <span style={{ fontSize: '15px', fontWeight: 800, letterSpacing: '0.15em', color: '#fff', textTransform: 'uppercase' }}>
                    {isGhostMode ? 'Shadow' : 'Command'}
                  </span>
                </div>
                
                {/* TABS */}
                <div style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.02)', padding: '4px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  {(['overwatch', 'triage', 'prereg', 'security', 'invitations'] as const).map(tab => (
                    <button key={tab} onClick={() => { setActiveTab(tab); }}
                      style={{
                        padding: '8px 20px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                        fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        background: activeTab === tab ? 'rgba(255,255,255,0.1)' : 'transparent',
                        color: activeTab === tab ? '#fff' : 'rgba(255,255,255,0.4)',
                        boxShadow: activeTab === tab ? '0 2px 10px rgba(0,0,0,0.2)' : 'none'
                      }}>
                      {tab === 'triage' ? `Triage (${tickets.length})` : tab === 'prereg' ? `Registry (${preRegs.length})` : tab === 'invitations' ? 'Invitations' : tab}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '6px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <img src="/shinichiro_sano_icon.jpg" alt="Admin" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div>
                    <p style={{ fontSize: '11px', fontWeight: 600, color: '#fff' }}>Shinichiro Sano</p>
                    <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>{new Date().toISOString().split('T')[1].slice(0, 8)} UTC</p>
                  </div>
                </div>
                <button onClick={onClose} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', padding: '8px 16px', borderRadius: '6px', fontSize: '10px', cursor: 'pointer', fontWeight: 700, letterSpacing: '0.1em', transition: 'all 0.2s' }}>
                  SECURE EXIT
                </button>
              </div>
            </header>

            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

              {/* ── Sidebar ── */}
              <div style={{ width: '360px', flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', background: '#0a0a0a', overflowY: 'auto' }} className="scrollbar-hide">

                {/* Search + Filter */}
                <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '8px' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <svg style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <input type="text" placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                      style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)', padding: '9px 10px 9px 30px', borderRadius: '8px', color: '#fff', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)', borderRadius: '8px', padding: '9px 10px', fontSize: '11px', outline: 'none', cursor: 'pointer', flexShrink: 0 }}>
                    <option value="all" style={{ background: '#111' }}>All</option>
                    <option value="Received" style={{ background: '#111' }}>Received</option>
                    <option value="In progress" style={{ background: '#111' }}>In Progress</option>
                    <option value="In review" style={{ background: '#111' }}>In Review</option>
                    <option value="Resolved" style={{ background: '#111' }}>Resolved</option>
                    <option value="Closed" style={{ background: '#111' }}>Closed</option>
                  </select>
                </div>

                {activeTab === 'triage' && (
                  (() => {
                    const filtered = tickets.filter(t => {
                      const q = searchQuery.toLowerCase();
                      const matchQ = !q || t.subject?.toLowerCase().includes(q) || t.full_name?.toLowerCase().includes(q) || t.email?.toLowerCase().includes(q) || t.case_id?.toLowerCase().includes(q);
                      const matchS = statusFilter === 'all' || t.status === statusFilter;
                      return matchQ && matchS;
                    });
                    const grouped = filtered.reduce((acc: any, t) => {
                      const cat = t.report_type || 'general';
                      if (!acc[cat]) acc[cat] = [];
                      acc[cat].push(t);
                      return acc;
                    }, {});
                    if (filtered.length === 0) return <div style={{ padding: '48px 24px', textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: '12px' }}>No matching records</div>;
                    
                    return Object.entries(grouped).map(([cat, catTickets]: [string, any]) => (
                      <div key={cat}>
                        <div style={{ padding: '12px 24px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)', borderTop: '1px solid rgba(255,255,255,0.02)', fontSize: '9px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                          {getCategoryLabel(cat)} ({catTickets.length})
                        </div>
                        {catTickets.map((t: any) => (
                          <div key={t.id} onClick={() => { setSelectedTicket(t); setJoinStep(adminName ? 'chat' : 'idle'); setChatInput(''); }}
                            style={{
                              padding: '20px 24px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s',
                              background: selectedTicket?.id === t.id ? 'rgba(255,255,255,0.04)' : 'transparent',
                              borderLeft: selectedTicket?.id === t.id ? '3px solid #6366f1' : '3px solid transparent'
                            }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
                              <span style={{ fontSize: '10px', fontWeight: 700, padding: '4px 8px', borderRadius: '6px', background: `${getStatusColor(t.status)}15`, color: getStatusColor(t.status), textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.status}</span>
                              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>{t.case_id}</span>
                            </div>
                            <p style={{ fontSize: '13.5px', fontWeight: 600, color: '#fff', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.subject}</p>
                            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.full_name} · Risk: Low</p>
                            {t.admin_reply && <p style={{ fontSize: '10px', color: '#6366f1', marginTop: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Awaiting User
                            </p>}
                          </div>
                        ))}
                      </div>
                    ));
                  })()
                )}

                {activeTab === 'prereg' && preRegs.map((r: any) => (
                  <div key={r.id} onClick={() => setSelectedTicket(r)}
                    style={{
                      padding: '20px 24px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s',
                      background: selectedTicket?.id === r.id ? 'rgba(255,255,255,0.04)' : 'transparent',
                      borderLeft: selectedTicket?.id === r.id ? '3px solid #fff' : '3px solid transparent'
                    }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>{r.full_name || 'Anonymous'}</p>
                      <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '4px' }}>{r.email}</p>
                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>{r.domain}</span>
                  </div>
                ))}

                {((activeTab === 'triage' && tickets.length === 0) || (activeTab === 'prereg' && preRegs.length === 0)) && (
                  <div style={{ padding: '60px 24px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>No records found</div>
                )}
              </div>

              {/* ── Main Detail Panel ── */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '40px' }} className="scrollbar-hide">
                
                {activeTab === 'overwatch' && (
                  <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
                      <div>
                        <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', marginBottom: '4px' }}>Global Overwatch</h2>
                        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>NODE: VERLYN-PRIME &nbsp;·&nbsp; {new Date().toISOString().replace('T', ' ').slice(0, 19)} UTC</p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', padding: '8px 16px', borderRadius: '10px' }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px rgba(16,185,129,0.8)', animation: 'vrlBlink 2s infinite' }} />
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#10b981', letterSpacing: '0.05em' }}>ALL SYSTEMS NOMINAL</span>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '28px' }}>
                      {[
                        { label: 'Active Cases', value: tickets.filter(t => !['Resolved','Completed','Closed'].includes(t.status)).length, total: tickets.length, color: '#6366f1', trend: '+2', icon: <IconActivity color="#6366f1" size={20} /> },
                        { label: 'Resolved Today', value: tickets.filter(t => ['Resolved','Completed','Closed'].includes(t.status)).length, total: null, color: '#10b981', trend: '+5', icon: <IconCheckCircle color="#10b981" size={20} /> },
                        { label: 'Avg Response', value: '1.4m', total: null, color: '#f59e0b', trend: '-0.3m', icon: <IconRisk color="#f59e0b" size={20} /> },
                        { label: 'Threat Level', value: 'LOW', total: null, color: '#8b5cf6', trend: 'STABLE', icon: <IconShield color="#8b5cf6" size={20} /> }
                      ].map((stat, i) => (
                        <div key={i} style={{ background: 'rgba(255,255,255,0.025)', padding: '22px 20px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.07)', position: 'relative', overflow: 'hidden' }}>
                          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, ${stat.color}60, transparent)` }} />
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>{stat.label}</p>
                            <span style={{ fontSize: '14px' }}>{stat.icon}</span>
                          </div>
                          <p style={{ fontSize: '28px', fontWeight: 800, color: stat.color, letterSpacing: '-0.02em', marginBottom: '6px' }}>{stat.value}</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '10px', color: 'rgba(16,185,129,0.8)', fontWeight: 600 }}>{stat.trend}</span>
                            {stat.total !== null && <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)' }}>of {stat.total} total</span>}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                      {/* Activity Feed */}
                      <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', padding: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                          <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#fff', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Live Activity</h3>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', animation: 'vrlBlink 2s infinite' }} />
                            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>LIVE</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                          {[
                            { time: 'Now', event: 'New ticket received', sub: tickets[0]?.case_id || 'No recent tickets', color: '#6366f1', dot: '#6366f1' },
                            { time: '3m', event: 'Case status updated', sub: 'In Progress → Resolved', color: '#10b981', dot: '#10b981' },
                            { time: '12m', event: 'Spam filter triggered', sub: '3 submissions blocked', color: '#f59e0b', dot: '#f59e0b' },
                            { time: '28m', event: 'Admin session started', sub: 'Auth via 2FA token', color: '#8b5cf6', dot: '#8b5cf6' },
                          ].map((log, i) => (
                            <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                              <div style={{ flexShrink: 0, paddingTop: '3px' }}>
                                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: log.dot, boxShadow: `0 0 6px ${log.dot}` }} />
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                                  <p style={{ fontSize: '12px', fontWeight: 600, color: '#fff' }}>{log.event}</p>
                                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace' }}>{log.time}</span>
                                </div>
                                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>{log.sub}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Queue health */}
                      <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', padding: '24px' }}>
                        <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#fff', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '20px' }}>Queue Breakdown</h3>
                        {[
                          { label: 'Received', count: tickets.filter(t => t.status === 'Received').length, color: '#10b981' },
                          { label: 'In Progress', count: tickets.filter(t => t.status === 'In progress').length, color: '#3b82f6' },
                          { label: 'In Review', count: tickets.filter(t => t.status === 'In review').length, color: '#f59e0b' },
                          { label: 'Resolved', count: tickets.filter(t => ['Resolved','Completed','Closed'].includes(t.status)).length, color: '#8b5cf6' },
                        ].map((row, i) => {
                          const pct = tickets.length > 0 ? Math.round((row.count / tickets.length) * 100) : 0;
                          return (
                            <div key={i} style={{ marginBottom: '14px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>{row.label}</span>
                                <span style={{ fontSize: '11px', color: row.color, fontWeight: 700, fontFamily: 'monospace' }}>{row.count} ({pct}%)</span>
                              </div>
                              <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${pct}%`, background: row.color, borderRadius: '2px', transition: 'width 0.8s ease', boxShadow: `0 0 8px ${row.color}60` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Recent tickets table */}
                    <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', padding: '24px' }}>
                      <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#fff', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '16px' }}>Recent Tickets</h3>
                      <div style={{ display: 'grid', gap: '1px' }}>
                        {tickets.slice(0, 5).map((t: any, i: number) => (
                          <div key={t.id} onClick={() => { setSelectedTicket(t); setActiveTab('triage'); setJoinStep(adminName ? 'chat' : 'idle'); }} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 160px 100px', gap: '16px', padding: '12px 16px', borderRadius: '8px', cursor: 'pointer', alignItems: 'center', background: i % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent', transition: 'background 0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                            onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent'}>
                            <p style={{ fontSize: '12px', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.subject}</p>
                            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>{t.case_id?.split('-').slice(1,3).join('-')}</span>
                            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)' }}>{t.full_name}</p>
                            <span style={{ fontSize: '10px', fontWeight: 700, color: getStatusColor(t.status), background: `${getStatusColor(t.status)}18`, padding: '3px 8px', borderRadius: '5px', textAlign: 'center' }}>{t.status}</span>
                          </div>
                        ))}
                        {tickets.length === 0 && <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', padding: '20px', textAlign: 'center' }}>No tickets yet</p>}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'security' && (
                  <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                      <div>
                        <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>Security & Configuration Control</h2>
                        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>Real-time platform configuration toggles and access management logs.</p>
                      </div>
                      
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', background: 'rgba(255,255,255,0.02)', padding: '4px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        {(['System & Traffic', 'Auth & Identity', 'Audit & Threat Logs', 'Data & Privacy', 'API & Performance'] as const).map(cat => (
                          <button
                            key={cat}
                            onClick={() => setSecurityCategory(cat)}
                            style={{
                              padding: '8px 14px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '10px',
                              fontWeight: 700,
                              letterSpacing: '0.03em',
                              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                              background: securityCategory === cat ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                              color: securityCategory === cat ? '#818cf8' : 'rgba(255,255,255,0.4)',
                              border: securityCategory === cat ? '1px solid rgba(99, 102, 241, 0.25)' : '1px solid transparent'
                            }}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>

                    {configError && (
                      <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '8px', color: 'rgba(239,68,68,0.9)', fontSize: '13px' }}>
                        {configError}
                      </div>
                    )}

                    {/* CONFIG GRID FOR ACTIVE CATEGORY */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                      {CONFIG_METADATA.filter(item => item.category === securityCategory).map(item => {
                        const rawVal = systemConfig?.[item.key];
                        const isUpdating = updatingConfig === item.key;
                        
                        return (
                          <div key={item.key} style={{ 
                            background: 'rgba(255,255,255,0.02)', 
                            padding: '20px', 
                            borderRadius: '14px', 
                            border: '1px solid rgba(255,255,255,0.05)', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            justifyContent: 'space-between',
                            gap: '16px',
                            opacity: isUpdating ? 0.6 : 1,
                            transition: 'all 0.3s ease',
                            position: 'relative'
                          }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <h3 style={{ fontSize: '13.5px', fontWeight: 600, color: '#fff' }}>{item.label}</h3>
                                {isUpdating && <span style={{ fontSize: '9px', color: '#818cf8', fontWeight: 600 }}>SAVING...</span>}
                              </div>
                              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', lineHeight: 1.4 }}>
                                {item.description}
                              </p>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%', alignItems: 'center' }}>
                              {item.type === 'toggle' && (
                                <div 
                                  onClick={() => {
                                    if (isUpdating || isGhostMode) return;
                                    const currentVal = rawVal === 'true' || rawVal === true;
                                    updateConfig(item.key, !currentVal);
                                  }}
                                  style={{
                                    position: 'relative',
                                    width: '46px',
                                    height: '24px',
                                    background: (rawVal === 'true' || rawVal === true) ? '#6366f1' : 'rgba(255,255,255,0.08)',
                                    borderRadius: '12px',
                                    cursor: isGhostMode ? 'not-allowed' : 'pointer',
                                    transition: 'background 0.3s ease',
                                    border: '1px solid rgba(255,255,255,0.05)'
                                  }}
                                >
                                  <div style={{
                                    position: 'absolute',
                                    top: '2px',
                                    left: (rawVal === 'true' || rawVal === true) ? '24px' : '2px',
                                    width: '18px',
                                    height: '18px',
                                    background: '#fff',
                                    borderRadius: '50%',
                                    transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                                  }} />
                                </div>
                              )}

                              {item.type === 'slider' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
                                  <input
                                    type="range"
                                    min={item.min}
                                    max={item.max}
                                    disabled={isGhostMode || isUpdating}
                                    value={parseInt(rawVal || String(item.min), 10)}
                                    onChange={(e) => updateConfig(item.key, parseInt(e.target.value))}
                                    style={{ flex: 1, accentColor: '#6366f1', background: 'rgba(255,255,255,0.1)', cursor: 'pointer' }}
                                  />
                                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#818cf8', minWidth: '16px', textAlign: 'right', fontFamily: 'monospace' }}>
                                    {rawVal || item.min}
                                  </span>
                                </div>
                              )}

                              {item.type === 'number' && (
                                <input
                                  type="number"
                                  min={item.min}
                                  max={item.max}
                                  disabled={isGhostMode || isUpdating}
                                  value={parseInt(rawVal || String(item.min), 10)}
                                  onChange={(e) => updateConfig(item.key, parseInt(e.target.value))}
                                  style={{
                                    width: '76px',
                                    padding: '6px 10px',
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: '8px',
                                    color: '#fff',
                                    fontSize: '11.5px',
                                    textAlign: 'right',
                                    outline: 'none',
                                    fontFamily: 'monospace'
                                  }}
                                />
                              )}

                              {item.type === 'select' && (
                                <select
                                  disabled={isGhostMode || isUpdating}
                                  value={rawVal || item.options?.[0]}
                                  onChange={(e) => updateConfig(item.key, e.target.value)}
                                  style={{
                                    padding: '6px 12px',
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: '8px',
                                    color: '#fff',
                                    fontSize: '11.5px',
                                    outline: 'none',
                                    cursor: 'pointer'
                                  }}
                                >
                                  {item.options?.map(opt => (
                                    <option key={opt} value={opt} style={{ background: '#0a0a0a', color: '#fff' }}>
                                      {opt}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* LIVE AUDIT LOG TRAIL */}
                    <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '16px', overflow: 'hidden' }}>
                      <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Security Audit Trail</h3>
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>Showing last 100 entries</span>
                      </div>
                      
                      <div style={{ maxHeight: '420px', overflowY: 'auto', padding: '12px 24px' }}>
                        {auditLogs.length === 0 ? (
                          <p style={{ padding: '40px', textAlign: 'center', fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>No audit events logged yet.</p>
                        ) : (
                          auditLogs.map((log: any) => (
                            <div key={log.id} style={{ display: 'flex', gap: '16px', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '12.5px', alignItems: 'flex-start' }}>
                              <span style={{
                                width: '70px',
                                flexShrink: 0,
                                fontSize: '10px',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                padding: '3px 6px',
                                borderRadius: '4px',
                                textAlign: 'center',
                                background: log.severity === 'critical' ? 'rgba(239,68,68,0.12)' : log.severity === 'warn' ? 'rgba(245,158,11,0.12)' : 'rgba(99,102,241,0.12)',
                                color: log.severity === 'critical' ? '#ef4444' : log.severity === 'warn' ? '#f59e0b' : '#a5b4fc'
                              }}>
                                {log.severity}
                              </span>
                              <div style={{ flex: 1 }}>
                                <p style={{ color: '#fff', fontWeight: 600, marginBottom: '2px' }}>{log.action}</p>
                                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>
                                  Actor: <span style={{ fontFamily: 'monospace', color: 'rgba(255,255,255,0.5)' }}>{log.actor || 'SYSTEM'}</span> 
                                  {log.target && <> · Target: <span style={{ fontFamily: 'monospace', color: 'rgba(255,255,255,0.5)' }}>{log.target}</span></>}
                                </p>
                                {log.metadata && Object.keys(log.metadata).length > 0 && (
                                  <pre style={{ margin: '6px 0 0 0', padding: '6px 10px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '6px', fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', overflowX: 'auto' }}>
                                    {JSON.stringify(log.metadata)}
                                  </pre>
                                )}
                              </div>
                              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', alignSelf: 'center' }}>
                                {new Date(log.created_at).toLocaleTimeString()}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}

                 {selectedTicket && activeTab === 'triage' ? (
                  <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Header with Case Title and Actions */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: 'rgba(255,255,255,0.02)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ flex: 1, marginRight: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                          <span style={{ fontSize: '10px', fontWeight: 800, padding: '4px 10px', borderRadius: '6px', background: `${getStatusColor(selectedTicket.status)}18`, color: getStatusColor(selectedTicket.status), textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {selectedTicket.status}
                          </span>
                          <span style={{
                            fontSize: '10px', fontWeight: 800, padding: '4px 10px', borderRadius: '6px',
                            background: ticketPriorities[selectedTicket.id] === 'High' ? 'rgba(239,68,68,0.15)' : ticketPriorities[selectedTicket.id] === 'Medium' ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.06)',
                            color: ticketPriorities[selectedTicket.id] === 'High' ? '#ef4444' : ticketPriorities[selectedTicket.id] === 'Medium' ? '#f59e0b' : 'rgba(255,255,255,0.4)',
                            textTransform: 'uppercase', letterSpacing: '0.05em'
                          }}>
                            Priority: {ticketPriorities[selectedTicket.id] || 'Low'}
                          </span>
                          {pausedTickets[selectedTicket.id] && (
                            <span style={{ fontSize: '10px', fontWeight: 800, padding: '4px 10px', borderRadius: '6px', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              Paused
                            </span>
                          )}
                          {lockedTickets[selectedTicket.id] && (
                            <span style={{ fontSize: '10px', fontWeight: 800, padding: '4px 10px', borderRadius: '6px', background: 'rgba(139,92,246,0.15)', color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              🔒 Locked
                            </span>
                          )}
                        </div>
                        <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#fff', lineHeight: 1.3, marginBottom: '6px' }}>{selectedTicket.subject}</h2>
                        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>Case ID: {selectedTicket.case_id} · Opened {new Date(selectedTicket.created_at).toLocaleString()}</p>
                      </div>

                      {/* Header Actions */}
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {/* Priority Selector */}
                        <select 
                          value={ticketPriorities[selectedTicket.id] || 'Low'} 
                          onChange={(e) => setTicketPriorities(prev => ({ ...prev, [selectedTicket.id]: e.target.value as any }))}
                          style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#fff', fontSize: '11px', fontWeight: 600, outline: 'none', cursor: 'pointer' }}
                        >
                          <option value="Low" style={{ background: '#0a0a0a' }}>Low Priority</option>
                          <option value="Medium" style={{ background: '#0a0a0a' }}>Medium Priority</option>
                          <option value="High" style={{ background: '#0a0a0a' }}>High Priority</option>
                        </select>

                        {/* Status Selector */}
                        <select value={selectedTicket.status} onChange={(e) => updateStatus(selectedTicket.id, e.target.value)}
                          style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#fff', fontSize: '11px', fontWeight: 600, outline: 'none', cursor: 'pointer' }}>
                          <option value="Received" style={{ background: '#0a0a0a' }}>Received</option>
                          <option value="In progress" style={{ background: '#0a0a0a' }}>In progress</option>
                          <option value="In review" style={{ background: '#0a0a0a' }}>In review</option>
                          <option value="Completed" style={{ background: '#0a0a0a' }}>Completed</option>
                          <option value="Resolved" style={{ background: '#0a0a0a' }}>Resolved</option>
                          <option value="Closed" style={{ background: '#0a0a0a' }}>Closed</option>
                        </select>
                      </div>
                    </div>

                    {/* Metadata & Telemetry Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      {/* Requester Profile */}
                      <div style={{ background: 'rgba(255,255,255,0.015)', padding: '20px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                          <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', fontWeight: 700 }}>Requester Details</p>
                          <p style={{ fontSize: '14px', color: '#fff', fontWeight: 600, marginBottom: '4px' }}>{selectedTicket.full_name}</p>
                          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', fontFamily: 'monospace' }}>{selectedTicket.email}</p>
                        </div>
                        <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                          <button 
                            onClick={() => blacklistIp(selectedTicket.ip_address)}
                            style={{ padding: '6px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', color: '#ef4444', fontSize: '10px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                          >
                            🚫 Ban IP
                          </button>
                        </div>
                      </div>

                      {/* Device & Connection Telemetry */}
                      <div style={{ background: 'rgba(255,255,255,0.015)', padding: '20px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.04)' }}>
                        <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', fontWeight: 700 }}>Connection Telemetry</p>
                        <p style={{ fontSize: '13px', color: '#fff', fontFamily: 'monospace', marginBottom: '4px' }}>IP: {selectedTicket.ip_address}</p>
                        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={selectedTicket.user_agent}>{selectedTicket.user_agent}</p>
                        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '8px', fontFamily: 'monospace' }}>Geofence: Secure Perimeter</p>
                      </div>
                    </div>

                    {/* Original Ticket Description */}
                    <div style={{ marginBottom: '8px' }}>
                      {renderChatLog(selectedTicket.description)}
                    </div>

                    {/* Live Support Portal */}
                    <div style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '420px', background: 'rgba(5,5,5,0.4)' }}>
                      {/* Premium Chat Header */}
                      <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: pausedTickets[selectedTicket.id] ? '#f59e0b' : '#10b981', boxShadow: `0 0 8px ${pausedTickets[selectedTicket.id] ? 'rgba(245,158,11,0.6)' : 'rgba(16,185,129,0.6)'}` }} />
                          <span style={{ fontSize: '12px', fontWeight: 600, color: '#fff' }}>
                            {pausedTickets[selectedTicket.id] ? 'Session Paused' : 'Live Chat Feed'} · {adminName ? `Connected as ${adminName}` : 'Spectating'}
                          </span>
                        </div>
                        
                        {/* Live Session Actions */}
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          {/* Export Transcript */}
                          <button 
                            onClick={exportTranscript}
                            title="Export chat transcript"
                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', borderRadius: '6px', padding: '5px 10px', fontSize: '10px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            💾 Export
                          </button>

                          {/* Pause / Resume Button */}
                          <button 
                            onClick={() => {
                              const nextPaused = !pausedTickets[selectedTicket.id];
                              setPausedTickets(prev => ({ ...prev, [selectedTicket.id]: nextPaused }));
                              sendAdminMsg(
                                nextPaused ? '[SESSION NOTICE]: Live chat session has been paused by the agent.' : '[SESSION NOTICE]: Live chat session has been resumed.',
                                'SYSTEM',
                                true
                              );
                            }}
                            style={{ 
                              background: pausedTickets[selectedTicket.id] ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', 
                              border: `1px solid ${pausedTickets[selectedTicket.id] ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`,
                              color: pausedTickets[selectedTicket.id] ? '#10b981' : '#f59e0b', 
                              borderRadius: '6px', padding: '5px 10px', fontSize: '10px', fontWeight: 600, cursor: 'pointer' 
                            }}
                          >
                            {pausedTickets[selectedTicket.id] ? '▶ Resume' : '⏸ Pause'}
                          </button>

                          {/* Lock / Unlock Case */}
                          <button 
                            onClick={() => {
                              const nextLocked = !lockedTickets[selectedTicket.id];
                              setLockedTickets(prev => ({ ...prev, [selectedTicket.id]: nextLocked }));
                              sendAdminMsg(
                                nextLocked ? `[SESSION NOTICE]: Ticket locked to agent ${adminName || 'Admin'}.` : '[SESSION NOTICE]: Ticket has been unlocked.',
                                'SYSTEM',
                                true
                              );
                            }}
                            style={{ 
                              background: lockedTickets[selectedTicket.id] ? 'rgba(255,255,255,0.1)' : 'rgba(139,92,246,0.1)', 
                              border: `1px solid ${lockedTickets[selectedTicket.id] ? 'rgba(255,255,255,0.2)' : 'rgba(139,92,246,0.3)'}`, 
                              color: lockedTickets[selectedTicket.id] ? '#fff' : '#8b5cf6', 
                              borderRadius: '6px', padding: '5px 10px', fontSize: '10px', fontWeight: 600, cursor: 'pointer' 
                            }}
                          >
                            {lockedTickets[selectedTicket.id] ? '🔓 Unlock' : '🔒 Lock Case'}
                          </button>
                        </div>
                      </div>

                      {/* Messages Scroller */}
                      <div ref={chatScrollRef} style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }} className="scrollbar-hide">
                        {chatMessages.length === 0 && (
                          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: '12px', marginTop: '40px' }}>No messages yet. Messages sent here will appear immediately.</p>
                        )}
                        {chatMessages.map(msg => (
                          msg.sender_type === 'user' ? (
                            <div key={msg.id} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                              <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(79,70,229,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#818cf8' }}>{(selectedTicket.full_name||'U')[0]}</span>
                              </div>
                              <div>
                                <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>{selectedTicket.full_name}</p>
                                <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '4px 12px 12px 12px', padding: '10px 14px', border: '1px solid rgba(255,255,255,0.07)' }}>
                                  <p style={{ fontSize: '13px', color: '#fff', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div key={msg.id} style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', alignItems: 'flex-start' }}>
                              <div style={{ textAlign: 'right' }}>
                                <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>{msg.agent_name || adminName} {msg.is_internal && <span style={{ color: '#f59e0b', marginLeft: '4px' }}>[WHISPER]</span>}</p>
                                <div style={{ background: msg.is_internal ? 'rgba(245,158,11,0.1)' : '#4f46e5', borderRadius: '12px 4px 12px 12px', padding: '10px 14px', border: msg.is_internal ? '1px solid rgba(245,158,11,0.3)' : 'none' }}>
                                  <p style={{ fontSize: '13px', color: msg.is_internal ? '#f59e0b' : '#fff', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                                </div>
                              </div>
                              <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: msg.is_internal ? '#f59e0b' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                 {msg.is_internal ? (
                                   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5"><path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5zM9 7a3 3 0 0 1 6 0v3H9V7z"/></svg>
                                 ) : (
                                   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                                 )}
                              </div>
                            </div>
                          )
                        ))}
                      </div>

                      {/* Input / Join Session Bar */}
                      {!adminName ? (
                        <div style={{ padding: '20px', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.01)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>You are spectating. To reply or write notes, enter your name below:</p>
                          <div style={{ display: 'flex', gap: '12px' }}>
                            <input autoFocus value={adminNameInput} onChange={e => setAdminNameInput(e.target.value)}
                              onKeyDown={e => { 
                                if (e.key === 'Enter' && adminNameInput.trim()) { 
                                  handleSaveName(adminNameInput.trim());
                                  sendAdminMsg(`Hello, I am ${adminNameInput.trim()} from Verlyn Support. I've joined the session to assist you with your request. How can I help you today?`, adminNameInput.trim());
                                } 
                              }}
                              placeholder="Your display name..." style={{ flex: 1, padding: '12px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', fontSize: '13px', outline: 'none' }} />
                            <button onClick={() => { 
                              if (adminNameInput.trim()) { 
                                handleSaveName(adminNameInput.trim());
                                sendAdminMsg(`Hello, I am ${adminNameInput.trim()} from Verlyn Support. I've joined the session to assist you with your request. How can I help you today?`, adminNameInput.trim());
                              } 
                            }}
                              style={{ 
                                padding: '12px 24px', background: '#fff', color: '#000', border: 'none', 
                                borderRadius: '10px', fontSize: '12px', fontWeight: 800, cursor: 'pointer',
                                textTransform: 'uppercase', letterSpacing: '0.1em'
                              }}>
                              Join Session
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.01)', position: 'relative' }}>
                          
                          {/* Quick replies list popover */}
                          {quickReplyOpen && (
                            <div style={{ position: 'absolute', bottom: '100%', left: '16px', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '8px', zIndex: 100, display: 'flex', flexDirection: 'column', gap: '4px', width: '320px', boxShadow: '0 -10px 30px rgba(0,0,0,0.5)' }}>
                              <p style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', padding: '4px 8px', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '4px' }}>Canned Quick Replies</p>
                              {[
                                { label: '👋 Greeting', text: `Hello! I am ${adminName} from Verlyn Support. How can I help you today?` },
                                { label: '🔑 Token Check', text: 'For your security, please verify the registration token shown on your screen so we can confirm your identity.' },
                                { label: '🛡️ Safety Policy', text: 'Please note that Verlyn operates on a strict zero-knowledge architecture. Your communication is end-to-end encrypted.' },
                                { label: '⚙️ Fixed/Resolved', text: 'We have resolved the underlying issue. Please refresh the page and verify if it is working now.' },
                                { label: '⏳ Escalate', text: 'I am escalating this ticket to our core engineering team for further investigation. We will update you here shortly.' }
                              ].map(reply => (
                                <button 
                                  key={reply.label} 
                                  onClick={() => {
                                    setChatInput(reply.text);
                                    setQuickReplyOpen(false);
                                  }}
                                  style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', padding: '8px 12px', borderRadius: '6px', color: '#fff', fontSize: '12px', cursor: 'pointer', transition: 'background 0.2s' }}
                                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                  <strong>{reply.label}</strong>
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Chat Input Bar */}
                          <div style={{ padding: '12px 16px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                            {/* Whisper Mode Toggle */}
                            <button onClick={() => setIsWhisper(!isWhisper)} 
                              title={isWhisper ? "Whisper Mode (Internal Note)" : "Customer Reply Mode"}
                              style={{ 
                                background: isWhisper ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.05)', 
                                border: `1px solid ${isWhisper ? '#f59e0b' : 'rgba(255,255,255,0.1)'}`,
                                borderRadius: '8px', width: '40px', height: '40px', display: 'flex', 
                                alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s'
                              }}>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isWhisper ? "#f59e0b" : "rgba(255,255,255,0.4)"} strokeWidth="2"><path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5zM9 7a3 3 0 0 1 6 0v3H9V7z"/></svg>
                            </button>

                            {/* Canned Replies Popover Toggle */}
                            <button onClick={() => setQuickReplyOpen(!quickReplyOpen)}
                              title="Insert Canned Response"
                              style={{ 
                                background: 'rgba(255,255,255,0.05)', 
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px', width: '40px', height: '40px', display: 'flex', 
                                alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s'
                              }}>
                              📝
                            </button>

                            <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                              disabled={pausedTickets[selectedTicket.id] || lockedTickets[selectedTicket.id]}
                              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAdminMsg(); } }}
                              placeholder={
                                lockedTickets[selectedTicket.id] ? "This ticket is locked. Unlock to reply." :
                                pausedTickets[selectedTicket.id] ? "This session is paused. Resume to reply." :
                                isWhisper ? "Write an internal whisper..." : `Reply to ${selectedTicket.full_name}...`
                              }
                              style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#fff', fontSize: '13px', padding: '10px 14px', outline: 'none' }} />

                            <button onClick={() => sendAdminMsg()} disabled={chatSending || !chatInput.trim() || pausedTickets[selectedTicket.id] || lockedTickets[selectedTicket.id]}
                              style={{ 
                                padding: '10px 24px', background: chatInput.trim() ? (isWhisper ? '#f59e0b' : '#fff') : 'rgba(255,255,255,0.1)', 
                                color: chatInput.trim() ? '#000' : 'rgba(255,255,255,0.3)', border: 'none', 
                                borderRadius: '10px', fontSize: '12px', fontWeight: 800, cursor: chatInput.trim() ? 'pointer' : 'not-allowed', 
                                transition: 'all 0.3s ease', textTransform: 'uppercase', letterSpacing: '0.1em'
                              }}>
                              {isWhisper ? 'Whisper' : 'Send'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : selectedTicket && activeTab === 'prereg' ? (
                  <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                      </div>
                      <div>
                        <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>{selectedTicket.full_name || 'Anonymous User'}</h2>
                        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>ID: {selectedTicket.id}</p>
                      </div>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                      {[
                        ['Email Address', selectedTicket.email],
                        ['Provider Domain', selectedTicket.domain],
                        ['Gender Identity', selectedTicket.gender || 'Not specified'],
                        ['Network IP', selectedTicket.ip_address || selectedTicket.ip_hash],
                        ['Registration Date', new Date(selectedTicket.created_at).toLocaleString()],
                        ['Account Status', selectedTicket.status || 'Pending Approval']
                      ].map(([label, val], idx) => (
                        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 24px', borderBottom: idx === 5 ? 'none' : '1px solid rgba(255,255,255,0.05)', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{label}</span>
                          <span style={{ fontSize: '13.5px', color: '#fff', fontFamily: String(label).includes('IP') || String(label).includes('ID') ? 'monospace' : 'inherit', fontWeight: 500 }}>{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : activeTab === 'invitations' ? (
                  <InvitationManager authKey={authKey} isGhostMode={isGhostMode} />
                ) : (
                  <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', border: '1px dashed rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><polyline points="13 2 13 9 20 9" /></svg>
                    </div>
                    <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>Select a record to view details</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}

// ── Invitation Manager Component ────────────────────────────────────────────────

function InvitationManager({ authKey, isGhostMode }: { authKey: string; isGhostMode: boolean }) {
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading]         = useState(false);
  const [actionLoading, setActionLoading] = useState('');
  const [error, setError]             = useState('');
  const [success, setSuccess]         = useState('');
  const [issueEmail, setIssueEmail]   = useState('');
  const [issueName, setIssueName]     = useState('');
  const [issueDays, setIssueDays]     = useState('7');
  const [issueNotes, setIssueNotes]   = useState('');
  const [newCode, setNewCode]         = useState('');
  const [showIssueForm, setShowIssueForm] = useState(false);

  const authHeader = isGhostMode ? `Ghost ${authKey}` : `Bearer ${authKey}`;

  const fetchInvitations = async () => {
    setLoading(true); setError('');
    try {
      const res  = await fetch('/api/admin/invitations', { headers: { Authorization: authHeader } });
      const data = await res.json();
      if (res.ok) setInvitations(data.invitations || []);
      else setError(data.error || 'Failed to load invitations');
    } catch { setError('Network error'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchInvitations(); }, []);

  const handleIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading('issue'); setError(''); setSuccess(''); setNewCode('');
    try {
      const res = await fetch('/api/admin/invitations', {
        method: 'POST',
        headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: issueEmail, name: issueName, expiryDays: Number(issueDays), notes: issueNotes }),
      });
      const data = await res.json();
      if (res.ok) {
        setNewCode(data.code_formatted); setSuccess('Invitation issued.');
        setIssueEmail(''); setIssueName(''); setIssueNotes('');
        await fetchInvitations();
      } else { setError(data.error || 'Failed to issue invitation'); }
    } catch { setError('Network error'); } finally { setActionLoading(''); }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('Revoke this invitation? This cannot be undone.')) return;
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/invitations/${id}/revoke`, { method: 'POST', headers: { Authorization: authHeader } });
      const data = await res.json();
      if (res.ok) { setSuccess('Invitation revoked.'); await fetchInvitations(); }
      else setError(data.error || 'Failed to revoke');
    } catch { setError('Network error'); } finally { setActionLoading(''); }
  };

  const SC: Record<string, string> = { active: '#10b981', used: '#6366f1', revoked: '#ef4444', expired: '#f59e0b' };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '8px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>Invitation Manager</h2>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>Issue, view, and revoke Advance Access invitations. All codes are single-use and email-bound.</p>
        </div>
        <button onClick={() => setShowIssueForm(v => !v)}
          style={{ padding: '10px 20px', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '8px', color: '#c7d2fe', fontSize: '12px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {showIssueForm ? 'Cancel' : '+ Issue Invitation'}
        </button>
      </div>
      {error   && <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '8px', color: 'rgba(239,68,68,0.9)', fontSize: '13px', marginBottom: '16px' }}>{error}</div>}
      {success && <div style={{ padding: '12px 16px', background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: '8px', color: 'rgba(16,185,129,0.9)', fontSize: '13px', marginBottom: '16px' }}>{success}</div>}
      {showIssueForm && (
        <form onSubmit={handleIssue} style={{ padding: '24px', background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: '12px', marginBottom: '28px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>Issue New Invitation</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div><label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '6px' }}>Recipient Email *</label><input value={issueEmail} onChange={e => setIssueEmail(e.target.value)} type="email" required placeholder="user@example.com" style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} /></div>
            <div><label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '6px' }}>Recipient Name</label><input value={issueName} onChange={e => setIssueName(e.target.value)} type="text" placeholder="Optional" style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} /></div>
            <div><label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '6px' }}>Expiry (days) *</label><input value={issueDays} onChange={e => setIssueDays(e.target.value)} type="number" min="1" max="365" required style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} /></div>
            <div><label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '6px' }}>Notes</label><input value={issueNotes} onChange={e => setIssueNotes(e.target.value)} type="text" placeholder="Internal note" style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} /></div>
          </div>
          {newCode && <div style={{ padding: '16px', background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '8px' }}><p style={{ fontSize: '11px', color: 'rgba(16,185,129,0.7)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Generated Code — Share with recipient only</p><p style={{ fontSize: '24px', fontWeight: 800, color: '#fff', fontFamily: 'monospace', letterSpacing: '0.2em' }}>{newCode}</p></div>}
          <button type="submit" disabled={actionLoading === 'issue'} style={{ padding: '12px 24px', background: actionLoading === 'issue' ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.9)', border: '1px solid rgba(99,102,241,0.4)', borderRadius: '8px', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.08em', textTransform: 'uppercase', alignSelf: 'flex-start' }}>{actionLoading === 'issue' ? 'Generating…' : 'Generate & Issue'}</button>
        </form>
      )}
      {loading ? <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.3)' }}>Loading…</div>
        : invitations.length === 0 ? <div style={{ textAlign: 'center', padding: '60px', color: 'rgba(255,255,255,0.25)', fontSize: '14px' }}>No invitations issued yet.</div>
        : <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {invitations.map((inv: any) => (
            <div key={inv.id} style={{ padding: '14px 20px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '9px', fontWeight: 700, padding: '4px 10px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0, background: `${SC[inv.status] ?? '#888'}15`, color: SC[inv.status] ?? '#888' }}>{inv.status}</span>
              <span style={{ fontSize: '14px', fontFamily: 'monospace', color: '#fff', fontWeight: 600, letterSpacing: '0.12em', flex: '0 0 auto' }}>{String(inv.code ?? '').replace(/(.{4})(.{4})(.{4})/, '$1-$2-$3')}</span>
              <div style={{ flex: 1, minWidth: '160px' }}><p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '2px' }}>{inv.email}</p><p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)' }}>{inv.issued_by} · Exp {new Date(inv.expires_at).toLocaleDateString()}{inv.redeemed_at ? ` · Used ${new Date(inv.redeemed_at).toLocaleDateString()}` : ''}</p></div>
              {inv.status === 'active' && <button onClick={() => handleRevoke(inv.id)} disabled={actionLoading === inv.id} style={{ padding: '7px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', color: 'rgba(239,68,68,0.8)', fontSize: '11px', fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>{actionLoading === inv.id ? '…' : 'Revoke'}</button>}
            </div>
          ))}
        </div>}
    </div>
  );
}
