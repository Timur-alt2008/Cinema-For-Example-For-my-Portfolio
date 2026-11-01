import { html, esc, $, $$ } from '../lib/dom.js';
import { icon } from '../icons.js';
import { mount, stepsBar, setTitle, loadingView } from './common.js';
import { getSessionDetails } from '../services/api.js';
import { poster } from '../components/poster.js';
import { errorState, toast, confirmDialog } from '../components/ui.js';
import { store } from '../store.js';
import { navigate } from '../router.js';
import { formatDate, price, duration, seatsWord, plural } from '../lib/format.js';

export const MAX_SEATS = 8;
export const HOLD_MINUTES = 10;

export function getBooking() {
  const b = store.get('booking', null);
  if (!b) return null;
  if (b.expiresAt && b.expiresAt < Date.now()) { store.remove('booking'); return null; }
  return b;
}

function seatLabel(seat) {
  return `Ряд ${seat.row}, место ${seat.num}${seat.type === 'vip' ? ', VIP' : ''}, ${price(seat.price)}${seat.occupied ? ', занято' : ''}`;
}

function mapView(s) {
  const maxSeats = Math.max(...s.map.map((r) => r.seats.length + r.seats.filter((x) => x.aisleAfter).length));
  return html`
    <div class="hall-map" data-map style="--cols:${maxSeats}">
      <div class="hall-map__screen" aria-hidden="true">
        <svg viewBox="0 0 600 60" preserveAspectRatio="none"><defs><linearGradient id="scr" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#f2eeee" stop-opacity=".55"/><stop offset="1" stop-color="#f2eeee" stop-opacity="0"/></linearGradient></defs>
          <path d="M20 40 Q300 0 580 40" fill="none" stroke="#f2eeee" stroke-width="3" stroke-linecap="round"/>
          <path d="M20 40 Q300 0 580 40 L560 60 Q300 26 40 60 Z" fill="url(#scr)" opacity=".5"/></svg>
        <span>Экран</span>
      </div>
      <div class="hall-map__rows" role="grid" aria-label="Схема зала ${esc(s.hall.name)}">
        ${s.map.map((row) => html`<div class="seat-row" role="row" style="--offset:${row.offset}">
          <span class="seat-row__n" aria-hidden="true">${row.number}</span>
          <div class="seat-row__seats">
            ${row.seats.map((seat) => html`<button type="button" role="gridcell"
                class="seat seat--${seat.type}${seat.occupied ? ' is-occupied' : ''}${seat.aisleAfter ? ' has-aisle' : ''}${seat.pairEnd ? ' is-pair-end' : ''}"
                data-seat="${seat.id}" data-row="${seat.row}" data-num="${seat.num}" data-price="${seat.price}" data-type="${seat.type}"
                aria-pressed="false" aria-label="${seatLabel(seat)}" ${seat.occupied ? 'disabled' : ''}>
                <span>${seat.num}</span></button>`)}
          </div>
          <span class="seat-row__n" aria-hidden="true">${row.number}</span>
        </div>`)}
      </div>
    </div>`;
}

export default async function seatsPage({ params, scope, isCurrent }) {
  mount(loadingView('Готовим схему зала…'));
  let s;
  try {
    s = await getSessionDetails(params.id);
  } catch (err) {
    if (!isCurrent()) return;
    mount(errorState(err));
    setTitle('Сеанс не найден');
    return;
  }
  if (!isCurrent()) return;
  setTitle(`Выбор мест — ${s.film.title}`);

  const allSeats = s.map.flatMap((r) => r.seats);
  const byId = new Map(allSeats.map((x) => [x.id, x]));
  const std = allSeats.find((x) => x.type === 'std');
  const vip = allSeats.find((x) => x.type === 'vip');
  const free = allSeats.filter((x) => !x.occupied).length;

  // Восстанавливаем выбор, если пользователь вернулся к этому сеансу
  const saved = getBooking();
  let selected = saved && saved.sessionId === s.id ? saved.seats.filter((id) => byId.get(id) && !byId.get(id).occupied) : [];
  let expiresAt = saved && saved.sessionId === s.id ? saved.expiresAt : null;

  const closed = s.sales === 'closed';

  const root = mount(html`
    <section class="booking wrap">
      <div class="booking__top">
        <a class="link-arrow link-arrow--back" href="#/film/${s.film.id}?buy=1">${icon('arrowLeft')} К фильму</a>
        ${stepsBar(1)}
      </div>
      <header class="booking__head">
        <div class="booking__poster">${poster(s.film, { title: false, label: false })}</div>
        <div>
          <h1 class="booking__title">${esc(s.film.title)}</h1>
          <div class="meta booking__meta">
            <span class="badge badge--age" data-age="${s.film.age}">${s.film.age}</span>
            <span>${icon('calendar')}${formatDate(s.date, { weekday: true })}</span>
            <span>${icon('clock')}<b class="tnum">${s.time}</b></span>
            <span>${icon('door')}Зал ${s.hall.number} · «${esc(s.hall.name)}»</span>
            <span class="badge badge--fmt" data-fmt="${s.format}">${s.format}</span>
            <span class="muted">${duration(s.film.duration)}</span>
          </div>
        </div>
        <a class="btn btn--ghost btn--sm booking__change" href="#/schedule?date=${s.date}">${icon('calendar')} Другой сеанс</a>
      </header>

      ${closed ? `<div class="notice notice--error">${icon('alert')} Продажа билетов на этот сеанс закрыта — он начинается меньше чем через 10 минут или уже идёт.</div>` : ''}
      ${s.sales === 'closing' ? `<div class="notice">${icon('clock')} До начала сеанса меньше 45 минут — оформите заказ быстрее, места разбирают.</div>` : ''}

      <div class="booking__grid">
        <div class="seat-panel panel">
          <div class="seat-panel__top">
            <ul class="legend" aria-label="Обозначения">
              <li><span class="seat seat--std seat--demo"></span>Свободно${std ? ` · <b>${price(std.price)}</b>` : ''}</li>
              ${vip ? `<li><span class="seat seat--vip seat--demo"></span>${s.hall.id === 'h3' ? 'Реклайнер' : s.hall.id === 'h2' ? 'Точка обзора' : 'VIP-диван'} · <b>${price(vip.price)}</b></li>` : ''}
              <li><span class="seat seat--std seat--demo is-selected"></span>Ваш выбор</li>
              <li><span class="seat seat--std seat--demo is-occupied"></span>Занято</li>
            </ul>
            <div class="zoom" role="group" aria-label="Масштаб схемы">
              <button type="button" data-zoom="-1" aria-label="Уменьшить">${icon('zoomOut')}</button>
              <button type="button" data-zoom="0" aria-label="Обычный масштаб">${icon('reset')}</button>
              <button type="button" data-zoom="1" aria-label="Увеличить">${icon('zoomIn')}</button>
            </div>
          </div>
          <div class="seat-scroll" data-scroll tabindex="0" aria-label="Схема зала, можно прокручивать">
            ${mapView(s)}
          </div>
          <p class="seat-panel__hint muted">${icon('info')} Свободно ${seatsWord(free)} из ${allSeats.length}. Нажмите на кресло, чтобы выбрать, и ещё раз — чтобы отменить. До ${MAX_SEATS} мест в заказе.</p>
        </div>

        <aside class="summary panel panel--gold" data-summary aria-label="Ваш заказ">
          <div class="summary__head">
            <h2 class="panel__title">Ваш заказ</h2>
            <span class="summary__timer" data-timer hidden>${icon('clock')}<span class="tnum"></span></span>
          </div>
          <div data-summary-body></div>
        </aside>
      </div>
    </section>
    <div class="mobile-bar" data-mobile-bar>
      <button class="mobile-bar__info" type="button" data-scroll-summary>
        <span data-mb-count>Места не выбраны</span>
        <b class="tnum" data-mb-total>0 ₴</b>
      </button>
      <button class="btn btn--primary" type="button" data-continue>Продолжить ${icon('arrowRight')}</button>
    </div>
  `);

  const map = $('[data-map]', root);
  const body = $('[data-summary-body]', root);
  const timerEl = $('[data-timer]', root);
  const mobileBar = $('[data-mobile-bar]', root);
  let zoom = Number(store.get('seatZoom', 1)) || 1;

  const applyZoom = () => map.style.setProperty('--zoom', String(zoom));
  applyZoom();

  const persist = () => {
    if (selected.length) {
      if (!expiresAt) expiresAt = Date.now() + HOLD_MINUTES * 60000;
      store.set('booking', { sessionId: s.id, seats: selected, expiresAt });
    } else {
      expiresAt = null;
      store.remove('booking');
    }
  };

  const total = () => selected.reduce((sum, id) => sum + byId.get(id).price, 0);

  function renderSummary() {
    $$('[data-seat]', map).forEach((b) => {
      const on = selected.includes(b.dataset.seat);
      b.classList.toggle('is-selected', on);
      b.setAttribute('aria-pressed', String(on));
    });
    const seats = selected.map((id) => byId.get(id)).sort((a, b) => a.row - b.row || a.num - b.num);
    const sum = total();
    body.innerHTML = seats.length
      ? html`
        <ul class="summary__list">
          ${seats.map((x) => html`<li class="summary__seat">
            <span class="summary__seat-ico seat seat--${x.type} is-selected"></span>
            <span><b>${x.row} ряд, ${x.num} место</b><small>${x.type === 'vip' ? (s.hall.id === 'h3' ? 'Реклайнер VIP' : 'VIP') : 'Стандарт'}</small></span>
            <span class="tnum">${price(x.price)}</span>
            <button class="summary__remove" type="button" data-remove="${x.id}" aria-label="Убрать место: ряд ${x.row}, место ${x.num}">${icon('close')}</button>
          </li>`)}
        </ul>
        <div class="summary__total"><span>${seats.length} ${plural(seats.length, ['билет', 'билета', 'билетов'])}</span><b class="tnum">${price(sum)}</b></div>
        <button class="btn btn--primary btn--lg btn--block" type="button" data-continue>${icon('ticket')} Перейти к оформлению</button>
        <button class="btn btn--quiet btn--block" type="button" data-clear>${icon('trash')} Сбросить выбор</button>`
      : html`<div class="summary__empty">
          <span class="summary__empty-ico">${icon('seat')}</span>
          <p>Выберите места на схеме зала. Лучший звук — в центре, ближе к последней трети зала.</p>
        </div>
        <button class="btn btn--primary btn--lg btn--block" type="button" disabled>${icon('ticket')} Перейти к оформлению</button>`;
    $('[data-mb-count]', root).textContent = seats.length ? `${seats.length} ${plural(seats.length, ['место', 'места', 'мест'])}: ${seats.map((x) => `${x.row}-${x.num}`).join(', ')}` : 'Места не выбраны';
    $('[data-mb-total]', root).textContent = price(sum);
    mobileBar.classList.toggle('has-seats', seats.length > 0);
    tick();
  }

  function tick() {
    if (!expiresAt || !selected.length) { timerEl.hidden = true; return; }
    const left = Math.max(0, expiresAt - Date.now());
    if (!left) {
      selected = [];
      persist();
      renderSummary();
      toast('Время брони истекло', { type: 'error', text: `Места удерживаются ${HOLD_MINUTES} минут. Выберите их заново.` });
      return;
    }
    timerEl.hidden = false;
    const m = Math.floor(left / 60000);
    const sec = Math.floor((left % 60000) / 1000);
    timerEl.querySelector('span').textContent = `${m}:${String(sec).padStart(2, '0')}`;
    timerEl.classList.toggle('is-urgent', left < 120000);
  }
  scope.interval(tick, 1000);

  function toggleSeat(btn) {
    if (closed) { toast('Продажа закрыта', { type: 'error', text: 'Выберите другой сеанс в расписании.' }); return; }
    const id = btn.dataset.seat;
    if (selected.includes(id)) {
      selected = selected.filter((x) => x !== id);
    } else {
      if (selected.length >= MAX_SEATS) {
        toast(`Не больше ${MAX_SEATS} мест`, { text: 'Для групповой брони напишите нам — подготовим отдельный зал.' });
        return;
      }
      selected = [...selected, id];
      btn.classList.remove('pop');
      void btn.offsetWidth;
      btn.classList.add('pop');
    }
    persist();
    renderSummary();
  }

  function goCheckout() {
    if (!selected.length) {
      toast('Сначала выберите места', { text: 'Нажмите на свободное кресло на схеме зала.' });
      $('[data-scroll]', root).scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    persist();
    navigate('/checkout');
  }

  root.addEventListener('click', async (e) => {
    const seat = e.target.closest('[data-seat]');
    if (seat && !seat.disabled) { toggleSeat(seat); return; }
    const rm = e.target.closest('[data-remove]');
    if (rm) { selected = selected.filter((x) => x !== rm.dataset.remove); persist(); renderSummary(); return; }
    if (e.target.closest('[data-clear]')) {
      const ok = await confirmDialog({ title: 'Сбросить выбор?', text: `Будут отменены ${seatsWord(selected.length)}.`, confirm: 'Сбросить', danger: true });
      if (ok) { selected = []; persist(); renderSummary(); toast('Выбор мест сброшен'); }
      return;
    }
    if (e.target.closest('[data-continue]')) { goCheckout(); return; }
    if (e.target.closest('[data-scroll-summary]')) { $('[data-summary]', root).scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    const z = e.target.closest('[data-zoom]');
    if (z) {
      const d = Number(z.dataset.zoom);
      zoom = d === 0 ? 1 : Math.min(1.6, Math.max(0.7, +(zoom + d * 0.15).toFixed(2)));
      store.set('seatZoom', zoom);
      applyZoom();
    }
  });

  // Центрируем схему на мобильных
  const scroller = $('[data-scroll]', root);
  requestAnimationFrame(() => { scroller.scrollLeft = (scroller.scrollWidth - scroller.clientWidth) / 2; });

  renderSummary();
}
