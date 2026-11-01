// Генерация расписания, цен и занятости мест.
// Расписание детерминировано: для одной и той же даты всегда получается одна и та же сетка сеансов.
// При подключении backend этот модуль заменяется запросами к API (см. services/api.js).

import { FILMS, getFilmById } from '../data/films.js';
import { HALLS, FORMAT_INFO, getHallById, seatType } from '../data/halls.js';
import { rng } from '../lib/rand.js';
import { parseISO, addDays, isoDate, time as fmtTime } from '../lib/format.js';

export const SCHEDULE_DAYS = 8;
const LAST_START = 23 * 60 + 50;
const HALL_START = { h1: 600, h2: 630, h3: 700, h4: 615 };

const roundUp = (m, step = 5) => Math.ceil(m / step) * step;

export function scheduleDates() {
  const today = new Date();
  return Array.from({ length: SCHEDULE_DAYS }, (_, i) => isoDate(addDays(today, i)));
}

function hallFormat(hall, film, random) {
  if (hall.id === 'h2') return film.formats.includes('IMAX') ? 'IMAX' : null;
  if (hall.id === 'h3') return film.formats.includes('VIP') ? 'VIP' : null;
  if (hall.id === 'h1') {
    if (film.formats.includes('3D') && random() < 0.55) return '3D';
    return film.formats.includes('2D') ? '2D' : null;
  }
  return film.formats.includes('2D') ? '2D' : null;
}

function allowedAt(film, start) {
  const kids = film.genres.includes('animation') || film.age === '0+' || film.age === '6+';
  if (kids && start >= 18 * 60) return false;
  if (film.age === '18+' && start < 13 * 60) return false;
  return true;
}

export function sessionPrice(format, startMin, dateISO) {
  const base = FORMAT_INFO[format]?.base ?? 200;
  const d = parseISO(dateISO);
  let k = 1;
  if (startMin < 12 * 60) k *= 0.8;
  else if (startMin >= 18 * 60) k *= 1.15;
  const day = d ? d.getDay() : 1;
  if (day === 0 || day === 5 || day === 6) k *= 1.1;
  return Math.round((base * k) / 10) * 10;
}

const cache = new Map();

/** Все сеансы на дату (по всем залам), отсортированные по времени. */
export function sessionsForDate(dateISO) {
  if (cache.has(dateISO)) return cache.get(dateISO);
  const date = parseISO(dateISO);
  if (!date) return [];

  const available = FILMS.filter((f) => f.premiere <= dateISO);
  const sessions = [];

  HALLS.forEach((hall) => {
    const random = rng(`${dateISO}|${hall.id}`);
    let t = HALL_START[hall.id] + Math.floor(random() * 6) * 5;
    let prev = null;
    let guard = 0;

    while (t <= LAST_START && guard++ < 40) {
      const candidates = available
        .map((film) => ({ film, format: hallFormat(hall, film, random) }))
        .filter((c) => c.format && allowedAt(c.film, t) && c.film.id !== prev);

      if (!candidates.length) { t += 30; continue; }

      // Поздние сеансы в «Кадре 13» — время хорроров
      const late = hall.id === 'h4' && t >= 22 * 60 + 30;
      const weighted = candidates.map((c) => ({
        ...c,
        w: c.film.popularity * (late && c.film.genres.includes('horror') ? 4 : 1) * (0.6 + random()),
      }));
      weighted.sort((a, b) => b.w - a.w);
      const chosen = weighted[Math.floor(random() * Math.min(3, weighted.length))];

      const start = t;
      sessions.push({
        id: `${dateISO}_${hall.id}_${fmtTime(start).replace(':', '')}`,
        date: dateISO,
        start,
        time: fmtTime(start),
        hallId: hall.id,
        filmId: chosen.film.id,
        format: chosen.format,
        price: sessionPrice(chosen.format, start, dateISO),
        vipPrice: sessionPrice(chosen.format, start, dateISO) + hall.vipExtra,
        midnight: start >= 22 * 60 + 30,
      });
      prev = chosen.film.id;
      const end = start + chosen.film.duration + 15;
      t = roundUp(end + 15 + Math.floor(random() * 3) * 5, 5);
    }
  });

  sessions.sort((a, b) => a.start - b.start || a.hallId.localeCompare(b.hallId));
  cache.set(dateISO, sessions);
  return sessions;
}

export function parseSessionId(id) {
  const m = /^(\d{4}-\d{2}-\d{2})_(h\d)_(\d{4})$/.exec(String(id));
  if (!m) return null;
  return { date: m[1], hallId: m[2], hhmm: m[3] };
}

export function findSession(id) {
  const p = parseSessionId(id);
  if (!p) return null;
  return sessionsForDate(p.date).find((s) => s.id === id) || null;
}

/** Время начала сеанса как Date. */
export function sessionDate(session) {
  const d = parseISO(session.date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), Math.floor(session.start / 60), session.start % 60);
}

/** Статус продаж: open | closing | closed */
export function salesState(session, now = new Date()) {
  const diff = (sessionDate(session) - now) / 60000;
  if (diff < 10) return 'closed';
  if (diff < 45) return 'closing';
  return 'open';
}

/** Схема зала: массив рядов с креслами. */
export function buildSeatMap(hall) {
  return hall.rows.map((row, ri) => {
    const rowNumber = ri + 1;
    const seats = [];
    for (let n = 1; n <= row.seats; n++) {
      seats.push({
        id: `${rowNumber}-${n}`,
        row: rowNumber,
        num: n,
        type: seatType(row, n),
        aisleAfter: row.aisles?.includes(n) || false,
        pairEnd: row.pairs ? n % 2 === 0 : false,
      });
    }
    return { number: rowNumber, offset: row.offset || 0, seats, pairs: !!row.pairs };
  });
}

/** Детерминированно «проданные» места для сеанса. */
export function seededOccupied(session) {
  const hall = getHallById(session.hallId);
  const film = getFilmById(session.filmId);
  const random = rng(`occ|${session.id}`);
  const daysAhead = Math.max(0, Math.round((parseISO(session.date) - parseISO(isoDate(new Date()))) / 86400000));
  let ratio = 0.18 + (film.popularity / 100) * 0.32;
  if (session.start >= 18 * 60) ratio += 0.16;
  if (session.start < 12 * 60) ratio -= 0.12;
  ratio -= daysAhead * 0.045;
  ratio = Math.min(0.78, Math.max(0.05, ratio));

  const map = buildSeatMap(hall);
  const total = map.length;
  const occupied = new Set();
  map.forEach((row) => {
    const rowCenter = 1 - Math.abs(row.number - total * 0.6) / total; // середина зала популярнее
    row.seats.forEach((seat) => {
      const center = 1 - Math.abs(seat.num - (row.seats.length + 1) / 2) / row.seats.length;
      const p = ratio * (0.55 + rowCenter * 0.5 + center * 0.45);
      if (random() < p) occupied.add(seat.id);
    });
  });
  return occupied;
}

export function seatPrice(session, seat) {
  return seat.type === 'vip' ? session.vipPrice : session.price;
}
