const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcrypt');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const path = require('path');

const app = express();
const PORT = 3000;

// ===== Google OAuth =====
const GOOGLE_CLIENT_ID = '136384587330-3lrq85beitigsrk2t8hjc78t2d0ovusg.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = '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';
// =============================

const MONGODB_URI = 'mongodb+srv://admin:admin@cluster0.lnqtbw7.mongodb.net/?appName=Cluster0';
const SESSION_SECRET = 'calendar-super-secret-2025';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection failed:', err));

// Schema
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  googleId: String,
  displayName: String
});
const User = mongoose.model('User', userSchema);

const eventSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  date: { type: Date, required: true },
  description: String
});
const Event = mongoose.model('Event', eventSchema);

// Middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: MONGODB_URI }),
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

app.use(passport.initialize());
app.use(passport.session());

// Passport Google Strategy
passport.use(new GoogleStrategy({
  clientID: GOOGLE_CLIENT_ID,
  clientSecret: GOOGLE_CLIENT_SECRET,
  callbackURL: 'https://comp3810-group62.onrender.com/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ googleId: profile.id });
    if (!user) {
      user = await User.create({
        googleId: profile.id,
        username: profile.emails[0].value,
        displayName: profile.displayName || profile.emails[0].value.split('@')[0]
      });
    }
    return done(null, user);
  } catch (err) {
    return done(err);
  }
}));

passport.serializeUser((user, done) => done(null, user._id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// Routes
app.get('/', (req, res) => req.isAuthenticated() ? res.redirect('/calendar') : res.redirect('/login'));
app.get('/login', (req, res) => res.render('login', { error: null }));

// Google Login
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => res.redirect('/calendar')
);

// Username/Password Login
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (user && user.password && await bcrypt.compare(password, user.password)) {
    req.login(user, () => res.redirect('/calendar'));
  } else {
    res.render('login', { error: 'Incorrect username or password' });
  }
});

app.post('/register', async (req, res) => {
  try {
    const hashed = await bcrypt.hash(req.body.password, 10);
    await User.create({ username: req.body.username, password: hashed });
    res.redirect('/login');
  } catch (err) {
    res.render('login', { error: 'Registration failed, the account may already exist' });
  }
});

app.get('/register', (req, res) => {
  res.render('register', { error: null });
});



app.get('/logout', (req, res) => {
  req.logout(() => res.redirect('/login'));
});

app.get('/calendar', (req, res) => {
  if (!req.isAuthenticated()) return res.redirect('/login');
  res.render('calendar', { username: req.user.displayName || req.user.username });
});

// ================== RESTful API ==================
app.get('/api/events', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not logged in' });
  const events = await Event.find({ userId: req.user._id });
  const formatted = events.map(e => ({
    id: e._id.toString(),
    title: e.title,
    start: e.date.toISOString().split('T')[0],
    description: e.description || ''
  }));
  res.json(formatted);
});

app.post('/api/events', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not logged in' });
  try {
    const event = await Event.create({
      userId: req.user._id,
      title: req.body.title,
      date: new Date(req.body.date),
      description: req.body.description || ''
    });
    res.status(201).json({
      id: event._id.toString(),
      title: event.title,
      start: event.date.toISOString().split('T')[0],
      description: event.description
    });
  } catch (err) {
    res.status(400).json({ error: 'Failed to create' });
  }
});

app.put('/api/events/:id', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not logged in' });

  const { title, date, description } = req.body;
  const parsedDate = new Date(date);

  if (isNaN(parsedDate.getTime())) {
    return res.status(400).json({ error: 'Invalid date format' });
  }

  const event = await Event.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { title, date: parsedDate, description },
    { new: true }
  );

  if (!event) return res.status(404).json({ error: 'Event not found' });

  res.json({
    id: event._id.toString(),
    title: event.title,
    start: event.date.toISOString().split('T')[0],
    description: event.description
  });
});

app.delete('/api/events/:id', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not logged in' });
  const result = await Event.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!result) return res.status(404).json({ error: 'Event not found' });
  res.json({ message: 'Deleted successfully' });
});
// ====================================================

app.listen(PORT, () => {
  console.log(`🚀 Server running`);
  console.log(`🔗 Google login test`);
});
