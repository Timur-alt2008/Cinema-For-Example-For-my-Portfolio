// Cinema Example application entry point.

import { startRouter } from './router.js';
import { renderHeader, renderFooter, setActiveNav, closeMobileMenu } from './components/shell.js';
import { toast, errorState } from './components/ui.js';
import { openTrailer } from './components/trailer.js';
import { favorites, premiereAlerts } from './store.js';
import { getFilmById } from './data/films.js';
import { icon } from './icons.js';
import { formatDate } from './lib/format.js';
import { main } from './pages/common.js';

import home from './pages/home.js';
import catalog from './pages/catalog.js';
import filmPage from './pages/film.js';
import schedule from './pages/schedule.js';
import seats from './pages/seats.js';
import checkout from './pages/checkout.js';
import ticket from './pages/ticket.js';
import { about, halls, promos, contacts, faq, notFound } from './pages/info.js';
import { loginPage, registerPage, accountPage } from './pages/account.js';

const routes = [
  { path: '/', render: home, nav: 'home' },
  { path: '/afisha', render: catalog, nav: 'afisha' },
  { path: '/film/:id', render: filmPage, nav: 'afisha' },
  { path: '/schedule', render: schedule, nav: 'schedule' },
  { path: '/session/:id', render: seats, nav: 'schedule' },
  { path: '/checkout', render: checkout, nav: 'schedule' },
  { path: '/ticket/:id', render: ticket, nav: '' },
  { path: '/about', render: about, nav: 'about' },
  { path: '/halls', render: halls, nav: 'halls' },
  { path: '/promos', render: promos, nav: 'promos' },
  { path: '/contacts', render: contacts, nav: 'contacts' },
  { path: '/faq', render: faq, nav: 'faq' },
  { path: '/login', render: loginPage, nav: '' },
  { path: '/register', render: registerPage, nav: '' },
  { path: '/account', render: accountPage, nav: '' },
  { path: '/account/:tab', render: accountPage, nav: '' },
  { path: '*', render: notFound, nav: '' },
];

/* ------------------------------- Global actions ----------------------- */

function syncFavButtons(id, active) {
  document.querySelectorAll(`[data-fav="${id}"]`).forEach((b) => {
    b.classList.toggle('is-active', active);
    b.setAttribute('aria-pressed', String(active));
    const film = getFilmById(id);
    b.setAttribute('aria-label', `${active ? 'Remove from favourites' : 'Add to favourites'}: ${film?.title || ''}`);
  });
}

function syncNotifyButtons(id, on) {
  document.querySelectorAll(`[data-notify="${id}"]`).forEach((b) => {
    b.setAttribute('aria-pressed', String(on));
    const label = b.querySelector('span');
    if (label) {
      const short = b.classList.contains('btn--sm') && b.closest('.film-card');
      label.textContent = short ? (on ? 'Reminder on' : 'Remind me') : (on ? 'Reminder set' : 'Remind me at premiere');
    }
  });
}

document.addEventListener('click', (e) => {
  const fav = e.target.closest('[data-fav]');
  if (fav) {
    e.preventDefault();
    const id = fav.dataset.fav;
    const active = favorites.toggle(id);
    syncFavButtons(id, active);
    fav.classList.remove('pop');
    void fav.offsetWidth;
    fav.classList.add('pop');
    const film = getFilmById(id);
    toast(active ? 'Added to favourites' : 'Removed from favourites', { text: film?.title, iconName: 'heart', type: active ? 'success' : 'info', timeout: 2600 });
    return;
  }
  const notify = e.target.closest('[data-notify]');
  if (notify) {
    e.preventDefault();
    const id = notify.dataset.notify;
    const on = premiereAlerts.toggle(id);
    syncNotifyButtons(id, on);
    const film = getFilmById(id);
    toast(on ? 'We’ll remind you at the premiere' : 'Reminder turned off', {
      text: on && film ? `“${film.title}” — ${formatDate(film.premiere)}. We’ll let you know when tickets go on sale.` : film?.title,
      iconName: 'bell',
      type: on ? 'success' : 'info',
    });
    return;
  }
  const trailer = e.target.closest('[data-trailer]');
  if (trailer) {
    const film = getFilmById(trailer.dataset.trailer);
    if (film) openTrailer(film);
  }
});

/* ------------------------------- Start -------------------------------- */

const progress = document.querySelector('.route-progress');
let progressTimer;

function start() {
  renderHeader();
  renderFooter();
  startRouter(routes, {
    before: ({ route, samePage }) => {
      closeMobileMenu();
      document.querySelectorAll('.modal').forEach((m) => m.querySelector('[data-close]')?.click());
      clearTimeout(progressTimer);
      progress.classList.remove('is-done');
      progress.classList.add('is-active');
      setActiveNav(route.nav);
      if (!samePage) {
        const html = document.documentElement;
        html.style.scrollBehavior = 'auto';
        window.scrollTo(0, 0);
        html.style.scrollBehavior = '';
      }
    },
    after: () => {
      progress.classList.remove('is-active');
      progress.classList.add('is-done');
      progressTimer = setTimeout(() => progress.classList.remove('is-done'), 700);
      const m = main();
      if (document.activeElement && document.activeElement !== document.body && !m.contains(document.activeElement)) {
        m.focus({ preventScroll: true });
      }
    },
    error: (err) => {
      main().innerHTML = errorState(err);
      progress.classList.remove('is-active');
    },
  });

  document.addEventListener('click', (e) => {
    const retry = e.target.closest('[data-retry]');
    if (retry && !retry.closest('[data-results], [data-list]')) window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
}

window.addEventListener('error', (e) => {
  console.error(e.error || e.message);
});
window.addEventListener('unhandledrejection', (e) => {
  console.error(e.reason);
  toast('Something went wrong', { type: 'error', text: 'Please try again — we’re already rewinding the reel.' });
});

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
else start();

export { icon };
