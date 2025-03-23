import express from 'express';
import { handleOAuthCallback, getUserData, 
	     refreshToken, logoutUser } from '../ctrls/google.js';

const router = express.Router();

router.get('/oauth/callback', handleOAuthCallback);
router.post('/me', getUserData);
router.post('/logout', logoutUser); // ✅ Added logout route
router.post('/refresh', refreshToken)
export default router;
