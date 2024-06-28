import express from 'express';
import knex from 'knex';
import knexConfig from './knexfile.js';
import morgan from 'morgan';
import dotenv from 'dotenv';

dotenv.config({ path: './.env.local' });

const app = express();
const env = process.env.NODE_ENV || 'development';
const db = knex(knexConfig[env]);

app.set('port', process.env.PORT || 10000);
app.locals.title = 'Kane Creek Comments';

app.use(express.json());
app.use(morgan('combined'));

// Log environment variables and knex configuration
console.log('Environment:', env);
console.log('DB Configuration:', knexConfig[env]);
console.log('DB Host:', process.env.DB_HOST);
console.log('DB User:', process.env.DB_USER);
console.log('DB Name:', process.env.DB_NAME);

app.get('/', (request, response) => {
  console.log('GET /');
  response.send('Welcome to Kane Creek Comments!');
});

app.get('/responses', async (req, res) => {
  console.log('GET /responses');
  try {
    const responses = await db.select('*').from('responses').limit(1000);
    console.log('Fetched responses:', responses);
    res.status(200).json(responses);
  } catch (error) {
    console.error('Error fetching responses:', error);
    res.status(500).json({ error: "Failed to get responses" });
  }
});

const server = app.listen(app.get('port'), '0.0.0.0', () => {
  console.log(
    `${app.locals.title} is running on http://localhost:${app.get('port')}.`
  );
});

server.keepAliveTimeout = 120000; // 120 seconds
server.headersTimeout = 120000; // 120 seconds