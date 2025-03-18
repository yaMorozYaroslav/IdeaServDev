// ctrls/google.js
import axios from 'axios';
import jwt from 'jsonwebtoken';
import db from '../conn.js';

export async function handleOAuthCallback(req, res) {
  const code = req.query.code;
  if (!code) {
    console.error("❌ OAuth Error: Missing authorization code");
    return res.status(400).json({ message: "Authorization code is missing" });
  }

  try {
    const REDIRECT_URI = "https://idea-sphere-50bb3c5bc07b.herokuapp.com/google/oauth/callback";

    const tokenResponse = await axios.post("https://oauth2.googleapis.com/token", {
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
    });

    const tokens = tokenResponse.data;

    // Fetch user profile
    const profileResponse = await axios.get(
      "https://www.googleapis.com/oauth2/v1/userinfo?alt=json",
      { headers: { Authorization: `Bearer ${tokens.access_token}` } }
    );

    const profile = profileResponse.data;

    // Save user to MongoDB
    const usersCollection = db.collection("users");
    let user = await usersCollection.findOne({ email: profile.email });

    if (!user) {
      const newUser = {
        googleId: profile.id,
        email: profile.email,
        name: profile.name,
        picture: profile.picture,
        status: "user",
        createdAt: new Date(),
      };
      const result = await usersCollection.insertOne(newUser);
      user = { ...newUser, _id: result.insertedId };
    }

    // Sign JWT tokens
    const JWT_SECRET = process.env.JWT_SECRET || "test";

    const accessToken = jwt.sign(
      { userId: user.googleId, email: user.email, name: user.name, picture: user.picture, status: user.status },
      JWT_SECRET,
      { expiresIn: "15m" }
    );

    const refreshToken = jwt.sign(
      { userId: user.googleId, email: user.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // ✅ Set cookies
    res.cookie("access_token", accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      domain: "localhost", // ✅ Important for local SSR
      path: "/",
      maxAge: 15 * 60 * 1000,
    });

    res.cookie("refresh_token", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      domain: "localhost",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.cookie("user_data", JSON.stringify({
      id: user.googleId,
      name: user.name,
      email: user.email,
      picture: user.picture,
      status: user.status,
    }), {
      httpOnly: false, // ✅ Accessible by JavaScript
      secure: true,
      sameSite: "None",
      domain: "localhost",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // ✅ Return JSON (Frontend will handle redirect)
    res.status(200).json({
      message: "Login successful",
      user: {
        id: user.googleId,
        name: user.name,
        email: user.email,
        picture: user.picture,
        status: user.status,
      },
    });

  } catch (error) {
    console.error("❌ Error during OAuth callback:", error.response?.data || error.message);
    res.status(500).json({ message: "Authentication failed", error: error.message });
  }
}


export function getUserData(req, res) {
  const accessToken = req.cookies?.access_token;
  //~ console.log(accessToken)
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
  res.clearCookie('access_token', { httpOnly: true, sameSite: 'None' });
  res.clearCookie('refresh_token', { httpOnly: true, sameSite: 'None' });
  res.clearCookie('user_data', { httpOnly: false, sameSite: 'None' });
  //~ res.clearCookie('user_data', { httpOnly: false, sameSite: 'Strict' });

  res.status(200).json({ message: 'Logged out successfully' }); // ✅ Confirmation response
}

