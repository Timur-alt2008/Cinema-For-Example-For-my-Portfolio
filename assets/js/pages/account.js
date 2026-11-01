// Вход, регистрация и личный кабинет.

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

/* ------------------------------- Вход / регистрация ------------------- */

function authLayout(inner, mode) {
  return html`<section class="auth wrap">
    <div class="auth__art" aria-hidden="true">
      <div class="auth__posters">${['f04', 'f01', 'f02', 'f06', 'f14', 'f08'].map((id, i) => `<span style="--i:${i}">${poster(getFilmById(id), { label: false })}</span>`).join('')}</div>
      <div class="auth__quote"><p>«Кино — это то, что происходит, когда гаснет свет».</p><span>Cinema Example</span></div>
    </div>
    <div class="auth__panel">
      ${crumbs([{ label: mode === 'login' ? 'Вход' : 'Регистрация' }])}
      ${inner}
    </div>
  </section>`;
}

export async function loginPage({ query }) {
  setTitle('Вход');
  if (currentUser()) { navigate(query.next || '/account', { replace: true }); return; }
  const root = mount(authLayout(html`
    <h1>С возвращением</h1>
    <p class="lead">Войдите, чтобы видеть свои билеты, историю заказов и избранные фильмы.</p>
    <form class="auth__form" data-form novalidate>
      ${field({ name: 'email', label: 'Электронная почта', type: 'email', required: true, autocomplete: 'email', placeholder: 'you@example.com' })}
      ${field({ name: 'password', label: 'Пароль', type: 'password', required: true, autocomplete: 'current-password', placeholder: '••••••' })}
      <p class="form-error" data-error role="alert" hidden></p>
      <button class="btn btn--primary btn--lg btn--block" type="submit">Войти</button>
      <p class="auth__switch muted">Ещё нет аккаунта? <a class="gold" href="#/register${query.next ? `?next=${encodeURIComponent(query.next)}` : ''}">Зарегистрироваться</a></p>
      <p class="field__hint">${icon('info')} Демо-режим: аккаунты хранятся только в этом браузере.</p>
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
      toast(`Здравствуйте, ${user.firstName}!`, { type: 'success' });
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
  setTitle('Регистрация');
  if (currentUser()) { navigate('/account', { replace: true }); return; }
  const last = store.get('lastCustomer', {});
  const root = mount(authLayout(html`
    <h1>Личный кабинет</h1>
    <p class="lead">Билеты в одном месте, напоминания о премьерах и быстрый заказ без ввода данных.</p>
    <form class="auth__form" data-form novalidate>
      <div class="form-grid">
        ${field({ name: 'firstName', label: 'Имя', required: true, autocomplete: 'given-name', value: last.firstName || '' })}
        ${field({ name: 'lastName', label: 'Фамилия', autocomplete: 'family-name', value: last.lastName || '' })}
      </div>
      ${field({ name: 'email', label: 'Электронная почта', type: 'email', required: true, autocomplete: 'email', value: last.email || '' })}
      ${field({ name: 'phone', label: 'Телефон', type: 'tel', autocomplete: 'tel', value: last.phone || '', placeholder: '+380 67 123 45 67' })}
      ${field({ name: 'password', label: 'Пароль', type: 'password', required: true, autocomplete: 'new-password', hint: 'Минимум 6 символов' })}
      <label class="check"><input type="checkbox" name="news" checked> Сообщать о премьерах и акциях</label>
      <button class="btn btn--primary btn--lg btn--block" type="submit">Создать аккаунт</button>
      <p class="auth__switch muted">Уже есть аккаунт? <a class="gold" href="#/login${query.next ? `?next=${encodeURIComponent(query.next)}` : ''}">Войти</a></p>
      <p class="field__hint">${icon('lock')} Демо-режим: пароль хранится в виде хеша только в этом браузере. Не используйте настоящий пароль.</p>
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
      toast('Аккаунт создан', { type: 'success', text: `Добро пожаловать, ${user.firstName}!` });
      navigate(query.next || '/account', { replace: true });
    } catch (err) {
      setBusy(btn, false);
      if (err.fields) showFieldErrors(form, err.fields);
      else toast('Не удалось зарегистрироваться', { type: 'error', text: err.message });
    }
  });
}

/* ------------------------------- Кабинет ------------------------------ */

const TABS = [
  { key: 'tickets', label: 'Мои билеты', icon: 'ticket' },
  { key: 'history', label: 'История заказов', icon: 'history' },
  { key: 'favorites', label: 'Избранное', icon: 'heart' },
  { key: 'notifications', label: 'Уведомления', icon: 'bell' },
  { key: 'profile', label: 'Личные данные', icon: 'user' },
];

const isUpcoming = (o) => {
  const s = findSession(o.sessionId);
  if (!s) return false;
  return sessionDate(s) > new Date() && o.status !== 'cancelled';
};

function ticketsTab(orders) {
  const upcoming = orders.filter(isUpcoming).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  if (!upcoming.length) {
    return emptyState({ iconName: 'ticket', title: 'Предстоящих сеансов нет', text: 'Самое время выбрать фильм. Купленные билеты появятся здесь и будут доступны без интернета у контролёра.', action: `<a class="btn btn--primary" href="#/schedule">${icon('calendar')} Выбрать сеанс</a>` });
  }
  return html`<div class="acc-tickets">
    ${upcoming.map((o) => html`<div class="acc-ticket" data-reveal>
      ${ticketView(o, { compact: true })}
      <div class="acc-ticket__actions">
        <span class="muted">${relativeDays(o.date)}, ${o.time}</span>
        <a class="btn btn--ghost btn--sm" href="#/ticket/${o.id}">${icon('eye')} Открыть</a>
        <button class="btn btn--quiet btn--sm" type="button" data-cancel="${o.id}">${icon('reset')} Вернуть</button>
      </div>
    </div>`)}
  </div>`;
}

function historyTab(orders) {
  if (!orders.length) {
    return emptyState({ iconName: 'history', title: 'Заказов пока нет', text: 'Здесь будет история всех покупок и броней.', action: `<a class="btn btn--primary" href="#/afisha">${icon('film')} В афишу</a>` });
  }
  const statusLabel = { paid: 'Оплачен', reserved: 'Бронь', cancelled: 'Возврат' };
  return html`<div class="orders">
    <div class="orders__head" aria-hidden="true"><span>Фильм</span><span>Сеанс</span><span>Места</span><span>Сумма</span><span>Статус</span></div>
    ${orders.map((o) => {
      const film = getFilmById(o.filmId);
      const hall = getHallById(o.hallId);
      return html`<a class="order-row" href="#/ticket/${o.id}">
        <span class="order-row__film"><span class="order-row__thumb">${poster(film, { title: false, label: false })}</span><span><b>${esc(film.title)}</b><small class="muted">№ ${o.id} · ${formatDateShort(o.createdAt.slice(0, 10))}</small></span></span>
        <span><b class="tnum">${formatDate(o.date)}, ${o.time}</b><small class="muted">Зал ${hall.number} · ${o.format}</small></span>
        <span>${o.seats.length} ${plural(o.seats.length, ['место', 'места', 'мест'])}<small class="muted">${o.seats.map((s) => `${s.row}-${s.num}`).join(', ')}</small></span>
        <span class="tnum">${price(o.total)}</span>
        <span><span class="status status--${o.status}">${statusLabel[o.status]}</span></span>
      </a>`;
    })}
  </div>`;
}

function favoritesTab() {
  const list = favorites.list().map(getFilmById).filter(Boolean);
  if (!list.length) {
    return emptyState({ iconName: 'heart', title: 'Избранное пусто', text: 'Нажимайте на сердечко на постере, чтобы сохранять фильмы и не потерять их.', action: `<a class="btn btn--primary" href="#/afisha">${icon('film')} Открыть афишу</a>` });
  }
  return `<div class="film-grid">${list.map((f, i) => filmCard(f, { index: i })).join('')}</div>`;
}

function notificationsTab(user) {
  const soon = FILMS.filter((f) => f.status === 'soon').sort((a, b) => a.premiere.localeCompare(b.premiere));
  const n = user.notify || {};
  return html`
    <div class="panel panel__pad notif-settings">
      <h3 class="panel__title">Каналы уведомлений</h3>
      ${[
        ['premieres', 'Премьеры', 'Письмо в день старта продаж на фильмы из списка ниже'],
        ['reminders', 'Напоминания о сеансе', 'SMS за 2 часа до начала с номером зала'],
        ['promos', 'Акции и закрытые показы', 'Не чаще одного письма в неделю'],
      ].map(([k, t, d]) => html`<label class="setting"><span><b>${t}</b><small class="muted">${d}</small></span><input class="switch" type="checkbox" data-notify-setting="${k}" ${n[k] ? 'checked' : ''}></label>`)}
    </div>
    <h3 class="acc-subtitle">Напомнить о премьере</h3>
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
      ${field({ name: 'firstName', label: 'Имя', value: user.firstName, required: true, autocomplete: 'given-name' })}
      ${field({ name: 'lastName', label: 'Фамилия', value: user.lastName, autocomplete: 'family-name' })}
      ${field({ name: 'email', label: 'Почта', type: 'email', value: user.email, required: true, autocomplete: 'email' })}
      ${field({ name: 'phone', label: 'Телефон', type: 'tel', value: user.phone, autocomplete: 'tel' })}
      ${field({ name: 'birthday', label: 'Дата рождения', type: 'date', value: user.birthday, hint: 'Для акции «День рождения в зале»' })}
    </div>
    <div class="profile-actions">
      <button class="btn btn--primary" type="submit">${icon('check')} Сохранить изменения</button>
      <span class="muted">Аккаунт создан ${formatDate(user.createdAt.slice(0, 10), { year: true })}</span>
    </div>
  </form>`;
}

export async function accountPage({ params, scope }) {
  const user = currentUser();
  if (!user) { navigate(`/login?next=${encodeURIComponent(`/account${params.tab ? `/${params.tab}` : ''}`)}`, { replace: true }); return; }
  const tab = TABS.some((t) => t.key === params.tab) ? params.tab : 'tickets';
  setTitle('Личный кабинет');
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
      ${crumbs([{ label: 'Личный кабинет' }])}
      <header class="account__head">
        <span class="avatar avatar--xl">${esc(initials(`${user.firstName} ${user.lastName}`))}</span>
        <div>
          <p class="eyebrow">Личный кабинет</p>
          <h1>${esc(user.firstName)} ${esc(user.lastName)}</h1>
          <p class="muted">${esc(user.email)}</p>
        </div>
        <div class="account__stats">
          <div><b class="tnum">${upcomingCount}</b><span>впереди</span></div>
          <div><b class="tnum">${orders.length}</b><span>заказов</span></div>
          <div><b class="tnum">${price(spent)}</b><span>потрачено</span></div>
        </div>
      </header>
      <div class="account__grid">
        <nav class="account__nav" aria-label="Разделы кабинета">
          ${TABS.map((t) => `<a href="#/account/${t.key}" class="${t.key === tab ? 'is-active' : ''}" ${t.key === tab ? 'aria-current="page"' : ''}>${icon(t.icon)}<span>${t.label}</span>${t.key === 'favorites' && favorites.list().length ? `<em>${favorites.list().length}</em>` : ''}${t.key === 'tickets' && upcomingCount ? `<em>${upcomingCount}</em>` : ''}</a>`).join('')}
          <button type="button" data-logout>${icon('logout')}<span>Выйти</span></button>
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
      toast('Вы вышли из аккаунта');
      navigate('/', { replace: true });
      return;
    }
    const c = e.target.closest('[data-cancel]');
    if (c) {
      const ok = await confirmDialog({ title: 'Вернуть билет?', text: `Заказ ${c.dataset.cancel} будет отменён, места вернутся в продажу. В демо-режиме деньги не списывались.`, confirm: 'Вернуть билет', danger: true });
      if (!ok) return;
      try {
        await cancelOrder(c.dataset.cancel);
        toast('Билет возвращён', { type: 'success' });
        navigate('/account/tickets', { replace: true });
      } catch (err) {
        toast('Возврат невозможен', { type: 'error', text: err.message });
      }
    }
  });

  root.addEventListener('change', async (e) => {
    const s = e.target.closest('[data-notify-setting]');
    if (!s) return;
    const notify = { ...(currentUser().notify || {}), [s.dataset.notifySetting]: s.checked };
    await updateProfile({ notify });
    toast(s.checked ? 'Уведомления включены' : 'Уведомления выключены', { type: 'success' });
  });

  const profile = $('[data-profile]', root);
  if (profile) {
    profile.addEventListener('input', clearFieldError);
    profile.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = profile.querySelector('[type="submit"]');
      const v = (n) => profile.querySelector(`[name="${n}"]`).value.trim();
      if (v('firstName').length < 2) { showFieldErrors(profile, { firstName: 'Укажите имя' }); return; }
      setBusy(btn, true);
      try {
        await updateProfile({ firstName: v('firstName'), lastName: v('lastName'), email: v('email'), phone: v('phone'), birthday: v('birthday') });
        toast('Данные сохранены', { type: 'success' });
        navigate('/account/profile', { replace: true });
      } catch (err) {
        if (err.fields) showFieldErrors(profile, err.fields);
        else toast('Не удалось сохранить', { type: 'error', text: err.message });
        setBusy(btn, false);
      }
    });
  }

  // Обновляем вкладку избранного при снятии сердечка
  if (tab === 'favorites') {
    const unsub = store.subscribe('favorites', () => {
      const box = root.querySelector('.account__content');
      box.innerHTML = `<h2 class="account__title">Избранное</h2>${favoritesTab()}`;
      observeReveal(box);
    });
    scope.add(unsub);
  }
}
