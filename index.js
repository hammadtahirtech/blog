const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const ejs = require('ejs');
const shortid = require('shortid');

// Database connection
mongoose
  .connect('mongodb://127.0.0.1:27017/blog')
  .then(() => console.log('DB connected'))
  .catch((err) => console.log('Error:', err));

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.set('view engine', 'ejs');

// User schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

const User = mongoose.model('User', userSchema);

// Comment schema
const commentSchema = new mongoose.Schema({
  username: { type: String, required: true },
  comment: { type: String, required: true },
  page: { type: String, required: true },
});

const Comment = mongoose.model('Comment', commentSchema);

// Blog schema with shortid for unique IDs
const blogSchema = new mongoose.Schema({
  blogName: { type: String, required: true },
  blogContent: { type: String, required: true },
  id: { type: String, required: true, unique: true, default: shortid.generate },
});

const Blog = mongoose.model('Blog', blogSchema);

const SECRET_KEY = 'i have no key';

// Authentication middleware
function authenticateToken(req, res, next) {
  const token = req.cookies.auth_token;
  if (!token) return res.redirect('/sign');

  try {
    const verified = jwt.verify(token, SECRET_KEY);
    req.user = verified;
    next();
  } catch (err) {
    res.clearCookie('auth_token');
    res.redirect('/sign');
  }
}

// Routes
app.get('/', authenticateToken, async (req, res) => {
  const blogs = await Blog.find({});
  res.render('home', { blogs });
});

app.get('/addBlog', authenticateToken, (req, res) => {
  res.render('add');
});

app.get('/blog-1', authenticateToken, async (req, res) => {
  const comments = await Comment.find({ page: 'blog-1' });
  res.render('blog1', { comments });
});

app.get('/blog-2', authenticateToken, async (req, res) => {
  const comments = await Comment.find({ page: 'blog-2' });
  res.render('blog2', { comments });
});

app.get('/sign', (req, res) => {
  res.render('login');
});

app.get('/blog/:id', authenticateToken, async (req,res) => {
   const urlId = req.params.id;

   const dedBlog = await Blog.findOne({id: urlId})
   const comments = await Comment.find({ page: urlId })

   res.render('dedBlog' , { dedBlog , urlId , comments })
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    let user = await User.findOne({ username });

    if (!user) {
      user = await User.create({ username, password });
    } else if (user.password !== password) {
      return res.status(401).send('Invalid username or password');
    }

    const token = jwt.sign({ username: user.username }, SECRET_KEY, { expiresIn: '24h' });
    res.cookie('auth_token', token, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });
    res.redirect('/');
  } catch (err) {
    console.log(err);
    res.status(500).send('Server Error');
  }
});

app.post('/comments/:page', authenticateToken, async (req, res) => {
  const { page } = req.params;
  const { comment } = req.body;
  const username = req.user.username;

  try {
    await Comment.create({ page, comment, username });
    res.status(201).send('Comment added successfully');
  } catch (err) {
    console.log(err);
    res.status(500).send('Cannot comment');
  }
});

app.post('/pushBlog', authenticateToken, async (req, res) => {
  const { blogName, blogContent } = req.body;

  try {
    // Automatically generate unique ID using shortid
    await Blog.create({ blogName, blogContent });
    const blogs = await Blog.find({});
    res.render('home', { blogs });
  } catch (err) {
    console.log(err);
    res.status(500).send('Cannot add Blog');
  }
});

// Start server
app.listen(1000, () => console.log('Server started on port 1000'));
