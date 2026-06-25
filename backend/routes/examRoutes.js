import express from 'express';
import { getExamQuestions, submitExam, loginCandidate, submitCoding } from '../controllers/examController.js';

const router = express.Router();

router.get('/questions', getExamQuestions);
router.post('/submit', submitExam);
router.post('/submit-coding', submitCoding);
router.post('/login', loginCandidate);

export default router;
