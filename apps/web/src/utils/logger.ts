/**
 * 📊 Logger Utility — Section 8: Observability
 * 
 * Provides structured logging for tracking requests, latency, and failures.
 * Designed to be easily swapped for external sinks (Axiom/Logtail).
 */

type LogLevel = 'info' | 'warn' | 'error' | 'metric';

interface LogPayload {
  module: string;
  action: string;
  data?: any;
  latency?: number;
  error?: any;
}

class Logger {
  private format(level: LogLevel, payload: LogPayload) {
    const timestamp = new Date().toISOString();
    const colorMap = {
      info: '\x1b[36m', // Cyan
      warn: '\x1b[33m', // Yellow
      error: '\x1b[31m', // Red
      metric: '\x1b[32m' // Green
    };
    const reset = '\x1b[0m';

    const logString = `[${timestamp}] [${level.toUpperCase()}] [${payload.module}:${payload.action}]`;
    
    if (level === 'metric' && payload.latency !== undefined) {
      return [`${colorMap[level]}${logString}${reset} Latency: ${payload.latency}ms | Data:`, payload.data];
    }

    if (level === 'error') {
      return [`${colorMap[level]}${logString}${reset} Error:`, payload.error, '| Context:', payload.data];
    }

    return [`${colorMap[level]}${logString}${reset} Data:`, payload.data];
  }

  info(module: string, action: string, data?: any) {
    console.info(...this.format('info', { module, action, data }));
  }

  warn(module: string, action: string, data?: any) {
    console.warn(...this.format('warn', { module, action, data }));
  }

  error(module: string, action: string, error: any, data?: any) {
    console.error(...this.format('error', { module, action, error, data }));
  }

  metric(module: string, action: string, latency: number, data?: any) {
    console.log(...this.format('metric', { module, action, latency, data }));
  }
}

export const logger = new Logger();
