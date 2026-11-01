// Общие элементы интерфейса: уведомления, модальные окна, появление при прокрутке,
// аккордеоны, пустые состояния и скелетоны.

import { html, esc, $, $$, prefersReducedMotion } from '../lib/dom.js';
import { icon } from '../icons.js';

/* ------------------------------- Тосты -------------------------------- */

export function toast(title, { text = '', type = 'info', timeout = 4200, iconName } = {}) {
  const root = document.getElementById('toasts');
  if (!root) return;
  const ic = iconName || (type === 'error' ? 'alert' : type === 'success' ? 'check' : 'info');
  const el = document.createElement('div');
  el.className = `toast toast--${type}`;
  el.setAttribute('role', type === 'error' ? 'alert' : 'status');
  el.innerHTML = html`
    <span class="toast__icon">${icon(ic)}</span>
    <div><div class="toast__title">${esc(title)}</div>${text ? `<div class="toast__text">${esc(text)}</div>` : ''}</div>
    <button class="toast__close" type="button" aria-label="Закрыть уведомление">${icon('close')}</button>`;
  const close = () => {
    if (el.classList.contains('is-leaving')) return;
    el.classList.add('is-leaving');
    setTimeout(() => el.remove(), 260);
  };
  el.querySelector('.toast__close').addEventListener('click', close);
  root.appendChild(el);
  while (root.children.length > 4) root.firstElementChild.remove();
  if (timeout) setTimeout(close, timeout);
  return close;
}

/* ------------------------------- Модальные окна ----------------------- */

let openModals = 0;

/**
 * openModal({ title, body, footer, wide, onOpen, onClose, label })
 * body/footer — HTML-строки. Возвращает объект { el, close }.
 */
export function openModal({ title = '', body = '', footer = '', wide = false, onOpen, onClose, label, dismissible = true } = {}) {
  const root = document.getElementById('modal-root');
  const previouslyFocused = document.activeElement;
  const el = document.createElement('div');
  el.className = `modal${wide ? ' modal--wide' : ''}`;
  el.innerHTML = html`
    <div class="modal__backdrop" data-close></div>
    <div class="modal__dialog" role="dialog" aria-modal="true" aria-label="${esc(label || title || 'Окно')}" tabindex="-1">
      ${title || dismissible ? html`<div class="modal__head">
        <h2 class="modal__title">${title}</h2>
        ${dismissible ? `<button class="icon-btn modal__close" type="button" data-close aria-label="Закрыть">${icon('close')}</button>` : ''}
      </div>` : ''}
      <div class="modal__body">${body}</div>
      ${footer ? `<div class="modal__foot">${footer}</div>` : ''}
    </div>`;
  root.appendChild(el);
  openModals++;
  document.body.classList.add('is-locked');

  const dialog = el.querySelector('.modal__dialog');
  let closed = false;

  const close = (result) => {
    if (closed) return;
    closed = true;
    el.classList.add('is-closing');
    document.removeEventListener('keydown', onKey);
    setTimeout(() => {
      el.remove();
      openModals = Math.max(0, openModals - 1);
      if (!openModals) document.body.classList.remove('is-locked');
      if (previouslyFocused && previouslyFocused.focus) previouslyFocused.focus({ preventScroll: true });
      onClose?.(result);
    }, 240);
  };

  const onKey = (e) => {
    if (e.key === 'Escape' && dismissible) close();
    if (e.key === 'Tab') {
      const focusables = $$('a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])', dialog)
        .filter((n) => n.offsetParent !== null);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  };
  document.addEventListener('keydown', onKey);
  el.addEventListener('click', (e) => {
    const t = e.target.closest('[data-close]');
    if (t && (dismissible || t.classList.contains('modal__close'))) close();
  });

  requestAnimationFrame(() => {
    const auto = dialog.querySelector('[autofocus]') || dialog;
    auto.focus({ preventScroll: true });
  });
  const api = { el, dialog, close };
  onOpen?.(api);
  return api;
}

export function confirmDialog({ title, text, confirm = 'Подтвердить', cancel = 'Отмена', danger = false }) {
  return new Promise((resolve) => {
    let result = false;
    const m = openModal({
      title,
      body: `<p>${text}</p>`,
      footer: html`<button class="btn btn--ghost" type="button" data-act="cancel">${cancel}</button>
        <button class="btn ${danger ? 'btn--primary' : 'btn--gold'}" type="button" data-act="ok">${confirm}</button>`,
      onClose: () => resolve(result),
    });
    m.el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      result = b.dataset.act === 'ok';
      m.close();
    });
  });
}

/* ------------------------------- Появление при прокрутке -------------- */

let observer;
export function observeReveal(root = document) {
  const items = $$('[data-reveal]:not(.is-in)', root);
  if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-in'));
    return;
  }
  if (!observer) {
    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  }
  items.forEach((el) => observer.observe(el));
}

/* ------------------------------- Аккордеон ----------------------------- */

export function accordion(items, { open = 0 } = {}) {
  return html`<div class="accordion">${items.map((it, i) => html`
    <div class="acc${i === open ? ' is-open' : ''}" data-reveal style="--d:${Math.min(i, 6) * 60}ms">
      <button class="acc__btn" type="button" aria-expanded="${i === open}" data-acc>
        <span>${esc(it.q)}</span><span class="acc__icon" aria-hidden="true"></span>
      </button>
      <div class="acc__panel"><div><p>${esc(it.a)}</p></div></div>
    </div>`)}</div>`;
}

export function bindAccordion(root) {
  root.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-acc]');
    if (!btn || !root.contains(btn)) return;
    const acc = btn.closest('.acc');
    const isOpen = acc.classList.toggle('is-open');
    btn.setAttribute('aria-expanded', String(isOpen));
  });
}

/* ------------------------------- Состояния ----------------------------- */

export function emptyState({ iconName = 'film', title, text = '', action = '' }) {
  return html`<div class="empty">
    <div class="empty__icon">${icon(iconName)}</div>
    <h3>${title}</h3>
    ${text ? `<p>${text}</p>` : ''}
    ${action}
  </div>`;
}

export function errorState(err, { retry = true } = {}) {
  const notFound = err?.status === 404;
  return html`<div class="wrap section"><div class="empty">
    <div class="empty__icon">${icon(notFound ? 'film' : 'alert')}</div>
    <h3>${notFound ? 'Кадр не найден' : 'Плёнка оборвалась'}</h3>
    <p>${esc(err?.message || 'Что-то пошло не так. Попробуйте обновить страницу.')}</p>
    <div class="chips" style="justify-content:center">
      ${retry && !notFound ? `<button class="btn btn--primary" type="button" data-retry>${icon('reset')} Повторить</button>` : ''}
      <a class="btn btn--ghost" href="#/afisha">${icon('film')} В афишу</a>
    </div>
  </div></div>`;
}

export function skeletonCards(n = 8) {
  return html`<div class="film-grid">${Array.from({ length: n }, () => html`
    <div><div class="skeleton skeleton--poster"></div><div class="skeleton skeleton--line"></div><div class="skeleton skeleton--line w60"></div></div>`)}</div>`;
}

export function starsView(rating, max = 5) {
  const full = Math.round(rating);
  return `<span class="stars" aria-label="Оценка ${rating} из ${max}">${Array.from({ length: max }, (_, i) =>
    `<span class="${i < full ? '' : 'off'}">${icon('star')}</span>`).join('')}</span>`;
}

/** Показывает ошибки полей формы. */
export function showFieldErrors(form, errors = {}) {
  $$('.field', form).forEach((f) => f.classList.remove('is-invalid'));
  Object.entries(errors).forEach(([name, message]) => {
    const input = form.querySelector(`[name="${name}"]`);
    const field = input?.closest('.field');
    if (!field) return;
    field.classList.add('is-invalid');
    const box = field.querySelector('.field__error');
    if (box) box.textContent = message;
  });
  const first = form.querySelector('.field.is-invalid input, .field.is-invalid textarea, .field.is-invalid select');
  first?.focus();
}

export function clearFieldError(e) {
  const field = e.target.closest?.('.field');
  if (field) field.classList.remove('is-invalid');
}

export function field({ name, label, type = 'text', value = '', required = false, placeholder = '', autocomplete = '', hint = '', attrs = '', textarea = false }) {
  const id = `f-${name}-${Math.random().toString(36).slice(2, 7)}`;
  return html`<div class="field">
    <label class="field__label" for="${id}">${label}${required ? ' <b>*</b>' : ''}</label>
    ${textarea
      ? `<textarea class="textarea" id="${id}" name="${name}" placeholder="${esc(placeholder)}" ${required ? 'required' : ''} ${attrs}>${esc(value)}</textarea>`
      : `<input class="input" id="${id}" name="${name}" type="${type}" value="${esc(value)}" placeholder="${esc(placeholder)}" ${autocomplete ? `autocomplete="${autocomplete}"` : ''} ${required ? 'required' : ''} ${attrs}>`}
    ${hint ? `<span class="field__hint">${hint}</span>` : ''}
    <span class="field__error" role="alert"></span>
  </div>`;
}

export function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text).then(() => true, () => fallbackCopy(text));
  } catch (e) { /* noop */ }
  return Promise.resolve(fallbackCopy(text));
}
function fallbackCopy(text) {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch (e) { return false; }
}

export function setBusy(btn, busy) {
  if (!btn) return;
  btn.classList.toggle('is-loading', busy);
  btn.disabled = busy;
  btn.setAttribute('aria-busy', String(busy));
}

export { $, $$ };
