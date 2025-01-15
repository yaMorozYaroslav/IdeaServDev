import db from "../conn.js"
import jwt from 'jsonwebtoken'
const secret = 'test'

async function googleCallback(accessToken, refreshToken, profile, done) {
  try {  
    const usersCollection = await db.collection("users");

    const existingUser = await usersCollection.findOne({ email: profile.emails[0].value });

    if (existingUser) {
      // Update user if needed...

      const token = jwt.sign({ userId: existingUser._id }, secret);
      return done(null, { token });
    } else {
      const newUser = {
        email: profile.emails[0].value,
        name: profile.displayName,
        // ... other properties
      };
      const result = await usersCollection.insertOne(newUser);

      const token = jwt.sign({ userId: result.insertedId }, secret);
      console.log(profile)
      return done(null, { token });
    }
  } catch (error) {
    return done(error);
  }
}
export default { googleCallback };
