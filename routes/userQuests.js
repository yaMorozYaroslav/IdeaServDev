import express from 'express';
import {
  createPersonalQuestion,
  answerPersonalQuestion,
  deletePersonalQuestion
} from '../ctrls/questUserCtrl.js';
import { verifyToken } from '../middl/verify.js';

const router = express.Router();

// Create a personal question (anonymous to a user)
router.post('/new', createPersonalQuestion); // No auth needed (anonymous askers)

// Move question from unanswered to answered (auth required)
router.patch('/answer/:questionId', answerPersonalQuestion);

// Delete question (auth required, must be the receiver)
router.delete('/:questionId',  verifyToken, deletePersonalQuestion);

export default router;
