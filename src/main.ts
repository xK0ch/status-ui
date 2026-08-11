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

const CONNECTION_LABELS: Record<ConnectionState, string> = {
  connecting: 'Verbinde…',
  live: 'Live',
  reconnecting: 'Verbindung unterbrochen…',
};

// Keep the latest snapshot so the "updated N seconds ago" labels can tick
// independently of incoming data.
let latest: ServerStatus[] = [];

connectStatus({
  onData: (servers) => {
    latest = servers;
    render(servers);
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
    grid.innerHTML = '<p class="empty">Keine Server konfiguriert.</p>';
    return;
  }

  grid.replaceChildren(...servers.map(renderCard));
}

function renderCard(server: ServerStatus): HTMLElement {
  const card = document.createElement('article');
  card.className = 'card status-card';
  card.dataset.server = server.id;
  card.dataset.state = server.online ? 'online' : 'offline';

  const main = document.createElement('div');
  main.className = 'card-main';

  main.appendChild(renderHead(server));
  main.appendChild(renderMeta(server));

  const detail = server.online ? server.motd : server.error;
  if (detail) {
    const line = document.createElement('p');
    line.className = server.online ? 'status-motd' : 'status-error';
    line.textContent = detail;
    main.appendChild(line);
  }

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

function renderHead(server: ServerStatus): HTMLElement {
  const head = document.createElement('div');
  head.className = 'status-head';

  const dot = document.createElement('span');
  dot.className = 'status-dot';

  const name = document.createElement('h3');
  name.textContent = server.name;

  const state = document.createElement('span');
  state.className = 'status-state';
  state.textContent = server.online ? 'Online' : 'Offline';

  head.append(dot, name, state);
  return head;
}

function renderMeta(server: ServerStatus): HTMLElement {
  const meta = document.createElement('dl');
  meta.className = 'status-meta';

  if (server.online) {
    if (server.players !== null) {
      const max = server.maxPlayers !== null ? ` / ${server.maxPlayers}` : '';
      meta.appendChild(metaItem('users', 'Spieler', `${server.players}${max}`));
    } else if (server.maxPlayers !== null) {
      meta.appendChild(metaItem('users', 'Slots', String(server.maxPlayers)));
    }
    if (server.version) meta.appendChild(metaItem('tag', 'Version', server.version));
    if (server.map) meta.appendChild(metaItem('map', 'Karte', server.map));
    if (server.latencyMs !== null) {
      meta.appendChild(metaItem('gauge-high', 'Ping', `${server.latencyMs} ms`));
    }
  }

  if (meta.childElementCount === 0) {
    const item = document.createElement('div');
    const value = document.createElement('dd');
    value.className = 'status-dim';
    value.textContent = server.online ? 'Erreichbar' : 'Nicht erreichbar';
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
  if (seconds < 5) return 'gerade eben';
  if (seconds < 60) return `vor ${seconds} s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `vor ${minutes} min`;
  const hours = Math.round(minutes / 60);
  return `vor ${hours} h`;
}
