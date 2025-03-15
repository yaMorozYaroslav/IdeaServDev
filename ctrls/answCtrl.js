import db from "../conn.js";
import { ObjectId } from "mongodb";

// Add an answer to a question
export async function answerQuestion(req, res) {
  try {
    let { content, userId } = req.body;
    const { questionId } = req.params;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: "Answer cannot be empty" });
    }

    // ✅ Assign unique identifier: userId for logged-in users, IP for anonymous users
    let identifier = userId ? userId : `Anonymous_${req.headers["x-forwarded-for"] || req.connection.remoteAddress}`;

    const questionsCollection = db.collection("questions");
    const question = await questionsCollection.findOne({ _id: new ObjectId(questionId) });

    if (!question) return res.status(404).json({ message: "Question not found" });

    const newAnswer = {
      _id: new ObjectId(), // ✅ Create a unique ObjectId for each answer
      content: content.trim(),
      authorId: identifier, // ✅ Store user ID or IP
      createdAt: new Date(),
      likes: 0,
      likedBy: [],
      anonymousLikes: []
    };

    await questionsCollection.updateOne(
      { _id: new ObjectId(questionId) },
      { $push: { answers: newAnswer } }
    );

    res.status(201).json(newAnswer);

  } catch (error) {
    console.error("Error creating answer:", error);
    res.status(500).json({ message: "Failed to create answer" });
  }
}

export async function likeAnswer(req, res) {
  try {
    const { questionId, answerId } = req.params;
    let { userId } = req.body;

    if (!userId) {
      userId = req.headers["x-forwarded-for"] || req.connection.remoteAddress || "Anonymous_" + Math.random().toString(36).substr(2, 9);
    }

    console.log(`Processing like for answer ${answerId} on question ${questionId} by user: ${userId}`);

    const questionsCollection = db.collection("questions");
    const question = await questionsCollection.findOne({ _id: new ObjectId(questionId) });
    if (!question) return res.status(404).json({ message: "Question not found" });

    const answerIndex = question.answers.findIndex(ans => ans._id.equals(new ObjectId(answerId)));
    if (answerIndex === -1) return res.status(404).json({ message: "Answer not found" });

    const answer = question.answers[answerIndex];
    if (!answer.likedBy) answer.likedBy = [];
    if (!answer.anonymousLikes) answer.anonymousLikes = [];

    // ✅ Ensure likes count is an integer
    if (typeof answer.likes !== "number" || isNaN(answer.likes)) {
      answer.likes = 0;
    }

    // ✅ Check if user already liked the answer
    const hasLiked = answer.likedBy.includes(userId) || answer.anonymousLikes.includes(userId);

    if (hasLiked) {
      answer.likes = Math.max(0, answer.likes - 1);
      answer.likedBy = answer.likedBy.filter(id => id !== userId);
      answer.anonymousLikes = answer.anonymousLikes.filter(id => id !== userId);
    } else {
      answer.likes += 1;
      if (userId.startsWith("Anonymous_")) {
        answer.anonymousLikes.push(userId);
      } else {
        answer.likedBy.push(userId);
      }
    }

    await questionsCollection.updateOne(
      { _id: new ObjectId(questionId), "answers._id": new ObjectId(answerId) },
      { 
        $set: { 
          [`answers.${answerIndex}.likes`]: answer.likes, 
          [`answers.${answerIndex}.likedBy`]: answer.likedBy,
          [`answers.${answerIndex}.anonymousLikes`]: answer.anonymousLikes
        }
      }
    );

    res.status(200).json(answer);

  } catch (error) {
    console.error("Error toggling like:", error);
    res.status(500).json({ message: "Failed to toggle like" });
  }
}

export async function deleteAnswer(req, res) {
  try {
    const { questionId, answerId } = req.params;
    let { userId } = req.body; // ✅ Contains userId if logged in

    // ✅ Determine user identity (IP for anonymous users)
    let identifier = userId ? userId : `Anonymous_${req.headers["x-forwarded-for"] || req.connection.remoteAddress}`;

    const questionsCollection = db.collection("questions");
    const question = await questionsCollection.findOne({ _id: new ObjectId(questionId) });

    if (!question) return res.status(404).json({ message: "Question not found" });

    const answer = question.answers.find(ans => ans._id.equals(new ObjectId(answerId)));
    if (!answer) return res.status(404).json({ message: "Answer not found" });

    // ✅ Check if user is the owner or an admin
    if (answer.authorId !== identifier && userId !== "admin") {
      return res.status(403).json({ message: "You are not allowed to delete this answer" });
    }

    // ✅ Remove the answer from the array
    await questionsCollection.updateOne(
      { _id: new ObjectId(questionId) },
      { $pull: { answers: { _id: new ObjectId(answerId) } } }
    );

    res.status(200).json({ message: "Answer deleted successfully" });

  } catch (error) {
    console.error("Error deleting answer:", error);
    res.status(500).json({ message: "Failed to delete answer" });
  }
}

