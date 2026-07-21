// Client-side stream sync manager for Zero-Knowledge Social Economy (Verlyn)
// Enables sub-millisecond local synchronization across different browser profiles/sandboxes.

type Client = {
  channelId: string;
  controller: ReadableStreamDefaultController;
};

const globalSync = globalThis as unknown as {
  _sseClients: Client[];
};

if (!globalSync._sseClients) {
  globalSync._sseClients = [];
}

export function addSyncClient(channelId: string, controller: any) {
  globalSync._sseClients.push({ channelId, controller });
}

export function removeSyncClient(channelId: string, controller: any) {
  globalSync._sseClients = globalSync._sseClients.filter(
    c => !(c.channelId === channelId && c.controller === controller)
  );
}

export function broadcastLocalSync(channelId: string, type: string, payload: any) {
  const data = JSON.stringify({ type, payload });
  const message = `data: ${data}\n\n`;
  const encoder = new TextEncoder();
  const encoded = encoder.encode(message);

  const targets = globalSync._sseClients.filter(c => c.channelId === channelId);
  targets.forEach(client => {
    try {
      client.controller.enqueue(encoded);
    } catch (err) {
      // Client disconnected, remove them
      removeSyncClient(client.channelId, client.controller);
    }
  });
}
