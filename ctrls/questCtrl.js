import db from "../conn.js";
import { ObjectId } from "mongodb";

// Create a new question
export async function createQuestion(req, res) {
  try {
    let { title, userId, name } = req.body; // ✅ Include name

    if (!title || title.trim().length === 0) {
      return res.status(400).json({ message: "Title cannot be empty" });
    }

    let ipAddress = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    let identifier = userId ? userId : `Anonymous_${ipAddress}`;
    let displayName = name ? name : "Anonymous";

    const newQuestion = {
      title: title.trim(),
      authorId: identifier,  // ✅ Store userId or IP
      authorName: displayName, // ✅ Store user’s name or "Anonymous"
      createdAt: new Date(),
      likes: 0,
      likedBy: [],
      anonymousLikes: [],
      answers: [],
    };

    const questionsCollection = db.collection("questions");
    const result = await questionsCollection.insertOne(newQuestion);

    res.status(201).json({ ...newQuestion, _id: result.insertedId });

  } catch (error) {
    console.error("Error creating question:", error);
    res.status(500).json({ message: "Failed to create question" });
  }
}
// Get all questions
export async function getQuestions(req, res) {
  try {
    const questionsCollection = db.collection("questions");
    const questions = await questionsCollection.find({}).toArray();
    res.status(200).json(questions);
  } catch (error) {
    console.error("Error fetching questions:", error);
    res.status(500).json({ message: "Failed to fetch questions" });
  }
}

// Get a single question by ID
export const getQuestion = async (req, res) => {
    try {
        const { questionId } = req.params;
        const objectId = new ObjectId(questionId);

        const question = await db.collection("questions").findOne(
            { _id: objectId },
            { projection: { content: 0 } } // Exclude content from response
        );

        if (!question) {
            return res.status(404).json({ error: "Question not found" });
        }

        res.json(question);

    } catch (error) {
        console.error("Error fetching question:", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

export async function likeQuestion(req, res) {
  try {
    const { questionId } = req.params;
    let { userId } = req.body;

    // ✅ Ensure correct identifier for anonymous users
    if (!userId) {
      userId = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    }

    console.log(`Received like request for questionId: ${questionId} from user: ${userId}`);

    const questionsCollection = db.collection("questions");
    const question = await questionsCollection.findOne({ _id: new ObjectId(questionId) });
    if (!question) return res.status(404).json({ message: "Question not found" });

    // ✅ Ensure likedBy and anonymousLikes arrays exist
    if (!question.likedBy) question.likedBy = [];
    if (!question.anonymousLikes) question.anonymousLikes = [];

    // ✅ Ensure likes count is an integer
    if (typeof question.likes !== "number" || isNaN(question.likes)) {
      question.likes = 0;
    }

    // ✅ Check if user has already liked
    const isAnonymous = userId.includes(":") || userId.startsWith("Anonymous_");
    const hasLiked = isAnonymous
      ? question.anonymousLikes.includes(userId)
      : question.likedBy.includes(userId);

    if (hasLiked) {
      // ✅ Unlike the question
      question.likes = Math.max(0, question.likes - 1);
      if (isAnonymous) {
        question.anonymousLikes = question.anonymousLikes.filter(id => id !== userId);
      } else {
        question.likedBy = question.likedBy.filter(id => id !== userId);
      }
    } else {
      // ✅ Like the question
      question.likes += 1;
      if (isAnonymous) {
        question.anonymousLikes.push(userId);
      } else {
        question.likedBy.push(userId);
      }
    }

    // ✅ Update the database
    await questionsCollection.updateOne(
      { _id: new ObjectId(questionId) },
      { 
        $set: { 
          likes: question.likes,
          likedBy: question.likedBy,
          anonymousLikes: question.anonymousLikes
        }
      }
    );

    res.status(200).json({
      _id: questionId,
      likes: question.likes,
      likedBy: question.likedBy,
      anonymousLikes: question.anonymousLikes
    });

  } catch (error) {
    console.error("Error toggling like:", error);
    res.status(500).json({ message: "Failed to toggle like" });
  }
}

export async function deleteQuestion(req, res) {
  try {
    console.log("Received DELETE request for question:", req.params.questionId);
    console.log("Request body:", req.body);

    const { questionId } = req.params;
    let { userId } = req.body; // ✅ Extract userId from request

    // ✅ Get IP for anonymous users
    let userIP = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    let identifier = userId ? userId : `Anonymous_${userIP}`;

    console.log(`User attempting to delete: ${userId} or IP: ${userIP}`);

    const questionsCollection = db.collection("questions");
    const usersCollection = db.collection("users"); // ✅ Get users collection

    const question = await questionsCollection.findOne({ _id: new ObjectId(questionId) });

    if (!question) {
      console.log("❌ Question not found.");
      return res.status(404).json({ message: "Question not found" });
    }

    console.log("✅ Found question:", question);

    // ✅ Check if the user is an admin
    let adminUser = null;
    if (userId) {
      adminUser = await usersCollection.findOne({ googleId: userId, status: "admin" });
    }
    const isAdmin = adminUser !== null;

    console.log(`Admin check: userId=${userId}, Found admin? ${isAdmin}`);

    // ✅ Allow delete if:
    // - User is the **owner** (userId matches `authorId` OR IP matches)
    // - User is an **admin**
    if (question.authorId === identifier || isAdmin) {
      console.log("✅ User authorized to delete question.");
      await questionsCollection.deleteOne({ _id: new ObjectId(questionId) });
      console.log("✅ Question deleted successfully.");
      return res.status(200).json({ message: "Question deleted successfully" });
    }

    console.log("❌ User is NOT allowed to delete this question.");
    return res.status(403).json({ message: "You are not allowed to delete this question" });

  } catch (error) {
    console.error("❌ Error deleting question:", error);
    res.status(500).json({ message: "Failed to delete question" });
  }
}

