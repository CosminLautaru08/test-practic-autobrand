# Autobrand Workspace

Nx monorepo for a protected product catalog. The workspace combines an Angular frontend with a NestJS API, stores data in SQLite, imports products from a remote catalog, and converts uploaded PDF invoices into CSV.

## Workspace at a glance

| Project | Type | Purpose |
| --- | --- | --- |
| `web` | Angular app | Login flow and protected catalog dashboard |
| `@org/api` | NestJS app | Auth, products, scraper, scheduled jobs, invoice parsing |
| `web-e2e` | Playwright app | Frontend end-to-end test project |
| `@org/api-e2e` | Jest app | API end-to-end test project |

## Main features

- JWT-protected login with a seeded admin account
- Product catalog listing with pagination, search, sorting, edit, and delete
- Product persistence in `db.sqlite` through TypeORM and `better-sqlite3`
- Product scraping from `https://www.web-scraping.dev/products?category=consumables&page=1`
- Automatic exchange-rate normalization to RON using the ECB daily XML feed
- PDF invoice upload that extracts line items and returns a downloadable CSV
- Scheduled scraper execution every hour from 12:00 through 18:00 server time

## Tech stack

- Nx 22
- Angular 21
- NestJS 11
- TypeORM
- SQLite via `better-sqlite3`
- Playwright
- Jest

## Getting started

### Prerequisites

- Node.js 20+
- npm

### Install dependencies

```sh
npm install
```

### Start the backend

```sh
npm exec nx run @org/api:serve
```

The API starts on `http://localhost:3000/api`.

### Start the frontend

In a second terminal:

```sh
npm exec nx run web:serve
```

The frontend starts on `http://localhost:4200`.

## Default login

On first boot the API seeds an admin user automatically:

- Username: `admin`
- Password: `admin123`

These can be overridden with environment variables before starting the API:

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `JWT_SECRET`
- `PORT`

## Important local assumptions

- The frontend is hardcoded to call `http://localhost:3000/api`.
- The backend CORS policy currently allows `http://localhost:4200`.
- The SQLite database file is `db.sqlite` at the workspace root.
- TypeORM runs with `synchronize: true`, so schema changes are applied automatically at startup.

## Useful Nx commands

### Run apps

```sh
npm exec nx run @org/api:serve
npm exec nx run web:serve
```

### Build

```sh
npm exec nx run @org/api:build
npm exec nx run web:build
```

### Lint

```sh
npm exec nx run @org/api:lint
npm exec nx run web:lint
```

### Test

```sh
npm exec nx run @org/api:test
npm exec nx run web:test
```

### End-to-end

```sh
npm exec nx run @org/api-e2e:e2e
npm exec nx run web-e2e:e2e
```

### Inspect the workspace graph

```sh
npm exec nx graph
```

## API overview

All protected routes require a Bearer token obtained from `POST /api/auth/login`.

| Method | Route | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api` | No | Basic API sanity response |
| `POST` | `/api/auth/login` | No | Returns JWT access token |
| `GET` | `/api/auth/profile` | Yes | Returns the authenticated user profile |
| `GET` | `/api/product` | Yes | List products with paging, filtering, and sorting |
| `POST` | `/api/product` | Yes | Create a product |
| `GET` | `/api/product/:id` | Yes | Fetch one product |
| `PATCH` | `/api/product/:id` | Yes | Update a product |
| `DELETE` | `/api/product/:id` | Yes | Delete a product |
| `POST` | `/api/scraper` | Yes | Run the product scraper manually |
| `GET` | `/api/scheduled-tasks/test-cron` | Yes | Trigger the scheduled scraper handler manually |
| `POST` | `/api/invoice/upload` | Yes | Upload a PDF invoice and download CSV output |

### Product list query parameters

`GET /api/product` supports:

- `page`
- `limit`
- `name`
- `sortField`: `id`, `name`, `price`, `createdAt`
- `sortOrder`: `ASC`, `DESC`

## Feature notes

### Product catalog

- Product names are normalized with trimming and enforced as unique.
- Non-RON products require an exchange rate and also store a computed `priceRon`.
- The Angular dashboard currently supports review, edit, delete, search, and sort.

### Scraper

- The scraper logs into `web-scraping.dev` with the demo credentials baked into the service.
- It reads product listing pages, visits detail pages, extracts price and currency, converts the amount to RON, and upserts products by name.
- Exchange rates are cached in memory for one hour.

### Invoice processing

- Only PDF uploads are accepted.
- The backend parses invoice text with `pdf-parse`.
- Extracted rows are exported as CSV with: `productCode`, `productName`, `unitPrice`, `currency`, `quantity`.

## Current testing state

- API unit tests exist for product, scraper, and invoice services.
- `web-e2e` and `@org/api-e2e` are present, but their generated example specs still look like scaffold defaults and are not yet aligned with the current app behavior.

## Suggested development flow

1. Start `@org/api`.
2. Start `web`.
3. Sign in with the seeded admin account.
4. Review products in the dashboard.
5. Run `POST /api/scraper` if you want to populate or refresh catalog data.
6. Upload a PDF invoice from the UI to verify CSV export.
