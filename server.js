import dotenv from 'dotenv'
dotenv.config()
import express from 'express'
import axios from 'axios'
// const OpenAI = require('openai')
import session from 'express-session'
import { GoogleGenerativeAI } from '@google/generative-ai'

const app = express()

app.use(express.static('public')) // Use express.static to serve static files
app.use(express.json()) // Use express.json to parse JSON bodies
app.use(
  session({
    secret: 'your-secret-key-here',
    resave: false,
    saveUninitialized: false,
  })
)

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// })
const gemini_api_key = process.env.GEMINI_API_KEY


const genAI = new GoogleGenerativeAI(gemini_api_key)

// endpoint to handle gemini api response
app.get('/', async (req, res) => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' })

    const prompt = 'Write a story about a magic backpack.'

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()
    // console.log(text)
    res.json({text})
  } catch (error) {
    console.log('Error:', error)
    res.status(500).json({ error: 'Failed to generate a response' })
  }
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
