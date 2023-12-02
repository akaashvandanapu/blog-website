// jshint esversion:6

const express = require('express')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const ejs = require('ejs')
const session = require('express-session')

const app = express()

app.set('view engine', 'ejs')

app.use(bodyParser.urlencoded({ extended: true }))
app.use(express.static('public'))
app.use(
  session({
    secret: 'your secret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // set to true if using https
  })
)

mongoose.connect(
  'mongodb+srv://akaash:akaash@akaash.17nf2ci.mongodb.net/BlogWebsiteDB',
  { useNewUrlParser: true }
)

const postsSchema = new mongoose.Schema({
  title: String,
  content: String,
  imageURL: String,
  username: { type: String, required: false }
})

const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  profilePhotoURL: String,
  blogs: [{ title: String, content: String }]
})

const Post = mongoose.model('Post', postsSchema)
const User = mongoose.model('User', userSchema)

// Main route
app.get('/', function (req, res) {
  res.render('main')
})

// Signup route
app.get('/signup', function (req, res) {
  res.render('signup')
})

app.post('/signup', function (req, res) {
  const { username, email, password, profilePhotoURL } = req.body

  // Perform user registration logic here
  // Example: Create a new user in the database
  const newUser = new User({
    username: username, 
    email: email,
    password: password,
    profilePhotoURL: profilePhotoURL
  })

  newUser
    .save()
    .then(() => {
      req.session.user = newUser // Store user information in session
      res.redirect('/home')
    })
    .catch(err => {
      console.error(err)
      res.status(500).send('Error registering user')
    })
})

// Login route
app.get('/login', function (req, res) {
  res.render('login')
})

app.post('/login', function (req, res) {
  const { email, password } = req.body

  User.findOne({ email: email, password: password })
    .then(user => {
      if (user) {
        req.session.user = user
        res.redirect('/home')
      } else {
        res.render('login', { error: 'Invalid email or password' })
      }
    })
    .catch(err => {
      console.error(err)
      res.status(500).send('Error during login')
    })
})

app.get('/home', function (req, res) {
  const user = req.session.user
  Post.find().then(posts => {
    res.render('home', {
      posts: posts,
      user: user
    })
  })
})

app.get('/profile', async (req, res) => {
  try {
    const user = await User.findOne({
      username: req.session.user.username
    }).lean()
    const blogs = await Post.find({
      username: req.session.user.username
    }).lean()

    // Attach blogs to user object
    user.blogs = blogs

    // Pass the updated user object to the view
    res.render('profile', { user })
  } catch (err) {
    console.error(err)
    res.status(500).send('Error fetching user data')
  }
})

app.post('/compose', function (req, res) {
  const post = new Post({
    title: req.body.postTitle,
    content: req.body.postBody,
    imageURL: req.body.postImageURL,
    username: req.session.user.username // Change 'name' to 'username'
  })

  User.findOneAndUpdate(
    { _id: req.session.user._id },
    { $push: { blogs: { title: post.title, content: post.content, imageURL: post.imageURL } } },
    { new: true }
  )
    .then(user => {
      console.log('User updated with new blog.')
    })
    .catch(err => {
      console.log(err)
      res.status(500).send('Internal Server Error')
    })

  post
    .save()
    .then(() => {
      console.log('Post added to DB.')
      res.redirect('/profile')
    })
    .catch(err => {
      res.status(400).send('Unable to save post to database.', err)
    })
})

// Individual post route
app.get('/posts/:postId', async function (req, res) {
  const postId = req.params.postId
  try {
    const post = await Post.findOne({ _id: postId })
    res.render('post', {
      title: post.title,
      content: post.content,
      imageURL: post.imageURL,
      user: req.session.user
    })
  } catch (err) {
    console.error(err)
    res.status(500).send('Error fetching post')
  }
})

app.get('/about', function (req, res) {
  res.render('about')
})

app.get('/compose', function (req, res) {
  res.render('compose')
})

app.listen(3000, function () {
  console.log('Server started on port 3000')
})
