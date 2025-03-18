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
      user = existingUser;
    } else {
      const newUser = {
        googleId: profile.id,
        email: profile.email,
        name: profile.name,
        picture: profile.picture,
        status: "user", // Default role
        createdAt: new Date(),
      };
      const result = await usersCollection.insertOne(newUser);
      user = { ...newUser, _id: result.insertedId };
    }

    // Securely sign JWT tokens
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
      { userId: user.googleId, email: user.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // ✅ Set `access_token` as HTTP-only for security
    res.cookie("access_token", accessToken, {
      httpOnly: true,  // ✅ Cannot be accessed by JavaScript
      secure: true,    // ✅ Only sent over HTTPS
      sameSite: "None",
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    // ✅ Set `refresh_token` as HTTP-only for security
    res.cookie("refresh_token", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // ✅ Set `user_data` as HTTPS-only but accessible by JavaScript
    res.cookie("user_data", JSON.stringify({
      id: user.googleId,
      name: user.name,
      email: user.email,
      picture: user.picture,
      status: user.status,
    }), {
      httpOnly: false,  // ❌ Accessible by JavaScript
      secure: true,     // ✅ Only sent over HTTPS
      sameSite: "None",
      //~ domain: ["http://192.168.0.54:3000", "https://idea-sphere-50bb3c5bc07b.herokuapp.com"],
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // ✅ Redirect to frontend
    res.redirect("http://localhost:3000"); // Update with your frontend URL
  } catch (error) {
    console.error("❌ Error during OAuth callback:", error.response ? error.response.data : error.message);
    res.status(500).send("Authentication failed");
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

