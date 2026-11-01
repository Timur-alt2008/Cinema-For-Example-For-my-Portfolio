// Форматирование дат, цен и длительности на русском языке.

const WEEKDAYS = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
const WEEKDAYS_SHORT = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

const pad = (n) => String(n).padStart(2, '0');

/** Дата → 'YYYY-MM-DD' в локальном времени. */
export function isoDate(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 'YYYY-MM-DD' → Date (полночь, локальное время). */
export function parseISO(iso) {
  const [y, m, d] = String(iso).split('-').map(Number);
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function addDays(date, days) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() + days);
  return d;
}

export function todayISO() { return isoDate(new Date()); }

export function dayDiff(iso, base = new Date()) {
  const a = parseISO(iso);
  const b = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  if (!a) return NaN;
  return Math.round((a - b) / 86400000);
}

export function formatDate(iso, { weekday = false, year = false } = {}) {
  const d = typeof iso === 'string' ? parseISO(iso) : iso;
  if (!d) return '';
  let s = `${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`;
  if (year) s += ` ${d.getFullYear()}`;
  if (weekday) s += `, ${WEEKDAYS[d.getDay()]}`;
  return s;
}

export function formatDateShort(iso) {
  const d = typeof iso === 'string' ? parseISO(iso) : iso;
  if (!d) return '';
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

export function dayLabel(iso) {
  const diff = dayDiff(iso);
  if (diff === 0) return 'Сегодня';
  if (diff === 1) return 'Завтра';
  const d = parseISO(iso);
  return WEEKDAYS_SHORT[d.getDay()];
}

export function dayParts(iso) {
  const d = parseISO(iso);
  return {
    wd: dayLabel(iso),
    num: d.getDate(),
    mon: MONTHS_SHORT[d.getMonth()],
    weekend: d.getDay() === 0 || d.getDay() === 6,
  };
}

export function relativeDays(iso) {
  const diff = dayDiff(iso);
  if (diff === 0) return 'сегодня';
  if (diff === 1) return 'завтра';
  if (diff > 1) return `через ${diff} ${plural(diff, ['день', 'дня', 'дней'])}`;
  return formatDate(iso);
}

/** 112 → '1 ч 52 мин' */
export function duration(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${m} мин`;
  return m ? `${h} ч ${m} мин` : `${h} ч`;
}

/** 'HHMM' или минуты → 'HH:MM' */
export function time(value) {
  if (typeof value === 'number') return `${pad(Math.floor(value / 60) % 24)}:${pad(value % 60)}`;
  const s = String(value).padStart(4, '0');
  return `${s.slice(0, 2)}:${s.slice(2, 4)}`;
}

export function price(value) {
  const n = Math.round(Number(value) || 0);
  return `${n.toLocaleString('ru-RU').replace(/ /g, ' ')} ₴`;
}

export function plural(n, forms) {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return forms[2];
  if (b > 1 && b < 5) return forms[1];
  if (b === 1) return forms[0];
  return forms[2];
}

export function seatsWord(n) { return `${n} ${plural(n, ['место', 'места', 'мест'])}`; }
export function ticketsWord(n) { return `${n} ${plural(n, ['билет', 'билета', 'билетов'])}`; }

export function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0] || '').join('').toUpperCase() || 'Г';
}

export function formatPhone(raw) {
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('380')) {
    return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10)}`;
  }
  return raw;
}
