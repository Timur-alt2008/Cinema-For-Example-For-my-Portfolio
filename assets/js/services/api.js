// Demo cinema API.
//
// Every function is async and returns data shaped exactly as a real server would.
// To plug in a backend, replace the function bodies with fetch() calls to REST/GraphQL —
// pages and components don’t need to change.
//
// Example:
//   export async function getFilms(params) {
//     const res = await fetch(`${API_URL}/films?` + new URLSearchParams(params));
//     if (!res.ok) throw new ApiError('Could not load the film list', res.status);
//     return res.json();
//   }

import { FILMS, COLLECTIONS, getFilmById } from '../data/films.js';
import { HALLS, getHallById } from '../data/halls.js';
import { PROMO_CODES, REVIEWS } from '../data/site.js';
import { store } from '../store.js';
import { rng, hashString } from '../lib/rand.js';
import { todayISO, parseISO } from '../lib/format.js';
import {
  sessionsForDate, findSession, buildSeatMap, seededOccupied, seatPrice, salesState, scheduleDates, sessionDate,
} from './schedule.js';

export class ApiError extends Error {
  constructor(message, status = 400, field = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.field = field;
  }
}

const latency = (min = 180, max = 520) =>
  new Promise((r) => setTimeout(r, min + Math.random() * (max - min)));

const clone = (v) => JSON.parse(JSON.stringify(v));

/* ------------------------------- Films -------------------------------- */

export function searchFilmsSync({ q = '', genre = 'all', sort = 'popular', collection = '' } = {}) {
  let list = FILMS.slice();
  const query = q.trim().toLowerCase();
  if (query) {
    list = list.filter((f) =>
      [f.title, f.director, ...f.cast].join(' ').toLowerCase().includes(query)
    );
  }
  if (collection && COLLECTIONS[collection]) {
    const ids = COLLECTIONS[collection].films;
    list = list.filter((f) => ids.includes(f.id));
  }
  if (genre === 'now') list = list.filter((f) => f.status === 'now');
  else if (genre === 'soon') list = list.filter((f) => f.status === 'soon');
  else if (genre && genre !== 'all') list = list.filter((f) => f.genres.includes(genre));

  const sorters = {
    popular: (a, b) => b.popularity - a.popularity,
    rating: (a, b) => (b.rating ?? -1) - (a.rating ?? -1) || b.popularity - a.popularity,
    date: (a, b) => b.premiere.localeCompare(a.premiere),
    soonest: (a, b) => a.premiere.localeCompare(b.premiere),
  };
  list.sort(sorters[sort] || sorters.popular);
  return list;
}

export async function getFilms(params = {}) {
  await latency();
  return searchFilmsSync(params);
}

export async function getFilm(id) {
  await latency(120, 320);
  const film = getFilmById(id);
  if (!film) throw new ApiError('Film not found', 404);
  return film;
}

/* ------------------------------- Showtimes ---------------------------- */

function enrich(session) {
  const film = getFilmById(session.filmId);
  const hall = getHallById(session.hallId);
  return { ...session, film, hall, sales: salesState(session) };
}

export async function getSchedule(date = todayISO()) {
  await latency(200, 450);
  if (!scheduleDates().includes(date)) throw new ApiError('The schedule for this date hasn’t been published yet', 404);
  return sessionsForDate(date).map(enrich);
}

export async function getFilmSessions(filmId, date) {
  await latency(150, 350);
  return sessionsForDate(date).filter((s) => s.filmId === filmId).map(enrich);
}

export function getFilmSessionsSync(filmId, date) {
  return sessionsForDate(date).filter((s) => s.filmId === filmId).map(enrich);
}

export function soldSeatsFromOrders(sessionId) {
  const orders = store.get('orders', []);
  const sold = new Set();
  orders
    .filter((o) => o.sessionId === sessionId && o.status !== 'cancelled')
    .forEach((o) => o.seats.forEach((s) => sold.add(s.id)));
  return sold;
}

export async function getSessionDetails(sessionId) {
  await latency(220, 480);
  const session = findSession(sessionId);
  if (!session) throw new ApiError('Show not found or no longer scheduled', 404);
  const full = enrich(session);
  const occupied = seededOccupied(session);
  soldSeatsFromOrders(sessionId).forEach((id) => occupied.add(id));
  const map = buildSeatMap(full.hall).map((row) => ({
    ...row,
    seats: row.seats.map((seat) => ({
      ...seat,
      price: seatPrice(session, seat),
      occupied: occupied.has(seat.id),
    })),
  }));
  return { ...full, map, occupiedCount: occupied.size };
}

/* ------------------------------- Promo codes -------------------------- */

export function checkPromo(code, { session, seatsCount }) {
  const key = String(code || '').trim().toUpperCase();
  if (!key) throw new ApiError('Enter a promo code', 400, 'promo');
  const promo = PROMO_CODES[key];
  if (!promo) throw new ApiError('This promo code doesn’t exist', 400, 'promo');
  if (promo.id === 'student') {
    const day = parseISO(session.date).getDay();
    if (session.hallId === 'h3') throw new ApiError('The student discount isn’t valid in the VIP room', 400, 'promo');
    if (day !== 2) throw new ApiError('This code is valid for Tuesday shows only', 400, 'promo');
  }
  if (promo.id === 'family') {
    if (seatsCount < 3) throw new ApiError('The Family Ticket needs at least three seats', 400, 'promo');
    if (session.start >= 17 * 60) throw new ApiError('The Family Ticket is valid for shows before 5 pm', 400, 'promo');
  }
  if (promo.id === 'midnight' && session.start < 22 * 60 + 30) {
    throw new ApiError('This code is valid for shows after 10:30 pm', 400, 'promo');
  }
  if (promo.id === 'vipdate') {
    if (session.hallId !== 'h3') throw new ApiError('This code is valid in the Obscura VIP room only', 400, 'promo');
    if (seatsCount < 2) throw new ApiError('Please select at least two seats', 400, 'promo');
  }
  return { code: key, percent: promo.percent, title: promo.title };
}

export function calcTotals(seats, promo) {
  const subtotal = seats.reduce((sum, s) => sum + s.price, 0);
  const discount = promo ? Math.round((subtotal * promo.percent) / 100) : 0;
  return { subtotal, discount, total: subtotal - discount };
}

/* ------------------------------- Orders ------------------------------- */

function orderNumber() {
  const random = rng(`${Date.now()}|${Math.random()}`);
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = 'CE-';
  for (let i = 0; i < 6; i++) s += chars[Math.floor(random() * chars.length)];
  return s;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateCustomer(c) {
  const errors = {};
  if (!c.firstName || c.firstName.trim().length < 2) errors.firstName = 'Enter your first name';
  if (!c.lastName || c.lastName.trim().length < 2) errors.lastName = 'Enter your last name';
  if (!EMAIL_RE.test(String(c.email || '').trim())) errors.email = 'Please check your email address';
  const digits = String(c.phone || '').replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 13) errors.phone = 'Enter a valid phone number, e.g. +380 67 123 45 67';
  return errors;
}

export async function createOrder({ sessionId, seatIds, customer, promoCode, mode, userId }) {
  await latency(900, 1500);
  const details = await getSessionDetails(sessionId);
  if (details.sales === 'closed') throw new ApiError('Ticket sales for this show have closed', 409);
  if (!seatIds?.length) throw new ApiError('No seats selected', 400);

  const seats = [];
  for (const id of seatIds) {
    const seat = details.map.flatMap((r) => r.seats).find((s) => s.id === id);
    if (!seat) throw new ApiError('One of the seats isn’t on the seating plan', 400);
    if (seat.occupied) throw new ApiError(`Row ${seat.row}, seat ${seat.num} has just been taken. Please choose another seat.`, 409);
    seats.push({ id: seat.id, row: seat.row, num: seat.num, type: seat.type, price: seat.price });
  }

  const errors = validateCustomer(customer);
  if (Object.keys(errors).length) {
    const err = new ApiError('Please check your contact details', 422);
    err.fields = errors;
    throw err;
  }

  let promo = null;
  if (promoCode) promo = checkPromo(promoCode, { session: details, seatsCount: seats.length });
  const totals = calcTotals(seats, promo);

  const order = {
    id: orderNumber(),
    createdAt: new Date().toISOString(),
    sessionId,
    filmId: details.filmId,
    hallId: details.hallId,
    date: details.date,
    time: details.time,
    start: details.start,
    format: details.format,
    seats,
    promo,
    ...totals,
    customer: {
      firstName: customer.firstName.trim(),
      lastName: customer.lastName.trim(),
      email: customer.email.trim().toLowerCase(),
      phone: customer.phone.trim(),
    },
    mode: mode === 'reserve' ? 'reserve' : 'pay',
    status: mode === 'reserve' ? 'reserved' : 'paid',
    payment: mode === 'reserve' ? null : { provider: 'demo', test: true, approvedAt: new Date().toISOString() },
    userId: userId || null,
  };
  store.update('orders', (list) => [order, ...list], []);
  return clone(order);
}

export async function getOrder(id) {
  await latency(120, 300);
  const order = store.get('orders', []).find((o) => o.id === id);
  if (!order) throw new ApiError('Order not found on this device', 404);
  return order;
}

export function ordersFor(user) {
  const all = store.get('orders', []);
  if (!user) return [];
  return all.filter((o) => o.userId === user.id || o.customer.email === user.email);
}

export async function cancelOrder(id) {
  await latency(400, 700);
  let found = null;
  store.update('orders', (list) => list.map((o) => {
    if (o.id !== id) return o;
    const session = findSession(o.sessionId);
    if (session && (sessionDate(session) - new Date()) / 60000 < 60) {
      throw new ApiError('Tickets can be refunded up to 60 minutes before the show', 409);
    }
    found = { ...o, status: 'cancelled', cancelledAt: new Date().toISOString() };
    return found;
  }), []);
  if (!found) throw new ApiError('Order not found', 404);
  return found;
}

/* ------------------------------- Users -------------------------------- */

async function hashPassword(password, salt) {
  const text = `${salt}::${password}::cinema-example`;
  try {
    if (window.crypto?.subtle) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
      return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (e) { /* insecure context — fall back to a simple hash */ }
  return `h${hashString(text).toString(16)}`;
}

const publicUser = (u) => {
  if (!u) return null;
  const { passHash, ...rest } = u;
  return clone(rest);
};

export function currentUser() {
  const session = store.get('auth', null);
  if (!session) return null;
  const user = store.get('users', []).find((u) => u.id === session.userId);
  return publicUser(user);
}

export async function register({ firstName, lastName, email, phone, password }) {
  await latency(500, 900);
  const errors = {};
  if (!firstName || firstName.trim().length < 2) errors.firstName = 'Enter your first name';
  if (!EMAIL_RE.test(String(email || '').trim())) errors.email = 'Please check your email address';
  if (!password || password.length < 6) errors.password = 'At least 6 characters';
  const users = store.get('users', []);
  const normalized = String(email || '').trim().toLowerCase();
  if (users.some((u) => u.email === normalized)) errors.email = 'An account with this email already exists';
  if (Object.keys(errors).length) {
    const err = new ApiError('Please check the form', 422);
    err.fields = errors;
    throw err;
  }
  const user = {
    id: `u_${Date.now().toString(36)}`,
    firstName: firstName.trim(),
    lastName: (lastName || '').trim(),
    email: normalized,
    phone: (phone || '').trim(),
    birthday: '',
    createdAt: new Date().toISOString(),
    notify: { premieres: true, promos: true, reminders: true },
    passHash: await hashPassword(password, normalized),
  };
  store.set('users', [...users, user]);
  store.set('auth', { userId: user.id, at: Date.now() });
  return publicUser(user);
}

export async function login({ email, password }) {
  await latency(400, 800);
  const normalized = String(email || '').trim().toLowerCase();
  const user = store.get('users', []).find((u) => u.email === normalized);
  if (!user || user.passHash !== (await hashPassword(password || '', normalized))) {
    throw new ApiError('Wrong email or password', 401);
  }
  store.set('auth', { userId: user.id, at: Date.now() });
  return publicUser(user);
}

export function logout() {
  store.remove('auth');
}

export async function updateProfile(patch) {
  await latency(300, 600);
  const me = currentUser();
  if (!me) throw new ApiError('Your session has expired, please sign in again', 401);
  if (patch.email !== undefined && !EMAIL_RE.test(String(patch.email).trim())) {
    const err = new ApiError('Please check your details', 422);
    err.fields = { email: 'Please check your email address' };
    throw err;
  }
  let updated = null;
  store.update('users', (list) => list.map((u) => {
    if (u.id !== me.id) return u;
    updated = { ...u, ...patch, email: patch.email ? patch.email.trim().toLowerCase() : u.email };
    return updated;
  }), []);
  return publicUser(updated);
}

/* ------------------------------- Reviews ------------------------------ */

const REVIEW_NAMES = ['Anna', 'Victor', 'Liz', 'Artem', 'Sophie', 'Igor', 'Martha', 'Oleg', 'Julia', 'Roman', 'Kate', 'Nazar'];
const REVIEW_TEXTS = {
  good: [
    'The atmosphere grips you until the very last second. We sat in silence all the way through the credits.',
    'The sound in the room is a character of its own. I caught myself looking over my shoulder more than once.',
    'A stunning-looking film — you could frame every shot as a poster.',
    'Smarter than the trailer suggests. We argued about the ending all the way home.',
    'Watched it in VIP — the blankets and the silence did their job. Recommended.',
  ],
  mid: [
    'The middle sags a little, but the last twenty minutes make up for it.',
    'Great cinematography, though I wanted a bit more explanation at the end.',
  ],
};

export async function getReviews(filmId) {
  await latency(150, 350);
  const film = getFilmById(filmId);
  if (!film) return [];
  const own = store.get(`reviews:${filmId}`, []);
  if (film.status === 'soon') return own;
  const random = rng(`reviews|${filmId}`);
  const base = Array.from({ length: 3 }, (_, i) => {
    const good = random() < 0.75;
    const pool = good ? REVIEW_TEXTS.good : REVIEW_TEXTS.mid;
    return {
      id: `seed-${filmId}-${i}`,
      name: `${REVIEW_NAMES[Math.floor(random() * REVIEW_NAMES.length)]} ${String.fromCharCode(65 + Math.floor(random() * 26))}.`,
      rating: good ? (random() < 0.6 ? 5 : 4) : 3,
      text: pool[Math.floor(random() * pool.length)],
      date: null,
    };
  });
  return [...own, ...base];
}

export async function addReview(filmId, { name, rating, text }) {
  await latency(400, 700);
  const errors = {};
  if (!name || name.trim().length < 2) errors.name = 'Please tell us your name';
  if (!rating || rating < 1 || rating > 5) errors.rating = 'Please choose a rating';
  if (!text || text.trim().length < 10) errors.text = 'At least 10 characters';
  if (Object.keys(errors).length) {
    const err = new ApiError('Please check your review', 422);
    err.fields = errors;
    throw err;
  }
  const review = { id: `r_${Date.now()}`, name: name.trim(), rating: Number(rating), text: text.trim(), date: new Date().toISOString(), own: true };
  store.update(`reviews:${filmId}`, (list) => [review, ...list], []);
  return review;
}

export const homeReviews = () => REVIEWS;

/* ------------------------------- Feedback ----------------------------- */

export async function sendFeedback({ name, email, topic, message }) {
  await latency(700, 1200);
  const errors = {};
  if (!name || name.trim().length < 2) errors.name = 'Enter your name';
  if (!EMAIL_RE.test(String(email || '').trim())) errors.email = 'Please check your email address';
  if (!message || message.trim().length < 10) errors.message = 'Your message is too short';
  if (Object.keys(errors).length) {
    const err = new ApiError('Please check the form', 422);
    err.fields = errors;
    throw err;
  }
  const ticket = { id: `FB-${Date.now().toString(36).toUpperCase()}`, name, email, topic, message, at: new Date().toISOString() };
  store.update('feedback', (list) => [ticket, ...list], []);
  return ticket;
}

export async function subscribeNews(email) {
  await latency(500, 800);
  if (!EMAIL_RE.test(String(email || '').trim())) throw new ApiError('Please check your email address', 422, 'email');
  store.update('newsletter', (list) => Array.from(new Set([...list, email.trim().toLowerCase()])), []);
  return true;
}

export { HALLS };
