const express = require('express');
const passport = require('passport');
const { googleCallbackSuccess, getMe, refreshTokens, logout } = require('../controllers/auth.controller');
const { verifyToken } = require('../middleware/verifyToken');

const router = express.Router();

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/pages/login.html?error=auth_failed' }),
  googleCallbackSuccess
);

router.get('/me', verifyToken, getMe);
router.post('/refresh', refreshTokens);
router.post('/logout', logout);

module.exports = router;
