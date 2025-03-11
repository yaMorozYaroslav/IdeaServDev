import jwt from 'jsonwebtoken';
import axios from 'axios';

export async function verifyToken(req, res, next) {
  const accessToken = req.cookies?.access_token;
  const refreshToken = req.cookies?.refresh_token;

  if (!accessToken && !refreshToken) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  try {
    // Verify access token with Google OAuth
    await axios.get('https://www.googleapis.com/oauth2/v1/tokeninfo', {
      params: { access_token: accessToken }
    });

    // Token is valid, proceed
    return next();
  } catch (error) {
    if (refreshToken) {
      try {
        const decodedRefresh = jwt.verify(refreshToken, 'test');

        // Generate new tokens
        const newAccessToken = jwt.sign(
          { userId: decodedRefresh.userId, email: decodedRefresh.email },
          'test',
          { expiresIn: '15m' }
        );

        const newRefreshToken = jwt.sign(
          { userId: decodedRefresh.userId, email: decodedRefresh.email },
          'test',
          { expiresIn: '7d' }
        );

        // Set new cookies
        res.cookie('access_token', newAccessToken, {
          httpOnly: true,
          secure: false,
          sameSite: 'Strict',
          maxAge: 15 * 60 * 1000,
        });

        res.cookie('refresh_token', newRefreshToken, {
          httpOnly: true,
          secure: false,
          sameSite: 'Strict',
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return next();
      } catch (refreshError) {
        return res.status(401).json({ message: 'Invalid refresh token' });
      }
    } else {
      return res.status(401).json({ message: 'Session expired, please log in again' });
    }
  }
}
