// Header, mobile menu, search, notifications and footer.

import { html, esc, $, debounce } from '../lib/dom.js';
import { icon } from '../icons.js';
import { store, favorites, premiereAlerts } from '../store.js';
import { currentUser, searchFilmsSync } from '../services/api.js';
import { getFilmById } from '../data/films.js';
import { CINEMA } from '../data/site.js';
import { poster } from './poster.js';
import { openModal } from './ui.js';
import { formatDate, relativeDays, initials } from '../lib/format.js';
import { navigate } from '../router.js';

export const NAV = [
  { href: '#/afisha', label: 'Films', key: 'afisha' },
  { href: '#/schedule', label: 'Showtimes', key: 'schedule' },
  { href: '#/halls', label: 'Rooms', key: 'halls' },
  { href: '#/promos', label: 'Offers', key: 'promos' },
  { href: '#/about', label: 'About', key: 'about' },
  { href: '#/contacts', label: 'Contact', key: 'contacts' },
];

export function logo() {
  return html`<a class="logo" href="#/" aria-label="Cinema Example — home">
    <span class="logo__mark">${icon('logoMark')}</span>
    <span class="logo__text"><span class="logo__name">Cinema <em>Example</em></span><span class="logo__sub">film · midnight · fear</span></span>
  </a>`;
}

function headerHTML() {
  const user = currentUser();
  return html`
  <div class="wrap header__inner">
    ${logo()}
    <nav class="nav" aria-label="Main menu">
      ${NAV.map((n) => `<a class="nav__link" href="${n.href}" data-nav="${n.key}">${n.label}</a>`)}
    </nav>
    <div class="header__actions">
      <button class="icon-btn" type="button" data-open-search aria-label="Search films">${icon('search')}</button>
      <div class="notif-wrap">
        <button class="icon-btn" type="button" data-notif-toggle aria-label="Premiere alerts" aria-expanded="false">
          ${icon('bell')}<span class="icon-btn__badge" data-notif-count></span>
        </button>
        <div class="dropdown" data-notif-panel role="dialog" aria-label="Notifications"></div>
      </div>
      <a class="icon-btn header__fav" href="#/account/favorites" aria-label="Favourite films">${icon('heart')}<span class="icon-btn__badge" data-fav-count></span></a>
      ${user
        ? `<a class="header__user" href="#/account" aria-label="My account"><span class="avatar">${esc(initials(`${user.firstName} ${user.lastName}`))}</span><span>${esc(user.firstName)}</span></a>`
        : `<a class="header__user" href="#/login" aria-label="Sign in to your account"><span class="avatar">${icon('user')}</span><span>Sign in</span></a>`}
      <a class="btn btn--primary btn--sm header__cta" href="#/schedule">${icon('ticket')} Buy tickets</a>
      <button class="icon-btn burger" type="button" data-burger aria-label="Open menu" aria-expanded="false" aria-controls="mobile-menu">${icon('menu')}</button>
    </div>
  </div>
  <div class="mobile-menu" id="mobile-menu" aria-hidden="true">
    <nav class="mobile-menu__nav" aria-label="Mobile menu">
      <a class="mobile-menu__link" href="#/" data-nav="home" style="transition-delay:40ms">Home <small>01</small></a>
      ${NAV.map((n, i) => `<a class="mobile-menu__link" href="${n.href}" data-nav="${n.key}" style="transition-delay:${80 + i * 40}ms">${n.label} <small>0${i + 2}</small></a>`)}
      <a class="mobile-menu__link" href="#/faq" data-nav="faq" style="transition-delay:360ms">FAQ <small>08</small></a>
    </nav>
    <div class="mobile-menu__foot">
      <a class="btn btn--primary btn--lg" href="#/schedule">${icon('ticket')} Buy tickets</a>
      <a class="btn btn--ghost" href="${user ? '#/account' : '#/login'}">${icon('user')} ${user ? 'My account' : 'Sign in or register'}</a>
      <p class="muted" style="font-size:.82rem;text-align:center">${CINEMA.addressFull}<br>${CINEMA.phone}</p>
    </div>
  </div>`;
}

function notifPanelHTML() {
  const ids = premiereAlerts.list();
  const films = ids.map(getFilmById).filter(Boolean).sort((a, b) => a.premiere.localeCompare(b.premiere));
  return html`
    <div class="dropdown__head"><span>Premieres</span><a href="#/account/notifications" class="muted" style="letter-spacing:0;text-transform:none;font-weight:600">Settings</a></div>
    ${films.length
      ? films.map((f) => html`<a class="dropdown__item" href="#/film/${f.id}">
          <span class="dropdown__thumb">${poster(f, { title: false, label: false })}</span>
          <span><b>${esc(f.title)}</b><br><span class="muted">${f.status === 'soon' ? `Premieres ${formatDate(f.premiere)} — ${relativeDays(f.premiere)}` : 'Now showing — tickets on sale'}</span></span>
        </a>`)
      : `<div class="dropdown__empty">Tap “Remind me at premiere” on any Coming Soon film and we’ll let you know when tickets go on sale.</div>`}
  `;
}

let headerEl;

export function renderHeader() {
  headerEl = document.getElementById('site-header');
  headerEl.innerHTML = headerHTML();
  updateCounters();
  bindHeader();
}

export function updateCounters() {
  if (!headerEl) return;
  const fav = favorites.list().length;
  const soon = premiereAlerts.list().map(getFilmById).filter((f) => f && f.status === 'soon').length;
  const favEl = $('[data-fav-count]', headerEl);
  const notifEl = $('[data-notif-count]', headerEl);
  if (favEl) favEl.textContent = fav ? String(fav) : '';
  if (notifEl) notifEl.textContent = soon ? String(soon) : '';
  const panel = $('[data-notif-panel]', headerEl);
  if (panel) panel.innerHTML = notifPanelHTML();
}

let activeKey = '';
export function setActiveNav(key) {
  activeKey = key;
  document.querySelectorAll('[data-nav]').forEach((a) => {
    const active = a.dataset.nav === key;
    a.classList.toggle('is-active', active);
    if (active) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
}

export function closeMobileMenu() {
  const menu = $('#mobile-menu');
  const burger = $('[data-burger]');
  if (!menu || !menu.classList.contains('is-open')) return;
  menu.classList.remove('is-open');
  menu.setAttribute('aria-hidden', 'true');
  burger?.setAttribute('aria-expanded', 'false');
  if (burger) burger.innerHTML = icon('menu');
  document.body.classList.remove('is-locked');
}

function closeNotif() {
  const panel = $('[data-notif-panel]', headerEl);
  panel?.classList.remove('is-open');
  $('[data-notif-toggle]', headerEl)?.setAttribute('aria-expanded', 'false');
}

let bound = false;
function bindHeader() {
  if (bound) return;
  bound = true;

  const onScroll = () => headerEl.classList.toggle('is-solid', window.scrollY > 24 || document.body.dataset.solidHeader === '1');
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  headerEl.addEventListener('click', (e) => {
    if (e.target.closest('[data-burger]')) {
      const menu = $('#mobile-menu');
      const burger = e.target.closest('[data-burger]');
      const open = !menu.classList.contains('is-open');
      menu.classList.toggle('is-open', open);
      menu.setAttribute('aria-hidden', String(!open));
      burger.setAttribute('aria-expanded', String(open));
      burger.innerHTML = icon(open ? 'close' : 'menu');
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      document.body.classList.toggle('is-locked', open);
      return;
    }
    if (e.target.closest('.mobile-menu a')) { closeMobileMenu(); return; }
    if (e.target.closest('[data-open-search]')) { openSearch(); return; }
    const toggle = e.target.closest('[data-notif-toggle]');
    if (toggle) {
      const panel = $('[data-notif-panel]', headerEl);
      const open = !panel.classList.contains('is-open');
      panel.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      return;
    }
    if (e.target.closest('[data-notif-panel] a')) closeNotif();
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.notif-wrap')) closeNotif();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeNotif(); closeMobileMenu(); }
    if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !/input|textarea|select/i.test(document.activeElement?.tagName || ''))) {
      e.preventDefault();
      openSearch();
    }
  });

  store.subscribe('favorites', updateCounters);
  store.subscribe('premiereAlerts', updateCounters);
  store.subscribe('auth', () => { headerEl.innerHTML = headerHTML(); updateCounters(); setActiveNav(activeKey); });
}

/* ------------------------------- Search ------------------------------- */

export function openSearch() {
  closeMobileMenu();
  const m = openModal({
    title: 'Search films',
    wide: false,
    label: 'Search films',
    body: html`
      <form class="search-box" data-search-form role="search">
        <div class="input-group">
          ${icon('search')}
          <input class="input" type="search" name="q" placeholder="Title, director or actor" autocomplete="off" autofocus aria-label="Search for a film">
        </div>
      </form>
      <div class="search-results" data-search-results aria-live="polite"></div>`,
  });
  const input = m.dialog.querySelector('input');
  const results = m.dialog.querySelector('[data-search-results]');
  const renderResults = () => {
    const q = input.value.trim();
    const list = q ? searchFilmsSync({ q }).slice(0, 6) : searchFilmsSync({ sort: 'popular' }).slice(0, 4);
    results.innerHTML = html`
      <p class="search-results__label">${q ? (list.length ? `${list.length} found` : '') : 'Popular right now'}</p>
      ${list.length ? list.map((f) => html`<a class="search-hit" href="#/film/${f.id}">
          <span class="search-hit__thumb">${poster(f, { title: false, label: false })}</span>
          <span><b>${esc(f.title)}</b><span class="muted">${f.genreLabels.join(', ')} · ${f.age} · ${f.status === 'soon' ? `from ${formatDate(f.premiere)}` : 'now showing'}</span></span>
          ${icon('chevronRight')}
        </a>`) : `<div class="dropdown__empty">Nothing found for “${esc(q)}”. Try another title or a director’s name.</div>`}`;
  };
  input.addEventListener('input', debounce(renderResults, 120));
  m.dialog.querySelector('[data-search-form]').addEventListener('submit', (e) => {
    e.preventDefault();
    const q = input.value.trim();
    m.close();
    navigate(`/afisha${q ? `?q=${encodeURIComponent(q)}` : ''}`);
  });
  results.addEventListener('click', (e) => { if (e.target.closest('a')) m.close(); });
  renderResults();
}

/* ------------------------------- Footer ------------------------------- */

export function renderFooter() {
  const el = document.getElementById('site-footer');
  const words = ['The Quiet House', 'Mirror Hall', 'Midnight Screenings', 'The Last Tenant', 'The Woods Are Awake', 'The Red Thread'];
  const track = words.map((w) => `<span>${w}<i>●</i></span>`).join('');
  el.innerHTML = html`
    <div class="footer__marquee" aria-hidden="true"><div class="footer__marquee-track">${track}${track}</div></div>
    <div class="wrap footer__grid">
      <div class="footer__about">
        ${logo()}
        <p>A cinema for people who like it truly dark in the room. Psychological thrillers, horror and big premieres across four rooms.</p>
        <div class="footer__socials">
          ${CINEMA.socials.map((s) => `<a href="#/contacts" aria-label="${s.label}: ${s.handle}" title="${s.label}">${icon(s.id)}</a>`)}
        </div>
      </div>
      <div>
        <h3 class="footer__title">Films</h3>
        <ul class="footer__list">
          <li><a href="#/afisha?genre=now">Now showing</a></li>
          <li><a href="#/afisha?genre=soon">Coming soon</a></li>
          <li><a href="#/schedule">Showtimes</a></li>
          <li><a href="#/afisha?collection=midnight">Midnight Screenings</a></li>
        </ul>
      </div>
      <div>
        <h3 class="footer__title">Cinema</h3>
        <ul class="footer__list">
          <li><a href="#/about">About us</a></li>
          <li><a href="#/halls">Our rooms</a></li>
          <li><a href="#/promos">Offers & discounts</a></li>
          <li><a href="#/faq">FAQ</a></li>
        </ul>
      </div>
      <div>
        <h3 class="footer__title">Contact</h3>
        <ul class="footer__list">
          <li><a href="tel:${CINEMA.phoneHref}">${CINEMA.phone}</a></li>
          <li><a href="mailto:${CINEMA.email}">${CINEMA.email}</a></li>
          <li><a href="#/contacts">${CINEMA.address}</a></li>
          <li class="muted">${CINEMA.hours}</li>
        </ul>
      </div>
    </div>
    <div class="wrap footer__bottom">
      <span>© ${new Date().getFullYear()} Cinema Example. All films, names and contacts are fictional.</span>
      <span class="demo-note">Portfolio demo project · payments in test mode</span>
    </div>`;
}
