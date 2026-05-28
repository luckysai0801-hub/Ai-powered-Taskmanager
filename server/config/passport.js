const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

const clientID = process.env.GOOGLE_CLIENT_ID || 'DUMMY_CLIENT_ID';
const clientSecret = process.env.GOOGLE_CLIENT_SECRET || 'DUMMY_CLIENT_SECRET';
const callbackURL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback';

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.warn('WARNING: Google OAuth credentials are not configured in your environment variables. Authentication will fail.');
}

passport.use(
  new GoogleStrategy(
    {
      clientID,
      clientSecret,
      callbackURL
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails && profile.emails[0] ? profile.emails[0].value : '';
        const avatar = profile.photos && profile.photos[0] ? profile.photos[0].value : '';
        const name = profile.displayName || '';

        let user = await User.findOne({ googleId: profile.id });

        if (!user && email) {
          user = await User.findOne({ email });
        }

        if (user) {
          user.name = name;
          if (avatar) user.avatar = avatar;
          if (!user.googleId) user.googleId = profile.id;
          await user.save();
        } else {
          user = new User({
            googleId: profile.id,
            name,
            email,
            avatar,
          });
          await user.save();
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);


passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});
