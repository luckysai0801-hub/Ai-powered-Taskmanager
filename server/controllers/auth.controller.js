const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ id: userId }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: '15m'
  });
  const refreshToken = jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: '7d'
  });
  return { accessToken, refreshToken };
};

const setTokenCookies = (res, accessToken, refreshToken) => {
  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000 // 15 minutes
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
};

const googleCallbackSuccess = async (req, res) => {
  try {
    if (!req.user) {
      return res.redirect('/pages/login.html?error=auth_failed');
    }

    const { accessToken, refreshToken } = generateTokens(req.user._id);
    setTokenCookies(res, accessToken, refreshToken);

    res.redirect('/pages/dashboard.html');
  } catch (error) {
    console.error('Google callback controller error:', error);
    res.redirect('/pages/login.html?error=server_error');
  }
};

const getMe = async (req, res) => {
  const user = await User.findById(req.user.id).select('-googleId -createdAt -updatedAt -__v');
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  res.json(user);
};

const refreshTokens = async (req, res) => {
  // this took me forever to figure out
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ message: 'Refresh token missing', code: 'REFRESH_TOKEN_MISSING' });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'User not found', code: 'USER_NOT_FOUND' });
    }

    const { accessToken: newAccessToken, refreshToken: newRefreshToken } = generateTokens(user._id);
    setTokenCookies(res, newAccessToken, newRefreshToken);

    res.json({ success: true, message: 'Tokens refreshed successfully' });
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired refresh token', code: 'REFRESH_TOKEN_EXPIRED' });
  }
};

const logout = (req, res) => {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  res.json({ success: true, message: 'Logged out successfully' });
};

module.exports = {
  googleCallbackSuccess,
  getMe,
  refreshTokens,
  logout
};
