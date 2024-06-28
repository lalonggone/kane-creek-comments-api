import express from 'express';
import knex from 'knex';
import knexConfig from './knexfile.js';
import morgan from 'morgan';
import dotenv from 'dotenv';

dotenv.config({ path: './.env.local' });

const app = express();
const db = knex(knexConfig[process.env.NODE_ENV || 'development']);

app.set('port', process.env.PORT || 10000);
app.locals.title = 'Kane Creek Comments';

app.use(express.json());
app.use(morgan('combined'));

console.log('DB Configuration:', knexConfig[process.env.NODE_ENV || 'development']);

app.get('/', (request, response) => {
  console.log('GET /');
  response.send('Welcome to Kane Creek Comments!');
});

app.get('/responses', async (req, res) => {
  console.log('GET /responses');
  try {
    const responses = await db.select('*').from('responses').limit(1000);
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