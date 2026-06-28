import express from 'express';
import { getExamQuestions, submitExam, loginCandidate, getMyChallenges, submitChallenge } from '../controllers/examController.js';

const router = express.Router();

router.get('/questions', getExamQuestions);
router.post('/submit', submitExam);
router.get('/my-challenges', getMyChallenges);
router.post('/submit-challenge', submitChallenge);
router.post('/login', loginCandidate);

export default router;
