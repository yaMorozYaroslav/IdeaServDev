import db from "../conn.js";
import { ObjectId } from "mongodb";

// ✅ Create a personal question (already implemented)
export async function createPersonalQuestion(req, res) {
  try {
    const { title, recipientUserId, userId, name } = req.body;

    if (!title || title.trim().length === 0) {
      return res.status(400).json({ message: "Title cannot be empty" });
    }

    const ipAddress = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    const identifier = userId || `Anonymous_${ipAddress}`;
    const displayName = name || "Anonymous";

    const newQuestion = {
      _id: new ObjectId(),
      title: title.trim(),
      authorId: identifier,
      authorName: displayName,
      createdAt: new Date()
    };

    const result = await db.collection("users").updateOne(
      { googleId: recipientUserId },
      { $push: { unanswered: newQuestion } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Recipient user not found by Google ID" });
    }

    res.status(201).json({ message: "Personal question sent", question: newQuestion });
  } catch (err) {
    console.error("❌ Error creating personal question:", err);
    res.status(500).json({ message: "Failed to send personal question" });
  }
}

// ✅ Answer a personal question (PATCH /personal/answer/:questionId)
export async function answerPersonalQuestion(req, res) {
  try {
    const { questionId } = req.params;
    const { content, userId } = req.body;

    if (!content || !userId) {
      return res.status(400).json({ message: "Missing content or userId" });
    }

    const user = await db.collection("users").findOne({ googleId: userId });

    if (!user) {
      return res.status(404).json({ message: "User not found by Google ID" });
    }

    const unansweredIndex = user.unanswered.findIndex(
      (q) => q._id.toString() === questionId
    );

    if (unansweredIndex === -1) {
      return res.status(404).json({ message: "Question not found in unanswered list" });
    }

    const question = user.unanswered[unansweredIndex];

    const answeredQuestion = {
      ...question,
      answer: content.trim(),
      answeredAt: new Date(),
    };

    await db.collection("users").updateOne(
      { googleId: userId },
      {
        $pull: { unanswered: { _id: question._id } },
        $push: { answered: answeredQuestion },
      }
    );

    res.status(200).json({ message: "Question answered", question: answeredQuestion });
  } catch (err) {
    console.error("❌ Error answering personal question:", err);
    res.status(500).json({ message: "Failed to answer question" });
  }
}

// ✅ Delete a personal question (must be the receiver)
export async function deletePersonalQuestion(req, res) {
  try {
    const { questionId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const result = await db.collection("users").updateOne(
      { googleId: userId },
      {
        $pull: {
          unanswered: { _id: new ObjectId(questionId) },
          answered: { _id: new ObjectId(questionId) }
        }
      }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ message: "Question not found or not deleted" });
    }

    res.status(200).json({ message: "Question deleted" });
  } catch (err) {
    console.error("❌ Error deleting personal question:", err);
    res.status(500).json({ message: "Failed to delete question" });
  }
}
