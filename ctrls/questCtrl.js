import db from "../conn.js";
import { ObjectId } from "mongodb";

// Create a new question
export const createQuestion = async (req, res) => {
    try {
        const { title, author } = req.body; // Remove `content` from here

        if (!title || !author) {
            return res.status(400).json({ error: "Title and author are required" });
        }

        const newQuestion = {
            title,
            author,
            likes: [], // Ensure likes field exists
            anonymousLikes: [],
            createdAt: new Date(),
        };

        const result = await db.collection("questions").insertOne(newQuestion);

        console.log("New question created:", result.insertedId);

        res.status(201).json({ _id: result.insertedId, ...newQuestion });

    } catch (error) {
        console.error("Error creating question:", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

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


// Like/unlike a question
export const likeQuestion = async (req, res) => {
    try {
        const { questionId } = req.params;
        const { userId } = req.body;
        const userIp = req.ip; // Capture user's IP

        console.log("Received like request for questionId:", questionId, "from user:", userId || "Anonymous");

        // Ensure questionId is correctly formatted
        if (!questionId) {
            return res.status(400).json({ error: "Question ID is required." });
        }

        const question = await db.collection("questions").findOne({ _id: new ObjectId(questionId) });

        if (!question) {
            console.log("Question not found in database:", questionId); // Log issue
            return res.status(404).json({ error: "Question not found" });
        }

        let likes = question.likes || [];
        let anonymousLikes = question.anonymousLikes || [];

        if (userId) {
            if (likes.includes(userId)) {
                likes = likes.filter(id => id !== userId);
            } else {
                likes.push(userId);
            }
        } else {
            if (anonymousLikes.includes(userIp)) {
                return res.status(400).json({ error: "You have already liked this question." });
            } else {
                anonymousLikes.push(userIp);
            }
        }

        await db.collection("questions").updateOne(
            { _id: questionId },
            { $set: { likes, anonymousLikes } }
        );

        const updatedQuestion = await db.collection("questions").findOne({ _id:  new ObjectId(questionId) });

        console.log("Updated question:", updatedQuestion);

        res.json(updatedQuestion);

    } catch (error) {
        console.error("Error in likeQuestion:", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};




// Delete a question
export async function deleteQuestion(req, res) {
  try {
    const { questionId } = req.params;
    if (!ObjectId.isValid(questionId)) return res.status(400).json({ message: "Invalid question ID" });

    const questionsCollection = db.collection("questions");
    const result = await questionsCollection.deleteOne({ _id: new ObjectId(questionId) });

    if (result.deletedCount === 0) return res.status(404).json({ message: "Question not found" });

    res.status(200).json({ message: "Question deleted successfully" });
  } catch (error) {
    console.error("Error deleting question:", error);
    res.status(500).json({ message: "Failed to delete question" });
  }
}
