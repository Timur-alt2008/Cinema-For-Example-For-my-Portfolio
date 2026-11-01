// Шапка, мобильное меню, поиск, уведомления и подвал.

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
  { href: '#/afisha', label: 'Афиша', key: 'afisha' },
  { href: '#/schedule', label: 'Расписание', key: 'schedule' },
  { href: '#/halls', label: 'Залы', key: 'halls' },
  { href: '#/promos', label: 'Акции', key: 'promos' },
  { href: '#/about', label: 'О кинотеатре', key: 'about' },
  { href: '#/contacts', label: 'Контакты', key: 'contacts' },
];

export function logo() {
  return html`<a class="logo" href="#/" aria-label="Cinema Example — на главную">
    <span class="logo__mark">${icon('logoMark')}</span>
    <span class="logo__text"><span class="logo__name">Cinema <em>Example</em></span><span class="logo__sub">кино · полночь · страх</span></span>
  </a>`;
}

function headerHTML() {
  const user = currentUser();
  return html`
  <div class="wrap header__inner">
    ${logo()}
    <nav class="nav" aria-label="Основное меню">
      ${NAV.map((n) => `<a class="nav__link" href="${n.href}" data-nav="${n.key}">${n.label}</a>`)}
    </nav>
    <div class="header__actions">
      <button class="icon-btn" type="button" data-open-search aria-label="Поиск фильмов">${icon('search')}</button>
      <div class="notif-wrap">
        <button class="icon-btn" type="button" data-notif-toggle aria-label="Уведомления о премьерах" aria-expanded="false">
          ${icon('bell')}<span class="icon-btn__badge" data-notif-count></span>
        </button>
        <div class="dropdown" data-notif-panel role="dialog" aria-label="Уведомления"></div>
      </div>
      <a class="icon-btn header__fav" href="#/account/favorites" aria-label="Избранные фильмы">${icon('heart')}<span class="icon-btn__badge" data-fav-count></span></a>
      ${user
        ? `<a class="header__user" href="#/account" aria-label="Личный кабинет"><span class="avatar">${esc(initials(`${user.firstName} ${user.lastName}`))}</span><span>${esc(user.firstName)}</span></a>`
        : `<a class="header__user" href="#/login" aria-label="Войти в личный кабинет"><span class="avatar">${icon('user')}</span><span>Войти</span></a>`}
      <a class="btn btn--primary btn--sm header__cta" href="#/schedule">${icon('ticket')} Купить билет</a>
      <button class="icon-btn burger" type="button" data-burger aria-label="Открыть меню" aria-expanded="false" aria-controls="mobile-menu">${icon('menu')}</button>
    </div>
  </div>
  <div class="mobile-menu" id="mobile-menu" aria-hidden="true">
    <nav class="mobile-menu__nav" aria-label="Мобильное меню">
      <a class="mobile-menu__link" href="#/" data-nav="home" style="transition-delay:40ms">Главная <small>01</small></a>
      ${NAV.map((n, i) => `<a class="mobile-menu__link" href="${n.href}" data-nav="${n.key}" style="transition-delay:${80 + i * 40}ms">${n.label} <small>0${i + 2}</small></a>`)}
      <a class="mobile-menu__link" href="#/faq" data-nav="faq" style="transition-delay:360ms">Вопросы <small>08</small></a>
    </nav>
    <div class="mobile-menu__foot">
      <a class="btn btn--primary btn--lg" href="#/schedule">${icon('ticket')} Купить билет</a>
      <a class="btn btn--ghost" href="${user ? '#/account' : '#/login'}">${icon('user')} ${user ? 'Личный кабинет' : 'Войти или зарегистрироваться'}</a>
      <p class="muted" style="font-size:.82rem;text-align:center">${CINEMA.addressFull}<br>${CINEMA.phone}</p>
    </div>
  </div>`;
}

function notifPanelHTML() {
  const ids = premiereAlerts.list();
  const films = ids.map(getFilmById).filter(Boolean).sort((a, b) => a.premiere.localeCompare(b.premiere));
  return html`
    <div class="dropdown__head"><span>Премьеры</span><a href="#/account/notifications" class="muted" style="letter-spacing:0;text-transform:none;font-weight:600">Настроить</a></div>
    ${films.length
      ? films.map((f) => html`<a class="dropdown__item" href="#/film/${f.id}">
          <span class="dropdown__thumb">${poster(f, { title: false, label: false })}</span>
          <span><b>${esc(f.title)}</b><br><span class="muted">${f.status === 'soon' ? `Премьера ${formatDate(f.premiere)} — ${relativeDays(f.premiere)}` : 'Уже в прокате — билеты в продаже'}</span></span>
        </a>`)
      : `<div class="dropdown__empty">Нажмите «Напомнить о премьере» у фильма из раздела «Скоро в кино» — мы сообщим, когда откроется продажа билетов.</div>`}
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
      burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
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

/* ------------------------------- Поиск -------------------------------- */

export function openSearch() {
  closeMobileMenu();
  const m = openModal({
    title: 'Поиск по афише',
    wide: false,
    label: 'Поиск фильмов',
    body: html`
      <form class="search-box" data-search-form role="search">
        <div class="input-group">
          ${icon('search')}
          <input class="input" type="search" name="q" placeholder="Название, режиссёр или актёр" autocomplete="off" autofocus aria-label="Поиск фильма">
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
      <p class="search-results__label">${q ? (list.length ? `Найдено: ${list.length}` : '') : 'Популярно сейчас'}</p>
      ${list.length ? list.map((f) => html`<a class="search-hit" href="#/film/${f.id}">
          <span class="search-hit__thumb">${poster(f, { title: false, label: false })}</span>
          <span><b>${esc(f.title)}</b><span class="muted">${f.genreLabels.join(', ')} · ${f.age} · ${f.status === 'soon' ? `с ${formatDate(f.premiere)}` : 'в прокате'}</span></span>
          ${icon('chevronRight')}
        </a>`) : `<div class="dropdown__empty">По запросу «${esc(q)}» ничего не нашлось. Попробуйте другое название или имя режиссёра.</div>`}`;
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

/* ------------------------------- Подвал ------------------------------- */

export function renderFooter() {
  const el = document.getElementById('site-footer');
  const words = ['Тихий дом', 'Зеркальный коридор', 'Полночный сеанс', 'Последний жилец', 'Лес не спит', 'Красная нить'];
  const track = words.map((w) => `<span>${w}<i>●</i></span>`).join('');
  el.innerHTML = html`
    <div class="footer__marquee" aria-hidden="true"><div class="footer__marquee-track">${track}${track}</div></div>
    <div class="wrap footer__grid">
      <div class="footer__about">
        ${logo()}
        <p>Кинотеатр для тех, кто любит, когда в зале по-настоящему темно. Психологические триллеры, хорроры и большие премьеры в четырёх залах.</p>
        <div class="footer__socials">
          ${CINEMA.socials.map((s) => `<a href="#/contacts" aria-label="${s.label}: ${s.handle}" title="${s.label}">${icon(s.id)}</a>`)}
        </div>
      </div>
      <div>
        <h3 class="footer__title">Кино</h3>
        <ul class="footer__list">
          <li><a href="#/afisha?genre=now">Сейчас в прокате</a></li>
          <li><a href="#/afisha?genre=soon">Скоро в кино</a></li>
          <li><a href="#/schedule">Расписание сеансов</a></li>
          <li><a href="#/afisha?collection=midnight">Полночный сеанс</a></li>
        </ul>
      </div>
      <div>
        <h3 class="footer__title">Кинотеатр</h3>
        <ul class="footer__list">
          <li><a href="#/about">О кинотеатре</a></li>
          <li><a href="#/halls">Наши залы</a></li>
          <li><a href="#/promos">Акции и скидки</a></li>
          <li><a href="#/faq">Частые вопросы</a></li>
        </ul>
      </div>
      <div>
        <h3 class="footer__title">Связь</h3>
        <ul class="footer__list">
          <li><a href="tel:${CINEMA.phoneHref}">${CINEMA.phone}</a></li>
          <li><a href="mailto:${CINEMA.email}">${CINEMA.email}</a></li>
          <li><a href="#/contacts">${CINEMA.address}</a></li>
          <li class="muted">${CINEMA.hours}</li>
        </ul>
      </div>
    </div>
    <div class="wrap footer__bottom">
      <span>© ${new Date().getFullYear()} Cinema Example. Все фильмы, имена и контакты вымышлены.</span>
      <span class="demo-note">Демонстрационный проект для портфолио · оплата в тестовом режиме</span>
    </div>`;
}
