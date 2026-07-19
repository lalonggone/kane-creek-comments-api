// Build the SQLite database from the Postgres custom-format dump (the source of
// truth). The schema comes from the knex migration; the data comes from the
// dump's COPY block. Re-run this whenever a fresher dump arrives.
//
// Usage:
//   DUMP_FILE=~/kc-responses-backup-2026-06-12.dump \
//   SQLITE_FILE=./data/kane_creek.sqlite \
//   npm run build:sqlite
//
// Requires `pg_restore` on PATH (only to read the dump; no Postgres server needed).
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import knex from 'knex';

const DUMP_FILE = process.env.DUMP_FILE;
const SQLITE_FILE = process.env.SQLITE_FILE || './data/kane_creek.sqlite';
if (!DUMP_FILE) {
  console.error('Set DUMP_FILE to the path of the .dump file.');
  process.exit(1);
}

// COPY column order as emitted by the dump (no `id`; it is auto-assigned).
const COLUMNS = [
  'submitted_at',
  'grand_county_resident',
  'name',
  'email',
  'phone',
  'address',
  'concern_level',
  'response',
  'impacts_speculated',
  'anonymous',
  'development_discovery_reason',
  'volunteer',
  'email_updates',
];

// Unescape one Postgres COPY (text format) field. \N means SQL NULL.
function unescape(field) {
  if (field === '\\N') return null;
  return field.replace(/\\(.)/g, (_, c) => {
    switch (c) {
      case 'n': return '\n';
      case 't': return '\t';
      case 'r': return '\r';
      case 'b': return '\b';
      case 'f': return '\f';
      case 'v': return '\v';
      case '\\': return '\\';
      default: return c;
    }
  });
}

console.log(`Reading dump: ${DUMP_FILE}`);
const sql = execFileSync('pg_restore', ['-f', '-', DUMP_FILE], {
  maxBuffer: 256 * 1024 * 1024,
}).toString('utf8');

// Extract the COPY data block: lines between "COPY public.responses (...) FROM stdin;" and "\."
const lines = sql.split('\n');
const start = lines.findIndex((l) => l.startsWith('COPY public.responses'));
if (start === -1) throw new Error('COPY block for public.responses not found in dump');
const rows = [];
for (let i = start + 1; i < lines.length; i++) {
  if (lines[i] === '\\.') break;
  if (lines[i] === '') continue;
  const fields = lines[i].split('\t');
  const row = {};
  COLUMNS.forEach((col, idx) => {
    const v = unescape(fields[idx]);
    row[col] = col === 'concern_level' && v != null ? parseInt(v, 10) : v;
  });
  rows.push(row);
}
console.log(`Parsed ${rows.length} rows.`);

mkdirSync(dirname(SQLITE_FILE), { recursive: true });
const db = knex({
  client: 'better-sqlite3',
  connection: { filename: SQLITE_FILE },
  useNullAsDefault: true,
  migrations: { directory: './db/migrations' },
});

try {
  // Rebuild from scratch so the script is idempotent.
  await db.schema.dropTableIfExists('responses');
  await db.migrate.latest();
  await db.batchInsert('responses', rows, 500);

  const [{ count }] = await db('responses').count({ count: '*' });
  const [{ pub }] = await db('responses')
    .whereIn('anonymous', ['Yes', 'Yes - anonymously'])
    .count({ pub: '*' });
  console.log(`Inserted ${count} rows; ${pub} will be public (rest withheld).`);
} finally {
  await db.destroy();
}
