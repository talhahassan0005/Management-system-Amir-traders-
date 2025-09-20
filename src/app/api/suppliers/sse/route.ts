import { NextRequest } from 'next/server';
export const runtime = 'nodejs';
export const fetchCache = 'force-no-store';
import eventBus from '@/lib/event-bus';

export async function GET(_request: NextRequest) {
  const stream = new ReadableStream({
    start(controller) {
      const send = (data: string) => controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
      const onChange = () => send('changed');
      eventBus.on('suppliers:changed', onChange);
      send('connected');

      const keepAlive = setInterval(() => send('ping'), 25000);
      return () => {
        clearInterval(keepAlive);
        eventBus.off('suppliers:changed', onChange);
      };
    }
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}


