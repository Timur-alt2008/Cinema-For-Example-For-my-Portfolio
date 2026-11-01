// Залы кинотеатра и схемы рассадки.
// rows: { seats, type: 'std' | 'vip', aisles: [номера кресел, после которых проход], offset }

export const HALLS = [
  {
    id: 'h1',
    number: 1,
    name: 'Носферату',
    kind: 'Стандарт',
    formats: ['2D', '3D'],
    vipExtra: 120,
    description: 'Классический зал с тёмно-бордовыми креслами и мягким янтарным светом бра. Последний ряд — диваны для двоих.',
    equipment: ['Лазерный проектор 4K', 'Dolby Atmos 7.1.4', 'Экран 16 × 7 м', 'Пассивное 3D', 'Диваны для двоих в последнем ряду'],
    tone: '#3a0c12',
    rows: [
      ...Array.from({ length: 9 }, () => ({ seats: 14, type: 'std', aisles: [3, 11] })),
      { seats: 12, type: 'vip', aisles: [2, 6, 10], offset: 1, pairs: true },
    ],
  },
  {
    id: 'h2',
    number: 2,
    name: 'Метрополис',
    kind: 'IMAX',
    formats: ['IMAX'],
    vipExtra: 140,
    description: 'Самый большой экран города и звук, который ощущается кожей. Золотые кресла в центре седьмого ряда — точка идеального обзора.',
    equipment: ['IMAX with Laser', 'Экран 26 × 14 м', '12-канальный звук IMAX', 'Кресла с наклоном спинки', 'Центр ряда 7 — «Точка обзора»'],
    tone: '#1b1414',
    rows: [
      { seats: 16, type: 'std', aisles: [4, 12], offset: 2 },
      { seats: 16, type: 'std', aisles: [4, 12], offset: 2 },
      { seats: 18, type: 'std', aisles: [4, 14], offset: 1 },
      { seats: 18, type: 'std', aisles: [4, 14], offset: 1 },
      { seats: 18, type: 'std', aisles: [4, 14], offset: 1 },
      { seats: 20, type: 'std', aisles: [5, 15] },
      { seats: 20, type: 'std', aisles: [5, 15], vipRange: [7, 14] },
      { seats: 20, type: 'std', aisles: [5, 15] },
      { seats: 20, type: 'std', aisles: [5, 15] },
      { seats: 20, type: 'std', aisles: [5, 15] },
      { seats: 20, type: 'std', aisles: [5, 15] },
    ],
  },
  {
    id: 'h3',
    number: 3,
    name: 'Обскура',
    kind: 'VIP',
    formats: ['VIP'],
    vipExtra: 0,
    description: 'Камерный зал на 40 гостей: кожаные кресла-реклайнеры с подогревом, пледы и обслуживание по кнопке прямо во время сеанса.',
    equipment: ['Кресла-реклайнеры с подогревом', 'Кнопка вызова официанта', 'Dolby Atmos', 'Лазерный проектор 4K', 'Плед и welcome-напиток'],
    tone: '#2a2014',
    rows: Array.from({ length: 5 }, () => ({ seats: 8, type: 'vip', aisles: [4] })),
  },
  {
    id: 'h4',
    number: 4,
    name: 'Кадр 13',
    kind: 'Стандарт',
    formats: ['2D'],
    vipExtra: 100,
    description: 'Уютный малый зал для ночных показов и ретроспектив. Здесь проходят полуночные сеансы и закрытые премьеры.',
    equipment: ['Проектор 4K Barco', 'Звук 7.1', 'Экран 12 × 5 м', 'Полуночные сеансы', 'Последний ряд — VIP'],
    tone: '#140c0c',
    rows: [
      ...Array.from({ length: 8 }, () => ({ seats: 12, type: 'std', aisles: [2, 10] })),
      { seats: 10, type: 'vip', aisles: [5], offset: 1 },
    ],
  },
];

export const getHallById = (id) => HALLS.find((h) => h.id === id) || null;

export function hallCapacity(hall) {
  return hall.rows.reduce((sum, r) => sum + r.seats, 0);
}

/** Тип кресла с учётом «золотой зоны» в IMAX. */
export function seatType(row, seatNumber) {
  if (row.type === 'vip') return 'vip';
  if (row.vipRange && seatNumber >= row.vipRange[0] && seatNumber <= row.vipRange[1]) return 'vip';
  return 'std';
}

export const FORMAT_INFO = {
  '2D': { label: '2D', base: 180, text: 'Классический показ' },
  '3D': { label: '3D', base: 220, text: 'Очки входят в стоимость' },
  IMAX: { label: 'IMAX', base: 290, text: 'Экран 26 метров, звук IMAX' },
  VIP: { label: 'VIP', base: 450, text: 'Реклайнеры, плед, обслуживание' },
};
