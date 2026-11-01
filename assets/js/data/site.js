// Site content: contacts, promotions, reviews, FAQ, history. All data is fictional.

export const CINEMA = {
  name: 'Cinema Example',
  city: 'Kyiv',
  address: '13 Lumière Boulevard',
  addressFull: '13 Lumière Boulevard, Kyiv — Shadow Gallery mall, 3rd floor',
  phone: '+380 44 290 13 13',
  phoneHref: '+380442901313',
  email: 'hello@cinema-example.demo',
  hours: 'Open daily 9:30 am – 2:30 am',
  boxOffice: 'Box office: 9:00 am until the last show',
  socials: [
    { id: 'instagram', label: 'Instagram', handle: '@cinema.example' },
    { id: 'telegram', label: 'Telegram', handle: '@cinema_example' },
    { id: 'youtube', label: 'YouTube', handle: 'Cinema Example' },
    { id: 'tiktok', label: 'TikTok', handle: '@cinema.example' },
  ],
};

export const PROMOS = [
  {
    id: 'student',
    icon: 'cap',
    title: 'Student Tuesday',
    discount: '−30%',
    code: 'STUDENT30',
    percent: 30,
    text: '30% off every Tuesday show — just show your student ID at the door.',
    terms: ['Tuesdays only', 'Not valid in the Obscura VIP room', 'One ticket per student ID'],
    tone: 'red',
    category: 'Students',
  },
  {
    id: 'family',
    icon: 'users',
    title: 'Family Ticket',
    discount: '−20%',
    code: 'FAMILY4',
    percent: 20,
    minSeats: 3,
    text: 'Book three or more tickets for a daytime show before 5 pm and get 20% off the whole order.',
    terms: ['3+ tickets in one order', 'Shows before 5 pm', 'Valid any day'],
    tone: 'gold',
    category: 'Families',
  },
  {
    id: 'midnight',
    icon: 'moon',
    title: 'Midnight Screening',
    discount: '₴149',
    code: 'MIDNIGHT',
    percent: 25,
    text: 'Horror and thrillers after 10:30 pm in Frame 13 — at a special price, with a themed mocktail at the bar.',
    terms: ['Shows after 10:30 pm', '18+ only', 'A free virgin “Bloody Mary” at the bar'],
    tone: 'red',
    category: 'Special shows',
  },
  {
    id: 'morning',
    icon: 'clock',
    title: 'Early Bird',
    discount: '−20%',
    code: null,
    percent: 20,
    text: 'Every show before noon is automatically 20% cheaper. No codes, no strings attached.',
    terms: ['Shows before 12 pm', 'Applied automatically', 'All rooms and formats'],
    tone: 'soft',
    category: 'Every day',
  },
  {
    id: 'birthday',
    icon: 'gift',
    title: 'Birthday at the Movies',
    discount: 'Gift',
    code: 'BIRTHDAY',
    percent: 15,
    text: '15% off for a week either side of your birthday — plus a large popcorn for the birthday guest.',
    terms: ['±7 days from your birthday', 'ID required', 'Popcorn collected at the bar'],
    tone: 'gold',
    category: 'Occasions',
  },
  {
    id: 'vipdate',
    icon: 'glass',
    title: 'Date Night in Obscura',
    discount: '2 for 1.5',
    code: 'VIPDATE',
    percent: 25,
    minSeats: 2,
    text: 'Two seats in the VIP room with 25% off, a blanket and a dessert to share.',
    terms: ['VIP room only', '2+ tickets', 'Weekdays before 7 pm'],
    tone: 'soft',
    category: 'Couples',
  },
];

export const PROMO_CODES = Object.fromEntries(
  PROMOS.filter((p) => p.code).map((p) => [p.code, p])
);

export const OFFERS = [
  { icon: 'cap', title: 'Student Tuesday', text: '30% off every show', href: '#/promos' },
  { icon: 'moon', title: 'Midnight horror', text: 'Fridays & Saturdays, 11:40 pm', href: '#/afisha?collection=midnight' },
  { icon: 'crown', title: 'Obscura VIP room', text: 'Recliners and blankets', href: '#/halls' },
];

export const REVIEWS = [
  { name: 'Alina K.', film: 'Mirror Hall', rating: 5, text: 'Saw it in IMAX — during the mirror scene the whole room stopped breathing. The sound is so good you can hear the glass cracking behind you.' },
  { name: 'Max R.', film: 'The Quiet House', rating: 5, text: 'The best cinema for horror: it’s genuinely dark, nobody lights up a phone, and the seats don’t creak in the silent bits.' },
  { name: 'Olga T.', film: 'The Red Thread', rating: 4, text: 'We booked the Obscura VIP room for our anniversary. Blankets, warm seats and dessert during the film — very grown-up.' },
  { name: 'Dennis V.', film: 'The Woods Are Awake', rating: 5, text: 'The midnight show in Frame 13 is a genre of its own. Afterwards the bartender poured a virgin Bloody Mary — the mood lasted all the way home.' },
  { name: 'Irene L.', film: 'The Lamplighter', rating: 5, text: 'Went with my son in the afternoon. Love that kids’ shows never overlap with the scary films — the lobby stays calm.' },
];

export const FAQ = [
  { q: 'How do I get my ticket after buying?', a: 'Your e-ticket appears straight after payment: download it, save it as a PDF or show it on your phone. A copy is kept in your account under “My tickets”.' },
  { q: 'Can I return or exchange a ticket?', a: 'Yes — up to 60 minutes before the show, in your account or at the box office. The money is refunded to your card within 3–5 business days.' },
  { q: 'What’s the difference between booking and buying?', a: 'A booking holds your seats without payment. Pay for it at the box office at least 30 minutes before the show, otherwise the seats go back on sale.' },
  { q: 'Who can see 18+ films?', a: 'Only guests aged 18 and over — staff may ask for ID at the door. Children under 16 can see 16+ films only with a parent.' },
  { q: 'Is there parking?', a: 'The Shadow Gallery underground car park has 400 spaces. Show your ticket at the parking desk and the first 3 hours are free.' },
  { q: 'Can I bring my own food?', a: 'Only drinks in sealed containers are allowed in the rooms. Popcorn, nachos and hot drinks are waiting at our Intermission bar on the 3rd floor.' },
  { q: 'What is the “Sweet Spot” in the IMAX room?', a: 'The centre seats of row 7, where picture and sound come together perfectly. They are marked in gold on the seating plan and cost a little more.' },
  { q: 'Is this a real cinema?', a: 'No. Cinema Example is a portfolio demo project. All films, names and contacts are fictional, and payments run in test mode — no money is ever charged.' },
];

export const HISTORY = [
  { year: '1931', title: 'The Lumière Cinematograph', text: 'A small 120-seat picture house opens on the site of today’s boulevard, with a live pianist and a velvet curtain.' },
  { year: '1974', title: 'Late-night shows', text: 'The cinema becomes famous for its midnight horror screenings — the queue for tickets stretches round the block.' },
  { year: '2009', title: 'Silence and restoration', text: 'The building closes for a long renovation. The original lobby plasterwork and brass seat numbers are preserved.' },
  { year: '2026', title: 'Cinema Example', text: 'The cinema reopens: four rooms, laser projection, IMAX and the intimate Obscura VIP room.' },
];

export const ADVANTAGES = [
  { icon: 'moon', title: 'Real darkness', text: 'Black walls, dimmed exit signs and a strict no-phone-light rule during the show.' },
  { icon: 'sound', title: 'Sound you can feel', text: 'Dolby Atmos and IMAX — every rustle behind you comes from exactly where it should.' },
  { icon: 'seat', title: 'Seats that never creak', text: 'Generous legroom, soft seats with cup holders and love seats in the back rows.' },
  { icon: 'crown', title: 'Obscura VIP room', text: 'Forty heated recliners, blankets and at-seat service while the film is playing.' },
  { icon: 'glass', title: 'Intermission bar', text: 'Signature mocktails inspired by the films and popcorn with truffle salt.' },
  { icon: 'ticket', title: 'Tickets in a minute', text: 'Pick seats on the plan, get an e-ticket on your phone and skip the queue.' },
];
