# Cinema Example

A demo website for a premium cinema with a psychological-thriller and horror aesthetic.
Built as a portfolio project: all films, names, contacts and reviews are fictional, and payments run in test mode.

**Live site:** https://timur-alt2008.github.io/Cinema-For-Example-For-my-Portfolio/

## Features

- **Home** — a cinematic hero with rotating films of the week, current offers, popular films, next showtimes, premieres, collections, reviews, FAQ and newsletter signup.
- **Films** — 17 films with working filters (now showing, coming soon, 7 genres), search by title/director/cast, and sorting by popularity, rating and premiere date.
- **Film page** — poster, trailer (animated teaser), synopsis, director, cast, formats, showtimes by day, reviews with a form, similar films.
- **Showtimes** — 8 days ahead, filters by format (2D, 3D, IMAX, VIP), time of day and room, prices and sales status.
- **Interactive seat selection** — seating plan with screen, rows and numbers, available/taken/selected/VIP seats, prices, up to 8 seats, a 10-minute hold, zoom controls and a dedicated mobile layout.
- **Checkout** — buy or book, form validation, promo codes with real conditions, test payment.
- **E-ticket** — QR code, order number, download (SVG), save as PDF, add to calendar (.ics).
- **Account** — register and sign in, upcoming shows, order history, refunds, favourites, premiere alerts, personal details.
- **About, Rooms, Offers, Contact (map and feedback form), FAQ and a 404 page.**

## Tech

Plain HTML, CSS and JavaScript (ES modules) — no build step and no dependencies, so the site runs on any static host, including GitHub Pages.

```
index.html
assets/
  css/        base · layout · components · pages · booking · print
  js/
    app.js            entry point and routes
    router.js         hash router (#/film/f04)
    store.js          state: localStorage + memory
    services/
      api.js          demo API: films, showtimes, orders, users, reviews
      schedule.js     generates showtimes, prices and seat occupancy
    data/             films, rooms, offers, contacts, FAQ
    components/       SVG posters, cards, ticket, player, interiors, header/footer, UI
    pages/            site pages
```

### Connecting a real backend

Every page gets its data only through `assets/js/services/api.js`. The functions are already async and return
server-shaped data — replace their bodies with `fetch()` calls to your API and nothing else needs to change.
The payment step (`createOrder`) is ready for a real payment provider; for now it marks orders with `payment.test = true`.

## Run locally

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Promo codes to try

`FAMILY4` (3+ seats, shows before 5 pm) · `STUDENT30` (Tuesdays) · `MIDNIGHT` (after 10:30 pm) · `VIPDATE` (VIP room, 2+ seats) · `BIRTHDAY`
