import type { ClientEventType, EventMetadata } from "../dto/experiment";
import { ApiError, postEvent } from "./experiment-api";

interface QueuedEvent {
  sessionId: string;
  eventType: ClientEventType;
  metadata?: EventMetadata;
  attempts: number;
}

const MAX_ATTEMPTS = 3;
const queue: QueuedEvent[] = [];
let running = false;

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

/**
 * Envía los eventos en orden, sin bloquear la interfaz. Si falla la red, reintenta hasta 3 veces
 * con espera creciente. El timestamp lo pone el servidor al recibirlo.
 */
async function drain(): Promise<void> {
  if (running) return;
  running = true;
  while (queue.length) {
    const next = queue[0];
    try {
      await postEvent(next.sessionId, next.eventType, next.metadata);
      queue.shift();
    } catch (error) {
      const retryable = error instanceof ApiError && (error.status === 0 || error.status >= 500);
      next.attempts += 1;
      if (!retryable || next.attempts >= MAX_ATTEMPTS) {
        queue.shift();
        if (import.meta.env.DEV) console.warn("Evento descartado", next, error);
      } else {
        await wait(500 * 2 ** next.attempts);
      }
    }
  }
  running = false;
}

export function enqueueEvent(sessionId: string, eventType: ClientEventType, metadata?: EventMetadata): void {
  queue.push({ sessionId, eventType, metadata, attempts: 0 });
  void drain();
}

/** Espera a que se envíen los eventos pendientes (por ejemplo, antes de exportar). */
export async function flushEvents(timeoutMs = 4000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while ((queue.length || running) && Date.now() < deadline) {
    await wait(50);
  }
}
