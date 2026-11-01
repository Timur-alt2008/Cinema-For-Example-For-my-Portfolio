import { html, esc, $ } from '../lib/dom.js';
import { icon } from '../icons.js';
import { mount, stepsBar, setTitle, loadingView } from './common.js';
import { getOrder, currentUser } from '../services/api.js';
import { getFilmById } from '../data/films.js';
import { ticketView, ticketFileSVG, downloadFile, icsFor } from '../components/ticket.js';
import { errorState, toast, copyText } from '../components/ui.js';
import { formatDate, price, relativeDays } from '../lib/format.js';
import { CINEMA } from '../data/site.js';

export default async function ticketPage({ params, query, isCurrent }) {
  mount(loadingView('Печатаем билет…'));
  let order;
  try {
    order = await getOrder(params.id);
  } catch (err) {
    if (!isCurrent()) return;
    mount(errorState(err, { retry: false }));
    setTitle('Билет не найден');
    return;
  }
  if (!isCurrent()) return;
  const film = getFilmById(order.filmId);
  const user = currentUser();
  const reserved = order.status === 'reserved';
  const cancelled = order.status === 'cancelled';
  setTitle(`Билет ${order.id}`);

  const root = mount(html`
    <section class="booking wrap ticket-page">
      ${query.new ? `<div class="booking__top">${stepsBar(3)}</div>` : `<div class="booking__top"><a class="link-arrow link-arrow--back" href="#/account/tickets">${icon('arrowLeft')} Мои билеты</a></div>`}
      <header class="ticket-page__head">
        <span class="ticket-page__check ${cancelled ? 'is-cancelled' : ''}" aria-hidden="true">${icon(cancelled ? 'close' : 'check')}</span>
        <div>
          <p class="eyebrow">${cancelled ? 'Заказ отменён' : reserved ? 'Бронь подтверждена' : query.new ? 'Оплата прошла · тестовый режим' : 'Электронный билет'}</p>
          <h1>${cancelled ? 'Билет возвращён' : reserved ? 'Места забронированы' : query.new ? 'До встречи в зале' : esc(film.title)}</h1>
          <p class="lead">${cancelled
            ? 'Места вернулись в продажу. В реальном сервисе деньги пришли бы на карту в течение 3–5 рабочих дней.'
            : reserved
              ? `Выкупите билеты в кассе не позднее чем за 30 минут до начала: ${formatDate(order.date)}, ${order.time}. Назовите номер заказа <b class="tnum">${order.id}</b>.`
              : `Сеанс «${esc(film.title)}» — ${relativeDays(order.date)}, в ${order.time}. Копия билета отправлена на <b>${esc(order.customer.email)}</b> (в демо-режиме письма не отправляются).`}</p>
        </div>
      </header>

      <div class="ticket-print" id="ticket-print">${ticketView(order)}</div>

      <div class="ticket-actions">
        <button class="btn btn--primary" type="button" data-download>${icon('download')} Скачать билет</button>
        <button class="btn btn--ghost" type="button" data-print>${icon('print')} Сохранить в PDF</button>
        <button class="btn btn--ghost" type="button" data-ics>${icon('calendar')} Добавить в календарь</button>
        <button class="btn btn--quiet" type="button" data-copy>${icon('copy')} Номер заказа</button>
      </div>

      <div class="ticket-info">
        <div class="feature"><div class="feature__icon">${icon('clock')}</div><h3>Приходите заранее</h3><p>Вход в зал открывается за 15 минут до начала. После начала сеанса вход возможен только до конца рекламы.</p></div>
        <div class="feature"><div class="feature__icon">${icon('mapPin')}</div><h3>Как добраться</h3><p>${CINEMA.addressFull}. Паркинг — 3 часа бесплатно по билету.</p></div>
        <div class="feature"><div class="feature__icon">${icon('reset')}</div><h3>Возврат</h3><p>Вернуть билет можно в личном кабинете не позднее чем за 60 минут до сеанса.</p></div>
      </div>

      <div class="ticket-page__links">
        ${user ? `<a class="btn btn--ghost" href="#/account/tickets">${icon('ticket')} Все мои билеты</a>` : `<a class="btn btn--ghost" href="#/register">${icon('user')} Создать кабинет, чтобы хранить билеты</a>`}
        <a class="link-arrow" href="#/afisha">Вернуться в афишу ${icon('arrowRight')}</a>
      </div>
      ${order.promo ? `<p class="muted center">Применён промокод ${order.promo.code}: скидка ${price(order.discount)}.</p>` : ''}
    </section>
  `);

  root.addEventListener('click', async (e) => {
    if (e.target.closest('[data-download]')) {
      const ok = downloadFile(`cinema-example-ticket-${order.id}.svg`, ticketFileSVG(order), 'image/svg+xml');
      toast(ok ? 'Билет скачан' : 'Не удалось скачать файл', { type: ok ? 'success' : 'error', text: ok ? 'Файл можно открыть в браузере или распечатать.' : 'Попробуйте «Сохранить в PDF».' });
    }
    if (e.target.closest('[data-print]')) {
      toast('Откроется окно печати', { text: 'Выберите «Сохранить как PDF» в списке принтеров.' });
      setTimeout(() => window.print(), 400);
    }
    if (e.target.closest('[data-ics]')) {
      const ok = downloadFile(`cinema-example-${order.id}.ics`, icsFor(order), 'text/calendar');
      if (ok) toast('Событие добавлено', { type: 'success', text: 'Откройте файл — сеанс появится в календаре с напоминанием за 2 часа.' });
    }
    if (e.target.closest('[data-copy]')) {
      const ok = await copyText(order.id);
      toast(ok ? `Номер ${order.id} скопирован` : `Номер заказа: ${order.id}`, { type: ok ? 'success' : 'info' });
    }
  });

  if (query.new) {
    setTimeout(() => toast(reserved ? 'Бронь оформлена' : 'Билет готов', { type: 'success', text: `Заказ ${order.id}` }), 400);
  }
}
