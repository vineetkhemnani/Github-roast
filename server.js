require('dotenv').config()
const express = require('express')
const axios = require('axios')
const passport = require('passport')
const GitHubStrategy = require('passport-github').Strategy
const session = require('express-session')
const path = require('path')
const { GoogleGenerativeAI } = require('@google/generative-ai')

const app = express()

// Set EJS as the templating engine
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'))

app.use(express.json())
app.use(express.static(__dirname + '/public/'))
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'replace_this_with_a_secure_secret',
    resave: false,
    saveUninitialized: true,
  })
)

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
      callbackURL: 'https://github-roast.vercel.app/auth/github/callback',
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
    res.render('login')
  } else {
    res.redirect('/home')
  }
})

// protected route to serve homepage after login
app.get('/home', (req, res) => {
  if (req.isAuthenticated()) {
    res.render('home')
  } else {
    res.redirect('/')
  }
})

// gemini setup
const geminiApiKey = process.env.GEMINI_API_KEY
const genAI = new GoogleGenerativeAI(geminiApiKey)

// endpoint to handle gemini api response
app.get('/roast/:username', async (req, res) => {
  const { username } = req.params
  try {
    // github response
    const githubResponse = await axios.get(
      `https://api.github.com/users/${username}`
    )
    const profileData = githubResponse.data

    if (!profileData) {
      return res.status(404).json({ error: 'GitHub user not found' })
    }

    // gemini api response
    const model = await genAI.getGenerativeModel({ model: 'gemini-1.5-pro' })

    const chat = model.startChat({
      history: [
        {
          role: 'user',
          parts: [
            { text: 'Suppose you are a witty AI with a good sense of humour' },
          ],
        },
      ],
      generationConfig: {
        maxOutputTokens: 100,
      },
    })

    const msg = `Tell me a roast about a GitHub user named ${
      profileData.name || username
    } who has ${profileData.public_repos} repositories and ${
      profileData.followers
    } followers.`

    // const msg = 'roast google'

    const result = await chat.sendMessage(msg)
    const text = result.response.candidates[0].content.parts[0].text
    console.log(text)
    res.json({ text })

    
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ error: 'Failed to generate a response' })
  }
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
