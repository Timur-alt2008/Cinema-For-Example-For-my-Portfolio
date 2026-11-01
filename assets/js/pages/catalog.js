import { html, esc, $, debounce } from '../lib/dom.js';
import { icon } from '../icons.js';
import { mount, pageHero, setTitle } from './common.js';
import { GENRES, COLLECTIONS, FILMS } from '../data/films.js';
import { getFilms, searchFilmsSync } from '../services/api.js';
import { filmCard } from '../components/filmCard.js';
import { emptyState, skeletonCards, observeReveal, errorState } from '../components/ui.js';
import { replaceQuery } from '../router.js';
import { plural } from '../lib/format.js';

const FILTERS = [
  { key: 'all', label: 'Все фильмы' },
  { key: 'now', label: 'Сейчас в прокате' },
  { key: 'soon', label: 'Скоро в кино' },
  ...Object.entries(GENRES).map(([key, label]) => ({ key, label: label === 'Хоррор' ? 'Хорроры' : label === 'Триллер' ? 'Триллеры' : label === 'Боевик' ? 'Боевики' : label === 'Драма' ? 'Драмы' : label === 'Комедия' ? 'Комедии' : label === 'Мультфильм' ? 'Мультфильмы' : label })),
];

const SORTS = [
  { key: 'popular', label: 'По популярности' },
  { key: 'rating', label: 'По рейтингу' },
  { key: 'date', label: 'Сначала новые премьеры' },
  { key: 'soonest', label: 'Сначала ранние премьеры' },
];

function countFor(key) {
  return searchFilmsSync({ genre: key }).length;
}

export default async function catalog({ query, scope, isCurrent }) {
  setTitle('Киноафиша');
  const state = {
    q: query.q || '',
    genre: FILTERS.some((f) => f.key === query.genre) ? query.genre : 'all',
    sort: SORTS.some((s) => s.key === query.sort) ? query.sort : 'popular',
    collection: COLLECTIONS[query.collection] ? query.collection : '',
  };
  const coll = state.collection ? COLLECTIONS[state.collection] : null;

  const root = mount(html`
    ${pageHero({
      trail: [{ label: 'Афиша' }],
      eyebrow: coll ? 'Подборка' : `${FILMS.length} фильмов в программе`,
      title: coll ? esc(coll.title) : 'Киноафиша',
      lead: coll ? esc(coll.text) : 'Психологические триллеры, хорроры и большие премьеры. Ищите по названию, режиссёру или актёру и сортируйте так, как удобно.',
    })}
    <section class="wrap catalog">
      <div class="catalog__bar">
        <form class="catalog__search" role="search" data-search>
          <div class="input-group">
            ${icon('search')}
            <input class="input" type="search" name="q" value="${esc(state.q)}" placeholder="Название, режиссёр или актёр" aria-label="Поиск фильма" autocomplete="off">
            <button class="input-group__clear" type="button" data-clear aria-label="Очистить поиск" ${state.q ? '' : 'hidden'}>${icon('close')}</button>
          </div>
        </form>
        <label class="catalog__sort">
          <span class="visually-hidden">Сортировка</span>
          <select class="select" data-sort aria-label="Сортировка">
            ${SORTS.map((s) => `<option value="${s.key}" ${s.key === state.sort ? 'selected' : ''}>${s.label}</option>`)}
          </select>
        </label>
      </div>
      <div class="chips catalog__filters" role="group" aria-label="Фильтр по жанру и статусу">
        ${FILTERS.map((f) => `<button class="chip" type="button" data-genre="${f.key}" aria-pressed="${f.key === state.genre}">${f.label} <span class="chip__count">${countFor(f.key)}</span></button>`)}
      </div>
      ${coll ? `<div class="catalog__coll"><span class="badge badge--gold">${icon('sparkle')} Подборка: ${esc(coll.title)}</span><a class="link-arrow" href="#/afisha" data-reset-coll>Показать все фильмы ${icon('close')}</a></div>` : ''}
      <p class="catalog__count muted" data-count aria-live="polite"></p>
      <div data-results>${skeletonCards(8)}</div>
    </section>
  `);

  const results = $('[data-results]', root);
  const countEl = $('[data-count]', root);
  const input = $('input[name="q"]', root);
  const clearBtn = $('[data-clear]', root);
  let req = 0;

  async function load() {
    const my = ++req;
    replaceQuery({ q: state.q, genre: state.genre !== 'all' ? state.genre : '', sort: state.sort !== 'popular' ? state.sort : '', collection: state.collection });
    results.setAttribute('aria-busy', 'true');
    if (!results.querySelector('.skeleton')) results.style.opacity = '0.5';
    try {
      const list = await getFilms(state);
      if (my !== req || !isCurrent()) return;
      results.style.opacity = '';
      results.removeAttribute('aria-busy');
      countEl.textContent = list.length
        ? `Найдено ${list.length} ${plural(list.length, ['фильм', 'фильма', 'фильмов'])}${state.q ? ` по запросу «${state.q}»` : ''}`
        : '';
      if (!list.length) {
        results.innerHTML = emptyState({
          iconName: 'search',
          title: 'Ничего не нашлось',
          text: state.q
            ? `По запросу «${esc(state.q)}» в выбранной категории фильмов нет. Проверьте написание или сбросьте фильтры.`
            : 'В этой категории пока нет фильмов. Загляните в раздел «Скоро в кино» — афиша обновляется каждую неделю.',
          action: '<button class="btn btn--ghost" type="button" data-reset>Сбросить фильтры</button>',
        });
        return;
      }
      results.innerHTML = `<div class="film-grid">${list.map((f, i) => filmCard(f, { index: i })).join('')}</div>`;
      observeReveal(results);
    } catch (err) {
      if (my !== req) return;
      results.style.opacity = '';
      results.innerHTML = errorState(err);
    }
  }

  const onInput = debounce(() => { state.q = input.value.trim(); clearBtn.hidden = !state.q; load(); }, 260);
  input.addEventListener('input', onInput);
  $('[data-search]', root).addEventListener('submit', (e) => { e.preventDefault(); state.q = input.value.trim(); load(); input.blur(); });
  clearBtn.addEventListener('click', () => { input.value = ''; state.q = ''; clearBtn.hidden = true; input.focus(); load(); });
  $('[data-sort]', root).addEventListener('change', (e) => { state.sort = e.target.value; load(); });

  root.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-genre]');
    if (chip) {
      state.genre = chip.dataset.genre;
      root.querySelectorAll('[data-genre]').forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
      load();
      return;
    }
    if (e.target.closest('[data-reset]')) {
      state.q = ''; state.genre = 'all'; state.sort = 'popular';
      input.value = ''; clearBtn.hidden = true;
      $('[data-sort]', root).value = 'popular';
      root.querySelectorAll('[data-genre]').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.genre === 'all')));
      load();
    }
    if (e.target.closest('[data-retry]')) load();
  });

  await load();
}
