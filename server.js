import express from 'express';
import knex from 'knex';
import knexConfig from './knexfile.js';
import morgan from 'morgan';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();
const env = process.env.NODE_ENV || 'development';
const db = knex(knexConfig[env]);

app.set('port', process.env.PORT || 10000);
// Bind to loopback by default; nginx terminates TLS and proxies in.
// Set HOST=0.0.0.0 only if you intend to expose the port directly.
app.set('host', process.env.HOST || '127.0.0.1');
app.locals.title = 'Kane Creek Comments';

app.use(express.json());
app.use(morgan('combined'));

// Comma-separated allowlist, e.g.
// ALLOWED_ORIGINS="https://kanecreekwatch.org,https://www.kanecreekwatch.org,https://kane-creek-comments.vercel.app"
const allowedOrigins = (
  process.env.ALLOWED_ORIGINS || 'https://kane-creek-comments.vercel.app'
)
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({ origin: allowedOrigins, optionsSuccessStatus: 200 }));

console.log('Environment:', env);
console.log('Allowed origins:', allowedOrigins);

app.get('/', (request, response) => {
  response.send('Welcome to Kane Creek Comments!');
});

// The public field allowlist. The `responses` table holds PII (email, phone,
// address) and internal-only flags (volunteer, email_updates) that must NEVER
// be exposed, so every public query selects exactly these columns, never
// select('*').
//
// `anonymous` is a free-text Google Form answer about sharing the commenter's
// PERSONAL INFO (their name), NOT about whether their response may be shown.
// The flag only controls name display:
//   'Yes'               -> consented to share their name -> show real name
//   'Yes - anonymously' -> show the comment, credit it as "Anonymous"
//   'No, thank you'     -> declined to share personal info -> credit as "Anonymous"
// Fail-closed: only an exact 'Yes' reveals a name; any other or unexpected
// value is shown as "Anonymous". (PII columns are never selected regardless.)
const publicColumns = [
  'id',
  'submitted_at',
  'grand_county_resident',
  'concern_level',
  'response',
  'impacts_speculated',
  db.raw("CASE WHEN anonymous = 'Yes' THEN name ELSE 'Anonymous' END AS name"),
];

// Only rows with an actual comment are part of the public feed.
const hasComment = (query) =>
  query.whereNotNull('response').andWhereRaw("TRIM(response) <> ''");

const RESIDENT = 'Yes, I am a resident';

// PUBLIC, paginated + searchable feed. Query params:
//   q         keyword, matched against the comment text + impacts (NOT the raw
//             name (searching real names could confirm a person submitted even
//             when their comment is shown as "Anonymous").
//   residency 'all' (default) | 'residents'
//   page      1-based (default 1)
//   limit     page size (default 12, capped at 100)
// Returns { results, total, page, limit } so the client can drive pagination.
app.get('/responses', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 12));
    const q = (req.query.q || '').trim();
    const residency = req.query.residency === 'residents' ? 'residents' : 'all';

    // Build the shared WHERE once so the count and the page stay in sync.
    const applyFilters = (query) => {
      hasComment(query);
      if (residency === 'residents') {
        query.where('grand_county_resident', RESIDENT);
      }
      if (q) {
        const term = `%${q}%`;
        query.where((b) =>
          b.where('response', 'like', term).orWhere('impacts_speculated', 'like', term)
        );
      }
      return query;
    };

    const [{ total }] = await applyFilters(db('responses')).count({ total: '*' });

    const results = await applyFilters(db('responses'))
      .select(publicColumns)
      .orderBy('submitted_at', 'desc')
      .limit(limit)
      .offset((page - 1) * limit);

    res.status(200).json({ results, total, page, limit });
  } catch (error) {
    console.error('Error fetching responses:', error);
    res.status(500).json({ error: 'Failed to get responses' });
  }
});

// PUBLIC single response by id (the detail page fetches this directly so it
// doesn't depend on the paginated feed being fully loaded client-side).
app.get('/responses/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    const response = await db('responses')
      .select(publicColumns)
      .where({ id })
      .first();
    if (!response) {
      return res.status(404).json({ error: 'Response not found' });
    }
    res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching response:', error);
    res.status(500).json({ error: 'Failed to get response' });
  }
});

// Aggregate counts for the public site (e.g. a "N comments submitted" banner).
// All non-identifying totals, safe to expose, and cheap vs. fetching every row.
app.get('/stats', async (req, res) => {
  try {
    const [{ total }] = await db('responses').count({ total: '*' });
    const [{ named }] = await db('responses')
      .where('anonymous', 'Yes')
      .count({ named: '*' });
    const byResidency = await db('responses')
      .select('grand_county_resident')
      .count({ count: '*' })
      .groupBy('grand_county_resident');
    const byConcernLevel = await db('responses')
      .select('concern_level')
      .count({ count: '*' })
      .groupBy('concern_level')
      .orderBy('concern_level');
    res.status(200).json({
      total,
      named,
      anonymous: total - named,
      byResidency,
      byConcernLevel,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

const server = app.listen(app.get('port'), app.get('host'), () => {
  console.log(
    `${app.locals.title} is running on http://${app.get('host')}:${app.get(
      'port'
    )}.`
  );
});

server.keepAliveTimeout = 120000;
server.headersTimeout = 120000;
