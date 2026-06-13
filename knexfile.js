import dotenv from 'dotenv';
dotenv.config();

// DB engine is env-driven so the same code runs on SQLite (VPS) or Postgres.
//   DB_CLIENT=better-sqlite3  -> SQLITE_FILE=/path/to/kane_creek.sqlite
//   DB_CLIENT=pg              -> DATABASE_URL=postgres://...  (DB_SSL=true to require TLS)
const client = process.env.DB_CLIENT || 'better-sqlite3';
const isSqlite = client.includes('sqlite');

const sqliteConnection = {
  filename: process.env.SQLITE_FILE || './data/kane_creek.sqlite',
};

const pgConnection = {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
};

const base = {
  client,
  connection: isSqlite ? sqliteConnection : pgConnection,
  migrations: { directory: './db/migrations' },
  seeds: { directory: './db/seeds' },
  useNullAsDefault: true,
};

const knexConfig = {
  development: base,
  production: {
    ...base,
    pool: isSqlite ? undefined : { min: 1, max: 10 },
  },
};

export default knexConfig;
