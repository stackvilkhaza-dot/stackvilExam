import express from 'express';
import {
    loginAdmin,
    getDashboardStats,
    getQuestions,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    getResults,
    getResultById,
    deleteResult,
    uploadPdf,
    getExamSets,
    setActiveExamSet,
    startAllExams,
    stopAllExams,
    getAssignments,
    createAssignment,
    deleteAssignment,
    getCandidates,
    getCandidateById,
    createCandidate,
    resetDatabase,
    createCodingChallenge,
    getCandidateChallenges,
    updateCodingChallenge,
    deleteCodingChallenge,
    uploadImage
} from '../controllers/adminController.js';
import { protect } from '../middleware/authMiddleware.js';
import { upload, imageUpload } from '../middleware/upload.js';

const router = express.Router();

router.post('/login', loginAdmin);
router.post('/reset-db', protect, resetDatabase);
router.put('/start-all-exams', protect, startAllExams);
router.put('/stop-all-exams', protect, stopAllExams);

router.route('/dashboard').get(protect, getDashboardStats);

router.route('/questions')
    .get(protect, getQuestions)
    .post(protect, createQuestion);

router.route('/questions/:id')
    .put(protect, updateQuestion)
    .delete(protect, deleteQuestion);

router.route('/results')
    .get(protect, getResults);

router.route('/results/:id')
    .get(protect, getResultById)
    .delete(protect, deleteResult);

router.route('/exam-sets')
    .get(protect, getExamSets);

router.route('/exam-sets/:id/activate')
    .put(protect, setActiveExamSet);

router.route('/assignments')
    .get(protect, getAssignments)
    .post(protect, createAssignment);

router.route('/assignments/:id')
    .delete(protect, deleteAssignment);

router.route('/candidates')
    .get(protect, getCandidates)
    .post(protect, createCandidate);

router.route('/candidates/:id')
    .get(protect, getCandidateById);

router.post('/upload-pdf', protect, upload.single('pdf'), uploadPdf);
router.post('/upload-image', protect, imageUpload.single('image'), uploadImage);

router.get('/candidates/:id/challenges', protect, getCandidateChallenges);
router.post('/challenges', protect, createCodingChallenge);

router.route('/challenges/:id')
    .put(protect, updateCodingChallenge)
    .delete(protect, deleteCodingChallenge);

export default router;
