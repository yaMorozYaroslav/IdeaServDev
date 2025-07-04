import axios from "axios";
import jwt from "jsonwebtoken";
import db from "../conn.js";

// 🔍 Public profile route
export async function getPublicUserProfile(req, res) {
  try {
    const { userId } = req.params;
    console.log("📡 Public profile request:", userId);
    console.log("🕵️ token?", req.body?.token);

    let requesterId = null;

    try {
      if (req.body?.token) {
        const decoded = jwt.verify(req.body.token, process.env.JWT_SECRET || "test");
        requesterId = decoded.userId;
      }
    } catch (err) {
      console.warn("⚠️ Token verification failed, continuing as anonymous:", err.message);
    }

    const isOwner = requesterId === userId;

    const projection = {
      name: 1,
      picture: 1,
      googleId: 1,
      answered: 1,
      ...(isOwner ? { unanswered: 1 } : {}),
    };

    const user = await db.collection("users").findOne({ googleId: userId }, { projection });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json(user);
  } catch (err) {
    console.error("❌ getPublicUserProfile error:", err);
    return res.status(500).json({ message: "Failed to fetch user" });
  }
}

export async function handleOAuthCallback(req, res) {
  console.log("🚀 Reached /google/oauth/callback");

  const code = req.query.code;
  if (!code) return res.status(400).json({ message: "Authorization code is missing" });

  try {
    const HOST = process.env.HOST || "PRODUCTION";
    let REDIRECT_URI = "";
    let clientRedirectBase = "";

    if (HOST === "LOCAL") {
      REDIRECT_URI = "http://localhost:5000/google/oauth/callback";
      clientRedirectBase = "http://localhost:3000";
    } else if (HOST === "DEVELOPMENT") {
      REDIRECT_URI = "https://idea-sphere-dev-30492dbf5e99.herokuapp.com/google/oauth/callback";
      clientRedirectBase = "https://idea-sphere-dev.vercel.app";
    } else {
      REDIRECT_URI = "https://idea-sphere-50bb3c5bc07b.herokuapp.com/google/oauth/callback";
      clientRedirectBase = "https://idea-sphere.vercel.app";
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
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const tokens = tokenResponse.data;

    const profileResponse = await axios.get(
      "https://openidconnect.googleapis.com/v1/userinfo",
      { headers: { Authorization: `Bearer ${tokens.access_token}` } }
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
      { userId: user.googleId, email: user.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    const userData = {
      userId: user.googleId,
      email: user.email,
      name: user.name,
      picture: user.picture,
      status: user.status,
      unanswered: dbUser?.unanswered || [],
    };

    const redirectUrl = `${clientRedirectBase}/popup?access_token=${encodeURIComponent(
      accessToken
    )}&refresh_token=${encodeURIComponent(refreshToken)}&user_data=${encodeURIComponent(
      JSON.stringify(userData)
    )}`;

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

// 🔐 Get user from access token
export async function getUserData(req, res) {
  const { accessToken } = req.body;

  if (!accessToken) {
    return res.status(401).json({ message: "Access token is required" });
  }

  try {
    const user = jwt.verify(accessToken, process.env.JWT_SECRET || "test");

    const dbUser = await db.collection("users").findOne(
      { googleId: user.userId },
      { projection: { unanswered: 1 } }
    );

    res.json({
      id: user.userId,
      name: user.name,
      email: user.email,
      picture: user.picture,
      status: user.status,
      unanswered: dbUser?.unanswered || [],
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

// 🔁 Refresh token controller for Express backend
export async function refreshToken(req, res) {
  console.log("🔥 /google/refresh HIT");
  console.log("📥 Incoming request body:", req.body);

  try {
    const JWT_SECRET = process.env.JWT_SECRET || "test";
    const token = req.body?.refreshToken || req.body?.token;
    console.log("🪪 Extracted token:", token);

    if (!token) {
      console.warn("🚫 No token received in request");
      return res.status(401).json({ message: "No refresh token provided" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    console.log("🔓 Decoded refresh token:", decoded);

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

    if (!user) {
      console.warn("❌ No user found with googleId:", decoded.userId);
      return res.status(404).json({ message: "User not found" });
    }

    const userData = {
      userId: user.googleId,
      email: user.email,
      name: user.name,
      picture: user.picture,
      status: user.status,
      unanswered: user.unanswered || [],
    };

    const newAccessToken = jwt.sign(userData, JWT_SECRET, { expiresIn: "15m" });

    console.log("✅ Returning data to frontend:");
    console.log("   - accessToken:", newAccessToken.slice(0, 30) + "...");
    console.log("   - userData:", userData);

    return res.status(200).json({
      accessToken: newAccessToken,
      userData,
    });
  } catch (error) {
    console.error("❌ Error in /google/refresh:", error.message);

    res.clearCookie("access_token");
    res.clearCookie("refresh_token");
    res.clearCookie("user_data");

    return res.status(401).json({ message: "Invalid or expired refresh token" });
  }
}
