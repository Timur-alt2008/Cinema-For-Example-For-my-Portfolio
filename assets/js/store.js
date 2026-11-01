// Хранилище состояния приложения.
// Данные живут в localStorage (если он доступен) и в памяти — так сайт работает
// даже в приватном режиме браузера. Ключи с префиксом, чтобы не пересекаться с другими сайтами.

const PREFIX = 'cinema-example:';
const memory = new Map();
const listeners = new Map();

function readRaw(key) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? undefined : JSON.parse(raw);
  } catch (e) {
    return undefined;
  }
}

function writeRaw(key, value) {
  try {
    if (value === undefined) localStorage.removeItem(PREFIX + key);
    else localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch (e) {
    /* хранилище недоступно — остаёмся на памяти */
  }
}

export const store = {
  get(key, fallback) {
    if (!memory.has(key)) {
      const v = readRaw(key);
      if (v !== undefined) memory.set(key, v);
    }
    const value = memory.get(key);
    return value === undefined ? fallback : value;
  },

  set(key, value) {
    if (value === undefined) memory.delete(key);
    else memory.set(key, value);
    writeRaw(key, value);
    this.emit(key, value);
    return value;
  },

  update(key, fn, fallback) {
    return this.set(key, fn(this.get(key, fallback)));
  },

  remove(key) { this.set(key, undefined); },

  subscribe(key, fn) {
    if (!listeners.has(key)) listeners.set(key, new Set());
    listeners.get(key).add(fn);
    return () => listeners.get(key)?.delete(fn);
  },

  emit(key, value) {
    listeners.get(key)?.forEach((fn) => {
      try { fn(value); } catch (e) { console.error(e); }
    });
  },
};

// Синхронизация между вкладками
try {
  window.addEventListener('storage', (e) => {
    if (!e.key || !e.key.startsWith(PREFIX)) return;
    const key = e.key.slice(PREFIX.length);
    memory.delete(key);
    store.emit(key, store.get(key));
  });
} catch (e) { /* noop */ }

/* ---------------- Избранное и подписки на премьеры ---------------- */

export const favorites = {
  list: () => store.get('favorites', []),
  has: (id) => favorites.list().includes(id),
  toggle(id) {
    const list = favorites.list();
    const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
    store.set('favorites', next);
    return next.includes(id);
  },
};

export const premiereAlerts = {
  list: () => store.get('premiereAlerts', []),
  has: (id) => premiereAlerts.list().includes(id),
  toggle(id) {
    const list = premiereAlerts.list();
    const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
    store.set('premiereAlerts', next);
    return next.includes(id);
  },
};
