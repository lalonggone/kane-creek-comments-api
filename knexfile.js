import dotenv from 'dotenv';
dotenv.config();

// SQLite everywhere — the same engine runs locally, on the VPS, and on any
// self-hosted box. The DB file path is env-driven:
//   SQLITE_FILE=/path/to/kane_creek.sqlite
const base = {
  client: 'better-sqlite3',
  connection: {
    filename: process.env.SQLITE_FILE || './data/kane_creek.sqlite',
  },
  migrations: { directory: './db/migrations' },
  seeds: { directory: './db/seeds' },
  useNullAsDefault: true,
};

const knexConfig = {
  development: base,
  production: base,
};

export default knexConfig;
