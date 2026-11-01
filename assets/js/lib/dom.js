// Небольшие помощники для работы с DOM и шаблонами.

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Экранирует пользовательские данные перед вставкой в HTML. */
export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ESC[c]);
}

/**
 * Шаблонная строка для разметки. Массивы склеиваются, null/undefined/false пропускаются.
 * ВАЖНО: значения не экранируются автоматически — пользовательский ввод оборачивайте в esc().
 */
export function html(strings, ...values) {
  let out = '';
  strings.forEach((str, i) => {
    out += str;
    if (i < values.length) {
      const v = values[i];
      if (Array.isArray(v)) out += v.join('');
      else if (v !== null && v !== undefined && v !== false) out += v;
    }
  });
  return out;
}

/** Делегирование событий: on(root, 'click', '[data-x]', handler) */
export function on(root, type, selector, handler, options) {
  const listener = (event) => {
    const target = event.target instanceof Element ? event.target.closest(selector) : null;
    if (target && root.contains(target)) handler(event, target);
  };
  root.addEventListener(type, listener, options);
  return () => root.removeEventListener(type, listener, options);
}

export function debounce(fn, wait = 200) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Подписки, которые нужно снять при уходе со страницы. */
export function createScope() {
  const cleanups = [];
  return {
    add(fn) { if (typeof fn === 'function') cleanups.push(fn); return fn; },
    on(target, type, fn, opts) {
      target.addEventListener(type, fn, opts);
      cleanups.push(() => target.removeEventListener(type, fn, opts));
    },
    interval(fn, ms) { const id = setInterval(fn, ms); cleanups.push(() => clearInterval(id)); return id; },
    timeout(fn, ms) { const id = setTimeout(fn, ms); cleanups.push(() => clearTimeout(id)); return id; },
    dispose() { while (cleanups.length) { try { cleanups.pop()(); } catch (e) { /* noop */ } } },
  };
}

export const prefersReducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
