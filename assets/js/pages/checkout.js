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
  { id: 'card', icon: 'card', title: 'Bank card', text: 'Test payment — no money is charged' },
  { id: 'wallet', icon: 'wallet', title: 'Apple Pay / Google Pay', text: 'One-step simulated payment' },
];

export default async function checkout({ scope, isCurrent }) {
  setTitle('Checkout');
  const booking = getBooking();
  if (!booking || !booking.seats?.length) {
    mount(html`<section class="wrap section">
      ${stepsBar(2)}
      <div style="margin-top:40px">${emptyState({
        iconName: 'ticket',
        title: 'Your basket is empty',
        text: 'You haven’t picked any seats yet, or your hold has expired. Choose a show in the schedule — it only takes a minute.',
        action: `<a class="btn btn--primary" href="#/schedule">${icon('calendar')} Open showtimes</a>`,
      })}</div>
    </section>`);
    return;
  }

  mount(loadingView('Making sure your seats are still free…'));
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
    toast('Some seats have just been taken', { type: 'error', text: 'Please choose other seats.' });
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
        <a class="link-arrow link-arrow--back" href="#/session/${s.id}">${icon('arrowLeft')} Change seats</a>
        ${stepsBar(2)}
      </div>
      <h1 class="checkout__title">Checkout</h1>
      <div class="test-banner" role="note">${icon('lock')} <span><b>Test mode.</b> This is a demo site: no real payment provider is connected, no money is charged and no card details are requested.</span></div>

      <div class="checkout__grid">
        <form class="checkout__form" data-form novalidate>
          <fieldset class="panel panel__pad">
            <legend class="panel__title">1. Contact details</legend>
            <p class="muted fieldset-note">Your e-ticket goes to your email, and a reminder goes to your phone 2 hours before the show.</p>
            <div class="form-grid">
              ${field({ name: 'firstName', label: 'First name', required: true, value: pre.firstName, autocomplete: 'given-name', placeholder: 'Anna' })}
              ${field({ name: 'lastName', label: 'Last name', required: true, value: pre.lastName, autocomplete: 'family-name', placeholder: 'Smith' })}
              ${field({ name: 'email', label: 'Email', type: 'email', required: true, value: pre.email, autocomplete: 'email', placeholder: 'anna@example.com', attrs: 'inputmode="email"' })}
              ${field({ name: 'phone', label: 'Phone', type: 'tel', required: true, value: pre.phone, autocomplete: 'tel', placeholder: '+380 67 123 45 67', attrs: 'inputmode="tel"' })}
            </div>
            ${!user ? `<p class="fieldset-note muted" style="margin-top:16px">${icon('user')} <a class="gold" href="#/login?next=/checkout">Sign in</a> to keep your tickets in your account.</p>` : ''}
          </fieldset>

          <fieldset class="panel panel__pad">
            <legend class="panel__title">2. Purchase option</legend>
            <div class="mode-switch" role="radiogroup" aria-label="Buy or book">
              <label class="mode"><input type="radio" name="mode" value="pay" checked><span class="mode__box"><b>${icon('ticket')} Buy online</b><small>E-ticket straight after payment</small></span></label>
              <label class="mode"><input type="radio" name="mode" value="reserve"><span class="mode__box"><b>${icon('clock')} Book now, pay later</b><small>Pay at the box office 30 minutes before the show</small></span></label>
            </div>
            <div class="methods" data-methods>
              ${METHODS.map((m, i) => `<label class="method"><input type="radio" name="method" value="${m.id}" ${i === 0 ? 'checked' : ''}><span class="method__box">${icon(m.icon)}<span><b>${m.title}</b><small>${m.text}</small></span><span class="badge badge--gold">TEST</span></span></label>`).join('')}
            </div>
          </fieldset>

          <fieldset class="panel panel__pad">
            <legend class="panel__title">3. Promo code</legend>
            <div class="promo-row">
              <div class="field">
                <label class="visually-hidden" for="promo">Promo code</label>
                <input class="input" id="promo" name="promo" placeholder="e.g. FAMILY4" autocomplete="off" style="text-transform:uppercase">
                <span class="field__error" role="alert"></span>
              </div>
              <button class="btn btn--ghost" type="button" data-apply>Apply</button>
            </div>
            <p class="field__hint">Codes and terms are on the <a class="gold" href="#/promos">Offers</a> page.</p>
          </fieldset>

          <label class="check agree"><input type="checkbox" name="agree"> <span>I agree to the <a href="#/faq">visitor and refund rules</a> and understand this is a demo order.</span></label>
          <span class="field__error agree-error" data-agree-error role="alert">Please accept the rules</span>
        </form>

        <aside class="order-card panel panel--gold" aria-label="Order summary">
          <div class="order-card__film">
            <div class="order-card__poster">${poster(s.film, { title: false, label: false })}</div>
            <div>
              <h2>${esc(s.film.title)}</h2>
              <p class="muted">${formatDate(s.date, { weekday: true })}, <b class="tnum" style="color:var(--c-text)">${s.time}</b></p>
              <p class="muted">Room ${s.hall.number} · ${esc(s.hall.name)} · <span class="badge badge--fmt" data-fmt="${s.format}">${s.format}</span></p>
            </div>
          </div>
          <ul class="order-card__seats">
            ${seats.map((x) => `<li><span>Row ${x.row}, seat ${x.num}${x.type === 'vip' ? ' · <span class="gold">VIP</span>' : ''}</span><span class="tnum">${price(x.price)}</span></li>`).join('')}
          </ul>
          <div class="order-card__totals" data-totals></div>
          <button class="btn btn--primary btn--lg btn--block" type="button" data-submit>${icon('lock')} <span data-submit-label>Pay</span></button>
          <p class="order-card__note muted">${icon('clock')} Seats are held for you until ${new Date(booking.expiresAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</p>
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
      <div><span>${seats.length} ${plural(seats.length, ['ticket', 'tickets'])}</span><span class="tnum">${price(t.subtotal)}</span></div>
      ${promo ? `<div class="gold"><span>Promo ${promo.code} (−${promo.percent}%) <button type="button" class="link-btn" data-remove-promo aria-label="Remove promo code">${icon('close')}</button></span><span class="tnum">−${price(t.discount)}</span></div>` : ''}
      <div><span>Service fee</span><span class="tnum">₴0</span></div>
      <div class="order-card__sum"><span>${mode === 'reserve' ? 'Due at box office' : 'Total'}</span><b class="tnum">${price(t.total)}</b></div>`;
    submitLabel.textContent = mode === 'reserve' ? 'Book seats' : `Pay ${price(t.total)}`;
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
      toast(`Promo code ${promo.code} applied`, { type: 'success', text: `${promo.title}: ${promo.percent}% off` });
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
      toast('Please check your contact details', { type: 'error' });
      return;
    }
    if (!form.querySelector('[name="agree"]').checked) {
      $('[data-agree-error]', root).classList.add('is-shown');
      form.querySelector('[name="agree"]').focus();
      return;
    }
    if (getBooking()?.sessionId !== s.id) {
      toast('Your hold has expired', { type: 'error', text: 'Please choose your seats again.' });
      navigate(`/session/${s.id}`);
      return;
    }
    const mode = form.querySelector('[name="mode"]:checked').value;
    const btn = $('[data-submit]', root);
    setBusy(btn, true);

    const steps = mode === 'reserve'
      ? ['Checking seat availability', 'Securing your booking', 'Preparing confirmation']
      : ['Checking seat availability', 'Test payment', 'Issuing your e-ticket'];
    const modal = openModal({
      title: mode === 'reserve' ? 'Booking your seats' : 'Processing payment',
      dismissible: false,
      label: 'Processing order',
      body: html`<div class="processing">
        <div class="processing__reel" aria-hidden="true"></div>
        <ol class="processing__steps">${steps.map((t, i) => `<li data-step="${i}">${icon('check')}<span>${t}</span></li>`).join('')}</ol>
        <p class="muted">Demo mode: no real payment system is used.</p>
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
        toast('We couldn’t complete your order', { type: 'error', text: err.message, timeout: 7000 });
        setTimeout(() => navigate(`/session/${s.id}`), 600);
        return;
      }
      if (err.field === 'promo') {
        promo = null; renderTotals();
        const f = promoInput.closest('.field'); f.classList.add('is-invalid'); f.querySelector('.field__error').textContent = err.message;
      }
      toast('Checkout error', { type: 'error', text: err.message });
    }
  }
}
