import db from "../conn.js";
import { ObjectId } from "mongodb";

// ✅ Middleware to authorize deletion of a general question
export async function canDeleteQuest(req, res, next) {
  try {
    const { questionId } = req.params;
    const { userId } = req.body;

    const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    const identifier = userId || `Anonymous_${ip}`;

    const questionsCollection = db.collection("questions");
    const usersCollection = db.collection("users");

    const question = await questionsCollection.findOne({
      _id: new ObjectId(questionId),
    });

    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    const adminUser = userId
      ? await usersCollection.findOne({ googleId: userId, status: "admin" })
      : null;

    const isOwner = question.authorId === identifier;
    const isAdmin = !!adminUser;
    const isSameIp =
      question.authorId?.startsWith("Anonymous_") &&
      question.authorId.endsWith(ip);

    console.log("🧾 Backend received userId:", userId);
    console.log("🧾 Resolved identifier:", identifier);
    console.log("📌 Question.authorId:", question.authorId);
    console.log("🔐 isAdmin:", isAdmin);

    if (isOwner || isAdmin || isSameIp) {
      return next();
    }

    return res.status(403).json({ message: "You are not allowed to delete this question" });
  } catch (err) {
    console.error("❌ Error in canDeleteQuest:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// ✅ Middleware to authorize deletion of an answer
export async function canDeleteAnswer(req, res, next) {
  try {
    const { questionId, answerId } = req.params;
    const { userId } = req.body;

    const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    const identifier = userId || `Anonymous_${ip}`;

    const questionsCollection = db.collection("questions");
    const usersCollection = db.collection("users");

    const question = await questionsCollection.findOne({
      _id: new ObjectId(questionId),
    });

    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    const answer = question.answers?.find((a) => a._id.toString() === answerId);
    if (!answer) {
      return res.status(404).json({ message: "Answer not found" });
    }

    const adminUser = userId
      ? await usersCollection.findOne({ googleId: userId, status: "admin" })
      : null;

    const isOwner = answer.authorId === identifier;
    const isQuestionOwner = question.authorId === identifier;
    const isAdmin = !!adminUser;

    if (isOwner || isQuestionOwner || isAdmin) {
      return next();
    }

    console.warn("🚫 Deletion of answer not authorized:", {
      user: userId,
      answerAuthor: answer.authorId,
      questionOwner: question.authorId,
    });

    return res.status(403).json({ message: "You are not allowed to delete this answer" });
  } catch (err) {
    console.error("❌ Error in canDeleteAnswer:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}
export async function canDeletePersonalQuestion(req, res) {
  try {
    const { questionId } = req.params;
    let { userId } = req.body;

    const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    const identifier = userId || `Anonymous_${ip}`;

    const usersCollection = db.collection("users");

    const targetUser = await usersCollection.findOne({
      $or: [
        { "unanswered._id": new ObjectId(questionId) },
        { "answered._id": new ObjectId(questionId) },
      ],
    });

    if (!targetUser) {
      return res.status(404).json({ message: "Question not found" });
    }

    const isOwner = targetUser.googleId === userId; // ✅ profile owner
    const isAuthor =
      targetUser.unanswered?.some(q => q._id.toString() === questionId && q.authorId === identifier) ||
      targetUser.answered?.some(q => q._id.toString() === questionId && q.authorId === identifier);

    const adminUser = userId
      ? await usersCollection.findOne({ googleId: userId, status: "admin" })
      : null;

    const isAdmin = !!adminUser;

    console.log("🧾 Backend received userId:", userId);
    console.log("🧾 Resolved identifier:", identifier);
    console.log("🔐 isAdmin:", isAdmin);
    console.log("👤 isProfileOwner:", isOwner);
    console.log("✍️ isAuthor:", isAuthor);

    if (!(isOwner || isAuthor || isAdmin)) {
      return res.status(403).json({ message: "You are not allowed to delete this personal question" });
    }

    const result = await usersCollection.updateOne(
      { _id: targetUser._id },
      {
        $pull: {
          unanswered: { _id: new ObjectId(questionId) },
          answered: { _id: new ObjectId(questionId) },
        },
      }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ message: "Question not found or already deleted" });
    }

    res.status(200).json({ message: "Question deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting personal question:", err);
    res.status(500).json({ message: "Failed to delete question" });
  }
}
