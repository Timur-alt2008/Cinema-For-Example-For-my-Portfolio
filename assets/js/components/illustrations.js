// Векторные «фотографии» интерьера: зал, фойе, бар, VIP-зал.
// Рисуются кодом, поэтому выглядят чётко на любом экране и не требуют загрузки картинок.

import { rng } from '../lib/rand.js';

let uid = 0;

function defs(id, tone = '#3a0c12') {
  return `<defs>
    <linearGradient id="${id}-wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#120d0d"/><stop offset="1" stop-color="#050404"/></linearGradient>
    <radialGradient id="${id}-screen" cx="0.5" cy="0.5" r="0.6"><stop offset="0" stop-color="#f6efe2"/><stop offset="0.6" stop-color="#cdbfa6"/><stop offset="1" stop-color="#6e5d45"/></radialGradient>
    <radialGradient id="${id}-spill" cx="0.5" cy="0" r="1"><stop offset="0" stop-color="#e8dcc6" stop-opacity="0.35"/><stop offset="1" stop-color="#e8dcc6" stop-opacity="0"/></radialGradient>
    <linearGradient id="${id}-seat" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${tone}"/><stop offset="1" stop-color="#140405"/></linearGradient>
    <linearGradient id="${id}-beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff4dc" stop-opacity="0.24"/><stop offset="1" stop-color="#fff4dc" stop-opacity="0"/></linearGradient>
    <radialGradient id="${id}-lamp"><stop offset="0" stop-color="#f3c77a" stop-opacity="0.9"/><stop offset="1" stop-color="#f3c77a" stop-opacity="0"/></radialGradient>
    <linearGradient id="${id}-floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a0a0b"/><stop offset="1" stop-color="#070303"/></linearGradient>
    <radialGradient id="${id}-vig" cx="0.5" cy="0.5" r="0.75"><stop offset="0.6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.8"/></radialGradient>
  </defs>`;
}

/** Кинозал в перспективе: экран, ряды кресел, бра на стенах. */
export function hallScene({ tone = '#5a0f17', gold = false, rows = 7, label = 'Интерьер кинозала' } = {}) {
  const id = `ill${++uid}`;
  const random = rng(`hall|${tone}|${rows}`);
  let seats = '';
  for (let r = 0; r < rows; r++) {
    const t = r / (rows - 1);
    const y = 300 + t * 250;
    const scale = 0.45 + t * 0.9;
    const count = Math.round(10 + t * 6);
    const width = 360 + t * 560;
    const x0 = 500 - width / 2;
    const step = width / count;
    for (let s = 0; s < count; s++) {
      const x = x0 + s * step + step * 0.08;
      const w = step * 0.84;
      const h = 34 * scale;
      const occupied = random() < 0.35;
      const vip = gold && r >= rows - 2;
      seats += `<g>
        <rect x="${x.toFixed(1)}" y="${(y - h).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="${(6 * scale).toFixed(1)}" fill="${vip ? '#6d5730' : `url(#${id}-seat)`}"/>
        <rect x="${(x + w * 0.08).toFixed(1)}" y="${(y - h - 4 * scale).toFixed(1)}" width="${(w * 0.84).toFixed(1)}" height="${(6 * scale).toFixed(1)}" rx="${(3 * scale).toFixed(1)}" fill="${vip ? '#b99a60' : '#2a0c0f'}" opacity="0.9"/>
        ${occupied ? `<circle cx="${(x + w / 2).toFixed(1)}" cy="${(y - h - 14 * scale).toFixed(1)}" r="${(9 * scale).toFixed(1)}" fill="#050303"/>` : ''}
      </g>`;
    }
  }
  return `<svg class="illus" viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${label}">
    ${defs(id, tone)}
    <rect width="1000" height="600" fill="url(#${id}-wall)"/>
    <polygon points="0,0 230,120 230,330 0,600" fill="#0b0707"/>
    <polygon points="1000,0 770,120 770,330 1000,600" fill="#0b0707"/>
    ${[60, 140].map((x) => `<ellipse cx="${x + 30}" cy="${170 + x * 0.3}" rx="60" ry="80" fill="url(#${id}-lamp)" opacity="0.6"/><rect x="${x + 24}" y="${160 + x * 0.3}" width="12" height="20" rx="3" fill="#b99a60"/>`).join('')}
    ${[60, 140].map((x) => `<ellipse cx="${970 - x}" cy="${170 + x * 0.3}" rx="60" ry="80" fill="url(#${id}-lamp)" opacity="0.6"/><rect x="${964 - x}" y="${160 + x * 0.3}" width="12" height="20" rx="3" fill="#b99a60"/>`).join('')}
    <rect x="250" y="70" width="500" height="210" rx="4" fill="url(#${id}-screen)"/>
    <path d="M240 64 L760 64" stroke="#4a0b12" stroke-width="10"/>
    <rect x="232" y="60" width="26" height="236" fill="#4a0b12"/>
    <rect x="742" y="60" width="26" height="236" fill="#4a0b12"/>
    <rect x="250" y="280" width="500" height="200" fill="url(#${id}-spill)"/>
    <polygon points="500,600 470,0 530,0" fill="url(#${id}-beam)" opacity="0.5" transform="rotate(180 500 300)"/>
    <rect x="0" y="290" width="1000" height="310" fill="url(#${id}-floor)" opacity="0.85"/>
    ${seats}
    <rect width="1000" height="600" fill="url(#${id}-vig)"/>
  </svg>`;
}

/** Фойе с латунными светильниками и афишами. */
export function lobbyScene() {
  const id = `ill${++uid}`;
  const posters = [0, 1, 2, 3].map((i) => {
    const x = 120 + i * 200;
    return `<rect x="${x}" y="150" width="120" height="180" fill="#0d0809" stroke="#b99a60" stroke-width="3"/>
      <rect x="${x + 10}" y="160" width="100" height="160" fill="${['#4a0b12', '#151a22', '#2a1a0c', '#1a0a14'][i]}"/>
      <circle cx="${x + 60}" cy="${215 + (i % 2) * 20}" r="${20 + i * 3}" fill="#f2e4c8" opacity="${0.35 + i * 0.08}"/>
      <rect x="${x + 22}" y="290" width="76" height="6" fill="#f2eeee" opacity="0.6"/>
      <ellipse cx="${x + 60}" cy="120" rx="70" ry="40" fill="url(#${id}-lamp)" opacity="0.7"/>
      <rect x="${x + 50}" y="112" width="20" height="10" rx="3" fill="#b99a60"/>`;
  }).join('');
  return `<svg class="illus" viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Фойе кинотеатра">
    ${defs(id)}
    <rect width="1000" height="600" fill="url(#${id}-wall)"/>
    <rect y="0" width="1000" height="40" fill="#0a0606"/>
    ${posters}
    <rect x="0" y="380" width="1000" height="220" fill="url(#${id}-floor)"/>
    ${Array.from({ length: 12 }, (_, i) => `<line x1="${i * 100 - 100}" y1="600" x2="${500 + (i - 6) * 20}" y2="380" stroke="#2a1214" stroke-width="2"/>`).join('')}
    <rect x="380" y="380" width="240" height="220" fill="#4a0b12" opacity="0.5"/>
    <path d="M100 380 L900 380" stroke="#b99a60" stroke-width="2" opacity="0.6"/>
    <rect width="1000" height="600" fill="url(#${id}-vig)"/>
  </svg>`;
}

/** Бар «Антракт». */
export function barScene() {
  const id = `ill${++uid}`;
  const random = rng('bar');
  let bottles = '';
  for (let i = 0; i < 28; i++) {
    const x = 140 + i * 26 + random() * 6;
    const h = 40 + random() * 30;
    const shelf = i % 2 ? 210 : 300;
    bottles += `<rect x="${x.toFixed(1)}" y="${(shelf - h).toFixed(1)}" width="14" height="${h.toFixed(1)}" rx="4" fill="${['#3a1a10', '#4a0b12', '#1a2a20', '#2a2418'][i % 4]}" opacity="0.95"/>
      <rect x="${(x + 4).toFixed(1)}" y="${(shelf - h - 12).toFixed(1)}" width="6" height="14" fill="#1a1010"/>`;
  }
  return `<svg class="illus" viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Бар Антракт">
    ${defs(id)}
    <rect width="1000" height="600" fill="url(#${id}-wall)"/>
    <rect x="110" y="120" width="780" height="200" fill="#120909"/>
    <rect x="110" y="210" width="780" height="6" fill="#b99a60" opacity="0.7"/>
    <rect x="110" y="300" width="780" height="6" fill="#b99a60" opacity="0.7"/>
    ${bottles}
    ${[220, 500, 780].map((x) => `<line x1="${x}" y1="0" x2="${x}" y2="70" stroke="#b99a60"/><path d="M${x - 40} 100 L${x + 40} 100 L${x + 18} 70 L${x - 18} 70 Z" fill="#b99a60"/><ellipse cx="${x}" cy="140" rx="110" ry="70" fill="url(#${id}-lamp)" opacity="0.75"/>`).join('')}
    <rect x="60" y="400" width="880" height="40" fill="#4a0b12"/>
    <rect x="60" y="396" width="880" height="6" fill="#b99a60"/>
    <rect x="80" y="440" width="840" height="160" fill="#140707"/>
    ${[200, 320, 680, 800].map((x) => `<rect x="${x - 6}" y="330" width="12" height="40" rx="3" fill="#f2eeee" opacity="0.25"/><path d="M${x - 14} 350 L${x + 14} 350 L${x + 8} 396 L${x - 8} 396 Z" fill="#a31320" opacity="0.8"/>`).join('')}
    <rect width="1000" height="600" fill="url(#${id}-vig)"/>
  </svg>`;
}

/** VIP-зал: реклайнеры и столики. */
export function vipScene() {
  const id = `ill${++uid}`;
  let chairs = '';
  [0, 1, 2].forEach((r) => {
    const y = 360 + r * 90;
    const s = 0.7 + r * 0.25;
    const count = 4;
    for (let i = 0; i < count; i++) {
      const x = 500 + (i - (count - 1) / 2) * 200 * s;
      chairs += `<g transform="translate(${x.toFixed(1)} ${y}) scale(${s.toFixed(2)})">
        <rect x="-70" y="-90" width="140" height="80" rx="26" fill="#3a2a18"/>
        <rect x="-82" y="-30" width="164" height="50" rx="18" fill="#2a1d10"/>
        <rect x="-86" y="-60" width="22" height="70" rx="10" fill="#4d391f"/>
        <rect x="64" y="-60" width="22" height="70" rx="10" fill="#4d391f"/>
        <rect x="-60" y="-84" width="120" height="6" rx="3" fill="#b99a60" opacity="0.6"/>
        <circle cx="72" cy="-62" r="4" fill="#a31320"/>
      </g>`;
    }
  });
  return `<svg class="illus" viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid slice" role="img" aria-label="VIP-зал Обскура">
    ${defs(id, '#3a2a18')}
    <rect width="1000" height="600" fill="url(#${id}-wall)"/>
    <rect x="270" y="70" width="460" height="190" rx="4" fill="url(#${id}-screen)" opacity="0.9"/>
    <rect x="270" y="260" width="460" height="160" fill="url(#${id}-spill)"/>
    ${[80, 920].map((x) => `<ellipse cx="${x}" cy="200" rx="90" ry="120" fill="url(#${id}-lamp)" opacity="0.55"/><rect x="${x - 8}" y="186" width="16" height="26" rx="4" fill="#b99a60"/>`).join('')}
    <rect x="0" y="300" width="1000" height="300" fill="url(#${id}-floor)"/>
    ${chairs}
    <rect width="1000" height="600" fill="url(#${id}-vig)"/>
  </svg>`;
}

/** Мини-схема зала для карточек залов. */
export function miniMap(hall) {
  const rows = hall.rows;
  const maxSeats = Math.max(...rows.map((r) => r.seats));
  const cell = 10;
  const w = maxSeats * cell + 40;
  const h = rows.length * cell + 50;
  let out = '';
  rows.forEach((row, ri) => {
    const offset = ((maxSeats - row.seats) * cell) / 2;
    for (let n = 1; n <= row.seats; n++) {
      const vip = row.type === 'vip' || (row.vipRange && n >= row.vipRange[0] && n <= row.vipRange[1]);
      const aisle = (row.aisles || []).filter((a) => a < n).length * 3;
      out += `<rect x="${20 + offset + (n - 1) * cell + aisle - 6}" y="${40 + ri * cell}" width="${cell - 3}" height="${cell - 3}" rx="2" fill="${vip ? '#b99a60' : '#4a3a3a'}" opacity="${vip ? 0.95 : 0.8}"/>`;
    }
  });
  return `<svg class="mini-map" viewBox="0 0 ${w} ${h}" role="img" aria-label="Схема зала ${hall.name}">
    <path d="M${w * 0.15} 16 Q${w / 2} 6 ${w * 0.85} 16" stroke="#f2eeee" stroke-width="2.5" fill="none" opacity="0.8"/>
    <text x="${w / 2}" y="30" text-anchor="middle" font-size="7" fill="#a49b9b" font-family="Manrope, sans-serif" letter-spacing="2">ЭКРАН</text>
    ${out}
  </svg>`;
}
