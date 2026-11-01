import { html, esc } from '../lib/dom.js';
import { icon } from '../icons.js';
import { poster } from './poster.js';
import { duration, formatDate } from '../lib/format.js';
import { favorites, premiereAlerts } from '../store.js';

export function ratingBadge(film) {
  if (film.rating) return `<span class="badge badge--rating">${icon('star')} ${film.rating.toFixed(1)}</span>`;
  return `<span class="badge badge--gold">Премьера</span>`;
}

export function favButton(film, extraClass = '') {
  const active = favorites.has(film.id);
  return `<button class="fav-btn ${extraClass}${active ? ' is-active' : ''}" type="button" data-fav="${film.id}"
    aria-pressed="${active}" aria-label="${active ? 'Убрать из избранного' : 'Добавить в избранное'}: ${esc(film.title)}">${icon('heart')}</button>`;
}

export function notifyButton(film, cls = 'btn btn--ghost btn--sm') {
  const on = premiereAlerts.has(film.id);
  return `<button class="${cls}" type="button" data-notify="${film.id}" aria-pressed="${on}">
    ${icon('bell')}<span>${on ? 'Напомним о премьере' : 'Напомнить о премьере'}</span></button>`;
}

export function filmCard(film, { index = 0, reveal = true } = {}) {
  const soon = film.status === 'soon';
  return html`
  <article class="film-card" ${reveal ? `data-reveal style="--d:${(index % 4) * 70}ms"` : ''}>
    <div class="film-card__frame">
    <a class="film-card__media" href="#/film/${film.id}" aria-label="${esc(film.title)} — подробнее">
      <div class="film-card__badges">
        <span class="badge badge--age" data-age="${film.age}">${film.age}</span>
        ${ratingBadge(film)}
      </div>
      ${poster(film, { label: false, cast: false })}
      <div class="film-card__overlay" aria-hidden="true">
        <p>${esc(film.short)}</p>
      </div>
    </a>
    ${favButton(film)}
    </div>
    <div class="film-card__info">
      ${soon ? `<span class="film-card__date">В кино с ${formatDate(film.premiere)}</span>` : ''}
      <h3 class="film-card__title"><a href="#/film/${film.id}">${esc(film.title)}</a></h3>
      <p class="film-card__sub">${film.genreLabels.join(', ')} · ${duration(film.duration)}</p>
      <div class="film-card__actions">
        <a class="btn btn--ghost btn--sm" href="#/film/${film.id}">Подробнее</a>
        ${soon
          ? `<button class="btn btn--primary btn--sm" type="button" data-notify="${film.id}" aria-pressed="${premiereAlerts.has(film.id)}">${icon('bell')}<span>${premiereAlerts.has(film.id) ? 'Напомним' : 'Напомнить'}</span></button>`
          : `<a class="btn btn--primary btn--sm" href="#/film/${film.id}?buy=1">${icon('ticket')} Билеты</a>`}
      </div>
    </div>
  </article>`;
}
