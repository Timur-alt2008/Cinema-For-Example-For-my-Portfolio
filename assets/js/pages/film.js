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
    return emptyState({ iconName: 'calendar', title: 'Сеансов нет', text: 'На эту дату фильм не идёт. Выберите другой день — расписание открыто на неделю вперёд.' });
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
        <b>Зал ${g.hall.number} · «${g.hall.name}»</b>
        <span class="muted">${g.hall.kind}</span>
      </div>
      <div class="times">
        ${g.items.map((s) => s.sales === 'closed'
          ? `<span class="time is-closed" aria-disabled="true" title="Продажа закрыта"><b class="tnum">${s.time}</b><small>закрыто</small></span>`
          : `<a class="time${s.sales === 'closing' ? ' is-closing' : ''}" href="#/session/${s.id}" aria-label="Сеанс в ${s.time}, от ${price(s.price)}"><b class="tnum">${s.time}</b><small>от ${price(s.price)}</small></a>`)}
      </div>
    </div>`)}
  </div>`;
}

function reviewsBlock(film, reviews) {
  const avg = reviews.length ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length : 0;
  return html`
    <div class="reviews-head">
      ${reviews.length ? `<div class="reviews-score"><b class="tnum">${avg.toFixed(1)}</b>${starsView(avg)}<span class="muted">${reviews.length} ${plural(reviews.length, ['отзыв', 'отзыва', 'отзывов'])} зрителей</span></div>` : ''}
    </div>
    <div class="reviews-list" data-reviews-list>
      ${reviews.length
        ? reviews.map((r) => reviewItem(r))
        : `<p class="muted">${film.status === 'soon' ? 'Фильм ещё не вышел — отзывы появятся после премьеры. Но вы можете оставить ожидания.' : 'Пока никто не оставил отзыв. Станьте первым.'}</p>`}
    </div>`;
}

function reviewItem(r) {
  return html`<article class="review-item${r.own ? ' is-own' : ''}">
    <div class="review-item__head"><span class="avatar">${esc(r.name[0] || '?')}</span><div><b>${esc(r.name)}</b>${r.own ? '<span class="badge badge--soft">Ваш отзыв</span>' : ''}<div>${starsView(r.rating)}</div></div></div>
    <p>${esc(r.text)}</p>
  </article>`;
}

export default async function filmPage({ params, query, scope, isCurrent }) {
  mount(loadingView('Заправляем плёнку…'), { flush: true });
  let film;
  try {
    film = await getFilm(params.id);
  } catch (err) {
    if (!isCurrent()) return;
    mount(errorState(err));
    setTitle('Фильм не найден');
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
          ${crumbs([{ label: 'Афиша', href: '#/afisha' }, { label: film.title }])}
          <div class="film-hero__badges">
            <span class="badge badge--age" data-age="${film.age}">${film.age}</span>
            ${film.status === 'soon' ? `<span class="badge badge--red">Премьера ${formatDate(film.premiere)}</span>` : '<span class="badge badge--gold">В прокате</span>'}
            ${film.formats.map((f) => `<span class="badge badge--fmt" data-fmt="${f}">${f}</span>`).join('')}
          </div>
          <h1>${esc(film.title)}</h1>
          <p class="film-hero__original">${esc(film.original)} · ${film.country} · ${film.premiere.slice(0, 4)}</p>
          <div class="film-hero__stats">
            ${film.rating
              ? `<div class="stat"><b class="tnum">${film.rating.toFixed(1)}</b><span>рейтинг · ${film.votes.toLocaleString('ru-RU')} оценок</span></div>`
              : `<div class="stat"><b class="tnum">${film.expect.toLocaleString('ru-RU')}</b><span>зрителей ждут премьеру</span></div>`}
            <div class="stat"><b>${duration(film.duration)}</b><span>продолжительность</span></div>
            <div class="stat"><b>${film.genreLabels.join(', ')}</b><span>жанр</span></div>
          </div>
          <p class="film-hero__tagline">«${esc(film.tagline)}»</p>
          <div class="film-hero__actions">
            ${film.status === 'now'
              ? `<a class="btn btn--primary btn--lg" href="#sessions" data-scroll="sessions">${icon('ticket')} Купить билеты</a>`
              : notifyButton(film, 'btn btn--primary btn--lg')}
            <a class="btn btn--ghost btn--lg" href="#trailer" data-scroll="trailer">${icon('play')} Трейлер</a>
          </div>
        </div>
      </div>
    </section>

    <section class="section section--tight">
      <div class="wrap film-about">
        <div class="film-about__text" data-reveal>
          <p class="eyebrow">О фильме</p>
          <h2>Сюжет</h2>
          ${film.description.map((p) => `<p>${esc(p)}</p>`).join('')}
        </div>
        <aside class="panel panel--gold film-facts" data-reveal style="--d:120ms">
          <dl>
            <div><dt>Режиссёр</dt><dd>${esc(film.director)}</dd></div>
            <div><dt>В ролях</dt><dd>${film.cast.map(esc).join(', ')}</dd></div>
            <div><dt>Жанр</dt><dd>${film.genreLabels.join(', ')}</dd></div>
            <div><dt>Страна</dt><dd>${film.country}</dd></div>
            <div><dt>Продолжительность</dt><dd>${duration(film.duration)}</dd></div>
            <div><dt>Возраст</dt><dd>${film.age}</dd></div>
            <div><dt>Премьера</dt><dd>${formatDate(film.premiere, { year: true })}</dd></div>
            <div><dt>Форматы</dt><dd>${film.formats.map((f) => `<span class="badge badge--fmt" data-fmt="${f}">${f}</span>`).join(' ')}</dd></div>
          </dl>
        </aside>
      </div>
    </section>

    <section class="section section--tight" id="trailer">
      <div class="wrap">
        <div class="section__head"><div><p class="eyebrow">Трейлер</p><h2>Первый взгляд</h2></div></div>
        <div data-reveal>${trailerPlayer(film)}</div>
      </div>
    </section>

    <section class="section section--tight" id="sessions">
      <div class="wrap">
        <div class="section__head">
          <div><p class="eyebrow">Расписание</p><h2>${film.status === 'now' ? 'Выберите сеанс' : 'Продажа билетов скоро'}</h2></div>
          ${film.status === 'now' ? '<p class="lead">Цена зависит от формата, времени сеанса и типа кресла. Утренние сеансы — на 20% дешевле.</p>' : ''}
        </div>
        ${film.status === 'now'
          ? html`<div class="days" role="tablist" aria-label="Дата сеанса" data-days>
              ${dates.map((d) => {
                const p = dayParts(d);
                const has = withSessions.includes(d);
                return `<button class="day${d === activeDate ? ' is-active' : ''}" type="button" role="tab" aria-selected="${d === activeDate}" data-date="${d}" ${has ? '' : 'disabled style="opacity:.35"'}><span class="day__wd">${p.wd}</span><span class="day__num">${p.num}</span><span class="day__mon">${p.mon}</span></button>`;
              })}
            </div>
            <div class="sessions-box" data-sessions>${sessionsBlock(film, activeDate)}</div>`
          : emptyState({
              iconName: 'calendar',
              title: `Премьера ${formatDate(film.premiere)}`,
              text: `До начала проката ${relativeDays(film.premiere).replace('через ', '')}. Подпишитесь — мы напомним, когда откроется продажа билетов.`,
              action: notifyButton(film, 'btn btn--primary'),
            })}
      </div>
    </section>

    <section class="section section--tight">
      <div class="wrap film-reviews">
        <div>
          <p class="eyebrow">Отзывы</p>
          <h2>Что говорят зрители</h2>
          <div data-reviews>${loadingView('Загружаем отзывы…')}</div>
        </div>
        <form class="panel panel__pad review-form" data-review-form novalidate>
          <h3 class="panel__title">Оставить отзыв</h3>
          <div class="field">
            <span class="field__label">Ваша оценка <b>*</b></span>
            <div class="star-input" role="radiogroup" aria-label="Оценка">
              ${[5, 4, 3, 2, 1].map((n) => `<input type="radio" id="rate-${n}" name="rating" value="${n}"><label for="rate-${n}" title="${n} из 5">${icon('star')}<span class="visually-hidden">${n}</span></label>`).join('')}
            </div>
            <span class="field__error" role="alert"></span>
          </div>
          ${field({ name: 'name', label: 'Имя', required: true, placeholder: 'Как вас представить', autocomplete: 'given-name' })}
          ${field({ name: 'text', label: 'Отзыв', required: true, textarea: true, placeholder: 'Без спойлеров, пожалуйста 🙂' })}
          <button class="btn btn--primary btn--block" type="submit">Опубликовать</button>
          <p class="field__hint">Отзыв сохраняется в демо-режиме на этом устройстве.</p>
        </form>
      </div>
    </section>

    ${similar.length ? html`<section class="section section--tight">
      <div class="wrap">
        <div class="section__head"><div><p class="eyebrow">Похожие фильмы</p><h2>Если понравилось</h2></div></div>
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

  // Отзывы
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
      toast('Спасибо за отзыв!', { type: 'success', text: `Ваша оценка: ${r.rating} из 5` });
    } catch (err) {
      if (err.fields) showFieldErrors(form, err.fields);
      else toast('Не удалось отправить отзыв', { type: 'error', text: err.message });
    } finally {
      setBusy(btn, false);
    }
  });
}
