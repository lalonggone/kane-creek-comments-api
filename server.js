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

// PUBLIC endpoint. The `responses` table holds PII (email, phone, address) and
// internal-only flags (volunteer, email_updates) that must NEVER be exposed, so
// we use a strict field allowlist here — never select('*').
//
// `anonymous` is a free-text Google Form answer. Sharing/consent rules:
//   'Yes'               -> consented to share publicly, show real name
//   'Yes - anonymously' -> share the comment but credit it as "Anonymous"
//   'No, thank you'     -> declined to share publicly -> excluded entirely
// This is fail-closed: only the two known "share" values are returned, and only
// an exact 'Yes' reveals a name. Any other or unexpected value is withheld.
app.get('/responses', async (req, res) => {
  try {
    const responses = await db('responses')
      .whereIn('anonymous', ['Yes', 'Yes - anonymously'])
      .select(
        'id',
        'submitted_at',
        'grand_county_resident',
        'concern_level',
        'response',
        'impacts_speculated',
        db.raw(
          "CASE WHEN anonymous = 'Yes' THEN name ELSE 'Anonymous' END AS name"
        )
      )
      .orderBy('submitted_at', 'asc');
    res.status(200).json(responses);
  } catch (error) {
    console.error('Error fetching responses:', error);
    res.status(500).json({ error: 'Failed to get responses' });
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
