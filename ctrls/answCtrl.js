import db from "../conn.js";
import { ObjectId } from "mongodb";

// Add an answer to a question
export async function answerQuestion(req, res) {
  try {
    const { questionId } = req.params;
    const { content, userId } = req.body;

    if (!ObjectId.isValid(questionId)) return res.status(400).json({ message: "Invalid question ID format" });
    if (!content) return res.status(400).json({ message: "Answer content is required" });

    const questionsCollection = db.collection("questions");

    const answer = {
      _id: new ObjectId(),
      content,
      author: userId || "Anonymous",
      createdAt: new Date(),
      likes: 0,
      likedBy: [],
    };

    const result = await questionsCollection.updateOne(
      { _id: new ObjectId(questionId) },
      { $push: { answers: answer } }
    );

    if (result.modifiedCount === 0) return res.status(404).json({ message: "Question not found" });

    const updatedQuestion = await questionsCollection.findOne({ _id: new ObjectId(questionId) });
    res.status(201).json(updatedQuestion);
  } catch (error) {
    console.error("Error posting answer:", error);
    res.status(500).json({ message: "Failed to post answer" });
  }
}

// Like/unlike an answer
export async function likeAnswer(req, res) {
  try {
    const { questionId, answerId } = req.params;
    const { userId } = req.body;

    if (!ObjectId.isValid(questionId) || !ObjectId.isValid(answerId))
      return res.status(400).json({ message: "Invalid question or answer ID format" });

    const questionsCollection = db.collection("questions");

    const question = await questionsCollection.findOne({
      _id: new ObjectId(questionId),
      "answers._id": new ObjectId(answerId),
    });

    if (!question) return res.status(404).json({ message: "Question not found" });

    const answerIndex = question.answers.findIndex(ans => ans._id.equals(new ObjectId(answerId)));
    if (answerIndex === -1) return res.status(404).json({ message: "Answer not found" });

    const hasLiked = question.answers[answerIndex].likedBy.includes(userId);
    const updateQuery = hasLiked
      ? { $inc: { [`answers.${answerIndex}.likes`]: -1 }, $pull: { [`answers.${answerIndex}.likedBy`]: userId } }
      : { $inc: { [`answers.${answerIndex}.likes`]: 1 }, $push: { [`answers.${answerIndex}.likedBy`]: userId } };

    await questionsCollection.updateOne({ _id: new ObjectId(questionId) }, updateQuery);
    const updatedQuestion = await questionsCollection.findOne({ _id: new ObjectId(questionId) });
    res.status(200).json(updatedQuestion);
  } catch (error) {
    console.error("Error toggling like:", error);
    res.status(500).json({ message: "Failed to toggle like" });
  }
}

// Delete an answer
export async function deleteAnswer(req, res) {
  try {
    const { questionId, answerId } = req.params;

    if (!ObjectId.isValid(questionId) || !ObjectId.isValid(answerId))
      return res.status(400).json({ message: "Invalid question or answer ID format" });

    const questionsCollection = db.collection("questions");

    const result = await questionsCollection.updateOne(
      { _id: new ObjectId(questionId) },
      { $pull: { answers: { _id: new ObjectId(answerId) } } }
    );

    if (result.modifiedCount === 0) return res.status(404).json({ message: "Answer not found" });

    res.status(200).json({ message: "Answer deleted successfully" });
  } catch (error) {
    console.error("Error deleting answer:", error);
    res.status(500).json({ message: "Failed to delete answer" });
  }
}
