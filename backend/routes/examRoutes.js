import express from 'express';
import { getExamQuestions, submitExam, loginCandidate } from '../controllers/examController.js';

const router = express.Router();

router.get('/questions', getExamQuestions);
router.post('/submit', submitExam);
router.post('/login', loginCandidate);

export default router;
