/// <reference types="vite/client" />

export type GameType = 'MINECRAFT' | 'STEAM_A2S' | 'TEAMSPEAK' | 'TCP';

export interface ServerStatus {
  id: string;
  name: string;
  game: GameType;
  online: boolean;
  players: number | null;
  maxPlayers: number | null;
  version: string | null;
  map: string | null;
  motd: string | null;
  latencyMs: number | null;
  error: string | null;
  lastChecked: string;
}

// In production the UI and API share an origin (nginx proxies /api). During
// local development Vite serves the UI on another port, so we target the
// backend directly.
const API_BASE = import.meta.env.DEV ? 'http://localhost:8080' : '';

const STATUS_PATH = '/api/status';
const STREAM_PATH = '/api/status/stream';
const POLL_INTERVAL_MS = 15_000;

export type ConnectionState = 'connecting' | 'live' | 'reconnecting';

export interface StatusHandlers {
  onData: (servers: ServerStatus[]) => void;
  onConnection: (state: ConnectionState) => void;
}

/**
 * Streams status updates via Server-Sent Events, falling back to polling when
 * EventSource is unavailable. Returns a cleanup function.
 */
export function connectStatus(handlers: StatusHandlers): () => void {
  void fetchOnce(handlers);

  if (typeof EventSource === 'undefined') {
    return startPolling(handlers);
  }

  handlers.onConnection('connecting');
  const source = new EventSource(`${API_BASE}${STREAM_PATH}`);

  source.addEventListener('status', (event) => {
    handlers.onConnection('live');
    parseAndEmit((event as MessageEvent).data, handlers);
  });

  source.addEventListener('open', () => handlers.onConnection('live'));
  source.addEventListener('error', () => handlers.onConnection('reconnecting'));

  return () => source.close();
}

async function fetchOnce(handlers: StatusHandlers): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}${STATUS_PATH}`);
    if (!response.ok) return;
    handlers.onData((await response.json()) as ServerStatus[]);
  } catch {
    // Ignored: the stream (or polling) will deliver data shortly.
  }
}

function startPolling(handlers: StatusHandlers): () => void {
  handlers.onConnection('reconnecting');
  const timer = window.setInterval(() => void fetchOnce(handlers), POLL_INTERVAL_MS);
  return () => window.clearInterval(timer);
}

function parseAndEmit(raw: string, handlers: StatusHandlers): void {
  try {
    handlers.onData(JSON.parse(raw) as ServerStatus[]);
  } catch {
    // Ignore malformed frames.
  }
}
