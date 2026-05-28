const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const token = req.cookies.accessToken;

  if (!token) {
    return res.status(401).json({ message: 'Access token missing', code: 'TOKEN_MISSING' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = { id: decoded.id };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired', code: 'ACCESS_TOKEN_EXPIRED' });
    }
    return res.status(401).json({ message: 'Invalid access token', code: 'INVALID_TOKEN' });
  }
};

const verifyPageAccess = (req, res, next) => {
  const accessToken = req.cookies.accessToken;
  const refreshToken = req.cookies.refreshToken;

  if (accessToken) {
    try {
      const decoded = jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET);
      req.user = { id: decoded.id };
      return next();
    } catch (err) {
      // Access token invalid or expired. Fall through to refresh token.
    }
  }

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
        maxAge: 15 * 60 * 1000 // 15 minutes
      });

      req.user = { id: decodedRefresh.id };
      return next();
    } catch (err) {
      // Refresh token invalid or expired
    }
  }

  // Redirect to login if unauthenticated
  res.redirect('/pages/login.html');
};

module.exports = { verifyToken, verifyPageAccess };
