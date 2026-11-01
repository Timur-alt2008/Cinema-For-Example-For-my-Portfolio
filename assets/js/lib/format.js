// Date, price and duration formatting (English).

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const pad = (n) => String(n).padStart(2, '0');

/** Date → 'YYYY-MM-DD' in local time. */
export function isoDate(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 'YYYY-MM-DD' → Date (local midnight). */
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

/** 'November 13', 'Friday, November 13', 'November 13, 2026' */
export function formatDate(iso, { weekday = false, year = false } = {}) {
  const d = typeof iso === 'string' ? parseISO(iso) : iso;
  if (!d) return '';
  let s = `${MONTHS[d.getMonth()]} ${d.getDate()}`;
  if (year) s += `, ${d.getFullYear()}`;
  if (weekday) s = `${WEEKDAYS[d.getDay()]}, ${s}`;
  return s;
}

export function formatDateShort(iso) {
  const d = typeof iso === 'string' ? parseISO(iso) : iso;
  if (!d) return '';
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()}`;
}

export function dayLabel(iso) {
  const diff = dayDiff(iso);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return WEEKDAYS_SHORT[parseISO(iso).getDay()];
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
  if (diff === 0) return 'today';
  if (diff === 1) return 'tomorrow';
  if (diff > 1) return `in ${diff} days`;
  return formatDate(iso);
}

/** 112 → '1h 52m' */
export function duration(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
}

/** 'HHMM' or minutes → 'HH:MM' */
export function time(value) {
  if (typeof value === 'number') return `${pad(Math.floor(value / 60) % 24)}:${pad(value % 60)}`;
  const s = String(value).padStart(4, '0');
  return `${s.slice(0, 2)}:${s.slice(2, 4)}`;
}

export function price(value) {
  const n = Math.round(Number(value) || 0);
  return `₴${n.toLocaleString('en-US')}`;
}

/** plural(2, ['seat', 'seats']) → 'seats' */
export function plural(n, forms) {
  return Math.abs(n) === 1 ? forms[0] : forms[forms.length - 1];
}

export function seatsWord(n) { return `${n} ${plural(n, ['seat', 'seats'])}`; }
export function ticketsWord(n) { return `${n} ${plural(n, ['ticket', 'tickets'])}`; }

export function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0] || '').join('').toUpperCase() || 'G';
}

export function formatPhone(raw) {
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('380')) {
    return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10)}`;
  }
  return raw;
}
