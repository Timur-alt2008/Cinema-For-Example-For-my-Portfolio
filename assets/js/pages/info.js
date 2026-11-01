// Информационные страницы: О кинотеатре, Залы, Акции, Контакты, FAQ, 404.

import { html, esc, $ } from '../lib/dom.js';
import { icon } from '../icons.js';
import { mount, pageHero, setTitle } from './common.js';
import { HALLS, FORMAT_INFO, hallCapacity } from '../data/halls.js';
import { CINEMA, PROMOS, FAQ, HISTORY, ADVANTAGES } from '../data/site.js';
import { hallScene, lobbyScene, barScene, vipScene, miniMap } from '../components/illustrations.js';
import { accordion, bindAccordion, toast, field, showFieldErrors, clearFieldError, setBusy, copyText } from '../components/ui.js';
import { sendFeedback, currentUser } from '../services/api.js';
import { price } from '../lib/format.js';

const TOTAL_SEATS = HALLS.reduce((sum, h) => sum + hallCapacity(h), 0);

/* ------------------------------- О кинотеатре ------------------------ */

export async function about() {
  setTitle('О кинотеатре');
  mount(html`
    ${pageHero({
      trail: [{ label: 'О кинотеатре' }],
      eyebrow: 'С 1931 года',
      title: 'Кинотеатр, в котором <em class="italic red">по-настоящему</em> темно',
      lead: 'Мы вернули жизнь старому синематографу на бульваре Люмьер и сделали его местом для фильмов, которые лучше всего смотреть в полной тишине и темноте.',
    })}
    <section class="wrap about-gallery" aria-label="Фотографии интерьера">
      <figure class="about-gallery__main" data-reveal>${hallScene({ tone: '#5a0f17', gold: true, label: 'Зал «Носферату»' })}<figcaption>Зал «Носферату» · 138 мест</figcaption></figure>
      <figure data-reveal style="--d:80ms">${lobbyScene()}<figcaption>Фойе с оригинальной лепниной 1931 года</figcaption></figure>
      <figure data-reveal style="--d:160ms">${barScene()}<figcaption>Бар «Антракт»</figcaption></figure>
      <figure data-reveal style="--d:240ms">${vipScene()}<figcaption>VIP-зал «Обскура»</figcaption></figure>
    </section>

    <section class="section">
      <div class="wrap concept">
        <div data-reveal>
          <p class="eyebrow">Концепция</p>
          <h2>Кино как ритуал</h2>
        </div>
        <div class="concept__text" data-reveal style="--d:100ms">
          <p class="lead">Мы верим, что психологический триллер или хоррор работает только тогда, когда вокруг ничего не отвлекает. Поэтому стены залов — чёрные, указатели — приглушённые, а телефоны на время сеанса уходят в «режим кинотеатра».</p>
          <p class="muted">В программе — авторское жанровое кино, большие студийные премьеры и ретроспективы. По пятницам и субботам в зале «Кадр 13» проходят полуночные сеансы, а днём мы показываем мультфильмы и семейные истории — в отдельные часы, чтобы фойе оставалось спокойным.</p>
          <div class="concept__stats">
            <div><b class="tnum">4</b><span>зала</span></div>
            <div><b class="tnum">${TOTAL_SEATS}</b><span>мест</span></div>
            <div><b class="tnum">26 м</b><span>экран IMAX</span></div>
            <div><b class="tnum">02:30</b><span>последний сеанс</span></div>
          </div>
        </div>
      </div>
    </section>

    <section class="section section--tight">
      <div class="wrap">
        <div class="section__head"><div><p class="eyebrow">История</p><h2>Почти сто лет в темноте</h2></div></div>
        <ol class="timeline">
          ${HISTORY.map((h, i) => html`<li class="timeline__item" data-reveal style="--d:${i * 90}ms">
            <span class="timeline__year">${h.year}</span>
            <div><h3>${h.title}</h3><p class="muted">${h.text}</p></div>
          </li>`)}
        </ol>
      </div>
    </section>

    <section class="section">
      <div class="wrap">
        <div class="section__head"><div><p class="eyebrow">Преимущества</p><h2>Почему к нам возвращаются</h2></div></div>
        <div class="tile-grid">
          ${ADVANTAGES.map((a, i) => html`<div class="feature" data-reveal style="--d:${(i % 3) * 80}ms">
            <span class="feature__num">0${i + 1}</span>
            <div class="feature__icon">${icon(a.icon)}</div>
            <h3>${a.title}</h3><p>${a.text}</p>
          </div>`)}
        </div>
      </div>
    </section>

    <section class="section section--tight">
      <div class="wrap cta-band" data-reveal>
        <div><h2>Свет гаснет через пять минут</h2><p class="muted">Посмотрите, что идёт сегодня, и выберите места в зале.</p></div>
        <a class="btn btn--primary btn--lg" href="#/schedule">${icon('ticket')} Расписание на сегодня</a>
      </div>
    </section>
  `);
}

/* ------------------------------- Залы --------------------------------- */

export async function halls() {
  setTitle('Наши залы');
  const scenes = { h1: () => hallScene({ tone: '#5a0f17', gold: true, label: 'Зал Носферату' }), h2: () => hallScene({ tone: '#2a2222', rows: 9, gold: false, label: 'Зал IMAX Метрополис' }), h3: () => vipScene(), h4: () => hallScene({ tone: '#3a0c12', rows: 6, gold: true, label: 'Зал Кадр 13' }) };
  mount(html`
    ${pageHero({
      trail: [{ label: 'Залы' }],
      eyebrow: `4 зала · ${TOTAL_SEATS} мест`,
      title: 'Наши залы',
      lead: 'От камерного VIP-зала на сорок реклайнеров до IMAX с экраном высотой в пятиэтажный дом. Выбирайте зал под фильм и настроение.',
    })}
    <section class="wrap halls-list">
      ${HALLS.map((h, i) => html`<article class="hall-card${i % 2 ? ' is-flip' : ''}" id="${h.id}" data-reveal>
        <div class="hall-card__art">${scenes[h.id]()}<span class="hall-card__num">${String(h.number).padStart(2, '0')}</span></div>
        <div class="hall-card__body">
          <div class="hall-card__badges"><span class="badge badge--fmt" data-fmt="${h.kind === 'VIP' ? 'VIP' : h.kind === 'IMAX' ? 'IMAX' : '2D'}">${h.kind}</span>${h.formats.map((f) => `<span class="badge badge--soft">${f}</span>`).join('')}</div>
          <h2>Зал «${h.name}»</h2>
          <p class="lead">${h.description}</p>
          <div class="hall-card__stats">
            <div><b class="tnum">${hallCapacity(h)}</b><span>мест</span></div>
            <div><b class="tnum">${h.rows.length}</b><span>рядов</span></div>
            <div><b class="tnum">от ${price(Math.round(FORMAT_INFO[h.formats[0]].base * 0.8 / 10) * 10)}</b><span>билет</span></div>
          </div>
          <ul class="hall-card__eq">${h.equipment.map((e) => `<li>${icon('check')}${e}</li>`).join('')}</ul>
          <div class="hall-card__map">${miniMap(h)}</div>
          <a class="btn btn--primary" href="#/schedule?hall=${h.id}">${icon('calendar')} Сеансы в этом зале</a>
        </div>
      </article>`)}
    </section>
    <section class="section section--tight">
      <div class="wrap">
        <div class="section__head"><div><p class="eyebrow">Форматы</p><h2>Сколько стоит билет</h2></div><p class="lead">Базовая цена зависит от формата. Утром (до 12:00) билеты на 20% дешевле, вечером и в выходные — немного дороже.</p></div>
        <div class="formats">
          ${Object.values(FORMAT_INFO).map((f, i) => html`<div class="format" data-reveal style="--d:${i * 70}ms"><span class="badge badge--fmt" data-fmt="${f.label}">${f.label}</span><b class="tnum">от ${price(Math.round(f.base * 0.8 / 10) * 10)}</b><p class="muted">${f.text}</p></div>`)}
        </div>
      </div>
    </section>
  `);
}

/* ------------------------------- Акции -------------------------------- */

export async function promos({ scope }) {
  setTitle('Акции и скидки');
  const root = mount(html`
    ${pageHero({
      trail: [{ label: 'Акции' }],
      eyebrow: 'Специальные предложения',
      title: 'Акции и скидки',
      lead: 'Студенческие вторники, семейные билеты и полуночные сеансы по особой цене. Промокод вводится на шаге оформления заказа.',
    })}
    <section class="wrap promos">
      ${PROMOS.map((p, i) => html`<article class="promo promo--${p.tone}" data-reveal style="--d:${(i % 3) * 80}ms">
        <div class="promo__top"><span class="promo__icon">${icon(p.icon)}</span><span class="badge badge--soft">${p.category}</span></div>
        <p class="promo__discount">${p.discount}</p>
        <h2 class="promo__title">${p.title}</h2>
        <p class="muted">${p.text}</p>
        <ul class="promo__terms">${p.terms.map((t) => `<li>${t}</li>`).join('')}</ul>
        ${p.code
          ? `<button class="promo__code" type="button" data-copy="${p.code}" aria-label="Скопировать промокод ${p.code}"><span>Промокод</span><b>${p.code}</b>${icon('copy')}</button>`
          : `<span class="promo__code is-auto"><span>Без промокода</span><b>Автоматически</b>${icon('check')}</span>`}
      </article>`)}
    </section>
    <section class="section section--tight">
      <div class="wrap cta-band" data-reveal>
        <div><h2>Скидки не суммируются</h2><p class="muted">В одном заказе действует один промокод. Утренняя скидка уже учтена в цене сеанса.</p></div>
        <a class="btn btn--primary btn--lg" href="#/schedule">${icon('ticket')} Выбрать сеанс</a>
      </div>
    </section>
  `);
  root.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-copy]');
    if (!b) return;
    const ok = await copyText(b.dataset.copy);
    b.classList.add('is-copied');
    setTimeout(() => b.classList.remove('is-copied'), 1600);
    toast(ok ? `Промокод ${b.dataset.copy} скопирован` : `Промокод: ${b.dataset.copy}`, { type: 'success', text: 'Вставьте его на шаге оформления заказа.' });
  });
}

/* ------------------------------- Контакты ----------------------------- */

function mapSVG() {
  return `<svg class="map" viewBox="0 0 800 520" role="img" aria-label="Схема проезда к Cinema Example">
    <defs><radialGradient id="mapglow"><stop offset="0" stop-color="#a31320" stop-opacity=".7"/><stop offset="1" stop-color="#a31320" stop-opacity="0"/></radialGradient>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#f2eeee" stroke-opacity=".035"/></pattern></defs>
    <rect width="800" height="520" fill="#0e0c0c"/><rect width="800" height="520" fill="url(#grid)"/>
    <path d="M-20 380 C120 340 240 420 380 380 S640 300 820 340" stroke="#16222b" stroke-width="46" fill="none"/>
    <text x="80" y="372" fill="#4a6070" font-size="12" font-family="Manrope" letter-spacing="3" transform="rotate(-6 80 372)">РЕКА</text>
    ${[[0, 120, 800, 150], [0, 250, 800, 230], [160, 0, 190, 520], [460, 0, 430, 520], [620, 0, 680, 520]].map(([x1, y1, x2, y2]) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#2a2424" stroke-width="14"/>`).join('')}
    <line x1="0" y1="250" x2="800" y2="230" stroke="#3a2a2a" stroke-width="18"/>
    <text x="520" y="226" fill="#a49b9b" font-size="12" font-family="Manrope" letter-spacing="2">БУЛЬВАР ЛЮМЬЕР</text>
    <text x="196" y="80" fill="#6f6767" font-size="11" font-family="Manrope" letter-spacing="2" transform="rotate(86 196 80)">ул. Театральная</text>
    ${[[60, 150, 80, 70], [220, 150, 180, 70], [500, 150, 100, 60], [60, 270, 80, 60], [220, 270, 120, 70], [500, 260, 110, 80], [700, 150, 80, 60], [700, 270, 80, 50]].map(([x, y, w, h]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="#191515"/>`).join('')}
    <rect x="300" y="150" width="140" height="70" rx="6" fill="#2a0e12" stroke="#b99a60" stroke-opacity=".6"/>
    <circle cx="370" cy="185" r="90" fill="url(#mapglow)"/>
    <g transform="translate(370 182)"><path d="M0 22 C-16 2 -18 -6 -18 -12 a18 18 0 1 1 36 0 c0 6 -2 14 -18 34z" fill="#a31320" stroke="#f2eeee" stroke-width="1.5"/><circle cx="0" cy="-12" r="6" fill="#f2eeee"/></g>
    <text x="370" y="140" text-anchor="middle" fill="#f2eeee" font-size="15" font-family="Cormorant Garamond, serif" font-weight="600">Cinema Example</text>
    <g transform="translate(560 320)"><circle r="14" fill="#1a1a2a" stroke="#6f7fa0"/><text y="5" text-anchor="middle" fill="#cfd8e8" font-size="13" font-family="Manrope" font-weight="800">М</text></g>
    <text x="582" y="324" fill="#a49b9b" font-size="11" font-family="Manrope">«Люмьер» · 4 мин пешком</text>
    <g transform="translate(250 205)"><rect x="-12" y="-10" width="24" height="20" rx="4" fill="#1a2a3a" stroke="#6f7fa0"/><text y="5" text-anchor="middle" fill="#cfd8e8" font-size="12" font-family="Manrope" font-weight="800">P</text></g>
  </svg>`;
}

export async function contacts() {
  setTitle('Контакты');
  const user = currentUser();
  const root = mount(html`
    ${pageHero({
      trail: [{ label: 'Контакты' }],
      eyebrow: 'Как нас найти',
      title: 'Контакты',
      lead: 'Мы находимся в центре города, в четырёх минутах от метро. Пишите и звоните — ответим быстрее, чем закончатся трейлеры перед сеансом.',
    })}
    <section class="wrap contacts">
      <div class="contacts__cards">
        <a class="contact-card" href="#/contacts" data-reveal>${icon('mapPin')}<span><small>Адрес</small><b>${CINEMA.addressFull}</b></span></a>
        <a class="contact-card" href="tel:${CINEMA.phoneHref}" data-reveal style="--d:60ms">${icon('phone')}<span><small>Телефон</small><b>${CINEMA.phone}</b></span></a>
        <a class="contact-card" href="mailto:${CINEMA.email}" data-reveal style="--d:120ms">${icon('mail')}<span><small>Почта</small><b>${CINEMA.email}</b></span></a>
        <div class="contact-card" data-reveal style="--d:180ms">${icon('clock')}<span><small>Режим работы</small><b>${CINEMA.hours}</b><span class="muted">${CINEMA.boxOffice}</span></span></div>
      </div>
      <div class="contacts__map panel" data-reveal>${mapSVG()}</div>
      <div class="contacts__socials" data-reveal>
        <h2 class="panel__title">Мы в соцсетях</h2>
        <div class="socials-list">
          ${CINEMA.socials.map((s) => `<span class="social">${icon(s.id)}<span><b>${s.label}</b><small>${s.handle}</small></span></span>`).join('')}
        </div>
        <p class="muted" style="font-size:.85rem;margin-top:14px">Аккаунты вымышлены — это демонстрационный проект.</p>
      </div>
      <form class="panel panel__pad contacts__form" data-feedback novalidate data-reveal>
        <h2 class="panel__title">Напишите нам</h2>
        <div class="form-grid">
          ${field({ name: 'name', label: 'Имя', required: true, value: user?.firstName || '', autocomplete: 'name' })}
          ${field({ name: 'email', label: 'Почта', type: 'email', required: true, value: user?.email || '', autocomplete: 'email' })}
          <div class="field span-2">
            <label class="field__label" for="fb-topic">Тема</label>
            <select class="select" id="fb-topic" name="topic">
              <option>Вопрос о билетах</option><option>Возврат билета</option><option>Аренда зала и мероприятия</option><option>Отзыв и предложения</option><option>Другое</option>
            </select>
          </div>
          <div class="span-2">${field({ name: 'message', label: 'Сообщение', required: true, textarea: true, placeholder: 'Расскажите, чем мы можем помочь' })}</div>
        </div>
        <button class="btn btn--primary btn--lg" type="submit" style="margin-top:18px">${icon('mail')} Отправить</button>
      </form>
    </section>
  `);
  const form = $('[data-feedback]', root);
  form.addEventListener('input', clearFieldError);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('[type="submit"]');
    setBusy(btn, true);
    const v = (n) => form.querySelector(`[name="${n}"]`).value;
    try {
      const t = await sendFeedback({ name: v('name'), email: v('email'), topic: v('topic'), message: v('message') });
      form.reset();
      toast('Сообщение отправлено', { type: 'success', text: `Номер обращения ${t.id}. Ответим в течение дня (демо-режим).` });
    } catch (err) {
      if (err.fields) showFieldErrors(form, err.fields);
      else toast('Не удалось отправить', { type: 'error', text: err.message });
    } finally {
      setBusy(btn, false);
    }
  });
}

/* ------------------------------- FAQ ---------------------------------- */

export async function faq() {
  setTitle('Частые вопросы');
  const root = mount(html`
    ${pageHero({ trail: [{ label: 'Вопросы и ответы' }], eyebrow: 'FAQ', title: 'Вопросы и ответы', lead: 'Всё о билетах, возврате, возрастных ограничениях и правилах посещения.' })}
    <section class="wrap faq-page">
      <div data-acc-root>${accordion(FAQ, { open: 0 })}</div>
      <aside class="panel panel__pad faq-page__aside" data-reveal>
        <h2 class="panel__title">Не нашли ответ?</h2>
        <p class="muted">Позвоните нам или напишите — дежурный администратор на связи до последнего сеанса.</p>
        <a class="btn btn--ghost btn--block" href="tel:${CINEMA.phoneHref}" style="margin-top:18px">${icon('phone')} ${CINEMA.phone}</a>
        <a class="btn btn--primary btn--block" href="#/contacts" style="margin-top:10px">${icon('mail')} Написать</a>
      </aside>
    </section>
  `);
  bindAccordion($('[data-acc-root]', root));
}

/* ------------------------------- 404 ---------------------------------- */

export async function notFound() {
  setTitle('Страница не найдена');
  mount(html`<section class="wrap section notfound">
    <p class="notfound__code" aria-hidden="true">404</p>
    <h1>Эта плёнка утеряна</h1>
    <p class="lead">Такой страницы нет — возможно, её вырезали при монтаже. Вернитесь в афишу или на главную.</p>
    <div class="chips" style="justify-content:center;margin-top:24px">
      <a class="btn btn--primary" href="#/afisha">${icon('film')} Афиша</a>
      <a class="btn btn--ghost" href="#/">На главную</a>
    </div>
  </section>`);
}
