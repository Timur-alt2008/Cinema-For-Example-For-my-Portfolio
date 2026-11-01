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
  mount(loadingView('Printing your ticket…'));
  let order;
  try {
    order = await getOrder(params.id);
  } catch (err) {
    if (!isCurrent()) return;
    mount(errorState(err, { retry: false }));
    setTitle('Ticket not found');
    return;
  }
  if (!isCurrent()) return;
  const film = getFilmById(order.filmId);
  const user = currentUser();
  const reserved = order.status === 'reserved';
  const cancelled = order.status === 'cancelled';
  setTitle(`Ticket ${order.id}`);

  const root = mount(html`
    <section class="booking wrap ticket-page">
      ${query.new ? `<div class="booking__top">${stepsBar(3)}</div>` : `<div class="booking__top"><a class="link-arrow link-arrow--back" href="#/account/tickets">${icon('arrowLeft')} My tickets</a></div>`}
      <header class="ticket-page__head">
        <span class="ticket-page__check ${cancelled ? 'is-cancelled' : ''}" aria-hidden="true">${icon(cancelled ? 'close' : 'check')}</span>
        <div>
          <p class="eyebrow">${cancelled ? 'Order cancelled' : reserved ? 'Booking confirmed' : query.new ? 'Payment complete · test mode' : 'E-ticket'}</p>
          <h1>${cancelled ? 'Ticket refunded' : reserved ? 'Your seats are booked' : query.new ? 'See you in the dark' : esc(film.title)}</h1>
          <p class="lead">${cancelled
            ? 'The seats are back on sale. In a real service the money would return to your card within 3–5 business days.'
            : reserved
              ? `Pay for your tickets at the box office at least 30 minutes before the show: ${formatDate(order.date)}, ${order.time}. Just give your order number <b class="tnum">${order.id}</b>.`
              : `“${esc(film.title)}” — ${relativeDays(order.date)} at ${order.time}. A copy of your ticket was sent to <b>${esc(order.customer.email)}</b> (no emails are sent in demo mode).`}</p>
        </div>
      </header>

      <div class="ticket-print" id="ticket-print">${ticketView(order)}</div>

      <div class="ticket-actions">
        <button class="btn btn--primary" type="button" data-download>${icon('download')} Download ticket</button>
        <button class="btn btn--ghost" type="button" data-print>${icon('print')} Save as PDF</button>
        <button class="btn btn--ghost" type="button" data-ics>${icon('calendar')} Add to calendar</button>
        <button class="btn btn--quiet" type="button" data-copy>${icon('copy')} Copy order number</button>
      </div>

      <div class="ticket-info">
        <div class="feature"><div class="feature__icon">${icon('clock')}</div><h3>Arrive early</h3><p>Doors open 15 minutes before the show. Once the film starts, late entry is only possible until the trailers end.</p></div>
        <div class="feature"><div class="feature__icon">${icon('mapPin')}</div><h3>Getting here</h3><p>${CINEMA.addressFull}. Parking is free for 3 hours with your ticket.</p></div>
        <div class="feature"><div class="feature__icon">${icon('reset')}</div><h3>Refunds</h3><p>You can refund your ticket in your account up to 60 minutes before the show.</p></div>
      </div>

      <div class="ticket-page__links">
        ${user ? `<a class="btn btn--ghost" href="#/account/tickets">${icon('ticket')} All my tickets</a>` : `<a class="btn btn--ghost" href="#/register">${icon('user')} Create an account to keep your tickets</a>`}
        <a class="link-arrow" href="#/afisha">Back to films ${icon('arrowRight')}</a>
      </div>
      ${order.promo ? `<p class="muted center">Promo code ${order.promo.code} applied: ${price(order.discount)} off.</p>` : ''}
    </section>
  `);

  root.addEventListener('click', async (e) => {
    if (e.target.closest('[data-download]')) {
      const ok = downloadFile(`cinema-example-ticket-${order.id}.svg`, ticketFileSVG(order), 'image/svg+xml');
      toast(ok ? 'Ticket downloaded' : 'Couldn’t download the file', { type: ok ? 'success' : 'error', text: ok ? 'Open it in any browser or print it.' : 'Try “Save as PDF” instead.' });
    }
    if (e.target.closest('[data-print]')) {
      toast('Opening the print dialog', { text: 'Choose “Save as PDF” as the printer.' });
      setTimeout(() => window.print(), 400);
    }
    if (e.target.closest('[data-ics]')) {
      const ok = downloadFile(`cinema-example-${order.id}.ics`, icsFor(order), 'text/calendar');
      if (ok) toast('Calendar event created', { type: 'success', text: 'Open the file — the show will appear in your calendar with a 2-hour reminder.' });
    }
    if (e.target.closest('[data-copy]')) {
      const ok = await copyText(order.id);
      toast(ok ? `Order number ${order.id} copied` : `Order number: ${order.id}`, { type: ok ? 'success' : 'info' });
    }
  });

  if (query.new) {
    setTimeout(() => toast(reserved ? 'Booking confirmed' : 'Your ticket is ready', { type: 'success', text: `Order ${order.id}` }), 400);
  }
}
