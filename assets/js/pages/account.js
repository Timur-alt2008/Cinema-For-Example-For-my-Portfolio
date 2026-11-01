// Sign in, registration and account.

import { html, esc, $ } from '../lib/dom.js';
import { icon } from '../icons.js';
import { mount, crumbs, setTitle } from './common.js';
import { login, register, logout, currentUser, updateProfile, ordersFor, cancelOrder } from '../services/api.js';
import { findSession, sessionDate } from '../services/schedule.js';
import { getFilmById, FILMS } from '../data/films.js';
import { getHallById } from '../data/halls.js';
import { favorites, premiereAlerts, store } from '../store.js';
import { filmCard, notifyButton } from '../components/filmCard.js';
import { poster } from '../components/poster.js';
import { ticketView } from '../components/ticket.js';
import { field, showFieldErrors, clearFieldError, setBusy, toast, emptyState, confirmDialog, observeReveal } from '../components/ui.js';
import { navigate } from '../router.js';
import { formatDate, formatDateShort, price, initials, relativeDays, plural } from '../lib/format.js';

/* ------------------------------- Sign in / register ------------------- */

function authLayout(inner, mode) {
  return html`<section class="auth wrap">
    <div class="auth__art" aria-hidden="true">
      <div class="auth__posters">${['f04', 'f01', 'f02', 'f06', 'f14', 'f08'].map((id, i) => `<span style="--i:${i}">${poster(getFilmById(id), { label: false })}</span>`).join('')}</div>
      <div class="auth__quote"><p>“Cinema is what happens when the lights go out.”</p><span>Cinema Example</span></div>
    </div>
    <div class="auth__panel">
      ${crumbs([{ label: mode === 'login' ? 'Sign in' : 'Register' }])}
      ${inner}
    </div>
  </section>`;
}

export async function loginPage({ query }) {
  setTitle('Sign in');
  if (currentUser()) { navigate(query.next || '/account', { replace: true }); return; }
  const root = mount(authLayout(html`
    <h1>Welcome back</h1>
    <p class="lead">Sign in to see your tickets, order history and favourite films.</p>
    <form class="auth__form" data-form novalidate>
      ${field({ name: 'email', label: 'Email', type: 'email', required: true, autocomplete: 'email', placeholder: 'you@example.com' })}
      ${field({ name: 'password', label: 'Password', type: 'password', required: true, autocomplete: 'current-password', placeholder: '••••••' })}
      <p class="form-error" data-error role="alert" hidden></p>
      <button class="btn btn--primary btn--lg btn--block" type="submit">Sign in</button>
      <p class="auth__switch muted">No account yet? <a class="gold" href="#/register${query.next ? `?next=${encodeURIComponent(query.next)}` : ''}">Register</a></p>
      <p class="field__hint">${icon('info')} Demo mode: accounts are stored in this browser only.</p>
    </form>`, 'login'));
  const form = $('[data-form]', root);
  form.addEventListener('input', (e) => { clearFieldError(e); $('[data-error]', root).hidden = true; });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('[type="submit"]');
    const v = (n) => form.querySelector(`[name="${n}"]`).value;
    setBusy(btn, true);
    try {
      const user = await login({ email: v('email'), password: v('password') });
      toast(`Hello, ${user.firstName}!`, { type: 'success' });
      navigate(query.next || '/account', { replace: true });
    } catch (err) {
      const box = $('[data-error]', root);
      box.textContent = err.message;
      box.hidden = false;
      setBusy(btn, false);
    }
  });
}

export async function registerPage({ query }) {
  setTitle('Register');
  if (currentUser()) { navigate('/account', { replace: true }); return; }
  const last = store.get('lastCustomer', {});
  const root = mount(authLayout(html`
    <h1>Create an account</h1>
    <p class="lead">All your tickets in one place, premiere reminders and faster checkout.</p>
    <form class="auth__form" data-form novalidate>
      <div class="form-grid">
        ${field({ name: 'firstName', label: 'First name', required: true, autocomplete: 'given-name', value: last.firstName || '' })}
        ${field({ name: 'lastName', label: 'Last name', autocomplete: 'family-name', value: last.lastName || '' })}
      </div>
      ${field({ name: 'email', label: 'Email', type: 'email', required: true, autocomplete: 'email', value: last.email || '' })}
      ${field({ name: 'phone', label: 'Phone', type: 'tel', autocomplete: 'tel', value: last.phone || '', placeholder: '+380 67 123 45 67' })}
      ${field({ name: 'password', label: 'Password', type: 'password', required: true, autocomplete: 'new-password', hint: 'At least 6 characters' })}
      <label class="check"><input type="checkbox" name="news" checked> Tell me about premieres and offers</label>
      <button class="btn btn--primary btn--lg btn--block" type="submit">Create account</button>
      <p class="auth__switch muted">Already have an account? <a class="gold" href="#/login${query.next ? `?next=${encodeURIComponent(query.next)}` : ''}">Sign in</a></p>
      <p class="field__hint">${icon('lock')} Demo mode: your password is stored as a hash in this browser only. Don’t use a real password.</p>
    </form>`, 'register'));
  const form = $('[data-form]', root);
  form.addEventListener('input', clearFieldError);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('[type="submit"]');
    const v = (n) => form.querySelector(`[name="${n}"]`).value;
    setBusy(btn, true);
    try {
      const user = await register({ firstName: v('firstName'), lastName: v('lastName'), email: v('email'), phone: v('phone'), password: v('password') });
      if (!form.querySelector('[name="news"]').checked) await updateProfile({ notify: { premieres: false, promos: false, reminders: true } });
      toast('Account created', { type: 'success', text: `Welcome, ${user.firstName}!` });
      navigate(query.next || '/account', { replace: true });
    } catch (err) {
      setBusy(btn, false);
      if (err.fields) showFieldErrors(form, err.fields);
      else toast('Registration failed', { type: 'error', text: err.message });
    }
  });
}

/* ------------------------------- Account ------------------------------ */

const TABS = [
  { key: 'tickets', label: 'My tickets', icon: 'ticket' },
  { key: 'history', label: 'Order history', icon: 'history' },
  { key: 'favorites', label: 'Favourites', icon: 'heart' },
  { key: 'notifications', label: 'Notifications', icon: 'bell' },
  { key: 'profile', label: 'Personal details', icon: 'user' },
];

const isUpcoming = (o) => {
  const s = findSession(o.sessionId);
  if (!s) return false;
  return sessionDate(s) > new Date() && o.status !== 'cancelled';
};

function ticketsTab(orders) {
  const upcoming = orders.filter(isUpcoming).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  if (!upcoming.length) {
    return emptyState({ iconName: 'ticket', title: 'No upcoming shows', text: 'Time to pick a film. Your tickets will appear here, ready to show at the door.', action: `<a class="btn btn--primary" href="#/schedule">${icon('calendar')} Choose a showtime</a>` });
  }
  return html`<div class="acc-tickets">
    ${upcoming.map((o) => html`<div class="acc-ticket" data-reveal>
      ${ticketView(o, { compact: true })}
      <div class="acc-ticket__actions">
        <span class="muted">${relativeDays(o.date)}, ${o.time}</span>
        <a class="btn btn--ghost btn--sm" href="#/ticket/${o.id}">${icon('eye')} Open</a>
        <button class="btn btn--quiet btn--sm" type="button" data-cancel="${o.id}">${icon('reset')} Refund</button>
      </div>
    </div>`)}
  </div>`;
}

function historyTab(orders) {
  if (!orders.length) {
    return emptyState({ iconName: 'history', title: 'No orders yet', text: 'All your purchases and bookings will appear here.', action: `<a class="btn btn--primary" href="#/afisha">${icon('film')} Browse films</a>` });
  }
  const statusLabel = { paid: 'Paid', reserved: 'Booked', cancelled: 'Refunded' };
  return html`<div class="orders">
    <div class="orders__head" aria-hidden="true"><span>Film</span><span>Show</span><span>Seats</span><span>Total</span><span>Status</span></div>
    ${orders.map((o) => {
      const film = getFilmById(o.filmId);
      const hall = getHallById(o.hallId);
      return html`<a class="order-row" href="#/ticket/${o.id}">
        <span class="order-row__film"><span class="order-row__thumb">${poster(film, { title: false, label: false })}</span><span><b>${esc(film.title)}</b><small class="muted">№ ${o.id} · ${formatDateShort(o.createdAt.slice(0, 10))}</small></span></span>
        <span><b class="tnum">${formatDate(o.date)}, ${o.time}</b><small class="muted">Room ${hall.number} · ${o.format}</small></span>
        <span>${o.seats.length} ${plural(o.seats.length, ['seat', 'seats'])}<small class="muted">${o.seats.map((s) => `${s.row}-${s.num}`).join(', ')}</small></span>
        <span class="tnum">${price(o.total)}</span>
        <span><span class="status status--${o.status}">${statusLabel[o.status]}</span></span>
      </a>`;
    })}
  </div>`;
}

function favoritesTab() {
  const list = favorites.list().map(getFilmById).filter(Boolean);
  if (!list.length) {
    return emptyState({ iconName: 'heart', title: 'No favourites yet', text: 'Tap the heart on any poster to save films for later.', action: `<a class="btn btn--primary" href="#/afisha">${icon('film')} Browse films</a>` });
  }
  return `<div class="film-grid">${list.map((f, i) => filmCard(f, { index: i })).join('')}</div>`;
}

function notificationsTab(user) {
  const soon = FILMS.filter((f) => f.status === 'soon').sort((a, b) => a.premiere.localeCompare(b.premiere));
  const n = user.notify || {};
  return html`
    <div class="panel panel__pad notif-settings">
      <h3 class="panel__title">Notification channels</h3>
      ${[
        ['premieres', 'Premieres', 'An email when tickets go on sale for the films below'],
        ['reminders', 'Show reminders', 'A text 2 hours before the show with your room number'],
        ['promos', 'Offers & private screenings', 'No more than one email a week'],
      ].map(([k, t, d]) => html`<label class="setting"><span><b>${t}</b><small class="muted">${d}</small></span><input class="switch" type="checkbox" data-notify-setting="${k}" ${n[k] ? 'checked' : ''}></label>`)}
    </div>
    <h3 class="acc-subtitle">Premiere reminders</h3>
    <div class="premiere-list">
      ${soon.map((f) => html`<div class="premiere-item">
        <span class="premiere-item__thumb">${poster(f, { title: false, label: false })}</span>
        <span><b>${esc(f.title)}</b><small class="muted">${formatDate(f.premiere)} · ${relativeDays(f.premiere)}</small></span>
        ${notifyButton(f)}
      </div>`)}
    </div>`;
}

function profileTab(user) {
  return html`<form class="panel panel__pad" data-profile novalidate>
    <div class="form-grid">
      ${field({ name: 'firstName', label: 'First name', value: user.firstName, required: true, autocomplete: 'given-name' })}
      ${field({ name: 'lastName', label: 'Last name', value: user.lastName, autocomplete: 'family-name' })}
      ${field({ name: 'email', label: 'Email', type: 'email', value: user.email, required: true, autocomplete: 'email' })}
      ${field({ name: 'phone', label: 'Phone', type: 'tel', value: user.phone, autocomplete: 'tel' })}
      ${field({ name: 'birthday', label: 'Date of birth', type: 'date', value: user.birthday, hint: 'For the Birthday at the Movies offer' })}
    </div>
    <div class="profile-actions">
      <button class="btn btn--primary" type="submit">${icon('check')} Save changes</button>
      <span class="muted">Member since ${formatDate(user.createdAt.slice(0, 10), { year: true })}</span>
    </div>
  </form>`;
}

export async function accountPage({ params, scope }) {
  const user = currentUser();
  if (!user) { navigate(`/login?next=${encodeURIComponent(`/account${params.tab ? `/${params.tab}` : ''}`)}`, { replace: true }); return; }
  const tab = TABS.some((t) => t.key === params.tab) ? params.tab : 'tickets';
  setTitle('My account');
  const orders = ordersFor(user).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const upcomingCount = orders.filter(isUpcoming).length;
  const spent = orders.filter((o) => o.status === 'paid').reduce((s, o) => s + o.total, 0);

  const content = {
    tickets: () => ticketsTab(orders),
    history: () => historyTab(orders),
    favorites: () => favoritesTab(),
    notifications: () => notificationsTab(user),
    profile: () => profileTab(user),
  }[tab]();

  const root = mount(html`
    <section class="wrap account">
      ${crumbs([{ label: 'My account' }])}
      <header class="account__head">
        <span class="avatar avatar--xl">${esc(initials(`${user.firstName} ${user.lastName}`))}</span>
        <div>
          <p class="eyebrow">My account</p>
          <h1>${esc(user.firstName)} ${esc(user.lastName)}</h1>
          <p class="muted">${esc(user.email)}</p>
        </div>
        <div class="account__stats">
          <div><b class="tnum">${upcomingCount}</b><span>upcoming</span></div>
          <div><b class="tnum">${orders.length}</b><span>orders</span></div>
          <div><b class="tnum">${price(spent)}</b><span>spent</span></div>
        </div>
      </header>
      <div class="account__grid">
        <nav class="account__nav" aria-label="Account sections">
          ${TABS.map((t) => `<a href="#/account/${t.key}" class="${t.key === tab ? 'is-active' : ''}" ${t.key === tab ? 'aria-current="page"' : ''}>${icon(t.icon)}<span>${t.label}</span>${t.key === 'favorites' && favorites.list().length ? `<em>${favorites.list().length}</em>` : ''}${t.key === 'tickets' && upcomingCount ? `<em>${upcomingCount}</em>` : ''}</a>`).join('')}
          <button type="button" data-logout>${icon('logout')}<span>Sign out</span></button>
        </nav>
        <div class="account__content">
          <h2 class="account__title">${TABS.find((t) => t.key === tab).label}</h2>
          ${content}
        </div>
      </div>
    </section>
  `);

  root.addEventListener('click', async (e) => {
    if (e.target.closest('[data-logout]')) {
      logout();
      toast('You’ve signed out');
      navigate('/', { replace: true });
      return;
    }
    const c = e.target.closest('[data-cancel]');
    if (c) {
      const ok = await confirmDialog({ title: 'Refund this ticket?', text: `Order ${c.dataset.cancel} will be cancelled and the seats released. No money was charged in demo mode.`, confirm: 'Refund ticket', danger: true });
      if (!ok) return;
      try {
        await cancelOrder(c.dataset.cancel);
        toast('Ticket refunded', { type: 'success' });
        navigate('/account/tickets', { replace: true });
      } catch (err) {
        toast('Refund not possible', { type: 'error', text: err.message });
      }
    }
  });

  root.addEventListener('change', async (e) => {
    const s = e.target.closest('[data-notify-setting]');
    if (!s) return;
    const notify = { ...(currentUser().notify || {}), [s.dataset.notifySetting]: s.checked };
    await updateProfile({ notify });
    toast(s.checked ? 'Notifications on' : 'Notifications off', { type: 'success' });
  });

  const profile = $('[data-profile]', root);
  if (profile) {
    profile.addEventListener('input', clearFieldError);
    profile.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = profile.querySelector('[type="submit"]');
      const v = (n) => profile.querySelector(`[name="${n}"]`).value.trim();
      if (v('firstName').length < 2) { showFieldErrors(profile, { firstName: 'Enter your first name' }); return; }
      setBusy(btn, true);
      try {
        await updateProfile({ firstName: v('firstName'), lastName: v('lastName'), email: v('email'), phone: v('phone'), birthday: v('birthday') });
        toast('Details saved', { type: 'success' });
        navigate('/account/profile', { replace: true });
      } catch (err) {
        if (err.fields) showFieldErrors(profile, err.fields);
        else toast('Couldn’t save', { type: 'error', text: err.message });
        setBusy(btn, false);
      }
    });
  }

  // Refresh the favourites tab when a heart is removed
  if (tab === 'favorites') {
    const unsub = store.subscribe('favorites', () => {
      const box = root.querySelector('.account__content');
      box.innerHTML = `<h2 class="account__title">Favourites</h2>${favoritesTab()}`;
      observeReveal(box);
    });
    scope.add(unsub);
  }
}
