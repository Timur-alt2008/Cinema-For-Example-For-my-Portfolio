// Hash-based router (#/film/f01). Works on any static host, including
// GitHub Pages: reloading a page never leads to a 404.

import { createScope } from './lib/dom.js';

let routes = [];
let hooks = {};
let current = null;
let renderToken = 0;

export function parseHash(hash = location.hash) {
  const raw = hash.replace(/^#/, '') || '/';
  const [pathPart, queryPart = ''] = raw.split('?');
  const path = ('/' + pathPart.replace(/^\/+/, '')).replace(/\/+$/, '') || '/';
  const query = Object.fromEntries(new URLSearchParams(queryPart));
  return { path, query, raw };
}

function match(path) {
  for (const route of routes) {
    if (route.path === '*') continue;
    const names = [];
    const re = new RegExp('^' + route.path.replace(/:([a-zA-Z]+)/g, (_, n) => { names.push(n); return '([^/]+)'; }) + '$');
    const m = re.exec(path);
    if (m) {
      const params = {};
      names.forEach((n, i) => { params[n] = decodeURIComponent(m[i + 1]); });
      return { route, params };
    }
  }
  return null;
}

export function navigate(path, { replace = false } = {}) {
  const target = '#' + (path.startsWith('/') ? path : '/' + path);
  if (replace) {
    history.replaceState(null, '', target);
    handle();
  } else if (location.hash === target) {
    handle();
  } else {
    location.hash = target;
  }
}

/** Updates query params without re-rendering the page (for filters). */
export function replaceQuery(params) {
  const { path } = parseHash();
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '' && v !== false) qs.set(k, v);
  });
  const s = qs.toString();
  history.replaceState(null, '', `#${path}${s ? `?${s}` : ''}`);
  if (current) current.query = Object.fromEntries(qs);
}

export const currentRoute = () => current;

async function handle() {
  const token = ++renderToken;
  const { path, query } = parseHash();
  const found = match(path) || { route: routes.find((r) => r.path === '*'), params: {} };
  const { route, params } = found;

  if (route.guard) {
    const redirect = route.guard({ params, query });
    if (redirect) { navigate(redirect, { replace: true }); return; }
  }

  const samePage = current && current.route === route && JSON.stringify(current.params) === JSON.stringify(params);
  current?.scope?.dispose();
  const scope = createScope();
  current = { route, params, query, path, scope };

  hooks.before?.({ route, params, query, samePage });
  try {
    await route.render({ params, query, scope, isCurrent: () => token === renderToken });
  } catch (err) {
    console.error(err);
    hooks.error?.(err, { route, params, query, scope });
  }
  if (token !== renderToken) return;
  hooks.after?.({ route, params, query, samePage });
}

export function startRouter(routeTable, routeHooks = {}) {
  routes = routeTable;
  hooks = routeHooks;
  window.addEventListener('hashchange', handle);
  handle();
}

export function refresh() { handle(); }
