import { html, esc, $ } from '../lib/dom.js';
import { icon } from '../icons.js';
import { mount, crumbs, setTitle, loadingView } from './common.js';
import { FILMS } from '../data/films.js';
import { getFilm, getFilmSessionsSync, getReviews, addReview } from '../services/api.js';
import { scheduleDates } from '../services/schedule.js';
import { poster } from '../components/poster.js';
import { filmCard, favButton, notifyButton } from '../components/filmCard.js';
import { trailerPlayer, bindPlayer } from '../components/trailer.js';
import { errorState, emptyState, starsView, toast, showFieldErrors, clearFieldError, setBusy, field, observeReveal } from '../components/ui.js';
import { duration, formatDate, price, dayParts, relativeDays, plural } from '../lib/format.js';

function sessionsBlock(film, date) {
  const sessions = getFilmSessionsSync(film.id, date);
  if (!sessions.length) {
    return emptyState({ iconName: 'calendar', title: 'No showtimes', text: 'This film isn’t showing on this date. Pick another day — the schedule is open a week ahead.' });
  }
  const groups = {};
  sessions.forEach((s) => {
    const key = `${s.hallId}|${s.format}`;
    (groups[key] ||= { hall: s.hall, format: s.format, items: [] }).items.push(s);
  });
  return html`<div class="session-groups">
    ${Object.values(groups).map((g) => html`<div class="session-group">
      <div class="session-group__head">
        <span class="badge badge--fmt" data-fmt="${g.format}">${g.format}</span>
        <b>Room ${g.hall.number} · ${g.hall.name}</b>
        <span class="muted">${g.hall.kind}</span>
      </div>
      <div class="times">
        ${g.items.map((s) => s.sales === 'closed'
          ? `<span class="time is-closed" aria-disabled="true" title="Sales closed"><b class="tnum">${s.time}</b><small>closed</small></span>`
          : `<a class="time${s.sales === 'closing' ? ' is-closing' : ''}" href="#/session/${s.id}" aria-label="Show at ${s.time}, from ${price(s.price)}"><b class="tnum">${s.time}</b><small>from ${price(s.price)}</small></a>`)}
      </div>
    </div>`)}
  </div>`;
}

function reviewsBlock(film, reviews) {
  const avg = reviews.length ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length : 0;
  return html`
    <div class="reviews-head">
      ${reviews.length ? `<div class="reviews-score"><b class="tnum">${avg.toFixed(1)}</b>${starsView(avg)}<span class="muted">${reviews.length} audience ${plural(reviews.length, ['review', 'reviews'])}</span></div>` : ''}
    </div>
    <div class="reviews-list" data-reviews-list>
      ${reviews.length
        ? reviews.map((r) => reviewItem(r))
        : `<p class="muted">${film.status === 'soon' ? 'The film isn’t out yet — reviews will appear after the premiere. You can share your expectations, though.' : 'No reviews yet. Be the first.'}</p>`}
    </div>`;
}

function reviewItem(r) {
  return html`<article class="review-item${r.own ? ' is-own' : ''}">
    <div class="review-item__head"><span class="avatar">${esc(r.name[0] || '?')}</span><div><b>${esc(r.name)}</b>${r.own ? '<span class="badge badge--soft">Your review</span>' : ''}<div>${starsView(r.rating)}</div></div></div>
    <p>${esc(r.text)}</p>
  </article>`;
}

export default async function filmPage({ params, query, scope, isCurrent }) {
  mount(loadingView('Threading the reel…'), { flush: true });
  let film;
  try {
    film = await getFilm(params.id);
  } catch (err) {
    if (!isCurrent()) return;
    mount(errorState(err));
    setTitle('Film not found');
    return;
  }
  if (!isCurrent()) return;
  setTitle(film.title);

  const dates = scheduleDates();
  const withSessions = dates.filter((d) => getFilmSessionsSync(film.id, d).length);
  let activeDate = withSessions.includes(query.date) ? query.date : withSessions[0] || dates[0];
  const similar = FILMS.filter((f) => f.id !== film.id && f.genres.some((g) => film.genres.includes(g))).sort((a, b) => b.popularity - a.popularity).slice(0, 4);

  const root = mount(html`
    <section class="film-hero">
      <div class="film-hero__bg" aria-hidden="true">${poster(film, { variant: 'wide', label: false })}</div>
      <div class="wrap film-hero__inner">
        <div class="film-hero__poster" data-reveal>
          ${poster(film)}
          ${favButton(film, 'fav-btn--lg')}
        </div>
        <div class="film-hero__info">
          ${crumbs([{ label: 'Films', href: '#/afisha' }, { label: film.title }])}
          <div class="film-hero__badges">
            <span class="badge badge--age" data-age="${film.age}">${film.age}</span>
            ${film.status === 'soon' ? `<span class="badge badge--red">Premieres ${formatDate(film.premiere)}</span>` : '<span class="badge badge--gold">Now showing</span>'}
            ${film.formats.map((f) => `<span class="badge badge--fmt" data-fmt="${f}">${f}</span>`).join('')}
          </div>
          <h1>${esc(film.title)}</h1>
          <p class="film-hero__original">Directed by ${esc(film.director)} · ${film.country} · ${film.premiere.slice(0, 4)}</p>
          <div class="film-hero__stats">
            ${film.rating
              ? `<div class="stat"><b class="tnum">${film.rating.toFixed(1)}</b><span>rating · ${film.votes.toLocaleString('en-US')} votes</span></div>`
              : `<div class="stat"><b class="tnum">${film.expect.toLocaleString('en-US')}</b><span>people waiting for the premiere</span></div>`}
            <div class="stat"><b>${duration(film.duration)}</b><span>runtime</span></div>
            <div class="stat"><b>${film.genreLabels.join(', ')}</b><span>genre</span></div>
          </div>
          <p class="film-hero__tagline">«${esc(film.tagline)}»</p>
          <div class="film-hero__actions">
            ${film.status === 'now'
              ? `<a class="btn btn--primary btn--lg" href="#sessions" data-scroll="sessions">${icon('ticket')} Buy tickets</a>`
              : notifyButton(film, 'btn btn--primary btn--lg')}
            <a class="btn btn--ghost btn--lg" href="#trailer" data-scroll="trailer">${icon('play')} Trailer</a>
          </div>
        </div>
      </div>
    </section>

    <section class="section section--tight">
      <div class="wrap film-about">
        <div class="film-about__text" data-reveal>
          <p class="eyebrow">About the film</p>
          <h2>Story</h2>
          ${film.description.map((p) => `<p>${esc(p)}</p>`).join('')}
        </div>
        <aside class="panel panel--gold film-facts" data-reveal style="--d:120ms">
          <dl>
            <div><dt>Director</dt><dd>${esc(film.director)}</dd></div>
            <div><dt>Cast</dt><dd>${film.cast.map(esc).join(', ')}</dd></div>
            <div><dt>Genre</dt><dd>${film.genreLabels.join(', ')}</dd></div>
            <div><dt>Country</dt><dd>${film.country}</dd></div>
            <div><dt>Runtime</dt><dd>${duration(film.duration)}</dd></div>
            <div><dt>Age rating</dt><dd>${film.age}</dd></div>
            <div><dt>Premiere</dt><dd>${formatDate(film.premiere, { year: true })}</dd></div>
            <div><dt>Formats</dt><dd>${film.formats.map((f) => `<span class="badge badge--fmt" data-fmt="${f}">${f}</span>`).join(' ')}</dd></div>
          </dl>
        </aside>
      </div>
    </section>

    <section class="section section--tight" id="trailer">
      <div class="wrap">
        <div class="section__head"><div><p class="eyebrow">Trailer</p><h2>First look</h2></div></div>
        <div data-reveal>${trailerPlayer(film)}</div>
      </div>
    </section>

    <section class="section section--tight" id="sessions">
      <div class="wrap">
        <div class="section__head">
          <div><p class="eyebrow">Showtimes</p><h2>${film.status === 'now' ? 'Choose a showtime' : 'Tickets on sale soon'}</h2></div>
          ${film.status === 'now' ? '<p class="lead">Prices depend on the format, time of the show and seat type. Shows before noon are 20% cheaper.</p>' : ''}
        </div>
        ${film.status === 'now'
          ? html`<div class="days" role="tablist" aria-label="Show date" data-days>
              ${dates.map((d) => {
                const p = dayParts(d);
                const has = withSessions.includes(d);
                return `<button class="day${d === activeDate ? ' is-active' : ''}" type="button" role="tab" aria-selected="${d === activeDate}" data-date="${d}" ${has ? '' : 'disabled style="opacity:.35"'}><span class="day__wd">${p.wd}</span><span class="day__num">${p.num}</span><span class="day__mon">${p.mon}</span></button>`;
              })}
            </div>
            <div class="sessions-box" data-sessions>${sessionsBlock(film, activeDate)}</div>`
          : emptyState({
              iconName: 'calendar',
              title: `Premieres ${formatDate(film.premiere)}`,
              text: `The film opens ${relativeDays(film.premiere)}. Set a reminder and we’ll tell you when tickets go on sale.`,
              action: notifyButton(film, 'btn btn--primary'),
            })}
      </div>
    </section>

    <section class="section section--tight">
      <div class="wrap film-reviews">
        <div>
          <p class="eyebrow">Reviews</p>
          <h2>What viewers say</h2>
          <div data-reviews>${loadingView('Loading reviews…')}</div>
        </div>
        <form class="panel panel__pad review-form" data-review-form novalidate>
          <h3 class="panel__title">Write a review</h3>
          <div class="field">
            <span class="field__label">Your rating <b>*</b></span>
            <div class="star-input" role="radiogroup" aria-label="Rating">
              ${[5, 4, 3, 2, 1].map((n) => `<input type="radio" id="rate-${n}" name="rating" value="${n}"><label for="rate-${n}" title="${n} out of 5">${icon('star')}<span class="visually-hidden">${n}</span></label>`).join('')}
            </div>
            <span class="field__error" role="alert"></span>
          </div>
          ${field({ name: 'name', label: 'Name', required: true, placeholder: 'How should we call you?', autocomplete: 'given-name' })}
          ${field({ name: 'text', label: 'Review', required: true, textarea: true, placeholder: 'No spoilers, please 🙂' })}
          <button class="btn btn--primary btn--block" type="submit">Publish</button>
          <p class="field__hint">Demo mode: your review is saved on this device.</p>
        </form>
      </div>
    </section>

    ${similar.length ? html`<section class="section section--tight">
      <div class="wrap">
        <div class="section__head"><div><p class="eyebrow">Similar films</p><h2>If you liked this</h2></div></div>
        <div class="film-grid film-grid--4">${similar.map((f, i) => filmCard(f, { index: i }))}</div>
      </div>
    </section>` : ''}
  `, { flush: true });

  scope.add(bindPlayer($('#trailer', root)));

  root.addEventListener('click', (e) => {
    const sc = e.target.closest('[data-scroll]');
    if (sc) {
      e.preventDefault();
      document.getElementById(sc.dataset.scroll)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    const day = e.target.closest('[data-date]');
    if (day && !day.disabled) {
      activeDate = day.dataset.date;
      root.querySelectorAll('[data-date]').forEach((d) => { d.classList.toggle('is-active', d === day); d.setAttribute('aria-selected', String(d === day)); });
      const box = $('[data-sessions]', root);
      box.classList.remove('fade-in');
      box.innerHTML = sessionsBlock(film, activeDate);
      void box.offsetWidth;
      box.classList.add('fade-in');
    }
  });

  if (query.buy && film.status === 'now') {
    setTimeout(() => document.getElementById('sessions')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 450);
  }

  // Reviews
  const reviewsBox = $('[data-reviews]', root);
  const reviews = await getReviews(film.id);
  if (!isCurrent()) return;
  reviewsBox.innerHTML = reviewsBlock(film, reviews);

  const form = $('[data-review-form]', root);
  form.addEventListener('input', clearFieldError);
  form.addEventListener('change', clearFieldError);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('[type="submit"]');
    setBusy(btn, true);
    try {
      const data = { name: form.querySelector('[name="name"]').value, text: form.querySelector('[name="text"]').value, rating: Number(form.querySelector('[name="rating"]:checked')?.value || 0) };
      const r = await addReview(film.id, data);
      const list = await getReviews(film.id);
      reviewsBox.innerHTML = reviewsBlock(film, list);
      observeReveal(reviewsBox);
      form.reset();
      toast('Thanks for your review!', { type: 'success', text: `Your rating: ${r.rating} out of 5` });
    } catch (err) {
      if (err.fields) showFieldErrors(form, err.fields);
      else toast('Couldn’t post your review', { type: 'error', text: err.message });
    } finally {
      setBusy(btn, false);
    }
  });
}
