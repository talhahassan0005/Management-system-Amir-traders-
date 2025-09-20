import { EventEmitter } from 'events';

// Singleton in-memory event bus for local realtime updates (SSE)
// Note: In serverless multi-instance deployments this won't cross instances.
// For production-wide realtime, integrate a shared broker (e.g., Redis/Pusher).
class GlobalEventBus extends EventEmitter {}

// Reuse a single instance across reloads in dev
const globalAny = global as unknown as { __EVENT_BUS__?: GlobalEventBus };

if (!globalAny.__EVENT_BUS__) {
  globalAny.__EVENT_BUS__ = new GlobalEventBus();
}

const eventBus = globalAny.__EVENT_BUS__ as GlobalEventBus;

export default eventBus;


