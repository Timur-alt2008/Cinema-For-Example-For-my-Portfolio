// Генератор оригинальных кинопостеров в SVG.
// Каждый фильм получает свою композицию (мотив), палитру и типографику.
// Постеры векторные: чёткие на любом экране и ничего не весят.

import { rng } from '../lib/rand.js';
import { esc } from '../lib/dom.js';

let uid = 0;
const W = 400;
const H = 600;

/* ------------------------------ помощники ------------------------------ */

function figure(x, y, h, fill = '#050404', extra = '') {
  const t = y - h;
  const p = (v) => (v * h).toFixed(1);
  return `<g fill="${fill}" ${extra}>
    <circle cx="${x}" cy="${(t + 0.075 * h).toFixed(1)}" r="${p(0.072)}"/>
    <path d="M${x - 0.115 * h} ${t + 0.2 * h} Q${x} ${t + 0.15 * h} ${x + 0.115 * h} ${t + 0.2 * h}
      L${x + 0.135 * h} ${t + 0.56 * h} L${x + 0.075 * h} ${t + 0.57 * h} L${x + 0.065 * h} ${y}
      L${x + 0.012 * h} ${y} L${x} ${t + 0.63 * h} L${x - 0.012 * h} ${y} L${x - 0.065 * h} ${y}
      L${x - 0.075 * h} ${t + 0.57 * h} L${x - 0.135 * h} ${t + 0.56 * h} Z"/>
  </g>`;
}

function stars(random, count, { x0 = 0, x1 = W, y0 = 0, y1 = H * 0.6, color = '#fff', max = 1.3 } = {}) {
  let out = '';
  for (let i = 0; i < count; i++) {
    const x = (x0 + random() * (x1 - x0)).toFixed(1);
    const y = (y0 + Math.pow(random(), 1.4) * (y1 - y0)).toFixed(1);
    const r = (0.3 + random() * max).toFixed(2);
    out += `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" opacity="${(0.25 + random() * 0.7).toFixed(2)}"/>`;
  }
  return out;
}

/* ------------------------------ мотивы ------------------------------ */
// Каждый мотив рисуется в системе координат 400 × 600.

const MOTIFS = {
  corridor({ id, a, l }) {
    const vx = 200, vy = 292;
    let walls = '';
    let frames = '';
    let lamps = '';
    let prev = { w: 420, h: 640 };
    for (let k = 1; k <= 8; k++) {
      const s = Math.pow(0.7, k);
      const w = 420 * s, h = 640 * s;
      const p = { x0: vx - prev.w / 2, x1: vx + prev.w / 2, y0: vy - prev.h / 2, y1: vy + prev.h / 2 };
      const c = { x0: vx - w / 2, x1: vx + w / 2, y0: vy - h / 2, y1: vy + h / 2 };
      const shade = k % 2 ? 0.16 : 0.06;
      walls += `<polygon points="${p.x0},${p.y0} ${c.x0},${c.y0} ${c.x0},${c.y1} ${p.x0},${p.y1}" fill="url(#${id}-mir)" opacity="${shade + 0.1}"/>`;
      walls += `<polygon points="${p.x1},${p.y0} ${c.x1},${c.y0} ${c.x1},${c.y1} ${p.x1},${p.y1}" fill="url(#${id}-mir)" opacity="${shade + 0.1}"/>`;
      frames += `<rect x="${c.x0}" y="${c.y0}" width="${w}" height="${h}" fill="none" stroke="${l}" stroke-opacity="${0.5 - k * 0.04}" stroke-width="${Math.max(0.4, 2.4 * s * 1.4)}"/>`;
      lamps += `<ellipse cx="${vx}" cy="${c.y0 + h * 0.06}" rx="${w * 0.08}" ry="${h * 0.012 + 0.6}" fill="${l}" opacity="${0.85 - k * 0.07}"/>`;
      prev = { w, h };
    }
    return `
      <rect x="${vx - 9}" y="${vy - 13}" width="18" height="26" fill="url(#${id}-end)"/>
      ${walls}
      <polygon points="40,600 360,600 ${vx + 7},${vy + 13} ${vx - 7},${vy + 13}" fill="${a}" opacity="0.55"/>
      <polygon points="120,600 280,600 ${vx + 3},${vy + 13} ${vx - 3},${vy + 13}" fill="#000" opacity="0.25"/>
      ${frames}
      ${lamps}
      <ellipse cx="${vx}" cy="${vy}" rx="90" ry="120" fill="url(#${id}-glowL)" opacity="0.7"/>
      ${figure(vx, vy + 12, 22, '#050303')}
      ${figure(vx + 2, vy + 12, 22, a, 'opacity="0.0"')}
    `;
  },

  house({ id, a, l, r }) {
    return `
      <circle cx="292" cy="150" r="54" fill="${l}" opacity="0.9"/>
      <circle cx="292" cy="150" r="130" fill="url(#${id}-glowL)" opacity="0.55"/>
      ${stars(r, 40, { y1: 260, color: l })}
      <path d="M0 470 L60 430 L120 445 L170 405 L240 398 L300 415 L360 400 L400 410 L400 600 L0 600 Z" fill="#050606"/>
      <rect x="0" y="470" width="400" height="130" fill="url(#${id}-fog)" opacity="0.5"/>
      <g fill="#030303">
        <path d="M150 405 L150 318 L200 278 L250 318 L250 405 Z"/>
        <rect x="226" y="276" width="13" height="34"/>
        <path d="M250 405 L250 340 L300 340 L300 405 Z"/>
        <path d="M246 342 L275 316 L304 342 Z"/>
        <path d="M118 405 L118 300 L131 284 L144 300 L144 405 Z"/>
      </g>
      <rect x="190" y="332" width="20" height="26" fill="${l}" opacity="0.95"/>
      <rect x="190" y="332" width="20" height="26" fill="url(#${id}-glowA)" opacity="0.9"/>
      <circle cx="200" cy="345" r="46" fill="url(#${id}-glowA)" opacity="0.65"/>
      ${figure(200, 358, 18, '#0a0303')}
      <rect x="265" y="358" width="12" height="16" fill="${l}" opacity="0.18"/>
      <path d="M40 470 C42 420 38 380 52 340 M50 360 C30 350 20 330 14 318 M52 342 C66 320 82 312 96 300 M47 390 C62 380 70 372 80 360"
        stroke="#030303" stroke-width="3.2" fill="none" stroke-linecap="round"/>
    `;
  },

  door({ id, a, l }) {
    return `
      <rect x="0" y="0" width="400" height="600" fill="url(#${id}-wall)"/>
      <polygon points="150,470 250,470 400,600 0,600" fill="url(#${id}-spill)"/>
      <rect x="128" y="112" width="144" height="362" fill="#070505" stroke="${l}" stroke-opacity="0.18" stroke-width="2"/>
      <polygon points="138,124 206,124 206,470 138,470" fill="url(#${id}-gap)"/>
      <polygon points="206,124 262,108 262,486 206,470" fill="#0d0908"/>
      <polygon points="206,124 262,108 262,486 206,470" fill="url(#${id}-panel)"/>
      <circle cx="252" cy="300" r="3.4" fill="#b99a60"/>
      ${figure(172, 470, 120, '#060403', 'opacity="0.92"')}
      <path d="M150 600 L172 470 L194 600 Z" fill="#000" opacity="0.55"/>
      <rect x="182" y="78" width="36" height="24" rx="2" fill="none" stroke="#b99a60" stroke-width="1.2"/>
      <text x="200" y="95" text-anchor="middle" font-family="Oswald, sans-serif" font-size="15" fill="#b99a60" letter-spacing="1">13</text>
      <ellipse cx="172" cy="300" rx="140" ry="220" fill="url(#${id}-glowL)" opacity="0.35"/>
    `;
  },

  hand({ id, a, l, r }) {
    let stripes = '';
    for (let x = 6; x < 400; x += 22) stripes += `<rect x="${x}" y="0" width="1" height="600" fill="${l}" opacity="0.045"/>`;
    const palm = (cx, cy, s, op) => `
      <g transform="translate(${cx} ${cy}) scale(${s})" fill="${a}" opacity="${op}">
        <path d="M-46 30 C-52 -10 -40 -40 0 -42 C40 -40 54 -12 48 30 C44 64 26 86 0 88 C-24 86 -42 64 -46 30 Z"/>
        <rect x="-50" y="-128" width="20" height="96" rx="10" transform="rotate(-8 -40 -40)"/>
        <rect x="-24" y="-152" width="21" height="116" rx="10.5"/>
        <rect x="3" y="-156" width="21" height="120" rx="10.5"/>
        <rect x="28" y="-138" width="20" height="104" rx="10" transform="rotate(7 38 -40)"/>
        <rect x="44" y="-30" width="20" height="78" rx="10" transform="rotate(48 54 10)"/>
      </g>`;
    let drips = '';
    for (let i = 0; i < 6; i++) {
      const x = 150 + r() * 110;
      const len = 30 + r() * 110;
      drips += `<rect x="${x.toFixed(1)}" y="${360 + r() * 30}" width="${(2 + r() * 3).toFixed(1)}" height="${len.toFixed(1)}" rx="2" fill="${a}" opacity="0.6"/>`;
    }
    return `
      ${stripes}
      <ellipse cx="200" cy="260" rx="220" ry="260" fill="url(#${id}-glowL)" opacity="0.3"/>
      ${palm(208, 300, 1.25, 0.9)}
      ${drips}
      ${palm(318, 170, 0.5, 0.25)}
      <path d="M0 120 L60 150 L90 132 L140 170 M400 420 L350 400 L330 430 L290 420 L270 450" stroke="${l}" stroke-opacity="0.25" fill="none" stroke-width="1.2"/>
    `;
  },

  moon({ id, a, l }) {
    const hang = [
      { x: 120, len: 150, shape: 'star' },
      { x: 170, len: 210, shape: 'moon' },
      { x: 230, len: 180, shape: 'star' },
      { x: 280, len: 130, shape: 'drop' },
    ];
    const shapes = hang.map(({ x, len, shape }) => {
      const y = 70 + len;
      let s = '';
      if (shape === 'star') s = `<path d="M${x} ${y - 16} L${x + 5} ${y - 5} L${x + 16} ${y - 4} L${x + 8} ${y + 4} L${x + 10} ${y + 15} L${x} ${y + 9} L${x - 10} ${y + 15} L${x - 8} ${y + 4} L${x - 16} ${y - 4} L${x - 5} ${y - 5} Z"/>`;
      if (shape === 'moon') s = `<path d="M${x + 6} ${y - 18} A18 18 0 1 0 ${x + 6} ${y + 18} A14 14 0 1 1 ${x + 6} ${y - 18} Z"/>`;
      if (shape === 'drop') s = `<path d="M${x} ${y - 14} C${x + 12} ${y} ${x + 10} ${y + 12} ${x} ${y + 12} C${x - 10} ${y + 12} ${x - 12} ${y} ${x} ${y - 14} Z"/>`;
      return `<line x1="${x}" y1="70" x2="${x}" y2="${y - 14}" stroke="#050404" stroke-width="1.2"/>${s}`;
    }).join('');
    let bars = '';
    for (let x = 60; x <= 340; x += 26) bars += `<rect x="${x}" y="470" width="6" height="140" fill="#050404"/>`;
    return `
      <circle cx="200" cy="250" r="158" fill="url(#${id}-moon)"/>
      <circle cx="200" cy="250" r="240" fill="url(#${id}-glowL)" opacity="0.4"/>
      <circle cx="160" cy="210" r="22" fill="#000" opacity="0.05"/>
      <circle cx="250" cy="300" r="34" fill="#000" opacity="0.05"/>
      <path d="M90 70 L310 70" stroke="#050404" stroke-width="3"/>
      <path d="M200 70 L200 20" stroke="#050404" stroke-width="2"/>
      <g fill="#050404">${shapes}</g>
      <rect x="40" y="458" width="320" height="16" rx="4" fill="#050404"/>
      ${bars}
      <path d="M200 600 L200 510" stroke="${a}" stroke-width="0"/>
    `;
  },

  forest({ id, a, l, r }) {
    let back = '';
    let front = '';
    for (let i = 0; i < 26; i++) {
      const x = r() * 420 - 10;
      const w = 3 + r() * 7;
      back += `<rect x="${x.toFixed(1)}" y="0" width="${w.toFixed(1)}" height="600" fill="#0b120e" opacity="${(0.5 + r() * 0.4).toFixed(2)}"/>`;
    }
    for (let i = 0; i < 9; i++) {
      const x = r() * 420 - 20;
      if (x > 150 && x < 230) continue;
      const w = 12 + r() * 22;
      front += `<rect x="${x.toFixed(1)}" y="0" width="${w.toFixed(1)}" height="600" fill="#020302"/>`;
    }
    const eyes = (x, y, s) => `
      <g fill="${a}"><ellipse cx="${x - 7 * s}" cy="${y}" rx="${3.2 * s}" ry="${1.6 * s}"/><ellipse cx="${x + 7 * s}" cy="${y}" rx="${3.2 * s}" ry="${1.6 * s}"/></g>
      <ellipse cx="${x}" cy="${y}" rx="${26 * s}" ry="${10 * s}" fill="url(#${id}-glowA)" opacity="0.8"/>`;
    return `
      <rect x="0" y="0" width="400" height="600" fill="url(#${id}-glowL)" opacity="0.35"/>
      ${back}
      <rect x="0" y="260" width="400" height="200" fill="url(#${id}-fogBand)" opacity="0.65"/>
      <polygon points="170,600 230,600 205,330 195,330" fill="${l}" opacity="0.08"/>
      ${eyes(150, 318, 1)}
      ${eyes(268, 352, 0.7)}
      ${eyes(96, 400, 0.55)}
      ${front}
      <rect x="0" y="430" width="400" height="170" fill="url(#${id}-fog)" opacity="0.55"/>
      ${figure(200, 520, 70, '#020302')}
    `;
  },

  eye({ id, a, l }) {
    let lashes = '';
    for (let i = 0; i < 15; i++) {
      const t = i / 14;
      const x = 70 + t * 260;
      const y = 300 - Math.sin(t * Math.PI) * 110;
      const dx = (t - 0.5) * 30;
      lashes += `<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${(x + dx).toFixed(1)}" y2="${(y - 30 - Math.sin(t * Math.PI) * 10).toFixed(1)}" stroke="#050505" stroke-width="2.4" stroke-linecap="round"/>`;
    }
    return `
      <ellipse cx="200" cy="300" rx="230" ry="200" fill="url(#${id}-glowA)" opacity="0.35"/>
      <path d="M60 300 Q200 170 340 300 Q200 430 60 300 Z" fill="#e8e1d8" opacity="0.92"/>
      <path d="M60 300 Q200 170 340 300 Q200 430 60 300 Z" fill="url(#${id}-sclera)"/>
      <circle cx="200" cy="300" r="78" fill="url(#${id}-iris)"/>
      <circle cx="200" cy="300" r="78" fill="none" stroke="#050505" stroke-width="4"/>
      <circle cx="200" cy="300" r="34" fill="#030303"/>
      ${figure(200, 322, 34, l, 'opacity="0.5"')}
      <ellipse cx="226" cy="274" rx="10" ry="6" fill="#fff" opacity="0.75"/>
      <path d="M60 300 Q200 170 340 300" fill="none" stroke="#050505" stroke-width="5"/>
      ${lashes}
      <path d="M60 300 Q200 430 340 300" fill="none" stroke="#050505" stroke-width="3"/>
      <line x1="110" y1="360" x2="96" y2="520" stroke="${a}" stroke-width="2" opacity="0.7"/>
    `;
  },

  thread({ id, a, l }) {
    return `
      <ellipse cx="200" cy="250" rx="200" ry="260" fill="url(#${id}-glowL)" opacity="0.35"/>
      <path d="M200 64 C214 64 214 84 200 86 M200 86 L136 118 L264 118 Z" fill="none" stroke="#b99a60" stroke-width="2"/>
      <path d="M168 118 C160 160 170 196 178 214 C150 270 116 380 96 470 L304 470 C284 380 250 270 222 214 C230 196 240 160 232 118 Z" fill="${l}" opacity="0.9"/>
      <path d="M168 118 C160 160 170 196 178 214 C150 270 116 380 96 470 L304 470 C284 380 250 270 222 214 C230 196 240 160 232 118 Z" fill="url(#${id}-dress)"/>
      <path d="M178 214 Q200 226 222 214" stroke="#b99a60" stroke-width="1.5" fill="none" opacity="0.7"/>
      <path d="M214 300 C260 280 330 290 320 340 C310 390 220 360 240 420 C258 476 360 470 372 540 C378 580 330 600 300 610"
        fill="none" stroke="${a}" stroke-width="3" stroke-linecap="round"/>
      <path d="M214 300 C190 310 160 330 150 300 C140 270 190 250 200 280" fill="none" stroke="${a}" stroke-width="2.5"/>
      <path d="M40 520 L110 450" stroke="#cfcfcf" stroke-width="2.2" stroke-linecap="round"/>
      <ellipse cx="44" cy="516" rx="3" ry="1.6" fill="none" stroke="#cfcfcf" transform="rotate(-45 44 516)"/>
      <path d="M44 516 C80 540 140 560 170 600" fill="none" stroke="${a}" stroke-width="2"/>
    `;
  },

  blast({ id, a, l, r }) {
    let sky = '';
    for (let i = 0; i < 14; i++) {
      const x = r() * 400, h = 80 + r() * 170, w = 24 + r() * 40;
      sky += `<rect x="${x.toFixed(1)}" y="${(420 - h).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="#090404"/>`;
    }
    let sparks = '';
    for (let i = 0; i < 46; i++) {
      sparks += `<circle cx="${(r() * 400).toFixed(1)}" cy="${(r() * 460).toFixed(1)}" r="${(0.6 + r() * 1.8).toFixed(2)}" fill="${l}" opacity="${(0.3 + r() * 0.6).toFixed(2)}"/>`;
    }
    return `
      <circle cx="200" cy="330" r="260" fill="url(#${id}-glowA)" opacity="0.95"/>
      <circle cx="200" cy="340" r="120" fill="url(#${id}-glowL)" opacity="0.9"/>
      ${sky}
      <path d="M0 420 Q200 300 400 420" stroke="#090404" stroke-width="8" fill="none"/>
      <g stroke="#090404" stroke-width="1.6">${Array.from({ length: 13 }, (_, i) => { const x = 20 + i * 30; const y = 420 - Math.sin((x / 400) * Math.PI) * 120 * 0.83; return `<line x1="${x}" y1="${y.toFixed(1)}" x2="${x}" y2="430"/>`; }).join('')}</g>
      <rect x="0" y="425" width="400" height="175" fill="#070303"/>
      ${sparks}
      ${figure(200, 590, 210, '#030101')}
    `;
  },

  city({ id, a, l, r }) {
    let roofs = '';
    let x = -10;
    while (x < 410) {
      const w = 26 + r() * 40, h = 90 + r() * 110;
      roofs += `<rect x="${x.toFixed(1)}" y="${(470 - h).toFixed(1)}" width="${w.toFixed(1)}" height="${h + 10}" fill="#1a0b08"/>`;
      roofs += `<polygon points="${x - 2},${470 - h} ${x + w / 2},${470 - h - 14 - r() * 10} ${x + w + 2},${470 - h}" fill="#1a0b08"/>`;
      for (let wy = 470 - h + 14; wy < 450; wy += 18) {
        for (let wx = x + 6; wx < x + w - 8; wx += 12) {
          if (r() < 0.32) roofs += `<rect x="${wx.toFixed(1)}" y="${wy.toFixed(1)}" width="4" height="7" fill="${l}" opacity="${(0.4 + r() * 0.5).toFixed(2)}"/>`;
        }
      }
      x += w + 2;
    }
    let birds = '';
    for (let i = 0; i < 7; i++) {
      const bx = 60 + r() * 280, by = 80 + r() * 140, s = 4 + r() * 5;
      birds += `<path d="M${bx - s} ${by} Q${bx - s / 2} ${by - s / 2} ${bx} ${by} Q${bx + s / 2} ${by - s / 2} ${bx + s} ${by}" stroke="#1a0b08" stroke-width="1.4" fill="none"/>`;
    }
    return `
      <circle cx="200" cy="300" r="96" fill="${l}" opacity="0.92"/>
      <circle cx="200" cy="300" r="240" fill="url(#${id}-glowA)" opacity="0.55"/>
      <path d="M180 196 Q196 160 220 170 Q226 140 250 150" stroke="${l}" stroke-opacity="0" fill="none"/>
      ${roofs}
      <path d="M0 440 L400 412" stroke="#1a0b08" stroke-width="1.2"/>
      <rect x="0" y="470" width="400" height="130" fill="#140806"/>
      <g transform="translate(120 452)">
        <rect x="0" y="0" width="150" height="64" rx="10" fill="${a}"/>
        <rect x="0" y="40" width="150" height="24" rx="4" fill="#3a1408" opacity="0.6"/>
        ${[12, 44, 76, 108].map((wx) => `<rect x="${wx}" y="10" width="26" height="22" rx="3" fill="${l}" opacity="0.9"/>`).join('')}
        <line x1="75" y1="0" x2="98" y2="-40" stroke="#1a0b08" stroke-width="2"/>
      </g>
      <path d="M0 412 L400 412" stroke="#1a0b08" stroke-width="1"/>
      ${birds}
    `;
  },

  rings({ id, a, l, r }) {
    let confetti = '';
    const colors = [a, l, '#c41a29', '#ffffff'];
    for (let i = 0; i < 60; i++) {
      confetti += `<rect x="${(r() * 400).toFixed(1)}" y="${(r() * 520).toFixed(1)}" width="${(3 + r() * 5).toFixed(1)}" height="${(5 + r() * 8).toFixed(1)}" fill="${colors[i % colors.length]}" opacity="${(0.35 + r() * 0.6).toFixed(2)}" transform="rotate(${(r() * 180).toFixed(0)} ${(r() * 400).toFixed(0)} ${(r() * 520).toFixed(0)})"/>`;
    }
    return `
      <circle cx="200" cy="270" r="230" fill="url(#${id}-glowA)" opacity="0.4"/>
      ${confetti}
      <circle cx="165" cy="285" r="86" fill="none" stroke="url(#${id}-gold)" stroke-width="22"/>
      <ellipse cx="245" cy="265" rx="86" ry="78" fill="none" stroke="url(#${id}-gold)" stroke-width="22" transform="rotate(-18 245 265)"/>
      <path d="M296 196 l12 -8 M302 208 l16 -3" stroke="${l}" stroke-width="2" stroke-linecap="round"/>
      <circle cx="226" cy="190" r="14" fill="#fff" opacity="0.85"/>
      <circle cx="226" cy="190" r="34" fill="#fff" opacity="0.12"/>
    `;
  },

  dish({ id, a, l, r }) {
    return `
      ${stars(r, 160, { y1: 470, color: l, max: 1 })}
      <path d="M-20 260 Q200 120 420 60" stroke="${l}" stroke-opacity="0.08" stroke-width="80" fill="none"/>
      ${[30, 60, 92, 126].map((rr, i) => `<circle cx="300" cy="130" r="${rr}" fill="none" stroke="${a}" stroke-width="1.4" opacity="${0.75 - i * 0.16}"/>`).join('')}
      <circle cx="300" cy="130" r="4" fill="${a}"/>
      <path d="M0 492 Q120 470 220 482 T400 476 L400 600 L0 600 Z" fill="#06070a"/>
      <g transform="rotate(-28 170 380)">
        <path d="M80 380 A90 40 0 0 0 260 380 Z" fill="#0b0d12" stroke="${l}" stroke-opacity="0.35"/>
        <line x1="170" y1="378" x2="170" y2="322" stroke="${l}" stroke-opacity="0.5" stroke-width="2"/>
        <circle cx="170" cy="320" r="5" fill="${a}"/>
      </g>
      <polygon points="150,486 196,486 182,420 164,420" fill="#06070a"/>
      <line x1="170" y1="330" x2="300" y2="130" stroke="${a}" stroke-width="1" stroke-dasharray="3 5" opacity="0.8"/>
      ${figure(260, 494, 30, '#06070a')}
    `;
  },

  lantern({ id, a, l, r }) {
    let flies = '';
    for (let i = 0; i < 30; i++) {
      flies += `<circle cx="${(r() * 400).toFixed(1)}" cy="${(150 + r() * 380).toFixed(1)}" r="${(0.8 + r() * 1.8).toFixed(2)}" fill="${l}" opacity="${(0.4 + r() * 0.6).toFixed(2)}"/>`;
    }
    let houses = '';
    [[-10, 380, 90], [70, 410, 70], [300, 390, 110], [250, 420, 60]].forEach(([x, y, w]) => {
      houses += `<path d="M${x} 600 L${x} ${y} L${x + w / 2} ${y - w * 0.45} L${x + w} ${y} L${x + w} 600 Z" fill="#06121a"/>`;
      houses += `<rect x="${x + w * 0.35}" y="${y + 20}" width="${w * 0.22}" height="${w * 0.25}" fill="${l}" opacity="0.55"/>`;
    });
    return `
      ${stars(r, 60, { y1: 300, color: '#fff', max: 0.9 })}
      <circle cx="200" cy="200" r="190" fill="url(#${id}-glowA)" opacity="0.75"/>
      ${houses}
      <rect x="194" y="210" width="12" height="390" fill="#03080c"/>
      <path d="M176 210 L224 210 L216 160 L184 160 Z" fill="#03080c"/>
      <rect x="184" y="168" width="32" height="38" fill="${l}"/>
      <circle cx="200" cy="186" r="60" fill="url(#${id}-glowL)"/>
      <path d="M182 160 L200 140 L218 160 Z" fill="#03080c"/>
      <g stroke="#03080c" stroke-width="5"><line x1="236" y1="600" x2="232" y2="260"/><line x1="276" y1="600" x2="268" y2="260"/></g>
      <g stroke="#03080c" stroke-width="4">${[300, 350, 400, 450, 500, 550].map((y) => `<line x1="233" y1="${y}" x2="273" y2="${y}"/>`).join('')}</g>
      ${figure(252, 300, 60, '#03080c')}
      <line x1="244" y1="262" x2="214" y2="200" stroke="#03080c" stroke-width="3"/>
      ${flies}
    `;
  },

  attic({ id, a, l }) {
    return `
      <polygon points="200,40 0,330 0,600 400,600 400,330" fill="#0c0807"/>
      <polygon points="200,40 0,330 22,330 200,70 378,330 400,330" fill="#050303"/>
      ${[110, 170, 230].map((y, i) => `<line x1="${200 - (y - 40) * 0.69}" y1="${y}" x2="${200 + (y - 40) * 0.69}" y2="${y}" stroke="#050303" stroke-width="${6 - i}"/>`).join('')}
      <circle cx="200" cy="150" r="36" fill="${l}" opacity="0.9"/>
      <line x1="164" y1="150" x2="236" y2="150" stroke="#050303" stroke-width="4"/>
      <line x1="200" y1="114" x2="200" y2="186" stroke="#050303" stroke-width="4"/>
      <polygon points="172,170 228,170 330,600 70,600" fill="url(#${id}-beam)"/>
      <ellipse cx="200" cy="540" rx="150" ry="30" fill="${l}" opacity="0.08"/>
      <g fill="none" stroke="#020101" stroke-width="7" stroke-linecap="round">
        <path d="M168 540 Q200 560 250 536"/>
        <line x1="182" y1="545" x2="186" y2="470"/>
        <line x1="236" y1="540" x2="232" y2="470"/>
        <line x1="186" y1="470" x2="232" y2="470"/>
        <line x1="186" y1="470" x2="176" y2="384"/>
        <line x1="176" y1="384" x2="222" y2="380"/>
        <line x1="222" y1="380" x2="232" y2="470"/>
      </g>
      <ellipse cx="200" cy="300" rx="200" ry="300" fill="url(#${id}-glowA)" opacity="0.18"/>
    `;
  },

  stairs({ id, a, l }) {
    let rings = '';
    for (let k = 0; k < 9; k++) {
      const rr = 250 * Math.pow(0.8, k);
      const op = 0.55 - k * 0.04;
      rings += `<circle cx="200" cy="300" r="${rr.toFixed(1)}" fill="none" stroke="${l}" stroke-opacity="${op.toFixed(2)}" stroke-width="${(18 * Math.pow(0.8, k)).toFixed(1)}" stroke-dasharray="${(rr * 0.12).toFixed(1)} ${(rr * 0.03).toFixed(1)}" transform="rotate(${k * 17} 200 300)"/>`;
      rings += `<circle cx="200" cy="300" r="${(rr - 10 * Math.pow(0.8, k)).toFixed(1)}" fill="none" stroke="#000" stroke-opacity="0.6" stroke-width="2"/>`;
    }
    let spiral = 'M200 300';
    for (let t = 0; t < 40; t += 0.25) {
      const rr = 6 + t * 6.2;
      spiral += ` L${(200 + Math.cos(t) * rr).toFixed(1)} ${(300 + Math.sin(t) * rr).toFixed(1)}`;
    }
    return `
      <circle cx="200" cy="300" r="280" fill="url(#${id}-glowL)" opacity="0.35"/>
      ${rings}
      <path d="${spiral}" fill="none" stroke="#b99a60" stroke-width="1.6" opacity="0.6"/>
      <circle cx="200" cy="300" r="22" fill="#000"/>
      <circle cx="200" cy="300" r="7" fill="${a}"/>
      <ellipse cx="200" cy="300" rx="40" ry="40" fill="url(#${id}-glowA)" opacity="0.9"/>
    `;
  },

  planet({ id, a, l, r }) {
    return `
      ${stars(r, 180, { y1: 600, color: '#fff', max: 1 })}
      <circle cx="210" cy="430" r="250" fill="url(#${id}-planet)"/>
      <circle cx="210" cy="430" r="250" fill="none" stroke="${l}" stroke-opacity="0.35" stroke-width="2"/>
      <ellipse cx="210" cy="430" rx="360" ry="60" fill="none" stroke="${l}" stroke-opacity="0.35" stroke-width="3" transform="rotate(-12 210 430)"/>
      <ellipse cx="210" cy="430" rx="330" ry="50" fill="none" stroke="${a}" stroke-opacity="0.5" stroke-width="1.2" transform="rotate(-12 210 430)"/>
      <g transform="translate(120 140) rotate(-18)">
        <rect x="-60" y="-4" width="120" height="8" fill="#c9cfdb"/>
        <rect x="-86" y="-16" width="30" height="32" fill="#22324e" stroke="#c9cfdb" stroke-width="1"/>
        <rect x="56" y="-16" width="30" height="32" fill="#22324e" stroke="#c9cfdb" stroke-width="1"/>
        <rect x="-12" y="-12" width="24" height="24" rx="4" fill="#dfe4ee"/>
        <circle cx="0" cy="0" r="4" fill="${a}"/>
      </g>
    `;
  },

  kite({ id, a, l, r }) {
    let bows = '';
    for (let i = 0; i < 6; i++) {
      const x = 254 + i * 14, y = 236 + i * 26 + Math.sin(i) * 8;
      bows += `<path d="M${x - 7} ${y - 5} L${x + 7} ${y + 5} M${x - 7} ${y + 5} L${x + 7} ${y - 5}" stroke="${i % 2 ? l : a}" stroke-width="3" stroke-linecap="round"/>`;
    }
    let clouds = '';
    for (let i = 0; i < 4; i++) {
      const cx = r() * 400, cy = 60 + r() * 200;
      clouds += `<g fill="#fff" opacity="0.12"><ellipse cx="${cx}" cy="${cy}" rx="60" ry="16"/><ellipse cx="${cx + 30}" cy="${cy - 10}" rx="34" ry="14"/></g>`;
    }
    return `
      <circle cx="90" cy="120" r="44" fill="${l}" opacity="0.85"/>
      <circle cx="90" cy="120" r="130" fill="url(#${id}-glowL)" opacity="0.4"/>
      ${clouds}
      <ellipse cx="80" cy="610" rx="300" ry="170" fill="#1d3b2c"/>
      <ellipse cx="360" cy="640" rx="260" ry="190" fill="#163024"/>
      <ellipse cx="200" cy="660" rx="300" ry="150" fill="#0f2219"/>
      <path d="M150 512 Q200 360 246 228" stroke="${l}" stroke-width="1" fill="none" opacity="0.8"/>
      <g transform="translate(246 190) rotate(18)">
        <polygon points="0,-58 40,0 0,52 -40,0" fill="${a}"/>
        <polygon points="0,-58 40,0 0,0" fill="${l}" opacity="0.9"/>
        <polygon points="0,52 -40,0 0,0" fill="${l}" opacity="0.9"/>
        <line x1="0" y1="-58" x2="0" y2="52" stroke="#0f2219" stroke-width="2"/>
        <line x1="-40" y1="0" x2="40" y2="0" stroke="#0f2219" stroke-width="2"/>
      </g>
      <path d="M250 240 C270 300 300 340 320 380" stroke="${l}" stroke-width="1" fill="none" opacity="0.6"/>
      ${bows}
      ${figure(148, 532, 40, '#0b1912')}
      <g transform="translate(330 140) rotate(-20)"><ellipse cx="0" cy="6" rx="22" ry="5" fill="#d9a35b"/><path d="M-12 6 Q-10 -12 0 -12 Q10 -12 12 6 Z" fill="#d9a35b"/><rect x="-12" y="-1" width="24" height="4" fill="${a}"/></g>
    `;
  },
};

/* ------------------------------ типографика ------------------------------ */

const FONT = {
  serif: { family: 'Cormorant Garamond, Georgia, serif', weight: 600, ratio: 0.66, spacing: 1, upper: true },
  cond: { family: 'Oswald, Arial Narrow, sans-serif', weight: 500, ratio: 0.56, spacing: 3, upper: true },
  sans: { family: 'Manrope, Arial, sans-serif', weight: 800, ratio: 0.74, spacing: 0, upper: true },
};

function splitTitle(title) {
  const words = title.split(' ');
  if (words.length === 1) return [title];
  if (words.length === 2) return words;
  const lines = [];
  let cur = '';
  words.forEach((w) => {
    if ((cur + ' ' + w).trim().length > 11 && cur) { lines.push(cur); cur = w; }
    else cur = (cur + ' ' + w).trim();
  });
  if (cur) lines.push(cur);
  return lines;
}

function titleBlock(film, withCast = true) {
  const f = FONT[film.art.titleFont] || FONT.serif;
  const text = f.upper ? film.title.toUpperCase() : film.title;
  const lines = splitTitle(text);
  const longest = Math.max(...lines.map((s) => s.length));
  const size = Math.min(64, Math.max(26, 330 / (longest * f.ratio + longest * f.spacing / 40)));
  const lh = size * (film.art.titleFont === 'cond' ? 1.02 : 0.98);
  const baseY = 528 - (lines.length - 1) * lh;
  const credit = `ФИЛЬМ ${film.director.toUpperCase()}`;
  const cast = film.cast.slice(0, 2).map((c) => c.replace('Голоса: ', '').toUpperCase()).join('   ');
  return `
    ${withCast ? `<text x="200" y="40" text-anchor="middle" font-family="Manrope, Arial, sans-serif" font-size="8.5" font-weight="700" letter-spacing="2.6" fill="#f2eeee" opacity="0.72" ${cast.length * 8 > 330 ? 'textLength="330" lengthAdjust="spacingAndGlyphs"' : ''}>${esc(cast)}</text>` : ''}
    <g font-family="${f.family}" font-weight="${f.weight}" text-anchor="middle" fill="#f4efea" letter-spacing="${f.spacing}">
      ${lines.map((ln, i) => `<text x="200" y="${(baseY + i * lh).toFixed(1)}" font-size="${size.toFixed(1)}">${esc(ln)}</text>`).join('')}
    </g>
    <text x="200" y="${(baseY - size - 4).toFixed(1)}" text-anchor="middle" font-family="Cormorant Garamond, Georgia, serif" font-style="italic" font-size="15" fill="${film.art.light}" opacity="0.85">${esc(film.tagline)}</text>
    <line x1="150" y1="550" x2="250" y2="550" stroke="#b99a60" stroke-width="0.8" opacity="0.6"/>
    <text x="200" y="566" text-anchor="middle" font-family="Manrope, Arial, sans-serif" font-size="7.4" font-weight="700" letter-spacing="2.6" fill="#f2eeee" opacity="0.5">${esc(credit)}</text>
    <text x="200" y="580" text-anchor="middle" font-family="Manrope, Arial, sans-serif" font-size="6.6" font-weight="600" letter-spacing="2.2" fill="#b99a60" opacity="0.6">CINEMA EXAMPLE PICTURES</text>
  `;
}

function defs(id, film) {
  const [b0, b1] = film.art.bg;
  const a = film.art.accent;
  const l = film.art.light;
  return `<defs>
    <linearGradient id="${id}-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${b0}"/><stop offset="1" stop-color="${b1}"/></linearGradient>
    <radialGradient id="${id}-glowA"><stop offset="0" stop-color="${a}" stop-opacity="0.9"/><stop offset="0.45" stop-color="${a}" stop-opacity="0.25"/><stop offset="1" stop-color="${a}" stop-opacity="0"/></radialGradient>
    <radialGradient id="${id}-glowL"><stop offset="0" stop-color="${l}" stop-opacity="0.8"/><stop offset="0.5" stop-color="${l}" stop-opacity="0.12"/><stop offset="1" stop-color="${l}" stop-opacity="0"/></radialGradient>
    <radialGradient id="${id}-vig" cx="0.5" cy="0.45" r="0.75"><stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.85"/></radialGradient>
    <linearGradient id="${id}-fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.92"/></linearGradient>
    <linearGradient id="${id}-fog" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${l}" stop-opacity="0"/><stop offset="0.5" stop-color="${l}" stop-opacity="0.18"/><stop offset="1" stop-color="${l}" stop-opacity="0"/></linearGradient>
    <linearGradient id="${id}-fogBand" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${l}" stop-opacity="0"/><stop offset="0.5" stop-color="${l}" stop-opacity="0.14"/><stop offset="1" stop-color="${l}" stop-opacity="0"/></linearGradient>
    <linearGradient id="${id}-mir" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${l}" stop-opacity="0.5"/><stop offset="0.5" stop-color="${l}" stop-opacity="0.05"/><stop offset="1" stop-color="${l}" stop-opacity="0.35"/></linearGradient>
    <radialGradient id="${id}-end"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="${l}"/></radialGradient>
    <linearGradient id="${id}-wall" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity="0.5"/><stop offset="0.5" stop-color="${b0}" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.5"/></linearGradient>
    <linearGradient id="${id}-spill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${l}" stop-opacity="0.75"/><stop offset="1" stop-color="${l}" stop-opacity="0.04"/></linearGradient>
    <linearGradient id="${id}-gap" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${l}" stop-opacity="0.75"/><stop offset="1" stop-color="#fff" stop-opacity="0.98"/></linearGradient>
    <linearGradient id="${id}-panel" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${l}" stop-opacity="0.18"/><stop offset="1" stop-color="#000" stop-opacity="0.4"/></linearGradient>
    <radialGradient id="${id}-moon" cx="0.42" cy="0.4"><stop offset="0" stop-color="#fffaf0"/><stop offset="0.7" stop-color="${l}"/><stop offset="1" stop-color="${l}" stop-opacity="0.85"/></radialGradient>
    <radialGradient id="${id}-iris"><stop offset="0.35" stop-color="#1a0204"/><stop offset="0.5" stop-color="${a}"/><stop offset="0.85" stop-color="#3a0509"/><stop offset="1" stop-color="#120102"/></radialGradient>
    <radialGradient id="${id}-sclera"><stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#3a0a0a" stop-opacity="0.75"/></radialGradient>
    <linearGradient id="${id}-dress" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity="0.45"/><stop offset="0.5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.55"/></linearGradient>
    <linearGradient id="${id}-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4d99b"/><stop offset="0.5" stop-color="#b99a60"/><stop offset="1" stop-color="#7d6234"/></linearGradient>
    <linearGradient id="${id}-beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${l}" stop-opacity="0.38"/><stop offset="1" stop-color="${l}" stop-opacity="0.02"/></linearGradient>
    <radialGradient id="${id}-planet" cx="0.35" cy="0.25" r="0.8"><stop offset="0" stop-color="${l}" stop-opacity="0.9"/><stop offset="0.35" stop-color="#2b3e66"/><stop offset="0.75" stop-color="#0b1222"/><stop offset="1" stop-color="#03050a"/></radialGradient>
  </defs>`;
}

/**
 * Постер фильма.
 * @param {object} film
 * @param {{variant?: 'poster'|'wide', title?: boolean, className?: string, label?: boolean}} opts
 */
export function poster(film, { variant = 'poster', title = true, className = '', label = true, cast = true } = {}) {
  if (!film) return '';
  const id = `pst${++uid}`;
  const random = rng(`poster|${film.id}`);
  const motif = MOTIFS[film.art.motif] || MOTIFS.corridor;
  const body = motif({ id, a: film.art.accent, l: film.art.light, r: random });
  const aria = label ? `role="img" aria-label="Постер фильма «${esc(film.title)}»"` : 'aria-hidden="true"';

  if (variant === 'wide') {
    // Широкий кадр для главного баннера: мотив справа, атмосфера слева.
    return `<svg class="poster poster--wide ${className}" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" ${aria}>
      ${defs(id, film)}
      <rect width="1600" height="900" fill="url(#${id}-bg)"/>
      <linearGradient id="${id}-mg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.24" stop-color="#fff" stop-opacity="1"/><stop offset="0.8" stop-color="#fff" stop-opacity="1"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
      <mask id="${id}-m" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="url(#${id}-mg)"/></mask>
      <circle cx="1180" cy="420" r="620" fill="url(#${id}-glowA)" opacity="0.28"/>
      <g transform="translate(820 0) scale(1.5)">
        <g mask="url(#${id}-m)">${body}</g>
      </g>
      <rect x="0" y="0" width="1600" height="900" fill="url(#${id}-vig)" opacity="0.6"/>
    </svg>`;
  }

  return `<svg class="poster ${className}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" ${aria}>
    ${defs(id, film)}
    <rect width="${W}" height="${H}" fill="url(#${id}-bg)"/>
    ${body}
    <rect width="${W}" height="${H}" fill="url(#${id}-vig)"/>
    ${title ? `<rect y="330" width="${W}" height="270" fill="url(#${id}-fade)"/>${titleBlock(film, cast)}` : ''}
  </svg>`;
}
