import express from 'express'
import passport from 'passport'

const router = express.Router();

router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/login', session: false }),
  (req, res) => {
    res.cookie('jwt', req.user.token, { httpOnly: false, secure: false });
    res.redirect('/');
  }
);

export default router
