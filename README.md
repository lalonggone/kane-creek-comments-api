# Kane Creek Comments: API

Express + SQLite (via knex) API that serves the public survey responses for
[kanecreekwatch.org](https://kanecreekwatch.org). It backs the
[comments front-end](../kane-creek-comments-fe).

The `responses` table holds PII (email, phone, address) and internal-only flags.
The API **never** exposes those: every public query selects a fixed column
allowlist, and the `anonymous` flag is handled fail-closed (only an exact `Yes`
reveals a commenter's name; anything else is shown as "Anonymous"). See the
comments in `server.js` before changing any query.

## Setup

```sh
npm install
cp .env.example .env   # then edit the values (see below)
```

### Environment (`.env`)

| Var               | Purpose                                                        |
| ----------------- | ------------------------------------------------------------- |
| `NODE_ENV`        | `development` or `production`                                  |
| `SQLITE_FILE`     | Path to the SQLite DB file                                     |
| `PORT`            | Listen port (default `10000`)                                  |
| `HOST`            | Bind address (default `127.0.0.1`; nginx proxies in over TLS) |
| `ALLOWED_ORIGINS` | Comma-separated CORS allowlist of site origins                |

Never commit the real `.env` (it is gitignored). `.env.example` is the template.

## Building the database

SQLite is the engine everywhere (local and VPS). The source of truth is a
Postgres custom-format dump (`*.dump`); the SQLite file is derived from it, so it
is **not** committed (it contains PII). Rebuild it whenever a fresher dump
arrives:

```sh
DUMP_FILE=~/kc-responses-backup-YYYY-MM-DD.dump \
SQLITE_FILE=./data/kane_creek.sqlite \
npm run build:sqlite
```

This drops and rebuilds the `responses` table from the migration schema, loads
the dump's rows, and prints how many will be public vs withheld. It needs
`pg_restore` on `PATH` (only to read the dump; no Postgres server required).

To run migrations against an existing DB without reloading data:

```sh
npm run migrate
```

## Running

```sh
npm start        # node server.js
npm run lint
```

## Endpoints

| Method | Path             | Description                                                                                                                                          |
| ------ | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/`              | Health/welcome string                                                                                                                               |
| GET    | `/responses`     | Public paginated feed. Query: `q`, `residency` (`all`/`residents`), `page`, `limit` (default 12, max 100). Returns `{ results, total, page, limit }`. |
| GET    | `/responses/:id` | Single public response by id                                                                                                                        |
| GET    | `/stats`         | Aggregate counts (`total`, `named`, `anonymous`, `byResidency`, `byConcernLevel`); safe, non-identifying totals                                     |

## Deployment

Runs on the VPS bound to loopback; nginx terminates TLS and reverse-proxies to
`PORT`. Set `HOST=0.0.0.0` only to expose the port directly.
