import jwt from "jsonwebtoken";
import db from "../conn.js";
import { ObjectId } from "mongodb";

// ✅ Middleware to verify access token from cookies
export function verifyToken(req, res, next) {
  const token = req.cookies?.access_token;

  if (!token) {
    console.warn("⚠️ No access token provided.");
    return res.status(401).json({ message: "Unauthorized: No token" });
  }

  try {
    const JWT_SECRET = process.env.JWT_SECRET || "test";
    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = {
      googleId: decoded.userId,
      email: decoded.email,
      name: decoded.name,
      picture: decoded.picture,
      status: decoded.status,
    };

    next();
  } catch (err) {
    console.error("❌ Invalid access token:", err.message);
    return res.status(401).json({ message: "Unauthorized: Invalid token" });
  }
}

// ✅ Middleware to check if user can delete a general question
export async function canDeleteQuest(req, res, next) {
  try {
    const { questionId } = req.params;
    const questionsCollection = db.collection("questions");

    const question = await questionsCollection.findOne({
      _id: new ObjectId(questionId),
    });

    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    const user = req.user;
    const ipAddress = req.headers["x-forwarded-for"] || req.connection.remoteAddress;

    const isOwner = question.authorId === user?.googleId;
    const isAdmin = user?.status === "admin";
    const isSameIp = question.authorId?.startsWith("Anonymous_") && question.authorId.endsWith(ipAddress);

    if (isOwner || isAdmin || isSameIp) {
      return next();
    }

    return res.status(403).json({ message: "Forbidden: You can't delete this question" });
  } catch (err) {
    console.error("❌ Error in canDeleteQuest:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// ✅ Middleware to check if user can delete an answer
export async function canDeleteAnswer(req, res, next) {
  try {
    const { questionId, answerId } = req.params;
    const questionsCollection = db.collection("questions");

    const question = await questionsCollection.findOne({
      _id: new ObjectId(questionId),
    });

    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    const answer = question.answers.find(a => a._id.toString() === answerId);
    if (!answer) {
      return res.status(404).json({ message: "Answer not found" });
    }

    const user = req.user;
    const isOwner = answer.authorId === user?.googleId;
    const isQuestionOwner = question.authorId === user?.googleId;
    const isAdmin = user?.status === "admin";

    if (isOwner || isQuestionOwner || isAdmin) {
      return next();
    }

    return res.status(403).json({ message: "Forbidden: You can't delete this answer" });
  } catch (err) {
    console.error("❌ Error in canDeleteAnswer:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}
