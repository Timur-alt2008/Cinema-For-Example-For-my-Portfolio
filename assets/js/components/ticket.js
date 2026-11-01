// E-ticket: page markup, a downloadable SVG file and a calendar event.

import { html, esc } from '../lib/dom.js';
import { icon } from '../icons.js';
import { rng } from '../lib/rand.js';
import { getFilmById } from '../data/films.js';
import { getHallById } from '../data/halls.js';
import { CINEMA } from '../data/site.js';
import { poster } from './poster.js';
import { formatDate, price, duration, parseISO } from '../lib/format.js';

/** Demo QR code: real structure (finder and timing patterns), data derived from the order number. */
export function qrMatrix(text, size = 25) {
  const random = rng(`qr|${text}`);
  const m = Array.from({ length: size }, () => Array(size).fill(0));
  const reserved = Array.from({ length: size }, () => Array(size).fill(false));
  const finder = (r0, c0) => {
    for (let r = -1; r <= 7; r++) for (let c = -1; c <= 7; c++) {
      const rr = r0 + r, cc = c0 + c;
      if (rr < 0 || cc < 0 || rr >= size || cc >= size) continue;
      reserved[rr][cc] = true;
      const on = r >= 0 && r <= 6 && c >= 0 && c <= 6 && (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4));
      m[rr][cc] = on ? 1 : 0;
    }
  };
  finder(0, 0); finder(0, size - 7); finder(size - 7, 0);
  for (let i = 8; i < size - 8; i++) {
    m[6][i] = m[i][6] = i % 2 === 0 ? 1 : 0;
    reserved[6][i] = reserved[i][6] = true;
  }
  // Alignment pattern
  const a = size - 9;
  for (let r = -2; r <= 2; r++) for (let c = -2; c <= 2; c++) {
    reserved[a + r][a + c] = true;
    m[a + r][a + c] = Math.max(Math.abs(r), Math.abs(c)) !== 1 ? 1 : 0;
  }
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
    if (!reserved[r][c]) m[r][c] = random() < 0.48 ? 1 : 0;
  }
  return m;
}

export function qrSVG(text, { px = 160, dark = '#090909', light = '#f2eeee' } = {}) {
  const m = qrMatrix(text);
  const n = m.length;
  const q = 2;
  let rects = '';
  m.forEach((row, r) => row.forEach((v, c) => { if (v) rects += `<rect x="${c + q}" y="${r + q}" width="1.02" height="1.02"/>`; }));
  return `<svg class="qr" viewBox="0 0 ${n + q * 2} ${n + q * 2}" width="${px}" height="${px}" shape-rendering="crispEdges" role="img" aria-label="Ticket QR code ${esc(text)}">
    <rect width="100%" height="100%" fill="${light}"/><g fill="${dark}">${rects}</g></svg>`;
}

const STATUS = {
  paid: { label: 'Paid', cls: 'is-paid' },
  reserved: { label: 'Booked — pay at box office', cls: 'is-reserved' },
  cancelled: { label: 'Refunded', cls: 'is-cancelled' },
};

export function seatsText(order) {
  const rows = {};
  order.seats.forEach((s) => { (rows[s.row] ||= []).push(s.num); });
  return Object.entries(rows).map(([r, nums]) => `row ${r}: seats ${nums.sort((a, b) => a - b).join(', ')}`).join('; ');
}

export function ticketView(order, { compact = false } = {}) {
  const film = getFilmById(order.filmId);
  const hall = getHallById(order.hallId);
  const st = STATUS[order.status] || STATUS.paid;
  return html`
  <article class="ticket ${st.cls}${compact ? ' ticket--compact' : ''}" aria-label="E-ticket ${order.id}">
    <div class="ticket__main">
      <div class="ticket__brand">
        <span class="ticket__logo">${icon('logoMark')}<span>Cinema <em>Example</em></span></span>
        <span class="ticket__status">${st.label}</span>
      </div>
      <div class="ticket__film">
        <div class="ticket__poster">${poster(film, { title: false, label: false })}</div>
        <div>
          <p class="ticket__label">Film</p>
          <h3 class="ticket__title">${esc(film.title)}</h3>
          <p class="ticket__sub">${film.age} · ${duration(film.duration)} · ${order.format}</p>
        </div>
      </div>
      <dl class="ticket__grid">
        <div><dt>Date</dt><dd>${formatDate(order.date)}</dd></div>
        <div><dt>Starts</dt><dd class="tnum">${order.time}</dd></div>
        <div><dt>Room</dt><dd>${hall.number} · ${esc(hall.name)}</dd></div>
        <div><dt>Seats</dt><dd>${order.seats.map((s) => `<span class="ticket__seat"><small>row</small>${s.row} <small>seat</small>${s.num}</span>`).join('')}</dd></div>
      </dl>
      <div class="ticket__foot">
        <span><small>Guest</small>${esc(order.customer.firstName)} ${esc(order.customer.lastName)}</span>
        <span><small>${order.status === 'reserved' ? 'Due' : 'Total'}</small><b class="tnum">${price(order.total)}</b></span>
      </div>
    </div>
    <div class="ticket__stub">
      <div class="ticket__qr">${qrSVG(order.id, { px: compact ? 110 : 150 })}</div>
      <p class="ticket__order"><small>Order</small><b class="tnum">${order.id}</b></p>
      <p class="ticket__hint">Show this QR code at the entrance</p>
    </div>
  </article>`;
}

/** Self-contained SVG ticket file for download. */
export function ticketFileSVG(order) {
  const film = getFilmById(order.filmId);
  const hall = getHallById(order.hallId);
  const st = STATUS[order.status] || STATUS.paid;
  const qr = qrMatrix(order.id);
  let qrRects = '';
  qr.forEach((row, r) => row.forEach((v, c) => { if (v) qrRects += `<rect x="${c * 7}" y="${r * 7}" width="7.1" height="7.1"/>`; }));
  const seats = order.seats.map((s) => `${s.row}-${s.num}`).join('  ·  ');
  const e = (s) => esc(s);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="400" viewBox="0 0 1000 400">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1c1717"/><stop offset="1" stop-color="#0b0909"/></linearGradient>
    <radialGradient id="r" cx="0.2" cy="0" r="0.9"><stop offset="0" stop-color="#720d16" stop-opacity="0.55"/><stop offset="1" stop-color="#720d16" stop-opacity="0"/></radialGradient>
  </defs>
  <rect x="0" y="0" width="1000" height="400" rx="28" fill="url(#g)"/>
  <rect x="0" y="0" width="1000" height="400" rx="28" fill="url(#r)"/>
  <rect x="12" y="12" width="976" height="376" rx="20" fill="none" stroke="#b99a60" stroke-opacity="0.45"/>
  <line x1="700" y1="30" x2="700" y2="370" stroke="#b99a60" stroke-opacity="0.6" stroke-dasharray="6 8"/>
  <circle cx="700" cy="0" r="22" fill="#fff"/><circle cx="700" cy="400" r="22" fill="#fff"/>
  <g font-family="Georgia, 'Times New Roman', serif" fill="#f2eeee">
    <text x="50" y="72" font-size="26" letter-spacing="1">Cinema <tspan fill="#c41a29" font-style="italic">Example</tspan></text>
    <text x="50" y="160" font-size="48">${e(film.title)}</text>
  </g>
  <g font-family="Arial, Helvetica, sans-serif">
    <text x="650" y="70" text-anchor="end" font-size="14" fill="#b99a60" letter-spacing="2">${e(st.label.toUpperCase())}</text>
    <text x="50" y="192" font-size="15" fill="#a49b9b">${e(film.age)} · ${e(duration(film.duration))} · ${e(order.format)}</text>
    <text x="50" y="250" font-size="12" fill="#b99a60" letter-spacing="2">DATE</text>
    <text x="50" y="278" font-size="22" fill="#f2eeee">${e(formatDate(order.date))}</text>
    <text x="250" y="250" font-size="12" fill="#b99a60" letter-spacing="2">STARTS</text>
    <text x="250" y="278" font-size="22" fill="#f2eeee">${e(order.time)}</text>
    <text x="400" y="250" font-size="12" fill="#b99a60" letter-spacing="2">ROOM</text>
    <text x="400" y="278" font-size="22" fill="#f2eeee">${hall.number} · ${e(hall.name)}</text>
    <text x="50" y="324" font-size="12" fill="#b99a60" letter-spacing="2">ROW-SEAT</text>
    <text x="50" y="352" font-size="20" fill="#f2eeee">${e(seats)}</text>
    <text x="650" y="352" text-anchor="end" font-size="22" fill="#f2eeee">${e(price(order.total))}</text>
    <text x="850" y="318" text-anchor="middle" font-size="12" fill="#b99a60" letter-spacing="2">ORDER</text>
    <text x="850" y="346" text-anchor="middle" font-size="22" fill="#f2eeee" font-family="Courier New, monospace">${e(order.id)}</text>
    <text x="850" y="372" text-anchor="middle" font-size="10" fill="#a49b9b">${e(CINEMA.addressFull)}</text>
  </g>
  <rect x="760" y="60" width="180" height="180" rx="8" fill="#f2eeee"/>
  <g transform="translate(762.5 62.5)" fill="#090909">${qrRects}</g>
</svg>`;
}

export function downloadFile(name, content, type) {
  try {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return true;
  } catch (e) {
    return false;
  }
}

export function icsFor(order) {
  const film = getFilmById(order.filmId);
  const hall = getHallById(order.hallId);
  const d = parseISO(order.date);
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), Math.floor(order.start / 60), order.start % 60);
  const end = new Date(start.getTime() + (film.duration + 15) * 60000);
  const f = (x) => `${x.getFullYear()}${String(x.getMonth() + 1).padStart(2, '0')}${String(x.getDate()).padStart(2, '0')}T${String(x.getHours()).padStart(2, '0')}${String(x.getMinutes()).padStart(2, '0')}00`;
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Cinema Example//Tickets//RU', 'BEGIN:VEVENT',
    `UID:${order.id}@cinema-example.demo`,
    `DTSTART:${f(start)}`, `DTEND:${f(end)}`,
    `SUMMARY:Movie: ${film.title}`,
    `LOCATION:${CINEMA.addressFull}, room ${hall.number}`,
    `DESCRIPTION:Order ${order.id}. Seats: ${seatsText(order)}.`,
    'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', 'DESCRIPTION:Your show at Cinema Example starts soon', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
}
