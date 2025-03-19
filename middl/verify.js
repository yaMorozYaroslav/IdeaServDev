import db from "../conn.js";
import { ObjectId } from "mongodb";

export async function verifyToken(req, res, next) {
  const accessToken = req.cookies?.access_token;
  const refreshToken = req.cookies?.refresh_token;

  if (!accessToken && !refreshToken) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  try {
    // 🔍 Verify access token
    await axios.get("https://www.googleapis.com/oauth2/v1/tokeninfo", {
      params: { access_token: accessToken },
    });

    const user = jwt.verify(accessToken, "test");

    req.user = {
      id: user.userId,
      email: user.email,
      status: user.status || "user",
      ip: req.headers["x-forwarded-for"] || req.connection.remoteAddress,
    };

    return next();
  } catch (error) {
    if (refreshToken) {
      try {
        const decodedRefresh = jwt.verify(refreshToken, "test");

        // 🔥 Generate new access token
        const newAccessToken = jwt.sign(
          { userId: decodedRefresh.userId, email: decodedRefresh.email, status: decodedRefresh.status || "user" },
          "test",
          { expiresIn: "15m" }
        );

        // ✅ Update cookies with the new access token
        res.cookie("access_token", newAccessToken, {
          httpOnly: true,
          secure: true,
          sameSite: "None",
          maxAge: 15 * 60 * 1000,
        });

        req.user = {
          id: decodedRefresh.userId,
          email: decodedRefresh.email,
          status: decodedRefresh.status || "user",
          ip: req.headers["x-forwarded-for"] || req.connection.remoteAddress,
        };

        console.log("✅ New access token issued:", newAccessToken);
        return next();
      } catch (refreshError) {
        return res.status(401).json({ message: "Invalid refresh token" });
      }
    } else {
      return res.status(401).json({ message: "Session expired, please log in again" });
    }
  }
}

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

