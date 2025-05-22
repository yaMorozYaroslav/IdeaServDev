import jwt from "jsonwebtoken";
import db from "../conn.js";
import { ObjectId } from "mongodb";

/**
 * ✅ Middleware to verify access token from cookies
 * Attaches decoded user to req.user
 */
export function verifyToken(req, res, next) {
  const token = req.cookies?.access_token;

  console.log("🔍 Incoming DELETE request cookies:", req.cookies);
  console.log("🔑 access_token:", token);

  if (!token) {
    return res.status(401).json({ message: "Unauthorized: No token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "test");
    console.log("✅ Token decoded:", decoded);

    req.user = {
      googleId: decoded.userId,
      email: decoded.email,
      name: decoded.name,
      picture: decoded.picture,
      status: decoded.status,
    };

    next();
  } catch (err) {
    console.error("❌ Invalid token:", err.message);
    return res.status(401).json({ message: "Unauthorized: Invalid token" });
  }
}

export async function canDeleteQuest(req, res, next) {
  try {
    const { questionId } = req.params;
    const question = await db.collection("questions").findOne({
      _id: new ObjectId(questionId),
    });

    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    const ipAddress = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    const user = req.user;

    const isOwner = question.authorId === user?.googleId;
    const isAdmin = user?.status === "admin";
    const isSameIp = question.authorId?.startsWith("Anonymous_") && question.authorId.endsWith(ipAddress);

    if (isOwner || isAdmin || isSameIp) {
      return next();
    }

    console.warn("🚫 Deletion not authorized: ", {
      user: user?.googleId,
      questionAuthor: question.authorId,
      ipMatch: isSameIp,
    });

    return res.status(403).json({ message: "Forbidden: You can't delete this question" });
  } catch (err) {
    console.error("❌ Error in canDeleteQuest:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * ✅ Middleware to authorize deletion of an answer
 * Permits: answer author, question author, or admin
 */
export async function canDeleteAnswer(req, res, next) {
  try {
    const { questionId, answerId } = req.params;
    const question = await db.collection("questions").findOne({
      _id: new ObjectId(questionId),
    });

    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    const answer = question.answers?.find(a => a._id.toString() === answerId);
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

    console.warn("🚫 Deletion of answer not authorized:", {
      user: user?.googleId,
      answerAuthor: answer.authorId,
      questionOwner: question.authorId,
    });

    return res.status(403).json({ message: "Forbidden: You can't delete this answer" });
  } catch (err) {
    console.error("❌ Error in canDeleteAnswer:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}
