// Auditoriums and seating plans.
// rows: { seats, type: 'std' | 'vip', aisles: [seat numbers followed by an aisle], offset }

export const HALLS = [
  {
    id: 'h1',
    number: 1,
    name: 'Nosferatu',
    kind: 'Standard',
    formats: ['2D', '3D'],
    vipExtra: 120,
    description: 'A classic auditorium with deep burgundy seats and soft amber sconces. The back row is all love seats for two.',
    equipment: ['4K laser projector', 'Dolby Atmos 7.1.4', '16 × 7 m screen', 'Passive 3D', 'Love seats in the back row'],
    tone: '#3a0c12',
    rows: [
      ...Array.from({ length: 9 }, () => ({ seats: 14, type: 'std', aisles: [3, 11] })),
      { seats: 12, type: 'vip', aisles: [2, 6, 10], offset: 1, pairs: true },
    ],
  },
  {
    id: 'h2',
    number: 2,
    name: 'Metropolis',
    kind: 'IMAX',
    formats: ['IMAX'],
    vipExtra: 140,
    description: 'The biggest screen in the city and sound you feel on your skin. The gold seats in the middle of row 7 are the perfect viewing spot.',
    equipment: ['IMAX with Laser', '26 × 14 m screen', '12-channel IMAX sound', 'Reclining seat backs', 'Row 7 centre — the “Sweet Spot”'],
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
    name: 'Obscura',
    kind: 'VIP',
    formats: ['VIP'],
    vipExtra: 0,
    description: 'An intimate room for 40 guests: heated leather recliners, blankets and at-seat service at the touch of a button during the film.',
    equipment: ['Heated recliners', 'Call-a-waiter button', 'Dolby Atmos', '4K laser projector', 'Blanket and welcome drink'],
    tone: '#2a2014',
    rows: Array.from({ length: 5 }, () => ({ seats: 8, type: 'vip', aisles: [4] })),
  },
  {
    id: 'h4',
    number: 4,
    name: 'Frame 13',
    kind: 'Standard',
    formats: ['2D'],
    vipExtra: 100,
    description: 'A cosy small room for late-night shows and retrospectives. Home of the midnight screenings and private premieres.',
    equipment: ['Barco 4K projector', '7.1 sound', '12 × 5 m screen', 'Midnight screenings', 'VIP back row'],
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

/** Seat type, including the IMAX “sweet spot”. */
export function seatType(row, seatNumber) {
  if (row.type === 'vip') return 'vip';
  if (row.vipRange && seatNumber >= row.vipRange[0] && seatNumber <= row.vipRange[1]) return 'vip';
  return 'std';
}

export const FORMAT_INFO = {
  '2D': { label: '2D', base: 180, text: 'Classic screening' },
  '3D': { label: '3D', base: 220, text: 'Glasses included' },
  IMAX: { label: 'IMAX', base: 290, text: '26-metre screen, IMAX sound' },
  VIP: { label: 'VIP', base: 450, text: 'Recliners, blankets, at-seat service' },
};
