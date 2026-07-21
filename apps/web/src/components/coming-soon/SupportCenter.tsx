'use client';

import { useState, useEffect, useRef } from 'react';
import { IconLock, IconShield, IconZap } from './Icons';
import { motion, AnimatePresence } from 'framer-motion';
import Logo from './Logo';
import { createClient } from '@/lib/supabase/client';

type ViewState = 'menu' | 'form' | 'tracking' | 'faq' | 'chat' | 'identity';

interface Ticket {
  case_id: string;
  subject: string;
  status: string;
  date_filed: string;
  description?: string;
  admin_reply?: string;
  email?: string;
}

const FAQS = [
  {
    q: 'What is the target latency for Verlyn nodes?',
    a: 'Verlyn is engineered for sub-120ms p95 latency across the global backbone. We utilize custom routing protocols and edge-optimization to bypass standard public congestion points. Our global relay network ensures messages are delivered with minimal delay regardless of geographic distance.'
  },
  {
    q: 'How does the Pre-Registration Access Model work?',
    a: 'Access is granted in deliberate waves based on registration sequence and verification status. Early adopters receive priority access and dedicated onboarding support. Each wave is carefully controlled to maintain platform quality and prevent spam or bot infiltration.'
  },
  {
    q: 'Is Verlyn data truly zero-knowledge?',
    a: 'Absolutely. We utilize hardware security modules (HSMs) and zero-knowledge proofs (ZKPs) to ensure that even at the infrastructure level, Verlyn has no visibility into the payload of your messages. Your cryptographic keys never leave your device.'
  },
  {
    q: 'Can I migrate my existing identity to Verlyn?',
    a: 'Verlyn supports a wide range of DID (Decentralized Identity) standards. Migration tools will be available upon the public release of the Command Center. You will be able to import contacts and identity proofs from compatible platforms.'
  },
  {
    q: 'What encryption protocol does Verlyn use?',
    a: 'Verlyn uses the Signal Protocol for end-to-end encryption, extended with our proprietary zero-knowledge layer. All messages use a Double Ratchet algorithm ensuring forward secrecy — even if a key is compromised, past messages remain protected.'
  },
  {
    q: 'How do I know a Verlyn agent is real and verified?',
    a: 'Every Verlyn support agent carries a cryptographically signed identity badge visible within the chat interface. You will see a verified checkmark and their agent ID. We never contact users through email unsolicited — all communication happens within your encrypted support case.'
  },
  {
    q: 'What happens to my data if I delete my account?',
    a: 'Upon account deletion, all your messages, profile data, and metadata are permanently erased from our servers within 48 hours. Because of our zero-knowledge architecture, we cannot recover or restore any data after this process completes. This is by design — your data is truly yours.'
  },
  {
    q: 'Does Verlyn store message metadata?',
    a: 'No. Verlyn does not log who messaged whom, when, or how often. Traditional platforms store this metadata even when messages are encrypted. Our architecture is designed to make this data collection technically impossible at the infrastructure level.'
  },
  {
    q: 'Can I use Verlyn on multiple devices?',
    a: 'Yes. Verlyn supports multi-device synchronization using a secure device-linking protocol. Each device generates its own key pair, and messages are encrypted separately for each linked device. There is no central key escrow.'
  },
  {
    q: 'How does Verlyn prevent spam and fake accounts?',
    a: 'Verlyn uses a multi-layer verification system: email domain reputation scoring, behavioral analysis during registration, and an invite-only access model during the early phase. Accounts exhibiting spam patterns are automatically flagged and reviewed by our trust team within 24 hours.'
  },
  {
    q: 'What is the Emergency Support protocol?',
    a: 'Emergency Support is reserved for critical security incidents, account compromise, or urgent safety concerns. Cases filed under this protocol are escalated immediately to a senior agent. Misuse of this channel results in a 48-hour support suspension and a 7-day flag on your account.'
  },
  {
    q: 'Is Verlyn compliant with GDPR and data protection laws?',
    a: 'Yes. Verlyn is designed with privacy regulations as a foundation, not an afterthought. Our zero-knowledge architecture means we technically cannot access your data, making GDPR compliance structurally enforced. You can request data export or deletion at any time through your account settings.'
  },
];

export default function SupportCenter({ onClose, initialView, initialReportType }: { onClose: () => void, initialView?: ViewState, initialReportType?: string }) {
  const [view, setView] = useState<ViewState>(initialView || 'menu');

  useEffect(() => {
    if (initialView) setView(initialView);
    if (initialReportType) setReportType(initialReportType);
  }, [initialView, initialReportType]);

  // Scroll Lock
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [reportType, setReportType] = useState(initialReportType || 'general');
  const [customReportType, setCustomReportType] = useState('');
  const [description, setDescription] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notifyAgreed, setNotifyAgreed] = useState(false);
  const [showNotifyReason, setShowNotifyReason] = useState(false);
  const [faqSearch, setFaqSearch] = useState('');
  const [isMaintenance, setIsMaintenance] = useState(false);

  // Chat State
  const [chatTicket, setChatTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [chatInitState, setChatInitState] = useState<'idle' | 'verifying_auth' | 'loading_ticket' | 'syncing_messages' | 'ready' | 'error'>('idle');
  const [initError, setInitError] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [userReplyText, setUserReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  const logEvent = (msg: string) => {
    const ts = new Date().toISOString().split('T')[1].slice(0, 8);
    const entry = `[${ts}] ${msg}`;
    console.log(entry);
    setLogs(prev => [...prev.slice(-49), entry]);
  };

  const chatScrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Validation helpers
  const wordCount = (str: string) => str.trim().split(/\s+/).filter(Boolean).length;
  const SUBJECT_MIN = 5; const SUBJECT_MAX = 120;
  const DESC_MIN = 30; const DESC_MAX = 1500;
  const subjectWords = wordCount(subject);
  const descWords = wordCount(description);

  const [lookupCaseId, setLookupCaseId] = useState('');
  const [lookupEmail, setLookupEmail] = useState('');
  const [lookupError, setLookupError] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [showLookup, setShowLookup] = useState(false);

  useEffect(() => {
    const checkMaintenance = async () => {
      try {
        const res = await fetch('/api/config/public');
        if (res.ok) {
          const data = await res.json();
          setIsMaintenance(data.maintenance);
        }
      } catch {}
    };
    checkMaintenance();

    // Prefill user details if authenticated
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }: any) => {
      if (data?.user) {
        setEmail(data.user.email || '');
        setLookupEmail(data.user.email || '');
        supabase.from('users').select('display_name, full_name').eq('id', data.user.id).single().then(({ data: profile }: any) => {
          if (profile) {
            setFullName(profile.display_name || profile.full_name || '');
          }
        });
      }
    });

    try {
      const stored = localStorage.getItem('vrl_support_tickets');
      if (stored) {
        const parsed: Ticket[] = JSON.parse(stored);
        setTickets(parsed);
        // Refresh statuses from live API
        parsed.forEach(async (t) => {
          try {
            const ticketEmail = t.email || email || parsed[0]?.email;
            if (!ticketEmail) return;
            const res = await fetch(`/api/support/status?case_id=${t.case_id}&email=${encodeURIComponent(ticketEmail)}`);
            if (res.ok) {
              const live = await res.json();
              setTickets(prev => {
                const updated = prev.map(p => p.case_id === t.case_id ? { ...p, status: live.status } : p);
                localStorage.setItem('vrl_support_tickets', JSON.stringify(updated));
                return updated;
              });
            }
          } catch {}
        });
      }
    } catch (e) { }
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const messagesRef = useRef<any[]>([]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  useEffect(() => {
    if (view === 'chat' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [view]);

  // State machine initialization for Chat View
  useEffect(() => {
    if (view !== 'chat' || !chatTicket) {
      setChatInitState('idle');
      return;
    }

    let isSubscribed = true;

    const runInitialization = async () => {
      setChatInitState('verifying_auth');
      setInitError('');
      setMessages([]);
      logEvent(`Initializing chat pipeline for Case ID: ${chatTicket.case_id}`);

      try {
        // Step 1: Verify auth user & email
        logEvent("Step 1: Verifying active user session...");
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        let clientEmail = email;
        if (user) {
          logEvent(`User session active (ID: ${user.id}). Using session email.`);
          clientEmail = user.email || email;
        } else {
          logEvent("No active session. Relying on form-provided email.");
        }

        if (!clientEmail) {
          throw new Error("Missing client email. Please log in or provide email.");
        }

        if (!isSubscribed) return;

        // Step 2: Load ticket details & confirm ownership
        setChatInitState('loading_ticket');
        logEvent(`Step 2: Fetching ticket status for ${chatTicket.case_id}...`);
        const statusRes = await fetch(`/api/support/status?case_id=${chatTicket.case_id}&email=${encodeURIComponent(clientEmail)}`);

        if (!statusRes.ok) {
          const errData = await statusRes.json();
          throw new Error(errData.error || `Verification failed (status: ${statusRes.status})`);
        }

        const statusData = await statusRes.json();
        logEvent(`Ticket verified. Status: ${statusData.status}`);

        if (!isSubscribed) return;

        // Step 3: Load initial messages
        setChatInitState('syncing_messages');
        logEvent("Step 3: Syncing secure channel messages...");
        const msgsRes = await fetch(`/api/support/messages?case_id=${chatTicket.case_id}&email=${encodeURIComponent(clientEmail)}`);

        if (!msgsRes.ok) {
          const errData = await msgsRes.json();
          throw new Error(errData.error || `Sync failed (status: ${msgsRes.status})`);
        }

        const msgsData = await msgsRes.json();
        const newMsgs = msgsData.messages || [];
        logEvent(`Handshake complete. Received ${newMsgs.length} messages.`);

        if (!isSubscribed) return;
        setMessages(newMsgs);
        setChatInitState('ready');
      } catch (err: any) {
        logEvent(`Error during initialization: ${err.message}`);
        if (isSubscribed) {
          setInitError(err.message);
          setChatInitState('error');
        }
      }
    };

    runInitialization();

    return () => {
      isSubscribed = false;
    };
  }, [view, chatTicket?.case_id]);

  // Periodic polling of messages (only runs when state is ready)
  useEffect(() => {
    if (view !== 'chat' || !chatTicket || chatInitState !== 'ready') return;

    let isSubscribed = true;

    const pollMessages = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        const clientEmail = user?.email || email;

        const res = await fetch(`/api/support/messages?case_id=${chatTicket.case_id}&email=${encodeURIComponent(clientEmail)}`);
        if (!res.ok || !isSubscribed) return;

        const data = await res.json();
        const newMsgs = data.messages || [];

        setMessages(prev => {
          const optimistic = prev.filter((m: any) => m.is_optimistic);
          const incomingIds = new Set(newMsgs.map((m: any) => m.id));

          const stillSending = optimistic.filter(m => {
            if (incomingIds.has(m.id)) return false;

            const mContent = m.content.trim().toLowerCase();
            const alreadyInIncoming = newMsgs.some((nm: any) => {
              if (nm.sender_type !== m.sender_type) return false;

              const nmContent = nm.content.trim().toLowerCase();
              if (mContent.includes('[attachment:') && nmContent.includes('[attachment:')) {
                try {
                  const mFile = mContent.split('\"name\":\"')[1]?.split('\"')[0];
                  const nmFile = nmContent.split('\"name\":\"')[1]?.split('\"')[0];
                  return mFile === nmFile && mFile !== undefined;
                } catch { return mContent === nmContent; }
              }
              return nmContent === mContent;
            });
            return !alreadyInIncoming;
          });

          const merged = [...newMsgs, ...stillSending];

          const container = chatScrollRef.current;
          const wasAtBottom = container ? (container.scrollHeight - container.scrollTop <= container.clientHeight + 150) : true;
          const newAgentMsg = newMsgs.length > prev.filter((m: any) => !m.is_optimistic).length && newMsgs[newMsgs.length - 1]?.sender_type === 'agent';

          if (wasAtBottom || newAgentMsg) {
             setTimeout(() => {
               chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: 'smooth' });
             }, 100);
          }

          return merged;
        });

        if (newMsgs.length > messagesRef.current.filter(m => !m.is_optimistic).length) {
          const lastMsg = newMsgs[newMsgs.length - 1];
          if (lastMsg.sender_type === 'agent' && 'Notification' in window && Notification.permission === 'granted') {
            new Notification('Verlyn Support', { body: lastMsg.content });
          }
        }
      } catch (err: any) {
        logEvent(`Polling error: ${err.message}`);
      }
    };

    const interval = setInterval(pollMessages, 4000);
    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [view, chatTicket?.case_id, chatInitState]);

  // Poll live ticket status every 5s (only runs when state is ready)
  useEffect(() => {
    if ((view !== 'chat' && view !== 'tracking') || (!chatTicket && !activeTicket) || (view === 'chat' && chatInitState !== 'ready')) return;
    const caseId = chatTicket?.case_id || activeTicket?.case_id;
    if (!caseId) return;

    let isSubscribed = true;

    const pollStatus = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        const clientEmail = user?.email || email;

        const res = await fetch(`/api/support/status?case_id=${caseId}&email=${encodeURIComponent(clientEmail)}`);
        if (!res.ok || !isSubscribed) return;
        const live = await res.json();

        if (chatTicket && live.status !== chatTicket.status) {
          setChatTicket(prev => prev ? { ...prev, status: live.status } : prev);
        }
        if (activeTicket && live.status !== activeTicket.status) {
          setActiveTicket(prev => prev ? { ...prev, status: live.status } : prev);
        }
        setTickets(prev => {
          const updated = prev.map(p => p.case_id === caseId ? { ...p, status: live.status } : p);
          localStorage.setItem('vrl_support_tickets', JSON.stringify(updated));
          return updated;
        });
      } catch {}
    };

    const interval = setInterval(pollStatus, 5000);
    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [view, chatTicket?.case_id, activeTicket?.case_id, chatInitState]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 3-ticket per 24 hours spam guard (client-side)
    const historyStr = localStorage.getItem('vrl_support_history');
    let history: number[] = historyStr ? JSON.parse(historyStr) : [];
    const now = Date.now();
    const ONE_DAY = 24 * 60 * 60 * 1000;
    
    // Filter out timestamps older than 24 hours
    history = history.filter(ts => now - ts < ONE_DAY);
    
    // Check for active ticket
    const hasActiveTicket = tickets.some(t => !['Resolved', 'Completed', 'Closed'].includes(t.status));
    if (hasActiveTicket) {
      setError('You already have an active request. Please wait until it is resolved before submitting a new one.');
      return;
    }

    if (history.length >= 3) {
      const oldest = history[0];
      const hoursLeft = Math.ceil((ONE_DAY - (now - oldest)) / 3600000);
      setError(`Request limit reached. You can submit up to 3 tickets per 24 hours. Please wait ${hoursLeft}h before submitting another request.`);
      return;
    }

    if (subjectWords < SUBJECT_MIN) return setError(`Subject requires at least ${SUBJECT_MIN} words.`);
    if (subject.length > SUBJECT_MAX) return setError(`Subject is too long. Max ${SUBJECT_MAX} characters.`);
    if (descWords < DESC_MIN) return setError(`Description requires at least ${DESC_MIN} words.`);
    if (description.length > DESC_MAX) return setError(`Description is too long. Max ${DESC_MAX} characters.`);
    if (!agreed) return setError('You must accept the terms to submit a request.');

    if (isMaintenance) return setError('Systems are currently undergoing scheduled maintenance. Transmissions are paused.');
    
    setLoading(true);
    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          email,
          subject,
          reportType: reportType === 'customize' ? `Custom: ${customReportType}` : reportType,
          description,
          agreed
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit');

      const newTicket: Ticket = {
        case_id: data.case_id,
        subject,
        status: data.status,
        date_filed: data.date_filed,
        description,
        email: email,
      };

      const updatedTickets = [newTicket, ...tickets];
      setTickets(updatedTickets);
      localStorage.setItem('vrl_support_tickets', JSON.stringify(updatedTickets));
      history.push(now);
      localStorage.setItem('vrl_support_history', JSON.stringify(history));

      setChatTicket(newTicket);
      setActiveTicket(newTicket);
      setView('chat');

      setSubject(''); setDescription(''); setAgreed(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLookupCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupCaseId.trim() || !lookupEmail.trim()) {
      setLookupError('Both Case ID and Email are required for validation.');
      return;
    }
    setLookupError('');
    setLookupLoading(true);
    try {
      let cid = lookupCaseId.trim().toUpperCase();
      if (!cid.startsWith('CASE-') && cid.length >= 10) {
        cid = `CASE-${cid}`;
      }

      const res = await fetch(`/api/support/status?case_id=${cid}&email=${encodeURIComponent(lookupEmail.trim())}`);
      if (!res.ok) { 
        const errData = await res.json().catch(() => ({}));
        setLookupError(errData.error || 'Case not found or email verification failed.'); 
        return; 
      }
      const data = await res.json();
      
      const msgRes = await fetch(`/api/support/messages?case_id=${cid}&email=${encodeURIComponent(lookupEmail.trim())}`);
      const msgData = msgRes.ok ? await msgRes.json() : { messages: [] };
      const found: Ticket = {
        case_id: cid,
        subject: 'Recovered Case',
        status: data.status,
        date_filed: new Date().toISOString(),
        email: lookupEmail.trim(),
      };
      
      const existing = tickets.some(t => t.case_id === cid);
      if (!existing) {
        const updated = [found, ...tickets];
        setTickets(updated);
        localStorage.setItem('vrl_support_tickets', JSON.stringify(updated));
      }
      
      setChatTicket(found);
      setMessages(msgData.messages || []);
      setShowLookup(false);
      setLookupCaseId('');
      setLookupEmail('');
      setView('chat');
    } catch {
      setLookupError('Connection error. Please try again.');
    } finally {
      setLookupLoading(false);
    }
  };

  const handleUserReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userReplyText.trim() && !selectedFile) return;
    if (!chatTicket || sendingReply) return;
    
    const text = userReplyText;
    const file = selectedFile;
    
    setUserReplyText('');
    setSelectedFile(null);
    setSendingReply(true);

    const optimisticId = Date.now();
    const localUrl = file ? URL.createObjectURL(file) : null;
    
    // 1. Instant Optimistic Preview
    const optimisticContent = file 
      ? `[ATTACHMENT:${JSON.stringify({ name: file.name, url: localUrl, type: file.type, is_uploading: true })}]${text ? '\n\n' + text : ''}`
      : text;

    setMessages(prev => [...prev, { 
      id: optimisticId, 
      sender_type: 'user', 
      content: optimisticContent, 
      created_at: new Date().toISOString(),
      is_optimistic: true 
    }]);

    setTimeout(() => { chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: 'smooth' }); }, 80);

    try {
      let finalContent = text;
      
      // 2. Background Upload & Sync with Timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s timeout

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const clientEmail = user?.email || email;

      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('case_id', chatTicket.case_id);
        formData.append('email', clientEmail || '');
        
        const uploadRes = await fetch('/api/support/upload', {
          method: 'POST',
          body: formData,
          signal: controller.signal
        });
        
        if (!uploadRes.ok) {
          const err = await uploadRes.json();
          throw new Error(err.error || 'Media upload failed.');
        }
        
        const uploadData = await uploadRes.json();
        finalContent = `[ATTACHMENT:${JSON.stringify({ name: file.name, url: uploadData.url, type: file.type })}]${text ? '\n\n' + text : ''}`;
      }

      const res = await fetch('/api/support/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ case_id: chatTicket.case_id, email: clientEmail, content: finalContent, sender_type: 'user' }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!res.ok) { 
        const d = await res.json(); 
        throw new Error(d.error || 'Failed to sync with secure node.'); 
      }
      
      if (localUrl) setTimeout(() => URL.revokeObjectURL(localUrl), 10000);
      
      // Clean up the optimistic message now that we know it's synced
      // The next poll will pick it up as a real message
      setMessages(prev => prev.filter(m => m.id !== optimisticId));

    } catch (err: any) {
      const isTimeout = err.name === 'AbortError';
      const errMsg = isTimeout ? 'Transmission timed out. File may be too large.' : err.message;
      alert(`[Secure Link Error]: ${errMsg}`);
      setMessages(prev => prev.filter(m => m.id !== optimisticId));
      if (localUrl) URL.revokeObjectURL(localUrl);
    } finally {
      setSendingReply(false);
    }
  };

  // Helper to parse attachments
  const parseAttachment = (content: string) => {
    if (content.startsWith('[ATTACHMENT:')) {
      try {
        const endIdx = content.indexOf(']');
        const jsonStr = content.substring(12, endIdx);
        const data = JSON.parse(jsonStr);
        const text = content.substring(endIdx + 1).trim();
        return { ...data, text };
      } catch { return null; }
    }
    return null;
  };

  // Render real messages from support_messages table
  const renderChatMessages = () => {
    const hasAgentMsg = messages.some(m => m.sender_type === 'agent');
    return (
      <>
        {messages.map((msg) => {
          const att = parseAttachment(msg.content);
          const isUser = msg.sender_type === 'user';
          
          return (
            <div key={msg.id} style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', gap: '10px', marginBottom: '16px' }}>
              {!isUser && (
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                  <img src="/o_director.jpg" alt="Agent" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}
              <div style={{ maxWidth: '85%' }}>
                {!isUser && <p style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>{msg.agent_name || 'Support Agent'} · Verlyn Support</p>}
                
                <div style={{ 
                  background: isUser ? '#4f46e5' : 'rgba(255,255,255,0.04)', 
                  border: isUser ? 'none' : '1px solid rgba(255,255,255,0.08)', 
                  borderRadius: isUser ? '16px 16px 4px 16px' : '4px 16px 16px 16px', 
                  padding: '12px 16px',
                  overflow: 'hidden',
                  position: 'relative'
                }}>
                  {att && (
                    <div style={{ marginBottom: att.text ? '12px' : '0', position: 'relative' }}>
                      {att.type?.startsWith('image/') ? (
                        <div style={{ position: 'relative' }}>
                          <a href={att.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <img 
                              src={att.url} 
                              alt={att.name} 
                              style={{ 
                                maxWidth: '280px',
                                maxHeight: '320px',
                                width: 'auto',
                                height: 'auto',
                                borderRadius: '12px', 
                                display: 'block',
                                opacity: att.is_uploading ? 0.5 : 1,
                                filter: att.is_uploading ? 'blur(4px)' : 'none',
                                transition: 'all 0.4s ease',
                                objectFit: 'contain'
                              }} 
                            />
                          </a>
                          {att.is_uploading && (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px' }}>
                               <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.7)', padding: '6px 12px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)' }}>
                                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} style={{ width: '12px', height: '12px', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#fff', borderRadius: '50%' }} />
                                  <span style={{ fontSize: '10px', color: '#fff', fontWeight: 700, letterSpacing: '0.05em' }}>SYNCING...</span>
                               </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <a href={att.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', color: '#fff', textDecoration: 'none', fontSize: '12px', opacity: att.is_uploading ? 0.6 : 1 }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
                          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name} {att.is_uploading ? '(Syncing...)' : ''}</span>
                        </a>
                      )}
                    </div>
                  )}
                  {(!att || att.text) && (
                    <p style={{ fontSize: '13px', color: '#fff', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                      {att ? att.text : msg.content}
                    </p>
                  )}
                </div>
                
                <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', textAlign: isUser ? 'right' : 'left', marginTop: '4px' }}>
                  {isUser ? 'You' : ''} · {new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: 'numeric', timeZone: 'Asia/Kolkata' }).format(new Date(msg.created_at))}
                </p>
              </div>
            </div>
          );
        })}
        {/* State Machine Rendering */}
        {chatInitState === 'ready' && !hasAgentMsg && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', textAlign: 'center', background: 'rgba(255,255,255,0.01)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.05)', marginTop: '20px' }}>
            <div style={{ position: 'relative', marginBottom: '16px' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 30px rgba(255,255,255,0.1)' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" /><path d="M12 16v-4m0-4h.01" /></svg>
              </div>
              <motion.div animate={{ y: [0, -3, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} style={{ position: 'absolute', bottom: '-4px', right: '-4px', background: '#0a0a0a', borderRadius: '50%', padding: '4px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              </motion.div>
            </div>
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '6px' }}>Session Secured</p>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5, maxWidth: '240px' }}>An admin will be assigned shortly and join the chat. The channel will unlock when they arrive.</p>
          </motion.div>
        )}

        {chatInitState === 'error' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', textAlign: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </div>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>Handshake Failed</p>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5, maxWidth: '260px' }}>{initError || 'Failed to establish secure communications link.'}</p>
            </div>
            
            {/* Diagnostics details */}
            <div style={{ width: '100%', maxHeight: '100px', overflowY: 'auto', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '8px', textAlign: 'left', fontFamily: 'monospace', fontSize: '9px', color: 'rgba(255,255,255,0.4)' }} className="scrollbar-hide">
              {logs.map((log, idx) => <div key={idx}>{log}</div>)}
            </div>

            <button 
              type="button"
              onClick={() => {
                setView('menu');
                setTimeout(() => setView('chat'), 50);
              }}
              style={{ background: '#fff', color: '#000', border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}
            >
              Retry Secure Link
            </button>
          </motion.div>
        )}

        {chatInitState !== 'ready' && chatInitState !== 'error' && chatInitState !== 'idle' && (
          <div style={{ display: 'flex', flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px', padding: '40px' }}>
            <motion.div 
              animate={{ rotate: 360 }} 
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} 
              style={{ width: '32px', height: '32px', border: '1.5px solid rgba(255,255,255,0.05)', borderTopColor: '#fff', borderRadius: '50%' }} 
            />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '10px', color: '#fff', fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                {chatInitState === 'verifying_auth' ? 'Verifying Auth' : chatInitState === 'loading_ticket' ? 'Validating Case' : 'Decrypting Signal'}
              </span>
              <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)', fontWeight: 500, letterSpacing: '0.05em' }}>
                {chatInitState === 'verifying_auth' ? 'HANDSHAKING USER ENTRIES...' : chatInitState === 'loading_ticket' ? 'CHECKING DEVICE PROTOCOLS...' : 'STABILIZING SECURE CHANNEL...'}
              </span>
            </div>
          </div>
        )}
      </>
    );
  };

  const inpStyles = {
    width: '100%', padding: '14px 16px',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px', color: '#fff', fontSize: '13px',
    outline: 'none', marginBottom: '16px',
    transition: 'all 0.2s ease',
  };

  const lblStyles = {
    display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.6)',
    marginBottom: '8px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' as const
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px', zIndex: 999999,
      background: 'rgba(5,5,5,0.9)', backdropFilter: 'blur(12px)',
      overflow: 'hidden',
    }} onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        style={{
          width: '100%', maxWidth: '440px',
          height: 'min(90dvh, 820px)',
          background: '#0a0a0a',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '20px',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 32px 80px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.05)',
          position: 'relative',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', position: 'relative', zIndex: 10,
          background: 'rgba(10,10,10,0.95)', backdropFilter: 'blur(10px)'
        }}>
          {view !== 'menu' ? (
            <button onClick={() => setView('menu')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: '4px', display: 'flex', transition: 'color 0.2s' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
            </button>
          ) : (
            <div style={{ width: 28 }} />
          )}

          <h2 style={{ flex: 1, textAlign: 'center', fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
            {view === 'menu' ? 'Verlyn Support' : view === 'form' ? 'New Case' : view === 'faq' ? 'Knowledge Base' :
             (chatTicket && ['Resolved','Completed','Closed'].includes(chatTicket.status)) || (activeTicket && ['Resolved','Completed','Closed'].includes(activeTicket.status))
               ? 'Case Closed' : 'Active Case'}
          </h2>

          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: '4px', display: 'flex', transition: 'color 0.2s' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Content Area */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, position: 'relative', zIndex: 10, overflow: view === 'chat' ? 'hidden' : 'auto' }} className={view !== 'chat' ? 'scrollbar-hide' : ''}>
          <AnimatePresence mode="wait">

            {/* ── MENU VIEW ── */}
            {view === 'menu' && (
              <motion.div key="menu" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} style={{ padding: '24px' }}>

                {/* Hero header */}
                <div style={{ textAlign: 'center', marginBottom: '28px', marginTop: '4px' }}>
                  {/* Headset icon — clean, human, meaningful */}
                  <div style={{ position: 'relative', width: '62px', height: '62px', margin: '0 auto 16px', borderRadius: '18px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 18v-6a9 9 0 0 1 18 0v6"/>
                      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
                    </svg>
                    <div style={{ position: 'absolute', top: '-3px', right: '-3px', width: '12px', height: '12px', borderRadius: '50%', background: '#10b981', border: '2px solid #0a0a0a', boxShadow: '0 0 8px rgba(16,185,129,0.9)' }} />
                  </div>
                  <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', marginBottom: '8px' }}>We&apos;re here for you</h3>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.38)', lineHeight: 1.6, maxWidth: '220px', margin: '0 auto' }}>Real agents · Encrypted channel · Under 2h response</p>
                </div>

                {/* Action buttons */}
                <div style={{ display: 'grid', gap: '10px', marginBottom: '24px' }}>
                  {[
                    { label: 'Help Center & Guides', sub: 'Search documentation, interface tutorials, and general platform guidelines.', tag: 'Instant', tagColor: '#6366f1', icon: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>, iconBg: 'rgba(99,102,241,0.12)', iconBorder: 'rgba(99,102,241,0.25)', action: () => window.location.href = '/help', border: 'rgba(255,255,255,0.07)' },
                    { label: 'Contact Concierge', sub: 'Submit a support request', tag: '< 2h', tagColor: '#3b82f6', icon: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>, iconBg: 'rgba(59,130,246,0.12)', iconBorder: 'rgba(59,130,246,0.25)', action: () => { setReportType('general'); setView('form'); }, border: 'rgba(255,255,255,0.07)' },
                    { label: 'Registration Help', sub: 'Get help with access & signup', tag: 'Priority', tagColor: '#10b981', icon: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5c-1.1 0-2 .9-2 2v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>, iconBg: 'rgba(16,185,129,0.12)', iconBorder: 'rgba(16,185,129,0.25)', action: () => { setReportType('registration'); setView('form'); }, border: 'rgba(255,255,255,0.07)' },
                  ].map((item, i) => (
                    <motion.button key={i} onClick={item.action}
                      whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', background: 'rgba(255,255,255,0.025)', border: `1px solid ${item.border}`, borderRadius: '14px', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ width: '42px', height: '42px', borderRadius: '11px', background: item.iconBg, border: `1px solid ${item.iconBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{item.icon}</div>
                        <div>
                          <p style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginBottom: '3px', letterSpacing: '-0.01em' }}>{item.label}</p>
                          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.38)' }}>{item.sub}</p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 700, color: item.tagColor, background: `${item.tagColor}18`, padding: '3px 8px', borderRadius: '6px', letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>{item.tag}</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                      </div>
                    </motion.button>
                  ))}

                  {/* Emergency — special styling */}
                  <motion.button onClick={() => { setReportType('emergency'); setView('form'); }}
                    whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.22)', borderRadius: '14px', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ width: '42px', height: '42px', borderRadius: '11px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                      </div>
                      <div>
                        <p style={{ fontSize: '14px', fontWeight: 800, color: '#ef4444', marginBottom: '3px', letterSpacing: '-0.01em' }}>Emergency Protocol</p>
                        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Strict policy applies · Immediate action</p>
                      </div>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(239,68,68,0.4)" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                  </motion.button>


                </div>

                {tickets.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', paddingLeft: '2px' }}>
                      <h4 style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Your Cases</h4>
                      <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace' }}>{tickets.length} record{tickets.length > 1 ? 's' : ''}</span>
                    </div>
                    <div style={{ display: 'grid', gap: '8px' }}>
                      {tickets.map((t) => {
                        const isActive = !['Resolved', 'Completed', 'Closed'].includes(t.status);
                        const statusColor = isActive ? '#10b981' : 'rgba(255,255,255,0.25)';
                        return (
                          <motion.div key={t.case_id} onClick={() => { setChatTicket(t); setView('chat'); }}
                            whileHover={{ scale: 1.01, borderColor: isActive ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.12)' }}
                            style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', background: isActive ? 'rgba(16,185,129,0.04)' : 'rgba(255,255,255,0.015)', borderRadius: '12px', border: isActive ? '1px solid rgba(16,185,129,0.15)' : '1px solid rgba(255,255,255,0.06)', transition: 'all 0.2s' }}>
                            <div style={{ position: 'relative', flexShrink: 0 }}>
                              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: statusColor, boxShadow: isActive ? `0 0 10px ${statusColor}` : 'none' }} />
                              {isActive && <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: statusColor, opacity: 0.4, animation: 'ping 2s cubic-bezier(0,0,0.2,1) infinite' }} />}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: '13px', fontWeight: 600, color: isActive ? '#fff' : 'rgba(255,255,255,0.45)', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.subject}</p>
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <span style={{ fontSize: '10px', fontWeight: 700, color: isActive ? '#10b981' : 'rgba(255,255,255,0.25)', background: isActive ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.04)', padding: '2px 7px', borderRadius: '5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t.status}</span>
                                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace', letterSpacing: '0.03em' }}>{t.case_id.split('-').slice(1).join('-')}</span>
                              </div>
                            </div>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={isActive ? 'rgba(16,185,129,0.5)' : 'rgba(255,255,255,0.15)'} strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Case Lookup */}
                <div style={{ marginBottom: '20px' }}>
                  {!showLookup ? (
                    <button onClick={() => setShowLookup(true)}
                      style={{ width: '100%', padding: '13px', background: 'transparent', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '12px', color: 'rgba(255,255,255,0.38)', fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s', letterSpacing: '0.03em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.38)'; }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                      Recover existing case by ID
                    </button>
                  ) : (
                    <form onSubmit={handleLookupCase} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '18px' }}>
                      <p style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Enter Case ID</p>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input autoFocus value={lookupCaseId} onChange={e => { setLookupCaseId(e.target.value); setLookupError(''); }}
                          placeholder="CASE-XXXXXXXX-XXXX"
                          style={{ flex: 1, padding: '11px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '9px', color: '#fff', fontSize: '12px', fontFamily: 'monospace', outline: 'none', letterSpacing: '0.05em' }}
                        />
                        <button type="submit" disabled={lookupLoading || !lookupCaseId.trim()}
                          style={{ padding: '11px 16px', background: '#fff', color: '#000', border: 'none', borderRadius: '9px', fontSize: '12px', fontWeight: 800, cursor: 'pointer', opacity: lookupLoading || !lookupCaseId.trim() ? 0.5 : 1 }}>
                          {lookupLoading ? '…' : 'Find'}
                        </button>
                      </div>
                      {lookupError && <p style={{ fontSize: '11px', color: '#ef4444', marginTop: '8px' }}>{lookupError}</p>}
                      <button type="button" onClick={() => { setShowLookup(false); setLookupCaseId(''); setLookupError(''); }}
                        style={{ marginTop: '10px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: '11px', cursor: 'pointer', padding: '0' }}>Cancel</button>
                    </form>
                  )}
                </div>

                {/* Trust strip */}
                <div style={{ display: 'flex', gap: '0', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px', justifyContent: 'space-around' }}>
                  {[
                    { label: 'E2E Encrypted', icon: <IconLock color="rgba(255,255,255,0.5)" size={16} /> },
                    { label: 'Sub-2h Response', icon: <IconZap color="rgba(255,255,255,0.5)" size={16} /> },
                    { label: 'Zero-Log Policy', icon: <IconShield color="rgba(255,255,255,0.5)" size={16} /> },
                  ].map((t, i) => (
                    <div key={i} style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '6px' }}>{t.icon}</div>
                      <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.28)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t.label}</p>
                    </div>
                  ))}
                </div>

              </motion.div>
            )}

            {/* ── FAQ VIEW ── */}
            {view === 'faq' && (
              <motion.div key="faq" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} style={{ padding: '24px' }}>
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type="text" 
                      value={faqSearch} 
                      onChange={e => setFaqSearch(e.target.value)} 
                      placeholder="Search knowledge base..." 
                      style={{ ...inpStyles, paddingLeft: '44px', marginBottom: 0 }} 
                    />
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  </div>
                </div>

                <div style={{ display: 'grid', gap: '10px' }}>
                  {FAQS.filter(f => f.q.toLowerCase().includes(faqSearch.toLowerCase()) || f.a.toLowerCase().includes(faqSearch.toLowerCase())).map((faq, i) => (
                    <div key={i} style={{
                      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: '12px', overflow: 'hidden'
                    }}>
                      <button
                        onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                        style={{ width: '100%', padding: '18px 20px', background: 'none', border: 'none', color: '#fff', textAlign: 'left', fontSize: '13.5px', fontWeight: 500, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', lineHeight: 1.4 }}
                      >
                        {faq.q}
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" style={{ transform: activeFaq === i ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }}><path d="M6 9l6 6 6-6" /></svg>
                      </button>
                      <AnimatePresence>
                        {activeFaq === i && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                            <p style={{ padding: '0 20px 20px', fontSize: '13px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>{faq.a}</p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: '40px', textAlign: 'center', padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <p style={{ fontSize: '13px', color: '#fff', marginBottom: '6px', fontWeight: 500 }}>Unresolved Issue?</p>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '16px' }}>Our team is ready to assist you directly.</p>
                  <button onClick={() => setView('form')} style={{ background: '#fff', color: '#000', padding: '14px 28px', borderRadius: '10px', fontSize: '12px', fontWeight: 800, cursor: 'pointer', border: 'none', textTransform: 'uppercase', letterSpacing: '0.1em', boxShadow: '0 10px 30px rgba(255,255,255,0.1)' }}>Create Ticket</button>
                </div>
              </motion.div>
            )}

            {/* ── FORM VIEW ── */}
            {view === 'form' && (
              <motion.form key="form" onSubmit={handleSubmit} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} style={{ padding: '24px' }}>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={lblStyles}>Full Name</label>
                    <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required style={inpStyles} placeholder="Legal Name" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={lblStyles}>Email Address</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={inpStyles} placeholder={reportType === 'registration' ? 'Valid Email Address' : 'Registered Email'} />
                  </div>
                </div>

                <label style={lblStyles}>Inquiry Category</label>
                <div style={{ position: 'relative', marginBottom: reportType === 'customize' ? '12px' : '16px' }}>
                  <select value={reportType} onChange={e => setReportType(e.target.value)} style={{ ...inpStyles, appearance: 'none', cursor: 'pointer', paddingRight: '40px', marginBottom: 0 }}>
                    <option value="general" style={{ background: '#0a0a0a', color: '#fff' }}>General Inquiry</option>
                    <option value="tech" style={{ background: '#0a0a0a', color: '#fff' }}>Technical Support</option>
                    <option value="security" style={{ background: '#0a0a0a', color: '#fff' }}>Security & Privacy</option>
                    <option value="account" style={{ background: '#0a0a0a', color: '#fff' }}>Account Access</option>
                    <option value="billing" style={{ background: '#0a0a0a', color: '#fff' }}>Payment & Billing</option>
                    <option value="bug" style={{ background: '#0a0a0a', color: '#fff' }}>Bug Report</option>
                    <option value="legal" style={{ background: '#0a0a0a', color: '#fff' }}>Legal & Compliance</option>
                    <option value="partnership" style={{ background: '#0a0a0a', color: '#fff' }}>Partnership Inquiry</option>
                    <option value="suggestion" style={{ background: '#0a0a0a', color: '#fff' }}>Feature Suggestion</option>
                    <option value="customize" style={{ background: '#0a0a0a', color: '#fff' }}>Customize Inquiry</option>
                    <option value="registration" style={{ background: '#0a0a0a', color: '#fff' }}>Problem in Registration</option>
                    <option value="emergency" style={{ background: '#260000', color: '#ef4444', fontWeight: 'bold' }}>[EMERGENCY SUPPORT]</option>
                  </select>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}><path d="M6 9l6 6 6-6" /></svg>
                </div>

                <AnimatePresence>
                  {reportType === 'emergency' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden', marginBottom: '16px' }}>
                      <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px' }}>
                        <p style={{ color: '#ef4444', fontSize: '12px', fontWeight: 800, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '0.05em' }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                          STRICT USAGE POLICY
                        </p>
                        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11.5px', lineHeight: 1.5 }}>
                          Emergency support grants immediate access to our concierge team. If this feature is used for unnecessary reasons, you will be <b>blocked from contacting support for 48 hours</b> and your email will be <b>flagged for 7 days</b>.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {reportType === 'customize' && (
                  <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '16px' }}>
                    <input
                      type="text"
                      value={customReportType}
                      onChange={e => setCustomReportType(e.target.value)}
                      placeholder="Specify your custom inquiry type..."
                      required
                      style={{ ...inpStyles, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.2)' }}
                    />
                  </motion.div>
                )}

                <AnimatePresence>
                  {reportType === 'registration' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden', marginBottom: '16px' }}>
                      <div style={{ padding: '16px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '12px' }}>
                        <p style={{ color: '#10b981', fontSize: '12px', fontWeight: 800, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '0.05em' }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                          INSTANT REGISTRATION HELP
                        </p>
                        <div style={{ display: 'grid', gap: '8px' }}>
                          {[
                            { q: "Didn't receive OTP?", a: "Check spam or wait 2 mins. Do not submit multiple requests." },
                            { q: "Email already taken?", a: "You may have already registered. Try searching for 'Verlyn' in your inbox." },
                            { q: "Referral code error?", a: "Ensure you are using a valid, case-sensitive invite code." }
                          ].map((item, i) => (
                            <div key={i} style={{ padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                              <p style={{ fontSize: '12px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>{item.q}</p>
                              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>{item.a}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <label style={lblStyles}>Subject <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>({SUBJECT_MIN} words min)</span></label>
                <input type="text" value={subject} onChange={e => setSubject(e.target.value)} required style={{ ...inpStyles, borderColor: subject.length > 0 && subjectWords < SUBJECT_MIN ? 'rgba(239,68,68,0.5)' : subject.length > 0 && subjectWords >= SUBJECT_MIN ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)' }} placeholder="Brief description of the request..." />

                <label style={lblStyles}>Detailed Description <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>({DESC_MIN} words min)</span></label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} required style={{ ...inpStyles, minHeight: '120px', resize: 'vertical', borderColor: description.length > 0 && descWords < DESC_MIN ? 'rgba(239,68,68,0.5)' : description.length > 0 && descWords >= DESC_MIN ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)' }} placeholder="Provide comprehensive details regarding your inquiry. This ensures our concierge team can assist you efficiently..." />

                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginTop: '12px', cursor: 'pointer', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} style={{ marginTop: '2px', accentColor: '#fff', width: '16px', height: '16px', flexShrink: 0 }} />
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
                    I authorize Verlyn to securely process this data for support purposes according to the Privacy Policy.
                  </span>
                </label>

                <div style={{ position: 'relative' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px', cursor: 'pointer', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <input type="checkbox" checked={notifyAgreed} onChange={e => {
                      setNotifyAgreed(e.target.checked);
                      if (e.target.checked) setShowNotifyReason(true);
                    }} style={{ accentColor: '#fff', width: '16px', height: '16px', flexShrink: 0 }} />
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>Enable browser notifications for agent responses.</span>
                  </label>

                  <AnimatePresence>
                    {showNotifyReason && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                        style={{ position: 'absolute', bottom: '110%', left: 0, right: 0, zIndex: 10, background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', padding: '16px', borderRadius: '12px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
                        <p style={{ fontSize: '12px', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>Why enable notifications?</p>
                        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5, marginBottom: '12px' }}>
                          We value your time. Enabling notifications allows us to alert you the moment an agent joins your session or replies to your inquiry, so you don't have to keep the window open.
                        </p>
                        <button type="button" onClick={() => {
                          setShowNotifyReason(false);
                          if ('Notification' in window) Notification.requestPermission();
                        }} style={{ background: '#fff', color: '#000', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '10px', fontWeight: 700, cursor: 'pointer' }}>GOT IT</button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {error && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '16px', textAlign: 'center', background: 'rgba(239,68,68,0.1)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)' }}>{error}</p>}

                <button type="submit" disabled={loading} style={{
                  width: '100%', padding: '18px', borderRadius: '12px', marginTop: '24px',
                  background: loading ? 'rgba(255,255,255,0.2)' : '#fff',
                  color: '#000', fontSize: '14px', fontWeight: 800, border: 'none', cursor: loading ? 'wait' : 'pointer',
                  textTransform: 'uppercase', letterSpacing: '0.1em', transition: 'all 0.3s ease',
                  boxShadow: '0 10px 40px rgba(255,255,255,0.15)'
                }}>
                  {loading ? 'Transmitting...' : 'Submit Request'}
                </button>
              </motion.form>
            )}

            {/* ── TRACKING VIEW ── */}
            {view === 'tracking' && (
              <motion.div key="tracking" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} style={{ padding: '24px' }}>
                {!activeTicket ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    </div>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>No Active Session</p>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5, marginBottom: '24px' }}>We couldn't find an active case in your local storage. If you have a Case ID, you can recover it below.</p>
                    <form onSubmit={handleLookupCase} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '18px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div>
                        <p style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Case ID</p>
                        <input autoFocus value={lookupCaseId} onChange={e => { setLookupCaseId(e.target.value); setLookupError(''); }}
                          placeholder="CASE-XXXXXXXX-XXXX"
                          style={{ width: '100%', padding: '11px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '9px', color: '#fff', fontSize: '12px', fontFamily: 'monospace', outline: 'none', letterSpacing: '0.05em' }}
                        />
                      </div>
                      <div>
                        <p style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Registered Email</p>
                        <input type="email" value={lookupEmail} onChange={e => { setLookupEmail(e.target.value); setLookupError(''); }}
                          placeholder="Your email address"
                          style={{ width: '100%', padding: '11px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '9px', color: '#fff', fontSize: '12px', outline: 'none' }}
                        />
                      </div>
                      
                      <button type="submit" disabled={lookupLoading || !lookupCaseId.trim() || !lookupEmail.trim()}
                        style={{ width: '100%', padding: '12px', background: '#fff', color: '#000', border: 'none', borderRadius: '9px', fontSize: '12px', fontWeight: 800, cursor: 'pointer', opacity: lookupLoading || !lookupCaseId.trim() || !lookupEmail.trim() ? 0.5 : 1 }}>
                        {lookupLoading ? 'Verifying Credentials…' : 'Find Session'}
                      </button>
                      
                      {lookupError && <p style={{ fontSize: '11px', color: '#ef4444', marginTop: '4px' }}>{lookupError}</p>}
                    </form>
                  </div>
                ) : (
                  <>
                    <div style={{ textAlign: 'center', marginBottom: '32px', marginTop: '10px' }}>
                      <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 8px 30px rgba(255,255,255,0.15)' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                      </div>
                      <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#fff', marginBottom: '6px' }}>{activeTicket.subject}</h3>
                      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>{activeTicket.case_id}</p>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)', padding: '24px', marginBottom: '24px' }}>
                      <h4 style={{ fontSize: '10px', fontWeight: 800, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '28px' }}>Security & Transmission Timeline</h4>
                      <div style={{ position: 'relative', paddingLeft: '28px' }}>
                        <div style={{ position: 'absolute', left: '7px', top: '10px', bottom: '24px', width: '2px', background: 'rgba(255,255,255,0.06)' }} />

                        {[
                          { l: 'Request Logged', s: 'Secure entry received', active: true, time: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' }).format(new Date(activeTicket.date_filed)) },
                          { l: 'Encryption Verified', s: 'End-to-end handshake complete', active: true },
                          { l: 'Agent Assigned', s: 'Concierge reviewer assigned', active: activeTicket.status !== 'Received' },
                          { l: 'Final Resolution', s: 'Case completion reached', active: ['Resolved','Completed','Closed'].includes(activeTicket.status) },
                        ].map((step, i) => (
                          <div key={i} style={{ position: 'relative', marginBottom: i < 3 ? '28px' : '0', opacity: step.active ? 1 : 0.25 }}>
                            <div style={{ 
                              position: 'absolute', left: '-27px', top: '3px', width: '12px', height: '12px', borderRadius: '50%', 
                              background: step.active ? (i === 3 ? '#10b981' : '#fff') : 'rgba(255,255,255,0.1)', 
                              boxShadow: step.active ? `0 0 12px ${i === 3 ? 'rgba(16,185,129,0.5)' : 'rgba(255,255,255,0.3)'}` : 'none',
                              zIndex: 2, border: '3px solid #0a0a0a' 
                            }} />
                            <div>
                              <p style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: '4px', letterSpacing: '-0.01em' }}>{step.l}</p>
                              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{step.time ? step.time : step.s}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button onClick={() => { setChatTicket(activeTicket); setView('chat'); }}
                      style={{
                        width: '100%', padding: '18px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                        background: '#fff', color: '#000', fontSize: '14px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', transition: 'all 0.3s ease',
                        boxShadow: '0 10px 40px rgba(255,255,255,0.15)'
                      }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                      View Communications
                    </button>
                  </>
                )}
              </motion.div>
            )}

            {/* ── CHAT VIEW ── */}
            {view === 'chat' && (
              <motion.div key="chat" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>

                {!chatTicket ? (
                   <div style={{ textAlign: 'center', padding: '60px 24px' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                    </div>
                    <p style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>Session Expired</p>
                    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, marginBottom: '24px' }}>This encrypted channel is no longer active in your current browser session. Please use your Case ID to recover it.</p>
                    <button onClick={() => setView('menu')} style={{ background: '#fff', color: '#000', border: 'none', padding: '12px 24px', borderRadius: '10px', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}>Return to Menu</button>
                  </div>
                ) : (
                  <>
                    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '24px', paddingBottom: '16px' }} className="scrollbar-hide" ref={chatScrollRef}>

                      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', background: chatTicket.status === 'Paused' ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.04)', border: `1px solid ${chatTicket.status === 'Paused' ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.08)'}`, borderRadius: '20px', marginBottom: '16px' }}>
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: chatTicket.status === 'Paused' ? '#f59e0b' : '#10b981', boxShadow: `0 0 8px ${chatTicket.status === 'Paused' ? '#f59e0b' : '#10b981'}` }} />
                          <span style={{ fontSize: '10px', fontWeight: 700, color: '#fff', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{chatTicket.status === 'Paused' ? 'Channel Paused' : 'Secure Channel Active'}</span>
                        </div>
                        <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '4px', letterSpacing: '-0.01em' }}>{chatTicket.subject}</h3>
                        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>Case ID: {chatTicket.case_id.split('-').slice(1).join('-')}</p>
                      </div>

                      {renderChatMessages()}

                    </div>

                    {/* Reply Form */}
                    <div style={{ padding: '0 24px 24px 24px' }}>
                      {['Resolved', 'Completed', 'Closed'].includes(chatTicket.status) ? (
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                          style={{ textAlign: 'center', padding: '20px 16px', background: 'rgba(16,185,129,0.05)', borderRadius: '14px', border: '1px solid rgba(16,185,129,0.2)' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                          </div>
                          <p style={{ fontSize: '13px', fontWeight: 600, color: '#10b981', marginBottom: '6px' }}>Case {chatTicket.status}</p>
                          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>This case has been closed by our team. If you need further assistance, please open a new request.</p>
                        </motion.div>
                      ) : chatTicket.status === 'Paused' ? (
                        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
                          style={{ textAlign: 'center', padding: '16px', background: 'rgba(245,158,11,0.05)', borderRadius: '14px', border: '1px solid rgba(245,158,11,0.2)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b', boxShadow: '0 0 10px #f59e0b' }} />
                          <p style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 600, letterSpacing: '0.02em' }}>CHANNEL PAUSED BY ADMIN</p>
                        </motion.div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {selectedFile && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', width: 'fit-content' }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
                              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>{selectedFile.name}</span>
                              <button onClick={() => setSelectedFile(null)} style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', padding: '2px', display: 'flex' }}>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12" /></svg>
                              </button>
                            </div>
                          )}
                          <form onSubmit={handleUserReply} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', padding: '8px', gap: '8px', opacity: chatInitState !== 'ready' ? 0.5 : 1 }}>
                            <input
                              type="file"
                              ref={fileInputRef}
                              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                              style={{ display: 'none' }}
                              disabled={chatInitState !== 'ready'}
                            />
                            <button type="button" disabled={chatInitState !== 'ready'} onClick={() => fileInputRef.current?.click()} style={{ background: 'none', border: 'none', color: selectedFile ? '#fff' : 'rgba(255,255,255,0.4)', cursor: chatInitState !== 'ready' ? 'not-allowed' : 'pointer', padding: '6px', display: 'flex', alignItems: 'center', transition: 'all 0.2s' }}>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
                            </button>
                            <input
                              type="text"
                              value={userReplyText}
                              onChange={(e) => setUserReplyText(e.target.value)}
                              disabled={sendingReply || chatInitState !== 'ready'}
                              placeholder={chatInitState !== 'ready' ? "Initializing secure link..." : "Type your message..."}
                              style={{ flex: 1, background: 'none', border: 'none', color: '#fff', fontSize: '13px', outline: 'none', padding: '8px 4px', cursor: chatInitState !== 'ready' ? 'not-allowed' : 'text' }}
                            />
                            <button type="submit" disabled={sendingReply || chatInitState !== 'ready' || (!userReplyText.trim() && !selectedFile)} style={{ width: '36px', height: '36px', borderRadius: '10px', background: (userReplyText.trim() || selectedFile) && chatInitState === 'ready' ? '#fff' : 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: (userReplyText.trim() || selectedFile) && chatInitState === 'ready' ? 'pointer' : 'not-allowed', transition: 'background 0.2s' }}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={(userReplyText.trim() || selectedFile) && chatInitState === 'ready' ? '#000' : 'rgba(255,255,255,0.3)'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                            </button>
                          </form>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </motion.div>
            )}



          </AnimatePresence>
        </div>
      </motion.div>
      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes ping { 75%, 100% { transform: scale(2.2); opacity: 0; } }
        @keyframes vrlPulse { 0%,100%{opacity:0.6;transform:scale(1)} 50%{opacity:1;transform:scale(1.08)} }
      `}</style>
    </div>
  );
}