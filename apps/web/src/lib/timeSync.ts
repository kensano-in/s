/**
 * Time synchronization utility.
 * Calculates clock skew to ensure optimistic UI timestamps match server time.
 */

let clockSkewMs = 0;

/**
 * Updates the clock skew based on a round-trip to the server.
 * @param clientSendTime Timestamp when the request started (Date.now())
 * @param serverReceiveTime Timestamp from the server response (e.g. created_at)
 * @param rtt Round-trip time in ms
 */
export function updateClockSkew(clientSendTime: number, serverReceiveTime: number, rtt: number) {
  const skew = serverReceiveTime - (clientSendTime + rtt / 2);
  
  // Smooth out the skew to prevent drastic jumps
  if (clockSkewMs === 0) {
    clockSkewMs = skew;
  } else {
    clockSkewMs = (clockSkewMs * 0.8) + (skew * 0.2);
  }
}

/**
 * Gets the current synchronized server time.
 */
export function getServerTime(): string {
  return new Date(Date.now() + clockSkewMs).toISOString();
}

export function getClockSkewMs(): number {
  return clockSkewMs;
}
