import { html, esc, $ } from '../lib/dom.js';
import { icon } from '../icons.js';
import { mount, pageHero, setTitle } from './common.js';
import { getSchedule } from '../services/api.js';
import { scheduleDates } from '../services/schedule.js';
import { HALLS } from '../data/halls.js';
import { poster } from '../components/poster.js';
import { emptyState, errorState, observeReveal } from '../components/ui.js';
import { replaceQuery } from '../router.js';
import { dayParts, duration, formatDate, price, plural } from '../lib/format.js';

const FORMATS = ['all', '2D', '3D', 'IMAX', 'VIP'];
const PARTS = [
  { key: 'all', label: 'Весь день' },
  { key: 'morning', label: 'Утро', from: 0, to: 12 * 60 },
  { key: 'day', label: 'День', from: 12 * 60, to: 18 * 60 },
  { key: 'evening', label: 'Вечер', from: 18 * 60, to: 22 * 60 + 30 },
  { key: 'night', label: 'Ночь', from: 22 * 60 + 30, to: 24 * 60 },
];

function filter(sessions, st) {
  const part = PARTS.find((p) => p.key === st.part);
  return sessions.filter((s) =>
    (st.format === 'all' || s.format === st.format) &&
    (st.hall === 'all' || s.hallId === st.hall) &&
    (!part || part.key === 'all' || (s.start >= part.from && s.start < part.to)) &&
    (!st.open || s.sales !== 'closed')
  );
}

function listView(sessions) {
  const byFilm = new Map();
  sessions.forEach((s) => {
    if (!byFilm.has(s.filmId)) byFilm.set(s.filmId, { film: s.film, items: [] });
    byFilm.get(s.filmId).items.push(s);
  });
  const groups = [...byFilm.values()].sort((a, b) => b.film.popularity - a.film.popularity);
  return html`<div class="schedule-list">
    ${groups.map((g, i) => html`<article class="sched-film" data-reveal style="--d:${Math.min(i, 5) * 50}ms">
      <a class="sched-film__poster" href="#/film/${g.film.id}" aria-label="${esc(g.film.title)}">${poster(g.film, { title: false, label: false })}</a>
      <div class="sched-film__body">
        <div class="sched-film__head">
          <div>
            <h3><a href="#/film/${g.film.id}">${esc(g.film.title)}</a></h3>
            <p class="meta"><span class="badge badge--age" data-age="${g.film.age}">${g.film.age}</span><span>${g.film.genreLabels.join(', ')}</span><span class="sep"></span><span>${icon('clock')}${duration(g.film.duration)}</span>${g.film.rating ? `<span class="sep"></span><span>${icon('star')}${g.film.rating.toFixed(1)}</span>` : ''}</p>
          </div>
        </div>
        <div class="sched-times">
          ${g.items.map((s) => {
            const closed = s.sales === 'closed';
            const inner = html`
              <span class="sched-time__t tnum">${s.time}</span>
              <span class="sched-time__fmt badge badge--fmt" data-fmt="${s.format}">${s.format}</span>
              <span class="sched-time__hall">Зал ${s.hall.number} · ${esc(s.hall.name)}</span>
              <span class="sched-time__price">${closed ? 'продажа закрыта' : `от ${price(s.price)}`}</span>`;
            return closed
              ? `<span class="sched-time is-closed" aria-disabled="true">${inner}</span>`
              : `<a class="sched-time${s.sales === 'closing' ? ' is-closing' : ''}${s.midnight ? ' is-midnight' : ''}" href="#/session/${s.id}" aria-label="${esc(g.film.title)}, ${s.time}, ${s.format}, зал ${s.hall.number}, от ${price(s.price)}">${inner}${s.sales === 'closing' ? '<span class="sched-time__flag">скоро начало</span>' : ''}</a>`;
          })}
        </div>
      </div>
    </article>`)}
  </div>`;
}

export default async function schedule({ query, isCurrent }) {
  setTitle('Расписание сеансов');
  const dates = scheduleDates();
  const st = {
    date: dates.includes(query.date) ? query.date : dates[0],
    format: FORMATS.includes(query.format) ? query.format : 'all',
    part: PARTS.some((p) => p.key === query.part) ? query.part : 'all',
    hall: HALLS.some((h) => h.id === query.hall) ? query.hall : 'all',
    open: query.open !== '0',
  };

  const root = mount(html`
    ${pageHero({
      trail: [{ label: 'Расписание' }],
      eyebrow: 'Сеансы на неделю',
      title: 'Расписание',
      lead: 'Выберите день, формат и время — затем место в зале. Детские сеансы идут днём, хорроры 18+ — после обеда и до глубокой ночи.',
    })}
    <section class="wrap schedule">
      <div class="days" role="tablist" aria-label="Выбор даты" data-days>
        ${dates.map((d) => {
          const p = dayParts(d);
          return `<button class="day${d === st.date ? ' is-active' : ''}${p.weekend ? ' is-weekend' : ''}" type="button" role="tab" aria-selected="${d === st.date}" data-date="${d}"><span class="day__wd">${p.wd}</span><span class="day__num">${p.num}</span><span class="day__mon">${p.mon}</span></button>`;
        })}
      </div>
      <div class="schedule__filters">
        <div class="chips" role="group" aria-label="Формат">
          ${FORMATS.map((f) => `<button class="chip" type="button" data-format="${f}" aria-pressed="${f === st.format}">${f === 'all' ? 'Все форматы' : f}</button>`)}
        </div>
        <div class="schedule__selects">
          <label class="visually-hidden" for="sched-part">Время суток</label>
          <select class="select" id="sched-part" data-part>${PARTS.map((p) => `<option value="${p.key}" ${p.key === st.part ? 'selected' : ''}>${p.label}</option>`)}</select>
          <label class="visually-hidden" for="sched-hall">Зал</label>
          <select class="select" id="sched-hall" data-hall><option value="all">Все залы</option>${HALLS.map((h) => `<option value="${h.id}" ${h.id === st.hall ? 'selected' : ''}>Зал ${h.number} · ${h.name}</option>`)}</select>
        </div>
      </div>
      <label class="check schedule__open"><input type="checkbox" data-open ${st.open ? 'checked' : ''}> Скрыть сеансы, на которые продажа закрыта</label>
      <div class="schedule__summary" data-summary aria-live="polite"></div>
      <div data-list></div>
    </section>
  `);

  const list = $('[data-list]', root);
  const summary = $('[data-summary]', root);
  let req = 0;

  async function load() {
    const my = ++req;
    replaceQuery({
      date: st.date !== dates[0] ? st.date : '',
      format: st.format !== 'all' ? st.format : '',
      part: st.part !== 'all' ? st.part : '',
      hall: st.hall !== 'all' ? st.hall : '',
      open: st.open ? '' : '0',
    });
    list.innerHTML = `<div class="schedule-list">${Array.from({ length: 4 }, () => '<div class="skeleton skeleton--block"></div>').join('')}</div>`;
    summary.textContent = '';
    try {
      const all = await getSchedule(st.date);
      if (my !== req || !isCurrent()) return;
      const items = filter(all, st);
      const films = new Set(items.map((s) => s.filmId)).size;
      summary.innerHTML = items.length
        ? `<b>${formatDate(st.date, { weekday: true })}</b> · ${items.length} ${plural(items.length, ['сеанс', 'сеанса', 'сеансов'])}, ${films} ${plural(films, ['фильм', 'фильма', 'фильмов'])}`
        : '';
      if (!items.length) {
        const closedAll = all.length && all.every((s) => s.sales === 'closed');
        list.innerHTML = emptyState({
          iconName: 'calendar',
          title: closedAll ? 'На сегодня сеансы закончились' : 'Нет подходящих сеансов',
          text: closedAll
            ? 'Последний сеанс уже начался. Посмотрите расписание на завтра — билеты уже в продаже.'
            : 'Попробуйте выбрать другой формат, время суток или зал.',
          action: closedAll
            ? `<button class="btn btn--primary" type="button" data-date-jump="${dates[1]}">Расписание на завтра</button>`
            : '<button class="btn btn--ghost" type="button" data-reset>Сбросить фильтры</button>',
        });
        return;
      }
      list.innerHTML = listView(items);
      observeReveal(list);
    } catch (err) {
      if (my !== req) return;
      list.innerHTML = errorState(err);
    }
  }

  const setDate = (d) => {
    st.date = d;
    root.querySelectorAll('[data-date]').forEach((b) => { b.classList.toggle('is-active', b.dataset.date === d); b.setAttribute('aria-selected', String(b.dataset.date === d)); });
    root.querySelector(`[data-date="${d}"]`)?.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' });
    load();
  };

  root.addEventListener('click', (e) => {
    const d = e.target.closest('[data-date]');
    if (d) { setDate(d.dataset.date); return; }
    const j = e.target.closest('[data-date-jump]');
    if (j) { setDate(j.dataset.dateJump); return; }
    const f = e.target.closest('[data-format]');
    if (f) {
      st.format = f.dataset.format;
      root.querySelectorAll('[data-format]').forEach((c) => c.setAttribute('aria-pressed', String(c === f)));
      load();
      return;
    }
    if (e.target.closest('[data-reset]')) {
      st.format = 'all'; st.part = 'all'; st.hall = 'all';
      root.querySelectorAll('[data-format]').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.format === 'all')));
      $('[data-part]', root).value = 'all';
      $('[data-hall]', root).value = 'all';
      load();
    }
    if (e.target.closest('[data-retry]')) load();
  });
  $('[data-part]', root).addEventListener('change', (e) => { st.part = e.target.value; load(); });
  $('[data-hall]', root).addEventListener('change', (e) => { st.hall = e.target.value; load(); });
  $('[data-open]', root).addEventListener('change', (e) => { st.open = e.target.checked; load(); });

  await load();
}
