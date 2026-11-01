import { html, esc, $, sleep } from '../lib/dom.js';
import { icon } from '../icons.js';
import { mount, stepsBar, setTitle, loadingView } from './common.js';
import { getSessionDetails, createOrder, checkPromo, calcTotals, validateCustomer, currentUser } from '../services/api.js';
import { poster } from '../components/poster.js';
import { errorState, toast, field, showFieldErrors, clearFieldError, emptyState, openModal, setBusy } from '../components/ui.js';
import { store } from '../store.js';
import { navigate } from '../router.js';
import { getBooking } from './seats.js';
import { formatDate, price, plural } from '../lib/format.js';

const METHODS = [
  { id: 'card', icon: 'card', title: 'Банковская карта', text: 'Тестовая оплата — деньги не списываются' },
  { id: 'wallet', icon: 'wallet', title: 'Apple Pay / Google Pay', text: 'Имитация оплаты в один шаг' },
];

export default async function checkout({ scope, isCurrent }) {
  setTitle('Оформление заказа');
  const booking = getBooking();
  if (!booking || !booking.seats?.length) {
    mount(html`<section class="wrap section">
      ${stepsBar(2)}
      <div style="margin-top:40px">${emptyState({
        iconName: 'ticket',
        title: 'Корзина пуста',
        text: 'Вы ещё не выбрали места или время брони истекло. Выберите сеанс в расписании — это займёт минуту.',
        action: `<a class="btn btn--primary" href="#/schedule">${icon('calendar')} Открыть расписание</a>`,
      })}</div>
    </section>`);
    return;
  }

  mount(loadingView('Проверяем, что места всё ещё свободны…'));
  let s;
  try {
    s = await getSessionDetails(booking.sessionId);
  } catch (err) {
    if (!isCurrent()) return;
    mount(errorState(err));
    return;
  }
  if (!isCurrent()) return;

  const byId = new Map(s.map.flatMap((r) => r.seats).map((x) => [x.id, x]));
  const seats = booking.seats.map((id) => byId.get(id)).filter(Boolean).sort((a, b) => a.row - b.row || a.num - b.num);
  const taken = seats.filter((x) => x.occupied);
  if (taken.length) {
    toast('Часть мест уже заняли', { type: 'error', text: 'Выберите, пожалуйста, другие места.' });
    store.set('booking', { ...booking, seats: booking.seats.filter((id) => !taken.some((t) => t.id === id)) });
    navigate(`/session/${s.id}`, { replace: true });
    return;
  }

  const user = currentUser();
  const last = store.get('lastCustomer', {});
  const pre = {
    firstName: user?.firstName || last.firstName || '',
    lastName: user?.lastName || last.lastName || '',
    email: user?.email || last.email || '',
    phone: user?.phone || last.phone || '',
  };
  let promo = null;

  const root = mount(html`
    <section class="booking wrap">
      <div class="booking__top">
        <a class="link-arrow link-arrow--back" href="#/session/${s.id}">${icon('arrowLeft')} Изменить места</a>
        ${stepsBar(2)}
      </div>
      <h1 class="checkout__title">Оформление заказа</h1>
      <div class="test-banner" role="note">${icon('lock')} <span><b>Тестовый режим.</b> Это демонстрационный сайт: настоящая оплата не подключена, деньги не списываются, данные карты не запрашиваются.</span></div>

      <div class="checkout__grid">
        <form class="checkout__form" data-form novalidate>
          <fieldset class="panel panel__pad">
            <legend class="panel__title">1. Контактные данные</legend>
            <p class="muted fieldset-note">На почту придёт электронный билет, на телефон — напоминание за 2 часа до сеанса.</p>
            <div class="form-grid">
              ${field({ name: 'firstName', label: 'Имя', required: true, value: pre.firstName, autocomplete: 'given-name', placeholder: 'Анна' })}
              ${field({ name: 'lastName', label: 'Фамилия', required: true, value: pre.lastName, autocomplete: 'family-name', placeholder: 'Коваленко' })}
              ${field({ name: 'email', label: 'Электронная почта', type: 'email', required: true, value: pre.email, autocomplete: 'email', placeholder: 'anna@example.com', attrs: 'inputmode="email"' })}
              ${field({ name: 'phone', label: 'Телефон', type: 'tel', required: true, value: pre.phone, autocomplete: 'tel', placeholder: '+380 67 123 45 67', attrs: 'inputmode="tel"' })}
            </div>
            ${!user ? `<p class="fieldset-note muted" style="margin-top:16px">${icon('user')} <a class="gold" href="#/login?next=/checkout">Войдите</a>, чтобы билеты сохранились в личном кабинете.</p>` : ''}
          </fieldset>

          <fieldset class="panel panel__pad">
            <legend class="panel__title">2. Способ получения</legend>
            <div class="mode-switch" role="radiogroup" aria-label="Покупка или бронь">
              <label class="mode"><input type="radio" name="mode" value="pay" checked><span class="mode__box"><b>${icon('ticket')} Купить онлайн</b><small>Электронный билет сразу после оплаты</small></span></label>
              <label class="mode"><input type="radio" name="mode" value="reserve"><span class="mode__box"><b>${icon('clock')} Забронировать</b><small>Оплата в кассе за 30 минут до сеанса</small></span></label>
            </div>
            <div class="methods" data-methods>
              ${METHODS.map((m, i) => `<label class="method"><input type="radio" name="method" value="${m.id}" ${i === 0 ? 'checked' : ''}><span class="method__box">${icon(m.icon)}<span><b>${m.title}</b><small>${m.text}</small></span><span class="badge badge--gold">TEST</span></span></label>`).join('')}
            </div>
          </fieldset>

          <fieldset class="panel panel__pad">
            <legend class="panel__title">3. Промокод</legend>
            <div class="promo-row">
              <div class="field">
                <label class="visually-hidden" for="promo">Промокод</label>
                <input class="input" id="promo" name="promo" placeholder="Например, FAMILY4" autocomplete="off" style="text-transform:uppercase">
                <span class="field__error" role="alert"></span>
              </div>
              <button class="btn btn--ghost" type="button" data-apply>Применить</button>
            </div>
            <p class="field__hint">Коды и условия — в разделе <a class="gold" href="#/promos">«Акции»</a>.</p>
          </fieldset>

          <label class="check agree"><input type="checkbox" name="agree"> <span>Соглашаюсь с <a href="#/faq">правилами посещения и возврата</a> и понимаю, что это демонстрационный заказ.</span></label>
          <span class="field__error agree-error" data-agree-error role="alert">Подтвердите согласие с правилами</span>
        </form>

        <aside class="order-card panel panel--gold" aria-label="Состав заказа">
          <div class="order-card__film">
            <div class="order-card__poster">${poster(s.film, { title: false, label: false })}</div>
            <div>
              <h2>${esc(s.film.title)}</h2>
              <p class="muted">${formatDate(s.date, { weekday: true })}, <b class="tnum" style="color:var(--c-text)">${s.time}</b></p>
              <p class="muted">Зал ${s.hall.number} · «${esc(s.hall.name)}» · <span class="badge badge--fmt" data-fmt="${s.format}">${s.format}</span></p>
            </div>
          </div>
          <ul class="order-card__seats">
            ${seats.map((x) => `<li><span>${x.row} ряд, ${x.num} место${x.type === 'vip' ? ' · <span class="gold">VIP</span>' : ''}</span><span class="tnum">${price(x.price)}</span></li>`).join('')}
          </ul>
          <div class="order-card__totals" data-totals></div>
          <button class="btn btn--primary btn--lg btn--block" type="button" data-submit>${icon('lock')} <span data-submit-label>Оплатить</span></button>
          <p class="order-card__note muted">${icon('clock')} Места удерживаются за вами до ${new Date(booking.expiresAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</p>
        </aside>
      </div>
    </section>
  `);

  const form = $('[data-form]', root);
  const totalsEl = $('[data-totals]', root);
  const submitLabel = $('[data-submit-label]', root);
  const promoInput = $('#promo', root);

  function renderTotals() {
    const t = calcTotals(seats, promo);
    const mode = form.querySelector('[name="mode"]:checked').value;
    totalsEl.innerHTML = html`
      <div><span>${seats.length} ${plural(seats.length, ['билет', 'билета', 'билетов'])}</span><span class="tnum">${price(t.subtotal)}</span></div>
      ${promo ? `<div class="gold"><span>Промокод ${promo.code} (−${promo.percent}%) <button type="button" class="link-btn" data-remove-promo aria-label="Убрать промокод">${icon('close')}</button></span><span class="tnum">−${price(t.discount)}</span></div>` : ''}
      <div><span>Сервисный сбор</span><span class="tnum">0 ₴</span></div>
      <div class="order-card__sum"><span>${mode === 'reserve' ? 'К оплате в кассе' : 'Итого'}</span><b class="tnum">${price(t.total)}</b></div>`;
    submitLabel.textContent = mode === 'reserve' ? 'Забронировать места' : `Оплатить ${price(t.total)}`;
    $('[data-methods]', root).hidden = mode === 'reserve';
  }
  renderTotals();

  form.addEventListener('input', clearFieldError);
  form.addEventListener('change', (e) => {
    clearFieldError(e);
    if (e.target.name === 'mode') renderTotals();
    if (e.target.name === 'agree') $('[data-agree-error]', root).classList.remove('is-shown');
  });

  const applyPromo = () => {
    const fieldEl = promoInput.closest('.field');
    try {
      promo = checkPromo(promoInput.value, { session: s, seatsCount: seats.length });
      fieldEl.classList.remove('is-invalid');
      toast(`Промокод ${promo.code} применён`, { type: 'success', text: `${promo.title}: скидка ${promo.percent}%` });
    } catch (err) {
      promo = null;
      fieldEl.classList.add('is-invalid');
      fieldEl.querySelector('.field__error').textContent = err.message;
    }
    renderTotals();
  };
  $('[data-apply]', root).addEventListener('click', applyPromo);
  promoInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); applyPromo(); } });
  totalsEl.addEventListener('click', (e) => {
    if (e.target.closest('[data-remove-promo]')) { promo = null; promoInput.value = ''; renderTotals(); }
  });

  form.addEventListener('submit', (e) => { e.preventDefault(); submit(); });
  $('[data-submit]', root).addEventListener('click', submit);

  async function submit() {
    const val = (n) => form.querySelector(`[name="${n}"]`).value;
    const customer = { firstName: val('firstName'), lastName: val('lastName'), email: val('email'), phone: val('phone') };
    const errors = validateCustomer(customer);
    if (Object.keys(errors).length) {
      showFieldErrors(form, errors);
      toast('Проверьте контактные данные', { type: 'error' });
      return;
    }
    if (!form.querySelector('[name="agree"]').checked) {
      $('[data-agree-error]', root).classList.add('is-shown');
      form.querySelector('[name="agree"]').focus();
      return;
    }
    if (getBooking()?.sessionId !== s.id) {
      toast('Время брони истекло', { type: 'error', text: 'Выберите места заново.' });
      navigate(`/session/${s.id}`);
      return;
    }
    const mode = form.querySelector('[name="mode"]:checked').value;
    const btn = $('[data-submit]', root);
    setBusy(btn, true);

    const steps = mode === 'reserve'
      ? ['Проверяем свободные места', 'Закрепляем бронь', 'Готовим подтверждение']
      : ['Проверяем свободные места', 'Тестовая оплата', 'Выпускаем электронный билет'];
    const modal = openModal({
      title: mode === 'reserve' ? 'Бронируем места' : 'Оплата заказа',
      dismissible: false,
      label: 'Обработка заказа',
      body: html`<div class="processing">
        <div class="processing__reel" aria-hidden="true"></div>
        <ol class="processing__steps">${steps.map((t, i) => `<li data-step="${i}">${icon('check')}<span>${t}</span></li>`).join('')}</ol>
        <p class="muted">Демо-режим: реальная платёжная система не используется.</p>
      </div>`,
    });
    const mark = (i) => modal.dialog.querySelectorAll('[data-step]').forEach((li) => {
      const n = Number(li.dataset.step);
      li.classList.toggle('is-done', n < i);
      li.classList.toggle('is-active', n === i);
    });
    mark(0);
    const progress = (async () => { await sleep(500); mark(1); await sleep(700); mark(2); })();

    try {
      const order = await createOrder({
        sessionId: s.id,
        seatIds: seats.map((x) => x.id),
        customer,
        promoCode: promo?.code,
        mode,
        userId: user?.id,
      });
      await progress;
      mark(3);
      await sleep(350);
      store.set('lastCustomer', customer);
      store.remove('booking');
      modal.close();
      navigate(`/ticket/${order.id}?new=1`);
    } catch (err) {
      await progress;
      modal.close();
      setBusy(btn, false);
      if (err.fields) showFieldErrors(form, err.fields);
      if (err.status === 409) {
        toast('Не получилось оформить заказ', { type: 'error', text: err.message, timeout: 7000 });
        setTimeout(() => navigate(`/session/${s.id}`), 600);
        return;
      }
      if (err.field === 'promo') {
        promo = null; renderTotals();
        const f = promoInput.closest('.field'); f.classList.add('is-invalid'); f.querySelector('.field__error').textContent = err.message;
      }
      toast('Ошибка оформления', { type: 'error', text: err.message });
    }
  }
}
