import { createBrowserClient, createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cache } from 'react';
import { validateSupabaseEnv } from '../env-validator';

let browserClientInstance: any = null;
let adminClientInstance: any = null;
let realtimeClientInstance: any = null;

function wrapClientWithForensicLogger(client: any, type: string) {
  return client; // Return native Supabase client directly without Proxy overhead

  const activeSubscriptions = new Set<string>();

  return new Proxy(client, {
    get(target, prop, receiver) {
      if (prop === '__isProxied') return true;

      if (prop === 'from') {
        return function (tableName: string) {
          const originalFrom = target.from(tableName);
          return new Proxy(originalFrom, {
            get(fromTarget, fromProp) {
              const fromVal = Reflect.get(fromTarget, fromProp);
              if (fromProp === 'then') {
                return function (onfulfilled: any, onrejected: any) {
                  const startTime = performance.now();
                  console.log(`📦 [SUPABASE QUERY] Executing query on table: "${tableName}"`);
                  return fromVal.call(fromTarget, (res: any) => {
                    const dur = performance.now() - startTime;
                    console.log(`📦 [SUPABASE QUERY] Finished query on "${tableName}" | duration=${dur.toFixed(1)}ms | rows=${res.data?.length ?? (res.data ? 1 : 0)} | success=${!res.error}`);
                    if (onfulfilled) onfulfilled(res);
                  }, (err: any) => {
                    const dur = performance.now() - startTime;
                    console.error(`📦 [SUPABASE QUERY ERROR] Failed on "${tableName}" | duration=${dur.toFixed(1)}ms | error=`, err);
                    if (onrejected) onrejected(err);
                  });
                };
              }
              return typeof fromVal === 'function' ? fromVal.bind(fromTarget) : fromVal;
            }
          });
        };
      }

      if (prop === 'rpc') {
        return function (fnName: string, args: any) {
          const startTime = performance.now();
          console.log(`⚡ [SUPABASE RPC] Calling RPC "${fnName}" with args:`, args);
          const promise = target.rpc(fnName, args);
          if (promise && typeof promise.then === 'function') {
            return promise.then((res: any) => {
              const dur = performance.now() - startTime;
              console.log(`⚡ [SUPABASE RPC] Finished RPC "${fnName}" | duration=${dur.toFixed(1)}ms | success=${!res.error}`);
              return res;
            });
          }
          return promise;
        };
      }

      if (prop === 'channel') {
        return function (channelName: string, options: any) {
          console.log(`📡 [SUPABASE CHANNEL] Creating channel: "${channelName}"`);
          if (activeSubscriptions.has(channelName)) {
            console.warn(`🚨 [DUPLICATE REALTIME CHANNEL] Channel "${channelName}" created multiple times!`);
          }
          activeSubscriptions.add(channelName);

          const originalChannel = target.channel(channelName, options);
          return new Proxy(originalChannel, {
            get(chanTarget, chanProp) {
              if (chanProp === 'subscribe') {
                return function (callback: any) {
                  console.log(`📡 [SUPABASE REALTIME] Subscribing to channel: "${channelName}"`);
                  return chanTarget.subscribe(callback);
                };
              }
              if (chanProp === 'unsubscribe') {
                return function () {
                  console.log(`📡 [SUPABASE REALTIME] Unsubscribing from channel: "${channelName}"`);
                  activeSubscriptions.delete(channelName);
                  return chanTarget.unsubscribe();
                };
              }
              const chanVal = Reflect.get(chanTarget, chanProp);
              return typeof chanVal === 'function' ? chanVal.bind(chanTarget) : chanVal;
            }
          });
        };
      }

      const value = Reflect.get(target, prop, receiver);
      if (typeof value === 'function') {
        return value.bind(target);
      }
      return value;
    }
  });
}

/**
 * Centralized Supabase client factory.
 * Enforces environment validation before initialization and prevents duplicate client creation.
 */
export function getSupabaseClient(
  type: 'browser' | 'admin' | 'realtime',
  sourceFile = 'unknown',
  functionName = 'unknown'
) {
  // Enforce environment validation before initialization
  validateSupabaseEnv(type, sourceFile, functionName);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!.trim();

  if (type === 'browser') {
    if (!browserClientInstance) {
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim();
      browserClientInstance = wrapClientWithForensicLogger(createBrowserClient(url, anonKey), 'browser');
    }
    return browserClientInstance;
  }

  if (type === 'admin') {
    if (!adminClientInstance) {
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!.trim();
      adminClientInstance = createSupabaseClient(url, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
    }
    return adminClientInstance;
  }

  if (type === 'realtime') {
    if (!realtimeClientInstance) {
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim();
      realtimeClientInstance = wrapClientWithForensicLogger(createSupabaseClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
        realtime: {
          params: {
            eventsPerSecond: 100,
          },
          heartbeatIntervalMs: 15000,
          reconnectAfterMs: (tries: number) => Math.min(tries * 200, 2000),
        },
      }), 'realtime');
    }
    return realtimeClientInstance;
  }

  throw new Error(`Invalid client type: ${type}`);
}

/**
 * Factory for request-scoped Next.js SSR server clients.
 * Validates environment variables before client creation.
 */
export async function getServerClient(sourceFile = 'unknown', functionName = 'unknown') {
  validateSupabaseEnv('server', sourceFile, functionName);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!.trim();
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!.trim();
  
  // Dynamically import next/headers to prevent webpack from bundling it for the client-side
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Safe to ignore inside Server Components
        }
      },
    },
  });
}

/**
 * Cached version of getServerClient to prevent duplicate client creation within a single request context.
 */
export const getCachedServerClient = cache(async (sourceFile = 'unknown', functionName = 'unknown') => {
  return getServerClient(sourceFile, functionName);
});
