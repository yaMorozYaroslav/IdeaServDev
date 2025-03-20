import db from "../conn.js";
import { ObjectId } from "mongodb";

export async function canDeleteQuest(req, res, next) {
    try {
        const userId = req.body.userId || req.headers["x-user-id"] || null;
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

        const user = userId ? await usersCollection.findOne({ googleId: userId }) : null;
        const isAdmin = user && user.status === "admin";

        // ✅ Ensure consistent anonymous ID format (prefix "Anonymous_" for storage & comparison)
        const authorIdentifier = userId ? userId : `Anonymous_${userIP}`;

        console.log(`🔍 Checking delete permissions for Question:
            UserID=${userId || "Anonymous"}, 
            Admin=${isAdmin}, 
            StoredAuthorID=${question.authorId}, 
            UserIP=${userIP}, 
            AuthorIdentifier=${authorIdentifier}`);

        if (String(question.authorId) === String(authorIdentifier) || isAdmin) {
            console.log("✅ Question deletion authorized.");
            return next();
        } else {
            console.log("❌ Deletion denied: User is not the author or admin.");
            return res.status(403).json({ message: "You are not allowed to delete this question" });
        }

    } catch (error) {
        console.error("❌ Error checking delete permissions:", error);
        return res.status(500).json({ message: "Failed to check delete permissions" });
    }
}

export async function canDeleteAnswer(req, res, next) {
    try {
        const userId = req.body.userId || req.headers["x-user-id"] || null;
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

        const user = userId ? await usersCollection.findOne({ googleId: userId }) : null;
        const isAdmin = user && user.status === "admin";

        // ✅ Ensure anonymous users are consistently stored and checked as "Anonymous_" + IP
        const authorIdentifier = userId ? userId : `Anonymous_${userIP}`;

        console.log(`🔍 Checking delete permissions for Answer:
            UserID=${userId || "Anonymous"}, 
            Admin=${isAdmin}, 
            StoredAuthorID=${answer.authorId}, 
            UserIP=${userIP}, 
            AuthorIdentifier=${authorIdentifier}`);

        if (String(answer.authorId) === String(authorIdentifier) || isAdmin) {
            console.log("✅ Answer deletion authorized.");
            return next();
        } else {
            console.log("❌ Deletion denied: User is not the author or admin.");
            return res.status(403).json({ message: "You are not allowed to delete this answer" });
        }

    } catch (error) {
        console.error("❌ Error checking delete permissions:", error);
        return res.status(500).json({ message: "Failed to check delete permissions" });
    }
}

