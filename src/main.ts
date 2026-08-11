// Font Awesome SVG bootstrap. Only the icons used below are bundled; dom.watch()
// swaps the <i class="fa-..."> placeholders for inline SVG.
import { library, dom } from '@fortawesome/fontawesome-svg-core';
import {
  faArrowLeft,
  faUsers,
  faGaugeHigh,
  faTag,
  faMap,
} from '@fortawesome/free-solid-svg-icons';
import { connectStatus, type ConnectionState, type ServerStatus } from './api.ts';

library.add(faArrowLeft, faUsers, faGaugeHigh, faTag, faMap);
dom.watch();

const grid = document.querySelector<HTMLElement>('#servers')!;
const emptyHint = document.querySelector<HTMLElement>('#empty');
const conn = document.querySelector<HTMLElement>('#conn')!;
const connLabel = document.querySelector<HTMLElement>('#conn-label')!;
const favicon = document.querySelector<HTMLLinkElement>('#favicon')!;

const CONNECTION_LABELS: Record<ConnectionState, string> = {
  connecting: 'Connecting…',
  live: 'Live',
  reconnecting: 'Reconnecting…',
};

// Three display states:
//   online - reachable right now
//   down   - meant to be online but not reachable (a real problem)
//   idle   - intentionally not running
type CardState = 'online' | 'down' | 'idle';

const STATE_LABELS: Record<CardState, string> = {
  online: 'Online',
  down: 'Down',
  idle: 'Offline',
};

function cardState(server: ServerStatus): CardState {
  if (server.online) return 'online';
  return server.expectedOnline ? 'down' : 'idle';
}

// The tab icon turns red only when a server that should be online is down.
function updateFavicon(servers: ServerStatus[]): void {
  const anyDown = servers.some((server) => cardState(server) === 'down');
  favicon.href = anyDown ? '/favicon-offline.ico' : '/favicon-online.ico';
}

// Server-provided names carry the "MLTSF" brand; show "Fynn Koch" instead.
function rebrand(text: string): string {
  return text.split('MLTSF').join('Fynn Koch');
}

// Keep the latest snapshot so the "updated N seconds ago" labels can tick
// independently of incoming data.
let latest: ServerStatus[] = [];

connectStatus({
  onData: (servers) => {
    latest = servers;
    render(servers);
    updateFavicon(servers);
  },
  onConnection: (state) => {
    conn.dataset.state = state;
    connLabel.textContent = CONNECTION_LABELS[state];
  },
});

// Refresh only the relative timestamps once per second.
window.setInterval(() => {
  for (const server of latest) {
    const label = grid.querySelector<HTMLElement>(`[data-updated="${server.id}"]`);
    if (label) label.textContent = formatAgo(server.lastChecked);
  }
}, 1000);

function render(servers: ServerStatus[]): void {
  emptyHint?.remove();

  if (servers.length === 0) {
    grid.innerHTML = '<p class="empty">No servers configured.</p>';
    return;
  }

  grid.replaceChildren(...servers.map(renderCard));
}

function renderCard(server: ServerStatus): HTMLElement {
  const state = cardState(server);

  const card = document.createElement('article');
  card.className = 'card status-card';
  card.dataset.server = server.id;
  card.dataset.state = state;

  const main = document.createElement('div');
  main.className = 'card-main';

  main.appendChild(renderHead(server, state));
  if (server.online) main.appendChild(renderMeta(server));

  const detail = renderDetail(server, state);
  if (detail) main.appendChild(detail);

  const footer = document.createElement('div');
  footer.className = 'card-links status-footer';
  const updated = document.createElement('span');
  updated.className = 'status-updated';
  updated.dataset.updated = server.id;
  updated.textContent = formatAgo(server.lastChecked);
  footer.appendChild(updated);

  card.append(main, footer);
  return card;
}

function renderHead(server: ServerStatus, state: CardState): HTMLElement {
  const head = document.createElement('div');
  head.className = 'status-head';

  const dot = document.createElement('span');
  dot.className = 'status-dot';

  const name = document.createElement('h3');
  name.textContent = server.name;

  const pill = document.createElement('span');
  pill.className = 'status-state';
  pill.textContent = STATE_LABELS[state];

  head.append(dot, name, pill);
  return head;
}

// The detail line under the meta grid: server name when online, the technical
// error only for a real outage, and a calm note for intentionally-off servers.
function renderDetail(server: ServerStatus, state: CardState): HTMLElement | null {
  let text: string | null;
  let className: string;
  switch (state) {
    case 'online':
      text = server.motd ? rebrand(server.motd) : null;
      className = 'status-motd';
      break;
    case 'down':
      text = server.error;
      className = 'status-error';
      break;
    case 'idle':
      text = 'Not currently running';
      className = 'status-idle';
      break;
  }

  if (!text) return null;
  const line = document.createElement('p');
  line.className = className;
  line.textContent = text;
  return line;
}

// Only called for online servers; renders whatever metrics the protocol reports.
function renderMeta(server: ServerStatus): HTMLElement {
  const meta = document.createElement('dl');
  meta.className = 'status-meta';

  if (server.players !== null) {
    const max = server.maxPlayers !== null ? ` / ${server.maxPlayers}` : '';
    meta.appendChild(metaItem('users', 'Players', `${server.players}${max}`));
  } else if (server.maxPlayers !== null) {
    meta.appendChild(metaItem('users', 'Slots', String(server.maxPlayers)));
  }
  if (server.version) meta.appendChild(metaItem('tag', 'Version', server.version));
  if (server.map) meta.appendChild(metaItem('map', 'Map', server.map));
  if (server.latencyMs !== null) {
    meta.appendChild(metaItem('gauge-high', 'Ping', `${server.latencyMs} ms`));
  }

  if (meta.childElementCount === 0) {
    const item = document.createElement('div');
    const value = document.createElement('dd');
    value.className = 'status-dim';
    value.textContent = 'Reachable';
    item.appendChild(value);
    meta.appendChild(item);
  }

  return meta;
}

function metaItem(icon: string, label: string, value: string): HTMLElement {
  const item = document.createElement('div');

  const term = document.createElement('dt');
  const iconEl = document.createElement('i');
  iconEl.className = `fa-solid fa-${icon}`;
  iconEl.setAttribute('aria-hidden', 'true');
  term.append(iconEl, document.createTextNode(` ${label}`));

  const detail = document.createElement('dd');
  detail.textContent = value;

  item.append(term, detail);
  return item;
}

function formatAgo(iso: string): string {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds} s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return `${hours} h ago`;
}
