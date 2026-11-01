import { html, esc } from '../lib/dom.js';
import { observeReveal } from '../components/ui.js';
import { icon } from '../icons.js';

export const main = () => document.getElementById('main');

/** Вставляет разметку страницы с анимацией появления. */
export function mount(markup, { flush = false } = {}) {
  const el = main();
  el.classList.toggle('page--flush', flush);
  document.body.dataset.solidHeader = flush ? '0' : '1';
  window.dispatchEvent(new Event('scroll'));
  el.classList.remove('page-enter');
  el.innerHTML = markup;
  void el.offsetWidth;
  el.classList.add('page-enter');
  observeReveal(el);
  return el;
}

export function crumbs(items) {
  return html`<nav class="crumbs" aria-label="Навигационная цепочка">
    <a href="#/">Главная</a>
    ${items.map((it) => html`<span aria-hidden="true">/</span>${it.href ? `<a href="${it.href}">${esc(it.label)}</a>` : `<span aria-current="page">${esc(it.label)}</span>`}`)}
  </nav>`;
}

export function pageHero({ trail = [], eyebrow = '', title, lead = '', aside = '' }) {
  return html`<section class="page-hero">
    <div class="wrap page-hero__inner">
      <div>
        ${crumbs(trail)}
        ${eyebrow ? `<p class="eyebrow" style="margin-top:28px">${eyebrow}</p>` : ''}
        <h1>${title}</h1>
        ${lead ? `<p class="lead">${lead}</p>` : ''}
      </div>
      ${aside}
    </div>
  </section>`;
}

export function loadingView(text = 'Загружаем…') {
  return html`<div class="wrap section"><div class="boot"><div class="boot__mark"></div><p>${text}</p></div></div>`;
}

export function stepsBar(current) {
  const steps = ['Сеанс', 'Места', 'Оформление', 'Билет'];
  return html`<ol class="steps" aria-label="Этапы покупки">
    ${steps.map((s, i) => html`${i ? '<li class="steps__line" aria-hidden="true"></li>' : ''}
      <li class="step ${i < current ? 'is-done' : ''} ${i === current ? 'is-current' : ''}" ${i === current ? 'aria-current="step"' : ''}>
        <span class="step__n">${i < current ? icon('check') : i + 1}</span>${s}
      </li>`)}
  </ol>`;
}

export function setTitle(t) {
  document.title = t ? `${t} — Cinema Example` : 'Cinema Example — кинотеатр психологических триллеров и хорроров';
}
