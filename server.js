import dotenv from 'dotenv'
dotenv.config()
import express from 'express'
import axios from 'axios'
import path from 'path'
import { fileURLToPath } from 'url'
// const OpenAI = require('openai')
import session from 'express-session'
import { GoogleGenerativeAI } from '@google/generative-ai'
import passport from 'passport'
import { Strategy as GitHubStrategy } from 'passport-github'

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

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

passport.serializeUser((user, done) => {
  done(null, user)
})

passport.deserializeUser((obj, done) => {
  done(null, obj)
})

passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: 'http://127.0.0.1:3000/auth/github/callback',
    },
    (accessToken, refreshToken, profile, cb) => {
      return cb(null, profile)
    }
  )
)

// route to handle github authentication
app.get('/auth/github', passport.authenticate('github'))

app.get(
  '/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/' }),
  function (req, res) {
    // Successful authentication, redirect home.
    res.redirect('/')
  }
)

app.use(passport.initialize())
app.use(passport.session())

// serve login page if user not authenticated
app.get('/', (req, res) => {
  if (!req.isAuthenticated()) {
    // if not authenticated go to login page
    res.sendFile(path.join(__dirname, 'public', 'login.html'), (err) => {
      if (err) {
        res.status(500).send('Error occurred while serving the file.')
      }
    })
  } else {
    res.redirect('/home')
  }
})

// protected route to serve homepage after login
app.get('/home', (req, res) => {
  if (req.isAuthenticated()) {
    res.sendFile(path.join(__dirname, 'public', 'home.html'), (err) => {
      if (err) {
        res.status(500).send('Error occurred while serving the file.')
      }
    })
  } else {
    res.redirect('/')
  }
})

// gemini setup
const gemini_api_key = process.env.GEMINI_API_KEY
const genAI = new GoogleGenerativeAI(gemini_api_key)

// endpoint to handle gemini api response
app.get('/', async (req, res) => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' })

    const chat = model.startChat({
      history: [
        {
          role: 'user',
          parts: [
            { text: 'Suppose you are a witty AI with a good sense of humour' },
          ],
        },
        {
          role: 'user',
          parts: [{ text: 'Your job is to roast me' }],
        },
      ],
      generationConfig: {
        maxOutputTokens: 100,
      },
    })

    const msg = 'Roast me'

    const result = await chat.sendMessage(msg)
    const response = await result.response
    const text = response.text()
    // console.log(text)
    res.json({ text })
  } catch (error) {
    console.log('Error:', error)
    res.status(500).json({ error: 'Failed to generate a response' })
  }
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
