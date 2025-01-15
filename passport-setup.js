// server/passport-setup.js
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import googleCtrl from './ctrls/google.js';

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: '/google/google/callback',
    },
    googleCtrl.googleCallback
  )
);

export default passport;
