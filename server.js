import express from 'express'
import knex from 'knex'
import knexConfig from './knexfile.js'

const app = express()
const db = knex(knexConfig.development)

app.set('port', process.env.PORT || 3001)
app.locals.title = 'Kane Creek Comments'

app.use(express.json())

app.get('/', (request, response) => {
  response.send('Welcome to Kane Creek Comments!')
})

app.get('/responses', async (req, res) => {
    try { 
        const responses = await db.select('*').from('responses').limit(1000)
        res.status(200).json(responses)
    } catch (error) {
        res.status(500).json({ error: "Failed to get responses" })
    }
})

app.listen(app.get('port'), () => {
  console.log(
    `${app.locals.title} is running on http://localhost:${app.get('port')}.`
  )
})
