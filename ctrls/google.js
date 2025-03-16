// ctrls/google.js
import axios from 'axios';
import jwt from 'jsonwebtoken';
import db from '../conn.js';

export async function handleOAuthCallback(req, res) {
  const code = req.query.code;

  if (!code) {
    return res.status(400).send("Authorization code is missing");
  }

  try {
    const tokenResponse = await axios.post("https://oauth2.googleapis.com/token", {
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: "https://idea-sphere-50bb3c5bc07b.herokuapp.com/google/oauth/callback",
      grant_type: "authorization_code",
    });

    const tokens = tokenResponse.data;

    // Fetch user profile
    const profileResponse = await axios.get(
      "https://www.googleapis.com/oauth2/v1/userinfo?alt=json",
      {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      }
    );

    const profile = profileResponse.data;

    // Save user to MongoDB
    const usersCollection = db.collection("users");
    const existingUser = await usersCollection.findOne({ email: profile.email });

    let user;
    if (existingUser) {
      user = existingUser; // ✅ Keep existing user data
    } else {
      const newUser = {
        googleId: profile.id,
        email: profile.email,
        name: profile.name,
        picture: profile.picture,
        status: "user", // ✅ Default status is "user"
        createdAt: new Date(),
      };
      const result = await usersCollection.insertOne(newUser);
      user = { ...newUser, _id: result.insertedId }; // ✅ Ensure user object has the correct ID
    }

    // Generate JWT tokens
    const accessToken = jwt.sign(
      {
        userId: user.googleId,
        email: user.email,
        name: user.name,
        picture: user.picture,
        status: user.status, // ✅ Include status in JWT
      },
      "test",
      { expiresIn: "15m" }
    );

    const refreshToken = jwt.sign(
      { userId: user.googleId, email: user.email },
      "test",
      { expiresIn: "7d" }
    );

    // Set cookies with user data
    res.cookie("access_token", accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie("refresh_token", refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.cookie(
      "user_data",
      JSON.stringify({
        id: user.googleId,
        name: user.name,
        email: user.email,
        picture: user.picture,
        status: user.status, // ✅ Include status in cookie
      }),
      {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      }
    );

    // Redirect back to frontend with success
    res.redirect(`http://localhost:3000`);
  } catch (error) {
    console.error("Error during OAuth callback:", error.response ? error.response.data : error.message);
    res.status(500).send("Authentication failed");
  }
}


export function getUserData(req, res) {
  const accessToken = req.cookies?.access_token;

  if (!accessToken) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  try {
    const user = jwt.verify(accessToken, "test");
    res.json({
      id: user.userId,
      name: user.name,
      email: user.email,
      picture: user.picture,
      status: user.status, // ✅ Include status
    });
  } catch (err) {
    console.error("Invalid token:", err);
    res.status(401).json({ message: "Invalid token" });
  }
}

export function logoutUser(req, res) {
  res.clearCookie('access_token', { httpOnly: true, sameSite: 'Strict' });
  res.clearCookie('refresh_token', { httpOnly: true, sameSite: 'Strict' });
  res.clearCookie('user_data', { httpOnly: false, sameSite: 'Strict' });

  res.status(200).json({ message: 'Logged out successfully' }); // ✅ Confirmation response
}

