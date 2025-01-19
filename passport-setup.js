// server/passport-setup.js
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import googleCtrl from './ctrls/google.js';

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: 'https://inter-idea-ad80abcdf0d6.herokuapp.com/google/google/callback',
    },
    (accessToken, refreshToken, profile, done) => {
      // You can save the user profile or handle authentication logic here
      return done(null, profile);
    }
  )
);

export default passport;
