require('dotenv').config()
const express = require('express')
const axios = require('axios')
const OpenAI = require('openai')
const session = require('express-session')

const app = express()
app.use(express.static('public'))
app.use(express.json())
app.use(
  session({
    secret: 'your-secret-key-here',
    resave: false,
    saveUninitialized: false,
  })
)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
