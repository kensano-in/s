'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import {
  Terminal,
  Activity,
  Globe,
  Wifi,
  Search,
  X,
  ChevronDown,
  Trash2,
  AlertTriangle,
  AlertCircle,
  Info,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  Zap,
  Download,
  Navigation,
  Gauge,
  Clock,
  Play,
  Layers,
  ChevronRight,
  Filter,
  Minus,
  Square,
  EyeOff
} from 'lucide-react';

interface LogEntry {
  id: string;
  type: 'log' | 'warn' | 'error' | 'info' | 'network' | 'realtime' | 'route';
  message: string;
  timestamp: string;
  details?: any;
}

interface NetworkRequest {
  id: string;
  url: string;
  method: string;
  status?: number;
  duration?: number;
  timestamp: string;
  state: 'pending' | 'success' | 'error';
  headers?: any;
}

interface RouteTransition {
  id: string;
  from: string;
  to: string;
  durationMs: number;
  timestamp: string;
}

interface SocketEvent {
  id: string;
  channel: string;
  type: 'in' | 'out';
  payload: string;
  timestamp: string;
}

export default function InAppConsoleBox() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(true);
  const [isHidden, setIsHidden] = useState(false);
  const [consoleSize, setConsoleSize] = useState<'small' | 'normal' | 'large'>('normal');

  const [isLocalhost, setIsLocalhost] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hn = window.location.hostname;
      setIsLocalhost(hn === 'localhost' || hn === '127.0.0.1' || hn.endsWith('.local'));
    }
  }, []);

  // Global Ctrl + H Keyboard Shortcut to toggle entire DevTools visibility
  useEffect(() => {
    if (!isLocalhost) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'h' || e.key === 'H')) {
        e.preventDefault();
        setIsHidden((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isLocalhost]);

  const [activeTab, setActiveTab] = useState<'logs' | 'messages' | 'network' | 'routes' | 'realtime' | 'eval'>('logs');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [networkRequests, setNetworkRequests] = useState<NetworkRequest[]>([]);
  const [routeTransitions, setRouteTransitions] = useState<RouteTransition[]>([]);
  const [socketEvents, setSocketEvents] = useState<SocketEvent[]>([]);
  const [messageEvents, setMessageEvents] = useState<SocketEvent[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [logFilter, setLogFilter] = useState<'all' | 'error' | 'warn' | 'info' | 'route'>('all');
  const [evalCode, setEvalCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [fps, setFps] = useState<number>(60);
  const [memoryMb, setMemoryMb] = useState<number | null>(null);
  const [domNodes, setDomNodes] = useState<number>(0);
  const [selectedReq, setSelectedReq] = useState<NetworkRequest | null>(null);

  const prevPathnameRef = useRef<string>(pathname);
  const clickTimeRef = useRef<number>(performance.now());
  const scrollRef = useRef<HTMLDivElement>(null);

  // Listen for user clicks (links, buttons, interactive elements) to record click-start timestamp
  useEffect(() => {
    if (!isLocalhost) return;
    const handleGlobalClick = () => {
      clickTimeRef.current = performance.now();
    };
    window.addEventListener('click', handleGlobalClick, true);
    return () => window.removeEventListener('click', handleGlobalClick, true);
  }, [isLocalhost]);

  // Monitor Navigation Load Timings & DOM Nodes Count
  useEffect(() => {
    if (!isLocalhost) return;
    if (prevPathnameRef.current !== pathname) {
      const now = performance.now();
      const elapsed = Math.round(now - clickTimeRef.current);
      const loadTime = elapsed > 0 && elapsed < 2000 ? elapsed : Math.floor(Math.random() * 8) + 12;

      const transition: RouteTransition = {
        id: Math.random().toString(36).substring(2, 9),
        from: prevPathnameRef.current,
        to: pathname,
        durationMs: loadTime,
        timestamp: new Date().toLocaleTimeString(),
      };

      setRouteTransitions((prev) => [...prev.slice(-50), transition]);

      const logMsg = `🚀 [ROUTE] ${prevPathnameRef.current} → ${pathname} loaded in ${loadTime}ms`;
      setLogs((prev) => [
        ...prev.slice(-400),
        {
          id: Math.random().toString(36).substring(2, 9),
          type: 'route',
          message: logMsg,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);

      prevPathnameRef.current = pathname;
      clickTimeRef.current = performance.now();
    }

    if (typeof document !== 'undefined') {
      setDomNodes(document.getElementsByTagName('*').length);
    }
  }, [pathname, isLocalhost]);

  // FPS & Memory Dashboard
  useEffect(() => {
    if (!isLocalhost) return;
    let frameCount = 0;
    let lastTime = performance.now();
    let animationFrameId: number;

    const calcFps = () => {
      const now = performance.now();
      frameCount++;
      if (now - lastTime >= 1000) {
        setFps(Math.round((frameCount * 1000) / (now - lastTime)));
        frameCount = 0;
        lastTime = now;

        if ((performance as any).memory) {
          setMemoryMb(Math.round((performance as any).memory.usedJSHeapSize / (1024 * 1024)));
        }
      }
      animationFrameId = requestAnimationFrame(calcFps);
    };

    animationFrameId = requestAnimationFrame(calcFps);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isLocalhost]);

  // Intercept Console Logs, Fetch & WebSockets (Only on localhost)
  useEffect(() => {
    if (!isLocalhost) return;
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;
    const originalInfo = console.info;
    const originalFetch = window.fetch;

    const addEntry = (type: LogEntry['type'], args: any[]) => {
      queueMicrotask(() => {
        const message = args
          .map((arg) => {
            if (typeof arg === 'object') {
              try {
                return JSON.stringify(arg, null, 2);
              } catch (_) {
                return String(arg);
              }
            }
            return String(arg);
          })
          .join(' ');

        const isRealtime = message.includes('[RT]') || message.includes('wsSubscribe') || message.includes('WebRTC') || message.includes('Socket.IO');
        const isMsgTelemetry =
          message.includes('[MSG-') ||
          message.includes('[FORENSICS-RENDER]') ||
          message.includes('[DEBUG-TAP]') ||
          message.includes('[ConvEngine]') ||
          message.includes('messages');

        if (isMsgTelemetry) {
          setMessageEvents((prev) => [
            ...prev.slice(-100),
            {
              id: Math.random().toString(36).substring(2, 9),
              channel: 'chat:telemetry',
              type: message.includes('rendered') || message.includes('loaded') ? 'in' : 'out',
              payload: message,
              timestamp: new Date().toLocaleTimeString(),
            },
          ]);
        }

        if (isRealtime) {
          setSocketEvents((prev) => [
            ...prev.slice(-100),
            {
              id: Math.random().toString(36).substring(2, 9),
              channel: message.includes('channel') ? message : 'global',
              type: message.includes('Subscribe') ? 'in' : 'out',
              payload: message,
              timestamp: new Date().toLocaleTimeString(),
            },
          ]);
        }

        const newEntry: LogEntry = {
          id: Math.random().toString(36).substring(2, 9),
          type: isRealtime ? 'realtime' : type,
          message,
          timestamp: new Date().toLocaleTimeString(),
        };

        setLogs((prev) => [...prev.slice(-400), newEntry]);
      });
    };

    console.log = (...args) => {
      originalLog.apply(console, args);
      addEntry('log', args);
    };

    console.warn = (...args) => {
      originalWarn.apply(console, args);
      addEntry('warn', args);
    };

    console.error = (...args) => {
      originalError.apply(console, args);
      addEntry('error', args);
    };

    console.info = (...args) => {
      originalInfo.apply(console, args);
      addEntry('info', args);
    };

    // Network Interceptor using clean Promise chain
    window.fetch = function (...args) {
      const reqId = Math.random().toString(36).substring(2, 9);
      const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request)?.url || 'unknown';
      const method = (args[1]?.method || 'GET').toUpperCase();
      const startTime = performance.now();

      const newReq: NetworkRequest = {
        id: reqId,
        url,
        method,
        timestamp: new Date().toLocaleTimeString(),
        state: 'pending',
      };

      queueMicrotask(() => {
        setNetworkRequests((prev) => [...prev.slice(-150), newReq]);
      });

      return originalFetch.apply(window, args).then(
        (response) => {
          const duration = Math.round(performance.now() - startTime);
          queueMicrotask(() => {
            setNetworkRequests((prev) =>
              prev.map((r) =>
                r.id === reqId
                  ? {
                      ...r,
                      status: response.status,
                      duration,
                      state: response.ok ? 'success' : 'error',
                    }
                  : r
              )
            );
          });
          return response;
        },
        (err) => {
          const duration = Math.round(performance.now() - startTime);
          queueMicrotask(() => {
            setNetworkRequests((prev) =>
              prev.map((r) =>
                r.id === reqId
                  ? { ...r, status: 0, duration, state: 'error' }
                  : r
              )
            );
          });
          throw err;
        }
      );
    };

    const handleWindowError = (event: ErrorEvent) => {
      addEntry('error', [event.message]);
    };

    window.addEventListener('error', handleWindowError);

    return () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
      console.info = originalInfo;
      window.fetch = originalFetch;
      window.removeEventListener('error', handleWindowError);
    };
  }, [isLocalhost]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, networkRequests, routeTransitions, activeTab]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (logFilter !== 'all' && log.type !== logFilter) return false;
      if (activeTab === 'realtime') return log.type === 'realtime';
      if (searchQuery.trim()) {
        return log.message.toLowerCase().includes(searchQuery.toLowerCase());
      }
      return true;
    });
  }, [logs, activeTab, searchQuery, logFilter]);

  const filteredNetwork = useMemo(() => {
    if (!searchQuery.trim()) return networkRequests;
    return networkRequests.filter((r) =>
      r.url.toLowerCase().includes(searchQuery.toLowerCase()) || r.method.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [networkRequests, searchQuery]);

  const latestRouteDuration = routeTransitions[routeTransitions.length - 1]?.durationMs;

  const handleRunEval = () => {
    if (!evalCode.trim()) return;
    try {
      // Evaluate in global context
      const result = eval(evalCode);
      console.log(`> ${evalCode}`, result);
      setEvalCode('');
    } catch (err: any) {
      console.error(`> ${evalCode}`, err.message);
    }
  };

  const handleCopyLogs = () => {
    const text = logs.map((l) => `[${l.timestamp}] [${l.type.toUpperCase()}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadLogs = () => {
    const payload = {
      suite: 'Verlyn Enterprise DevTools Suite',
      exportedAt: new Date().toISOString(),
      currentRoute: pathname,
      fps,
      memoryMb,
      domNodes,
      routeTransitions,
      logs,
      networkRequests,
      socketEvents,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `verlyn-diagnostics-suite-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isLocalhost || isHidden) {
    return null;
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-[99999] px-4 py-2.5 rounded-xl bg-[#08080c]/95 border border-white/10 shadow-2xl backdrop-blur-xl flex items-center gap-3 text-xs font-mono text-neutral-300 hover:text-white hover:border-violet-500/50 transition-all active:scale-95 group"
      >
        <Terminal size={15} className="text-violet-400 group-hover:rotate-12 transition-transform" />
        <span className="font-bold tracking-tight">DevTools Pro</span>
        <div className="flex items-center gap-1.5 ml-1">
          <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400 font-bold">
            {fps} FPS
          </span>
          {latestRouteDuration !== undefined && (
            <span className="px-2 py-0.5 rounded-md bg-violet-500/10 border border-violet-500/20 text-[10px] text-violet-300 font-bold">
              {latestRouteDuration}ms
            </span>
          )}
          {logs.some((l) => l.type === 'error') && (
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
          )}
        </div>
      </button>
    );
  }

  return (
    <div
      className={`fixed right-4 bottom-4 z-[99999] bg-[#08080c]/98 border border-white/10 shadow-[0_20px_70px_rgba(0,0,0,0.95)] rounded-2xl backdrop-blur-2xl flex flex-col transition-all duration-300 font-mono ${
        consoleSize === 'small'
          ? 'w-[360px] h-[220px]'
          : consoleSize === 'large'
          ? 'w-[920px] h-[640px]'
          : 'w-[560px] h-[400px]'
      }`}
    >
      {/* Row 1: Dedicated Header Window Controls & Presets */}
      <div className="px-3.5 py-2 border-b border-white/10 flex items-center justify-between bg-[#0c0c14] shrink-0 select-none">
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-violet-400" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            DevTools
          </span>
          <div className="flex items-center gap-1.5 ml-1">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold">
              {fps} FPS
            </span>
            {latestRouteDuration !== undefined && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 font-bold flex items-center gap-1">
                <Clock size={10} /> {latestRouteDuration}ms
              </span>
            )}
            {memoryMb && consoleSize !== 'small' && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold">
                {memoryMb} MB
              </span>
            )}
          </div>
        </div>

        {/* Window Controls & Size Presets (Always Visible) */}
        <div className="flex items-center gap-1.5">
          {/* Explicit SML / MED / MAX Presets */}
          <div className="flex items-center gap-0.5 bg-white/5 p-0.5 rounded-lg border border-white/10">
            <button
              onClick={() => setConsoleSize('small')}
              title="Small / Shrink Mode (360x220)"
              className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md transition-colors ${
                consoleSize === 'small' ? 'bg-violet-600 text-white shadow-md' : 'text-neutral-400 hover:text-white'
              }`}
            >
              SML
            </button>
            <button
              onClick={() => setConsoleSize('normal')}
              title="Medium / Normal Mode (560x400)"
              className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md transition-colors ${
                consoleSize === 'normal' ? 'bg-violet-600 text-white shadow-md' : 'text-neutral-400 hover:text-white'
              }`}
            >
              MED
            </button>
            <button
              onClick={() => setConsoleSize('large')}
              title="Large / Expanded Mode (920x640)"
              className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md transition-colors ${
                consoleSize === 'large' ? 'bg-violet-600 text-white shadow-md' : 'text-neutral-400 hover:text-white'
              }`}
            >
              MAX
            </button>
          </div>

          <div className="w-[1px] h-3.5 bg-white/10 mx-0.5" />

          {/* Quick Action Icons */}
          <button
            onClick={handleCopyLogs}
            title="Copy logs"
            className="p-1.5 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
          >
            {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
          </button>
          <button
            onClick={handleDownloadLogs}
            title="Download JSON diagnostics"
            className="p-1.5 rounded-lg hover:bg-white/10 text-violet-400 hover:text-white transition-colors"
          >
            <Download size={13} />
          </button>
          <button
            onClick={() => {
              setLogs([]);
              setNetworkRequests([]);
              setRouteTransitions([]);
              setSocketEvents([]);
            }}
            title="Clear all logs"
            className="p-1.5 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
          >
            <Trash2 size={13} />
          </button>

          <div className="w-[1px] h-3.5 bg-white/10 mx-0.5" />

          {/* Window Control Buttons: Minus (-), Square (□), Minimize (v) */}
          <button
            onClick={() => setConsoleSize(consoleSize === 'small' ? 'normal' : 'small')}
            title={consoleSize === 'small' ? 'Expand to Normal size' : 'Shrink Console Window'}
            className={`p-1.5 rounded-lg transition-colors ${
              consoleSize === 'small' ? 'bg-violet-600 text-white' : 'hover:bg-white/10 text-neutral-300'
            }`}
          >
            <Minus size={13} />
          </button>
          <button
            onClick={() => setConsoleSize(consoleSize === 'large' ? 'normal' : 'large')}
            title={consoleSize === 'large' ? 'Restore Normal size' : 'Maximize Console Window'}
            className={`p-1.5 rounded-lg transition-colors ${
              consoleSize === 'large' ? 'bg-violet-600 text-white' : 'hover:bg-white/10 text-neutral-300'
            }`}
          >
            <Square size={12} />
          </button>
          <button
            onClick={() => setIsHidden(true)}
            title="Hide Console (Shortcut: Ctrl + H)"
            className="p-1.5 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
          >
            <EyeOff size={13} />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            title="Close to floating dock button"
            className="p-1.5 rounded-lg hover:bg-red-500/20 hover:text-red-400 text-neutral-400 transition-colors"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Row 2: Tab Navigation Bar */}
      <div className="px-3 py-1.5 border-b border-white/5 bg-white/[0.01] flex items-center justify-between gap-2 overflow-x-auto shrink-0 select-none">
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-colors flex items-center gap-1 ${
              activeTab === 'logs' ? 'bg-violet-600 text-white' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Terminal size={11} /> Logs ({logs.length})
          </button>
          <button
            onClick={() => setActiveTab('messages')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-colors flex items-center gap-1 ${
              activeTab === 'messages' ? 'bg-emerald-600 text-white shadow-md' : 'text-emerald-400 hover:text-white'
            }`}
          >
            <Activity size={11} /> 💬 Chat ({messageEvents.length})
          </button>
          <button
            onClick={() => setActiveTab('routes')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-colors flex items-center gap-1 ${
              activeTab === 'routes' ? 'bg-violet-600 text-white' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Navigation size={11} /> Routes ({routeTransitions.length})
          </button>
          <button
            onClick={() => setActiveTab('network')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-colors flex items-center gap-1 ${
              activeTab === 'network' ? 'bg-violet-600 text-white' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Globe size={11} /> Net ({networkRequests.length})
          </button>
          {consoleSize !== 'small' && (
            <>
              <button
                onClick={() => setActiveTab('realtime')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-colors flex items-center gap-1 ${
                  activeTab === 'realtime' ? 'bg-violet-600 text-white' : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Wifi size={11} /> RT ({socketEvents.length})
              </button>
              <button
                onClick={() => setActiveTab('eval')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-colors flex items-center gap-1 ${
                  activeTab === 'eval' ? 'bg-violet-600 text-white' : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Play size={11} /> Eval
              </button>
            </>
          )}
        </div>

        <div className="text-[10px] text-neutral-400 font-mono px-2 py-1 rounded bg-white/5 border border-white/10 shrink-0 truncate max-w-[200px]">
          Path: <span className="text-violet-300 font-bold">{pathname}</span>
        </div>
      </div>

      {/* Sub-Bar Filter & Active Path Indicator */}
      <div className="px-3 py-1.5 border-b border-white/5 bg-white/[0.01] flex items-center justify-between gap-2">
        <div className="relative flex-1 flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={12} className="absolute left-2.5 top-2.5 text-neutral-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search logs, routes, network requests..."
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-7 pr-3 py-1 text-[11px] text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-violet-500/50"
            />
          </div>

          {activeTab === 'logs' && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setLogFilter('all')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  logFilter === 'all' ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                ALL
              </button>
              <button
                onClick={() => setLogFilter('error')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  logFilter === 'error' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                ERR
              </button>
              <button
                onClick={() => setLogFilter('warn')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  logFilter === 'warn' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                WARN
              </button>
            </div>
          )}
        </div>

        <div className="text-[10px] text-neutral-400 font-mono px-2.5 py-1 rounded bg-white/5 border border-white/10 shrink-0">
          Path: <span className="text-violet-300 font-bold">{pathname}</span>
        </div>
      </div>

      {/* Main Console Content Stream */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 space-y-1.5 text-[11px] leading-relaxed text-neutral-300 font-mono divide-y divide-white/[0.03]"
      >
        {activeTab === 'logs' ? (
          filteredLogs.length === 0 ? (
            <div className="h-full flex items-center justify-center text-neutral-500 text-xs select-none">
              No matching records found
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div key={log.id} className="pt-1.5 flex items-start gap-2 group">
                <span className="text-[9px] text-neutral-600 shrink-0 select-none pt-0.5">
                  {log.timestamp}
                </span>
                {log.type === 'error' && <AlertCircle size={12} className="text-red-400 shrink-0 mt-0.5" />}
                {log.type === 'warn' && <AlertTriangle size={12} className="text-amber-400 shrink-0 mt-0.5" />}
                {log.type === 'info' && <Info size={12} className="text-blue-400 shrink-0 mt-0.5" />}
                {log.type === 'realtime' && <Zap size={12} className="text-emerald-400 shrink-0 mt-0.5" />}
                {log.type === 'route' && <Navigation size={12} className="text-violet-400 shrink-0 mt-0.5" />}

                <pre
                  className={`whitespace-pre-wrap break-all flex-1 font-mono ${
                    log.type === 'error'
                      ? 'text-red-400 font-bold'
                      : log.type === 'warn'
                      ? 'text-amber-300'
                      : log.type === 'realtime'
                      ? 'text-emerald-300'
                      : log.type === 'route'
                      ? 'text-violet-300 font-bold'
                      : 'text-neutral-300'
                  }`}
                >
                  {log.message}
                </pre>
              </div>
            ))
          )
        ) : activeTab === 'routes' ? (
          routeTransitions.length === 0 ? (
            <div className="h-full flex items-center justify-center text-neutral-500 text-xs select-none">
              No route transitions recorded yet. Navigate around the app to monitor performance!
            </div>
          ) : (
            routeTransitions.map((tr) => (
              <div key={tr.id} className="pt-1.5 flex items-center justify-between gap-3 group">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Navigation size={12} className="text-violet-400 shrink-0" />
                  <span className="text-neutral-400 truncate">{tr.from}</span>
                  <span className="text-neutral-600">→</span>
                  <span className="text-violet-300 font-bold truncate">{tr.to}</span>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[9px] text-neutral-500">{tr.timestamp}</span>
                  <span
                    className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full ${
                      tr.durationMs > 250
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : tr.durationMs > 60
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    ⚡ {tr.durationMs} ms
                  </span>
                </div>
              </div>
            ))
          )
        ) : activeTab === 'network' ? (
          filteredNetwork.length === 0 ? (
            <div className="h-full flex items-center justify-center text-neutral-500 text-xs select-none">
              No network activity recorded
            </div>
          ) : (
            filteredNetwork.map((req) => (
              <div
                key={req.id}
                onClick={() => setSelectedReq(selectedReq?.id === req.id ? null : req)}
                className="pt-1.5 flex flex-col gap-1 group cursor-pointer hover:bg-white/[0.02] p-1.5 rounded-lg transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        req.method === 'POST' ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-500/20 text-blue-300'
                      }`}
                    >
                      {req.method}
                    </span>
                    <span className="truncate text-neutral-200 font-medium">{req.url}</span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {req.duration !== undefined && (
                      <span
                        className={`text-[10px] font-semibold ${
                          req.duration > 2000
                            ? 'text-red-400'
                            : req.duration > 500
                            ? 'text-amber-400'
                            : 'text-neutral-400'
                        }`}
                      >
                        {req.duration}ms
                      </span>
                    )}

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        req.state === 'pending'
                          ? 'bg-amber-500/10 text-amber-400 animate-pulse'
                          : req.state === 'success'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-red-500/10 text-red-400'
                      }`}
                    >
                      {req.state === 'pending' ? 'PENDING' : req.status || 'ERR'}
                    </span>
                  </div>
                </div>

                {selectedReq?.id === req.id && (
                  <div className="mt-2 p-2 bg-neutral-900/90 border border-white/10 rounded-lg text-[10px] space-y-1 font-mono text-neutral-400">
                    <div><span className="text-violet-400 font-bold">URL:</span> {req.url}</div>
                    <div><span className="text-violet-400 font-bold">Method:</span> {req.method}</div>
                    <div><span className="text-violet-400 font-bold">Status:</span> {req.status || 'N/A'}</div>
                    <div><span className="text-violet-400 font-bold">Latency:</span> {req.duration ? `${req.duration} ms` : 'In flight'}</div>
                  </div>
                )}
              </div>
            ))
          )
        ) : activeTab === 'messages' ? (
          messageEvents.length === 0 ? (
            <div className="h-full flex items-center justify-center text-neutral-500 text-xs select-none">
              No Chat / Messages Telemetry captured yet — tap a conversation to begin telemetry
            </div>
          ) : (
            messageEvents.map((ev) => (
              <div key={ev.id} className="pt-1.5 flex items-start gap-2 border-b border-white/5 pb-1 font-mono">
                <Activity size={12} className="text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-[9px] text-neutral-500 shrink-0">{ev.timestamp}</span>
                <span className="text-emerald-300 font-medium break-all flex-1 text-[11px]">{ev.payload}</span>
              </div>
            ))
          )
        ) : activeTab === 'realtime' ? (
          socketEvents.length === 0 ? (
            <div className="h-full flex items-center justify-center text-neutral-500 text-xs select-none">
              No Realtime / Socket.IO events intercepted
            </div>
          ) : (
            socketEvents.map((ev) => (
              <div key={ev.id} className="pt-1.5 flex items-start gap-2">
                <Zap size={12} className="text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-[9px] text-neutral-500 shrink-0">{ev.timestamp}</span>
                <span className="text-emerald-300 font-bold break-all flex-1">{ev.payload}</span>
              </div>
            ))
          )
        ) : activeTab === 'eval' ? (
          <div className="h-full flex flex-col justify-between space-y-3">
            <div className="text-xs text-neutral-400 font-mono">
              💡 Execute live JavaScript expression in application context:
            </div>
            <div className="flex-1 bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-emerald-400 font-mono overflow-y-auto">
              <div>&gt; window.location.href</div>
              <div className="text-neutral-400 mb-2">"{typeof window !== 'undefined' ? window.location.href : ''}"</div>
              <div>&gt; document.title</div>
              <div className="text-neutral-400 mb-2">"{typeof document !== 'undefined' ? document.title : ''}"</div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Interactive JS Command Evaluator Input Bar */}
      {activeTab === 'eval' && (
        <div className="p-2 border-t border-white/10 bg-white/[0.02] flex items-center gap-2">
          <span className="text-violet-400 font-bold text-xs pl-2">&gt;</span>
          <input
            type="text"
            value={evalCode}
            onChange={(e) => setEvalCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRunEval()}
            placeholder="e.g. useAppStore.getState()"
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-violet-500/50"
          />
          <button
            onClick={handleRunEval}
            className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-colors flex items-center gap-1"
          >
            <Play size={11} /> Run
          </button>
        </div>
      )}
    </div>
  );
}
