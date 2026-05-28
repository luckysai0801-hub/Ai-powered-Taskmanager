require('dotenv').config();
require('express-async-errors');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const passport = require('passport');
const path = require('path');
const jwt = require('jsonwebtoken');

const connectDB = require('./server/config/db');
const { verifyPageAccess } = require('./server/middleware/verifyToken');
const errorHandler = require('./server/middleware/errorHandler');

// Load Passport Configuration
require('./server/config/passport');

// Connect to MongoDB
connectDB();

const app = express();

// CORS Settings
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5000',
    credentials: true
  })
);

// Body and Cookie Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Initialize Passport
app.use(passport.initialize());

// --- Protected Page Routes (Must be declared before express.static) ---

// Root endpoint: serve dashboard if authenticated, else login.html
app.get('/', (req, res, next) => {
  const accessToken = req.cookies.accessToken;
  if (accessToken) {
    try {
      jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET);
      return res.redirect('/pages/dashboard.html');
    } catch (err) {
      // Access token expired, attempt to refresh via refresh token
    }
  }

  const refreshToken = req.cookies.refreshToken;
  if (refreshToken) {
    try {
      const decodedRefresh = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      const newAccessToken = jwt.sign(
        { id: decodedRefresh.id },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: '15m' }
      );
      res.cookie('accessToken', newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000
      });
      return res.redirect('/pages/dashboard.html');
    } catch (err) {
      // Refresh token also invalid, fall through to login
    }
  }

  res.sendFile(path.join(__dirname, 'public', 'pages', 'login.html'));
});

// Protect individual HTML pages
app.get('/pages/login.html', (req, res, next) => {
  const accessToken = req.cookies.accessToken;
  if (accessToken) {
    try {
      jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET);
      return res.redirect('/pages/dashboard.html');
    } catch (err) {}
  }
  next();
});

app.get('/pages/dashboard.html', verifyPageAccess, (req, res, next) => {
  next();
});

app.get('/pages/taskboard.html', verifyPageAccess, (req, res, next) => {
  next();
});

// --- API Routes ---
app.use('/api/auth', require('./server/routes/auth.routes'));
app.use('/api/tasks', require('./server/routes/task.routes'));
app.use('/api/ai', require('./server/routes/ai.routes'));

// Serve Static Assets (Mounts public files)
app.use(express.static(path.join(__dirname, 'public')));

// Catch-all route to redirect back to root
app.use((req, res, next) => {
  res.redirect('/');
});

// Global Error Handler Middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});
