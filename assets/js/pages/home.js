import { html, esc, $, $$, prefersReducedMotion } from '../lib/dom.js';
import { icon } from '../icons.js';
import { mount, setTitle } from './common.js';
import { FILMS, FEATURED, COLLECTIONS, getFilmById } from '../data/films.js';
import { HALLS, hallCapacity } from '../data/halls.js';
import { OFFERS, REVIEWS, FAQ } from '../data/site.js';
import { poster } from '../components/poster.js';
import { filmCard, notifyButton } from '../components/filmCard.js';
import { hallScene } from '../components/illustrations.js';
import { accordion, bindAccordion, starsView, toast, setBusy } from '../components/ui.js';
import { sessionsForDate, salesState, scheduleDates } from '../services/schedule.js';
import { subscribeNews } from '../services/api.js';
import { duration, formatDate, price, relativeDays, todayISO } from '../lib/format.js';

function heroContent(film, i) {
  const label = i === 0 ? 'Film of the week' : film.status === 'soon' ? 'Coming soon' : 'Now showing';
  return html`
    <p class="eyebrow hero__eyebrow">${label}</p>
    <h1 class="hero__title">${film.title.split(' ').map((w, k) => `<span class="hero__word"><span style="--k:${k}">${esc(w)}</span></span>`).join(' ')}</h1>
    <p class="hero__original">Directed by ${esc(film.director)} · ${esc(film.country)}</p>
    <div class="hero__meta">
      <span class="badge badge--age" data-age="${film.age}">${film.age}</span>
      ${film.rating ? `<span class="badge badge--rating">${icon('star')} ${film.rating.toFixed(1)}</span>` : ''}
      <span class="meta"><span>${film.genreLabels.join(', ')}</span><span class="sep"></span><span>${icon('clock')}${duration(film.duration)}</span><span class="sep"></span><span>${film.formats.join(' · ')}</span></span>
    </div>
    <p class="hero__text">${esc(film.short)}</p>
    <div class="hero__actions">
      ${film.status === 'now'
        ? `<a class="btn btn--primary btn--lg" href="#/film/${film.id}?buy=1">${icon('ticket')} Buy tickets</a>`
        : notifyButton(film, 'btn btn--primary btn--lg')}
      <a class="btn btn--ghost btn--lg" href="#/film/${film.id}">Details</a>
      <button class="btn btn--quiet btn--lg hero__trailer" type="button" data-trailer="${film.id}"><span class="play-dot">${icon('play')}</span> Trailer</button>
    </div>`;
}

function heroSection(films) {
  return html`
  <section class="hero" data-hero aria-roledescription="carousel" aria-label="Films of the week">
    <div class="hero__slides">
      ${films.map((f, i) => `<div class="hero__slide${i === 0 ? ' is-active' : ''}" data-slide="${i}" aria-hidden="${i !== 0}">${poster(f, { variant: 'wide', label: false })}</div>`)}
    </div>
    <div class="hero__shade" aria-hidden="true"></div>
    <div class="hero__beam" aria-hidden="true"></div>
    <div class="wrap hero__inner">
      <div class="hero__content" data-hero-content aria-live="polite">${heroContent(films[0], 0)}</div>
      <div class="hero__queue" role="tablist" aria-label="Choose a film">
        ${films.map((f, i) => html`<button class="hero__thumb${i === 0 ? ' is-active' : ''}" type="button" role="tab" data-go="${i}" aria-selected="${i === 0}" aria-label="${esc(f.title)}">
          <span class="hero__thumb-img">${poster(f, { title: false, label: false })}</span>
          <span class="hero__thumb-text"><small>0${i + 1}</small>${esc(f.title)}</span>
          <span class="hero__thumb-bar"><span></span></span>
        </button>`)}
      </div>
    </div>
    <div class="hero__controls wrap">
      <span class="hero__counter tnum"><b data-hero-index>01</b> / 0${films.length}</span>
      <div class="rail-nav">
        <button type="button" data-hero-prev aria-label="Previous film">${icon('arrowLeft')}</button>
        <button type="button" data-hero-next aria-label="Next film">${icon('arrowRight')}</button>
      </div>
    </div>
  </section>`;
}

function offersStrip() {
  return html`<section class="offers wrap" aria-label="Current offers">
    ${OFFERS.map((o, i) => html`<a class="offer" href="${o.href}" data-reveal style="--d:${i * 90}ms">
      <span class="offer__icon">${icon(o.icon)}</span>
      <span><b>${o.title}</b><span>${o.text}</span></span>
      ${icon('arrowRight')}
    </a>`)}
  </section>`;
}

function todaySessions() {
  let date = todayISO();
  let list = sessionsForDate(date).filter((s) => salesState(s) !== 'closed');
  let tomorrow = false;
  if (list.length < 4) {
    date = scheduleDates()[1];
    list = sessionsForDate(date);
    tomorrow = true;
  }
  list = list.slice(0, 8);
  return html`
  <section class="section section--tight">
    <div class="wrap">
      <div class="section__head">
        <div><p class="eyebrow">${tomorrow ? 'Tomorrow at the cinema' : 'Today at the cinema'}</p><h2>Next showtimes</h2></div>
        <a class="link-arrow" href="#/schedule${tomorrow ? `?date=${date}` : ''}">Full schedule ${icon('arrowRight')}</a>
      </div>
      <div class="next-sessions">
        ${list.map((s, i) => {
          const film = getFilmById(s.filmId);
          const hall = HALLS.find((h) => h.id === s.hallId);
          return html`<a class="next-session" href="#/session/${s.id}" data-reveal style="--d:${(i % 4) * 60}ms">
            <span class="next-session__time tnum">${s.time}</span>
            <span class="next-session__poster">${poster(film, { title: false, label: false })}</span>
            <span class="next-session__info"><b>${esc(film.title)}</b><span>Room ${hall.number} · ${hall.name} · <em class="badge badge--fmt" data-fmt="${s.format}">${s.format}</em></span></span>
            <span class="next-session__price">from ${price(s.price)}</span>
          </a>`;
        })}
      </div>
    </div>
  </section>`;
}

function soonSection() {
  const soon = FILMS.filter((f) => f.status === 'soon').sort((a, b) => a.premiere.localeCompare(b.premiere));
  return html`
  <section class="section soon-section">
    <div class="wrap">
      <div class="section__head">
        <div><p class="eyebrow">Coming soon</p><h2>Premieres worth <em class="italic red">waiting</em> for</h2></div>
        <a class="link-arrow" href="#/afisha?genre=soon">All premieres ${icon('arrowRight')}</a>
      </div>
      <div class="soon-grid">
        ${soon.map((f, i) => html`<article class="soon-card" data-reveal style="--d:${i * 80}ms">
          <a class="soon-card__poster" href="#/film/${f.id}" aria-label="${esc(f.title)}">${poster(f, { label: false })}</a>
          <div class="soon-card__body">
            <p class="soon-card__date"><span class="tnum">${formatDate(f.premiere)}</span><small>${relativeDays(f.premiere)}</small></p>
            <h3><a href="#/film/${f.id}">${esc(f.title)}</a></h3>
            <p class="muted">${esc(f.short)}</p>
            <p class="soon-card__expect">${icon('users')} ${f.expect.toLocaleString('en-US')} people waiting</p>
            ${notifyButton(f)}
          </div>
        </article>`)}
      </div>
    </div>
  </section>`;
}

function collectionsSection() {
  return html`
  <section class="section">
    <div class="wrap">
      <div class="section__head">
        <div><p class="eyebrow">Collections</p><h2>Pick a mood</h2></div>
        <p class="lead">Films grouped into themed programmes — from midnight horror to warm stories for the whole family.</p>
      </div>
      <div class="collections">
        ${Object.entries(COLLECTIONS).map(([key, c], i) => {
          const films = c.films.map(getFilmById).filter(Boolean).slice(0, 3);
          return html`<a class="collection collection--${c.tone}" href="#/afisha?collection=${key}" data-reveal style="--d:${i * 80}ms">
            <div class="collection__fan" aria-hidden="true">${films.map((f, k) => `<span style="--k:${k}">${poster(f, { title: false, label: false })}</span>`)}</div>
            <div class="collection__text">
              <span class="collection__count">${c.films.length} films</span>
              <h3>${c.title}</h3>
              <p>${c.text}</p>
              <span class="link-arrow">View collection ${icon('arrowRight')}</span>
            </div>
          </a>`;
        })}
      </div>
    </div>
  </section>`;
}

function hallsTeaser() {
  return html`
  <section class="section halls-teaser">
    <div class="wrap">
      <div class="halls-teaser__panel" data-reveal>
        <div class="halls-teaser__art">${hallScene({ tone: '#5a0f17', gold: true })}</div>
        <div class="halls-teaser__text">
          <p class="eyebrow">Four rooms</p>
          <h2>Darkness you can <em class="italic gold">hear</em></h2>
          <p class="lead">IMAX with a 26-metre screen, an intimate VIP room with forty recliners and Frame 13 for midnight shows.</p>
          <ul class="halls-teaser__list">
            ${HALLS.map((h) => `<li><span class="badge badge--fmt" data-fmt="${h.kind === 'VIP' ? 'VIP' : h.kind === 'IMAX' ? 'IMAX' : '2D'}">${h.kind}</span><b>${h.number} · ${h.name}</b><span class="muted">${hallCapacity(h)} seats</span></li>`)}
          </ul>
          <a class="btn btn--ghost" href="#/halls">Explore the rooms ${icon('arrowRight')}</a>
        </div>
      </div>
    </div>
  </section>`;
}

function reviewsSection() {
  return html`
  <section class="section section--tight">
    <div class="wrap">
      <div class="section__head">
        <div><p class="eyebrow">Audience reviews</p><h2>After the credits</h2></div>
        <div class="rail-nav"><button type="button" data-rail-prev="reviews" aria-label="Back">${icon('arrowLeft')}</button><button type="button" data-rail-next="reviews" aria-label="Forward">${icon('arrowRight')}</button></div>
      </div>
      <div class="rail reviews-rail" data-rail="reviews">
        ${REVIEWS.map((r, i) => html`<figure class="review" data-reveal style="--d:${i * 70}ms">
          <span class="review__quote">${icon('quote')}</span>
          ${starsView(r.rating)}
          <blockquote>${esc(r.text)}</blockquote>
          <figcaption><b>${esc(r.name)}</b><span>on “${esc(r.film)}”</span></figcaption>
        </figure>`)}
      </div>
    </div>
  </section>`;
}

function faqSection() {
  return html`
  <section class="section">
    <div class="wrap faq-teaser">
      <div>
        <p class="eyebrow">Questions</p>
        <h2>Before the show</h2>
        <p class="lead">Refunds, age ratings, parking and everything worth knowing before the lights go down.</p>
        <a class="link-arrow" href="#/faq" style="margin-top:24px">All questions & answers ${icon('arrowRight')}</a>
      </div>
      <div data-acc-root>${accordion(FAQ.slice(0, 4))}</div>
    </div>
  </section>`;
}

function newsletter() {
  return html`
  <section class="section section--tight">
    <div class="wrap">
      <div class="newsletter" data-reveal>
        <div>
          <p class="eyebrow">Newsletter</p>
          <h2>Hear about premieres first</h2>
          <p class="muted">Once a week — new films, midnight shows and private previews. No spam.</p>
        </div>
        <form class="newsletter__form" data-news novalidate>
          <div class="field">
            <label class="visually-hidden" for="news-email">Email</label>
            <div class="input-group">${icon('mail')}<input class="input" id="news-email" type="email" name="email" placeholder="your@email.com" autocomplete="email" required></div>
            <span class="field__error" role="alert"></span>
          </div>
          <button class="btn btn--primary btn--lg" type="submit">Subscribe</button>
        </form>
      </div>
    </div>
  </section>`;
}

export default async function home({ scope }) {
  setTitle('');
  const featured = FEATURED.map(getFilmById).filter(Boolean);
  const nowShowing = FILMS.filter((f) => f.status === 'now').sort((a, b) => b.popularity - a.popularity);

  const root = mount(html`
    ${heroSection(featured)}
    ${offersStrip()}
    <section class="section">
      <div class="wrap">
        <div class="section__head">
          <div><p class="eyebrow">Now showing</p><h2>Popular this week</h2></div>
          <div class="section__tools">
            <a class="link-arrow" href="#/afisha?genre=now">All films ${icon('arrowRight')}</a>
            <div class="rail-nav"><button type="button" data-rail-prev="now" aria-label="Scroll back">${icon('arrowLeft')}</button><button type="button" data-rail-next="now" aria-label="Scroll forward">${icon('arrowRight')}</button></div>
          </div>
        </div>
        <div class="rail" data-rail="now">${nowShowing.slice(0, 10).map((f, i) => filmCard(f, { index: i }))}</div>
      </div>
    </section>
    ${todaySessions()}
    ${soonSection()}
    ${collectionsSection()}
    ${hallsTeaser()}
    ${reviewsSection()}
    ${faqSection()}
    ${newsletter()}
  `, { flush: true });

  /* ---- Hero carousel ---- */
  const hero = $('[data-hero]', root);
  const slides = $$('[data-slide]', hero);
  const thumbs = $$('[data-go]', hero);
  const content = $('[data-hero-content]', hero);
  const indexEl = $('[data-hero-index]', hero);
  const INTERVAL = 8000;
  let index = 0;
  let startedAt = performance.now();
  let paused = false;
  let elapsedBeforePause = 0;

  const go = (i) => {
    index = (i + featured.length) % featured.length;
    slides.forEach((s, k) => { s.classList.toggle('is-active', k === index); s.setAttribute('aria-hidden', String(k !== index)); });
    thumbs.forEach((t, k) => { t.classList.toggle('is-active', k === index); t.setAttribute('aria-selected', String(k === index)); t.style.setProperty('--p', '0'); });
    content.classList.remove('is-in');
    content.innerHTML = heroContent(featured[index], index);
    void content.offsetWidth;
    content.classList.add('is-in');
    indexEl.textContent = String(index + 1).padStart(2, '0');
    startedAt = performance.now();
    elapsedBeforePause = 0;
  };
  content.classList.add('is-in');

  let raf;
  const tick = (now) => {
    if (!document.body.contains(hero)) return;
    if (!paused && !document.hidden) {
      const p = Math.min(1, (elapsedBeforePause + (now - startedAt)) / INTERVAL);
      thumbs[index]?.style.setProperty('--p', p.toFixed(3));
      if (p >= 1) go(index + 1);
    }
    raf = requestAnimationFrame(tick);
  };
  if (!prefersReducedMotion()) raf = requestAnimationFrame(tick);
  scope.add(() => cancelAnimationFrame(raf));

  const pause = () => { if (!paused) { paused = true; elapsedBeforePause += performance.now() - startedAt; } };
  const resume = () => { if (paused) { paused = false; startedAt = performance.now(); } };
  hero.addEventListener('mouseenter', pause);
  hero.addEventListener('mouseleave', resume);
  hero.addEventListener('focusin', pause);
  hero.addEventListener('focusout', resume);

  hero.addEventListener('click', (e) => {
    const t = e.target.closest('[data-go]');
    if (t) go(Number(t.dataset.go));
    if (e.target.closest('[data-hero-prev]')) go(index - 1);
    if (e.target.closest('[data-hero-next]')) go(index + 1);
  });
  let touchX = null;
  hero.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  hero.addEventListener('touchend', (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) go(index + (dx < 0 ? 1 : -1));
    touchX = null;
  });

  /* ---- Horizontal rails ---- */
  root.addEventListener('click', (e) => {
    const prev = e.target.closest('[data-rail-prev]');
    const next = e.target.closest('[data-rail-next]');
    const key = (prev || next)?.dataset.railPrev || (prev || next)?.dataset.railNext;
    if (!key) return;
    const rail = $(`[data-rail="${key}"]`, root);
    rail.scrollBy({ left: (next ? 1 : -1) * rail.clientWidth * 0.8, behavior: 'smooth' });
  });

  bindAccordion($('[data-acc-root]', root));

  /* ---- Newsletter ---- */
  const form = $('[data-news]', root);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button');
    const fieldEl = form.querySelector('.field');
    fieldEl.classList.remove('is-invalid');
    setBusy(btn, true);
    try {
      await subscribeNews(form.email.value);
      form.reset();
      toast('You’re subscribed', { type: 'success', text: 'Your first email arrives on Thursday — together with the new line-up.' });
    } catch (err) {
      fieldEl.classList.add('is-invalid');
      fieldEl.querySelector('.field__error').textContent = err.message;
    } finally {
      setBusy(btn, false);
    }
  });
}
