import db from "../conn.js";
import { ObjectId } from "mongodb";

export async function canDeleteQuest(req, res, next) {
  try {
    const { userId } = req.body;
    const { questionId } = req.params;

    if (!questionId) {
      return res.status(400).json({ message: "Question ID is required" });
    }

    const userIP = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    const questionsCollection = db.collection("questions");
    const usersCollection = db.collection("users");

    const question = await questionsCollection.findOne({ _id: new ObjectId(questionId) });
    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    let isAdmin = false;
    let authorIdentifier = `Anonymous_${userIP}`; // default fallback

    if (userId && !userId.startsWith("Anonymous_")) {
      const user = await usersCollection.findOne({ googleId: userId });
      isAdmin = user?.status === "admin";
      if (user) authorIdentifier = userId;
    } else if (userId) {
      // If already anonymous ID from frontend
      authorIdentifier = userId;
    }

    console.log(`🔍 Checking delete permissions for Question:
      userId = ${userId || "Anonymous"},
      isAdmin = ${isAdmin},
      question.authorId = ${question.authorId},
      authorIdentifier = ${authorIdentifier}
    `);

    if (String(question.authorId) === String(authorIdentifier) || isAdmin) {
      console.log("✅ Question deletion authorized.");
      return next();
    } else {
      console.log("❌ Deletion denied: Not the author or admin.");
      return res.status(403).json({ message: "You are not allowed to delete this question" });
    }

  } catch (error) {
    console.error("❌ Error checking delete permissions:", error);
    return res.status(500).json({ message: "Failed to check delete permissions" });
  }
}

export async function canDeleteAnswer(req, res, next) {
  try {
    const { userId } = req.body;
    const { questionId, answerId } = req.params;

    if (!questionId || !answerId) {
      return res.status(400).json({ message: "Question ID and Answer ID are required" });
    }

    const userIP = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    const questionsCollection = db.collection("questions");
    const usersCollection = db.collection("users");

    const question = await questionsCollection.findOne({ _id: new ObjectId(questionId) });
    if (!question) {
      console.log("❌ Question not found.");
      return res.status(404).json({ message: "Question not found" });
    }

    const answer = question.answers.find(ans => String(ans._id) === String(answerId));
    if (!answer) {
      console.log("❌ Answer not found.");
      return res.status(404).json({ message: "Answer not found" });
    }

    let isAdmin = false;
    let authorIdentifier = `Anonymous_${userIP}`; // default to anonymous

    if (userId && !userId.startsWith("Anonymous_")) {
      const user = await usersCollection.findOne({ googleId: userId });
      isAdmin = user?.status === "admin";
      if (user) authorIdentifier = userId; // override anonymous fallback
    } else if (userId) {
      // If userId is already an anonymous ID, use it directly
      authorIdentifier = userId;
    }

    console.log(`🔍 Checking delete permissions:
      userId = ${userId || "Anonymous"},
      isAdmin = ${isAdmin},
      authorId in answer = ${answer.authorId},
      authorIdentifier = ${authorIdentifier}
    `);

    if (String(answer.authorId) === String(authorIdentifier) || isAdmin) {
      console.log("✅ Deletion authorized.");
      return next();
    } else {
      console.log("❌ Deletion denied: Not author or admin.");
      return res.status(403).json({ message: "You are not allowed to delete this answer" });
    }

  } catch (error) {
    console.error("❌ Error checking delete permissions:", error);
    return res.status(500).json({ message: "Failed to check delete permissions" });
  }
}
