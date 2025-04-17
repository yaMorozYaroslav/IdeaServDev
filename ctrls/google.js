import axios from 'axios';
import jwt from 'jsonwebtoken';
import querystring from 'querystring';
import db from '../conn.js';

export async function handleOAuthCallback(req, res) {
  const code = req.query.code;
  if (!code) {
    return res.status(400).json({ message: "Authorization code is missing" });
  }

  const tokenResponse = await axios.post(
  "https://oauth2.googleapis.com/token",
  new URLSearchParams({
    code,
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    redirect_uri: REDIRECT_URI,
    grant_type: "authorization_code",
  }).toString(),
  {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  }
);

    const tokens = tokenResponse.data;

    const profileResponse = await axios.get(
      "https://openidconnect.googleapis.com/v1/userinfo",
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      }
    );

    const profile = profileResponse.data;

    const usersCollection = db.collection("users");
    let user = await usersCollection.findOne({ email: profile.email });

    if (!user) {
      const newUser = {
        googleId: profile.sub,
        email: profile.email,
        name: profile.name,
        picture: profile.picture,
        status: "user",
        createdAt: new Date(),
      };
      const result = await usersCollection.insertOne(newUser);
      user = { ...newUser, _id: result.insertedId };
    }

    const JWT_SECRET = process.env.JWT_SECRET || "test";

    const accessToken = jwt.sign(
      {
        userId: user.googleId,
        email: user.email,
        name: user.name,
        picture: user.picture,
        status: user.status,
      },
      JWT_SECRET,
      { expiresIn: "15m" }
    );

    const refreshToken = jwt.sign(
      {
        userId: user.googleId,
        email: user.email,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    let clientRedirectBase = "https://idea-sphere.vercel.app";
    if (host.includes("localhost:5000")) {
      clientRedirectBase = "http://localhost:3000";
    } else if (host.includes("idea-sphere-dev-30492dbf5e99.herokuapp.com")) {
      clientRedirectBase = "https://idea-sphere-dev.vercel.app";
    }

    const redirectUrl = `${clientRedirectBase}/api/store-tokens?access_token=${accessToken}&refresh_token=${refreshToken}`;
    res.redirect(redirectUrl);
  } catch (error) {
    console.error("❌ OAuth callback failed:");
    console.error(error.response?.data || error.message);
    res.status(500).json({
      message: "Authentication failed",
      error: error.response?.data || error.message,
    });
  }
}

export function getUserData(req, res) {
  const { accessToken } = req.body;

  if (!accessToken) {
    return res.status(401).json({ message: "Access token is required" });
  }

  try {
    const user = jwt.verify(accessToken, process.env.JWT_SECRET || "test");

    res.json({
      id: user.userId,
      name: user.name,
      email: user.email,
      picture: user.picture,
      status: user.status,
    });
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
}

export function logoutUser(req, res) {
  res.clearCookie('access_token', { httpOnly: true, sameSite: 'None' });
  res.clearCookie('refresh_token', { httpOnly: true, sameSite: 'None' });
  res.clearCookie('user_data', { httpOnly: false, sameSite: 'None' });

  res.status(200).json({ message: 'Logged out successfully' });
}

export async function refreshToken(req, res) {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({ message: "No refresh token provided" });
  }
//some
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET || "test");

    const newAccessToken = jwt.sign(
      {
        userId: decoded.userId,
        email: decoded.email,
        status: decoded.status || "user",
      },
      process.env.JWT_SECRET || "test",
      { expiresIn: "15m" }
    );

    return res.json({ accessToken: newAccessToken });
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired refresh token" });
  }
}
