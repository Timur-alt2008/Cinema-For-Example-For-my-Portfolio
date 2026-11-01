// Демонстрационный трейлер: анимированный тизер на основе кадра фильма.
// В реальном проекте здесь будет <video> или встроенный плеер — интерфейс openTrailer() не изменится.

import { html, esc } from '../lib/dom.js';
import { icon } from '../icons.js';
import { poster } from './poster.js';
import { openModal } from './ui.js';
import { duration } from '../lib/format.js';

function parseLen(s) {
  const [m, sec] = String(s).split(':').map(Number);
  return (m || 0) * 60 + (sec || 0);
}

export function trailerPlayer(film, { compact = false } = {}) {
  const total = parseLen(film.trailer.length);
  return html`
  <div class="player${compact ? ' player--compact' : ''}" data-player data-total="${total}">
    <div class="player__stage">
      <div class="player__art">${poster(film, { variant: 'wide', label: false })}</div>
      <div class="player__bars" aria-hidden="true"></div>
      <div class="player__beats" aria-live="off">
        ${film.trailer.beats.map((b, i) => `<p class="player__beat" data-beat="${i}">${esc(b)}</p>`)}
        <p class="player__beat player__beat--title" data-beat="${film.trailer.beats.length}">${esc(film.title)}<small>${film.status === 'soon' ? 'Скоро в кино' : 'Уже в кино'}</small></p>
      </div>
      <button class="player__big" type="button" data-play aria-label="Смотреть трейлер «${esc(film.title)}»">${icon('play')}</button>
    </div>
    <div class="player__bar">
      <button class="player__btn" type="button" data-play aria-label="Воспроизвести">${icon('play')}</button>
      <div class="player__track" data-seek role="slider" tabindex="0" aria-label="Перемотка" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="0"><span data-progress></span></div>
      <span class="player__time tnum" data-time>0:00 / ${film.trailer.length}</span>
      <button class="player__btn" type="button" data-mute aria-label="Звук">${icon('sound')}</button>
    </div>
    <p class="player__note">${icon('info')} Демо-режим: вместо видео — анимированный тизер. Хронометраж трейлера ${film.trailer.length}, фильм идёт ${duration(film.duration)}.</p>
  </div>`;
}

const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/** Подключает логику к разметке плеера. Возвращает функцию остановки. */
export function bindPlayer(root) {
  const el = root.matches?.('[data-player]') ? root : root.querySelector('[data-player]');
  if (!el) return () => {};
  const total = Number(el.dataset.total) || 120;
  const beats = Array.from(el.querySelectorAll('[data-beat]'));
  const progress = el.querySelector('[data-progress]');
  const timeEl = el.querySelector('[data-time]');
  const track = el.querySelector('[data-seek]');
  const playBtns = el.querySelectorAll('[data-play]');
  let t = 0;
  let playing = false;
  let raf = 0;
  let last = 0;
  const SPEED = 8; // тизер проигрывается быстрее реального хронометража

  const render = () => {
    const ratio = Math.min(1, t / total);
    progress.style.width = `${ratio * 100}%`;
    timeEl.textContent = `${fmt(t)} / ${fmt(total)}`;
    track.setAttribute('aria-valuenow', String(Math.round(t)));
    const idx = Math.min(beats.length - 1, Math.floor(ratio * beats.length));
    beats.forEach((b, i) => b.classList.toggle('is-on', playing || t > 0 ? i === idx : false));
    el.style.setProperty('--zoom', String(1 + ratio * 0.12));
  };
  const loop = (now) => {
    if (!playing) return;
    const dt = (now - last) / 1000;
    last = now;
    t += dt * SPEED;
    if (t >= total) { t = total; setPlaying(false); el.classList.add('is-ended'); }
    render();
    raf = requestAnimationFrame(loop);
  };
  const setPlaying = (v) => {
    playing = v;
    el.classList.toggle('is-playing', v);
    playBtns.forEach((b) => { if (b.classList.contains('player__btn')) { b.innerHTML = icon(v ? 'pause' : 'play'); b.setAttribute('aria-label', v ? 'Пауза' : 'Воспроизвести'); } });
    if (v) {
      if (t >= total) t = 0;
      el.classList.remove('is-ended');
      last = performance.now();
      raf = requestAnimationFrame(loop);
    } else cancelAnimationFrame(raf);
  };
  playBtns.forEach((b) => b.addEventListener('click', () => setPlaying(!playing)));
  el.querySelector('[data-mute]')?.addEventListener('click', (e) => {
    const btn = e.currentTarget;
    const muted = btn.dataset.muted !== '1';
    btn.dataset.muted = muted ? '1' : '0';
    btn.innerHTML = icon(muted ? 'mute' : 'sound');
    btn.setAttribute('aria-label', muted ? 'Включить звук' : 'Выключить звук');
  });
  const seek = (clientX) => {
    const rect = track.getBoundingClientRect();
    t = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) * total;
    render();
  };
  track.addEventListener('click', (e) => seek(e.clientX));
  track.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { t = Math.min(total, t + 5); render(); }
    if (e.key === 'ArrowLeft') { t = Math.max(0, t - 5); render(); }
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setPlaying(!playing); }
  });
  render();
  return () => { playing = false; cancelAnimationFrame(raf); };
}

export function openTrailer(film) {
  let stop = () => {};
  openModal({
    title: `${esc(film.title)} <span class="muted italic" style="font-size:.6em">— трейлер</span>`,
    label: `Трейлер фильма ${film.title}`,
    wide: true,
    body: trailerPlayer(film),
    onOpen: ({ dialog }) => {
      stop = bindPlayer(dialog);
      setTimeout(() => dialog.querySelector('.player__big')?.click(), 350);
    },
    onClose: () => stop(),
  });
}
