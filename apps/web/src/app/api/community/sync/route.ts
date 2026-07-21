import '@/lib/sanitize-env';
import { addSyncClient, removeSyncClient } from '@/lib/syncManager';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const channelId = searchParams.get('channelId');

  if (!channelId) {
    return new Response('Missing channelId', { status: 400 });
  }

  let controllerRef: ReadableStreamDefaultController | null = null;
  let intervalId: NodeJS.Timeout | null = null;

  const stream = new ReadableStream({
    start(controller) {
      controllerRef = controller;
      addSyncClient(channelId, controller);

      // Heartbeat ping every 15s keeps connection healthy and enables fast disconnect detection
      intervalId = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(': ping\n\n'));
        } catch (_) {
          if (intervalId) clearInterval(intervalId);
          if (controllerRef) removeSyncClient(channelId, controllerRef);
        }
      }, 15000);
    },
    cancel() {
      if (intervalId) clearInterval(intervalId);
      if (controllerRef) {
        removeSyncClient(channelId, controllerRef);
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
