# E2E (Playwright)

Minimal parity smoke against the local Next app.

## Setup

```bash
npm install
npx playwright install chromium   # once, if browsers are missing
```

## Run

With an already running app (`npm run dev` or `npm run start` on port 3000):

```bash
npm run test:e2e
```

Or let Playwright start the server (default: `npm run start` — needs a prior `npm run build`):

```bash
npm run build
npm run test:e2e
```

For local iteration without a production build:

```bash
PLAYWRIGHT_WEB_SERVER="npm run dev" npm run test:e2e
```

Credentials used by the smoke: `owner@mitzvah.pro` / `mitzvah` (or password-only admin `mitzvah`).

Unit tests stay on `npm test`. E2E does **not** require BarBeni / `BAR_BENI_ORIGIN`.
