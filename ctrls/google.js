import axios from "axios";
import jwt from "jsonwebtoken";
import db from "../conn.js";
import { ObjectId } from "mongodb";

// controllers/google.js

export async function getPublicUserProfile(req, res) {
  try {
    const { userId } = req.params;
    const { requesterId } = req.body || {};

    const isOwner = requesterId === userId;

    const projection = {
      name: 1,
      picture: 1,
      googleId: 1,
      answered: 1,
      ...(isOwner ? { unanswered: 1 } : {}), // show `unanswered` only to owner
    };

    const user = await db.collection("users").findOne(
      { googleId: userId },
      { projection }
    );

    if (!user) {
      console.warn("⚠️ User not found for googleId:", userId);
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);
  } catch (err) {
    console.error("❌ getPublicUserProfile error:", err);
    res.status(500).json({ message: "Failed to fetch user" });
  }
}


// 🔐 OAuth login callback
export async function handleOAuthCallback(req, res) {
  const code = req.query.code;
  if (!code) {
    return res.status(400).json({ message: "Authorization code is missing" });
  }

  try {
    const host = req.headers.host;
    let REDIRECT_URI = "https://idea-sphere-50bb3c5bc07b.herokuapp.com/google/oauth/callback";
    let clientRedirectBase = "https://idea-sphere.vercel.app";

    if (host?.includes("localhost")) {
      REDIRECT_URI = "http://localhost:5000/google/oauth/callback";
      clientRedirectBase = "http://localhost:3000";
    } else if (host?.includes("idea-sphere-dev")) {
      REDIRECT_URI = "https://idea-sphere-dev-30492dbf5e99.herokuapp.com/google/oauth/callback";
      clientRedirectBase = "https://idea-sphere-dev.vercel.app";
    }

    // Exchange auth code for access token
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
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );

    const tokens = tokenResponse.data;

    // Fetch Google profile
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

    const dbUser = await usersCollection.findOne(
      { googleId: user.googleId },
      { projection: { unanswered: 1 } }
    );

    const JWT_SECRET = process.env.JWT_SECRET || "test";

    const accessToken = jwt.sign(
      {
        userId: user.googleId,
        email: user.email,
        name: user.name,
        picture: user.picture,
        status: user.status,
        unanswered: dbUser?.unanswered || [],
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

    const redirectUrl = `${clientRedirectBase}/api/store-tokens?access_token=${encodeURIComponent(
      accessToken
    )}&refresh_token=${encodeURIComponent(refreshToken)}`;

    console.log("✅ Redirecting to:", redirectUrl);
    res.redirect(redirectUrl);
  } catch (error) {
    console.error("❌ OAuth callback failed:", error.response?.data || error.message);
    res.status(500).json({
      message: "Authentication failed",
      error: error.response?.data || error.message,
    });
  }
}

// 🔐 Get user from token
export async function getUserData(req, res) {
  const { accessToken } = req.body;

  if (!accessToken) {
    return res.status(401).json({ message: "Access token is required" });
  }

  try {
    const user = jwt.verify(accessToken, process.env.JWT_SECRET || "test");

    const usersCollection = db.collection("users");
    const dbUser = await usersCollection.findOne(
      { googleId: user.userId },
      { projection: { unanswered: 1 } }
    );

    const unanswered = dbUser?.unanswered || [];

    res.json({
      id: user.userId,
      name: user.name,
      email: user.email,
      picture: user.picture,
      status: user.status,
      username: user.username,
      unanswered,
    });
  } catch (err) {
    console.error("Token verification failed:", err);
    res.status(401).json({ message: "Invalid token" });
  }
}

// 🔒 Logout
export function logoutUser(req, res) {
  res.clearCookie("access_token", { httpOnly: true, sameSite: "None", secure: true });
  res.clearCookie("refresh_token", { httpOnly: true, sameSite: "None", secure: true });
  res.clearCookie("user_data", { httpOnly: false, sameSite: "Lax", secure: true });

  res.status(200).json({ message: "Logged out successfully" });
}

export async function refreshToken(req, res) {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    console.log("⛔ No refresh token provided");
    return res.status(401).json({ message: "No refresh token provided" });
  }

  try {
    const JWT_SECRET = process.env.JWT_SECRET || "test";

    // 🔍 Decode and inspect the refresh token payload
    const decoded = jwt.verify(refreshToken, JWT_SECRET);
    console.log("🧪 Decoded refresh token payload:", decoded);

    // 🔍 Look for the user by googleId = decoded.userId
    const user = await db.collection("users").findOne(
      { googleId: decoded.userId },
      {
        projection: {
          googleId: 1,
          name: 1,
          email: 1,
          picture: 1,
          status: 1,
          unanswered: 1,
        },
      }
    );

    console.log("📄 Found user from DB:", user);

    if (!user) {
      console.log("❌ No user found for googleId:", decoded.userId);
      return res.status(404).json({ message: "User not found" });
    }

    // 🔐 Generate a new access token using googleId
    const newAccessToken = jwt.sign(
      {
        userId: user.googleId, // ✅ Ensure googleId is encoded as userId
        email: user.email,
        name: user.name,
        picture: user.picture,
        status: user.status,
        unanswered: user.unanswered || [],
      },
      JWT_SECRET,
      { expiresIn: "15m" }
    );

    // 📦 Build the userData object that gets returned to frontend
    const userData = {
      userId: user.googleId,
      email: user.email,
      name: user.name,
      picture: user.picture,
      status: user.status,
      unanswered: user.unanswered || [],
    };

    console.log("📦 Returning refreshed accessToken and userData:", {
      accessToken: newAccessToken,
      userData,
    });

    return res.json({ accessToken: newAccessToken, userData });
  } catch (error) {
    console.error("❌ Refresh token error:", error);

    res.clearCookie("access_token");
    res.clearCookie("refresh_token");
    res.clearCookie("user_data");

    return res.status(401).json({ message: "Invalid or expired refresh token" });
  }
}
