import Question from '../models/Question.js';
import Result from '../models/Result.js';
import ExamSet from '../models/ExamSet.js';
import ExamAssignment from '../models/ExamAssignment.js';
import Candidate from '../models/Candidate.js';
import CodingChallenge from '../models/CodingChallenge.js';
import CodingSubmission from '../models/CodingSubmission.js';
import bcrypt from 'bcryptjs';

// @desc    Get all questions for exam (without answers)
// @route   GET /api/exam/questions
// @access  Public
export const getExamQuestions = async (req, res) => {
    try {
        const email = req.query.email?.toLowerCase().trim();

        let examSetIdToUse;

        if (email) {
            const existingResult = await Result.findOne({ candidateEmail: email });
            if (existingResult) {
                return res.status(403).json({ message: 'Your exam has been submitted and is currently under review.' });
            }

            const assignment = await ExamAssignment.findOne({ candidateEmail: email }).populate('examSetId');
            if (assignment && assignment.examSetId) {
                if (!assignment.examSetId.isActive) {
                    return res.status(403).json({ message: 'The Admin has not started this exam yet. Please wait.' });
                }
                examSetIdToUse = assignment.examSetId._id;
            }
        }

        // If no specific assignment, we fall back to the global active set (or return error if strict)
        // Based on plan: "Block them with an error message saying 'No exam assigned to this email'."
        if (!examSetIdToUse) {
            return res.status(403).json({ message: 'NO EXAM IS CURRENTLY ASSIGNED.' });
        }

        const questions = await Question.find({ examSetId: examSetIdToUse }).select('-correctAnswer -createdAt -__v').sort({ order: 1 });
        res.json(questions);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Submit exam answers
// @route   POST /api/exam/submit
// @access  Public
export const submitExam = async (req, res) => {
    const { candidateName, candidateEmail, answers } = req.body;

    if (!candidateName || !candidateEmail || !answers) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
        let correctCount = 0;
        let wrongCount = 0;
        let score = 0;

        const evaluatedAnswers = await Promise.all(answers.map(async (ans) => {
            const question = await Question.findById(ans.questionId);
            if (!question) {
                return null;
            }

            const isCorrect = question.correctAnswer === ans.selectedAnswer;

            if (isCorrect) {
                correctCount++;
                score += question.marks;
            } else {
                wrongCount++;
            }

            return {
                questionId: ans.questionId,
                selectedAnswer: ans.selectedAnswer,
                isCorrect
            };
        }));

        // Filter out any nulls if question wasn't found
        const validAnswers = evaluatedAnswers.filter(ans => ans !== null);

        const result = await Result.create({
            candidateName,
            candidateEmail,
            answers: validAnswers,
            correctCount,
            wrongCount,
            score
        });

        res.status(201).json({ message: 'Exam submitted successfully', resultId: result._id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Login a candidate
// @route   POST /api/exam/login
// @access  Public
export const loginCandidate = async (req, res) => {
    const { email, password } = req.body;

    try {
        const candidate = await Candidate.findOne({ email: email.toLowerCase().trim() });

        if (!candidate) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const isMatch = await bcrypt.compare(password, candidate.password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        res.json({
            id: candidate._id,
            name: candidate.name,
            email: candidate.email
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get assigned coding challenges
// @route   GET /api/exam/my-challenges
// @access  Public
export const getMyChallenges = async (req, res) => {
    try {
        const email = req.query.email?.toLowerCase().trim();
        if (!email) return res.status(400).json({ message: 'Email required' });

        const candidate = await Candidate.findOne({ email });
        if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

        const challenges = await CodingChallenge.find({ candidateId: candidate._id }).sort({ order: 1, createdAt: 1 }).select('-__v');
        res.json(challenges);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Submit coding challenge
// @route   POST /api/exam/submit-challenge
// @access  Public
export const submitChallenge = async (req, res) => {
    const { candidateEmail, challengeId, uiuxAnalysis, submittedHtml, submittedCss } = req.body;

    if (!candidateEmail || !challengeId) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
        const candidate = await Candidate.findOne({ email: candidateEmail.toLowerCase().trim() });
        if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

        const submission = await CodingSubmission.findOneAndUpdate(
            { candidateId: candidate._id, challengeId },
            { uiuxAnalysis, submittedHtml, submittedCss, submissionTime: new Date(), status: 'Pending' },
            { new: true, upsert: true }
        );

        let existingResult = await Result.findOne({ candidateEmail: candidate.email });
        if (!existingResult) {
            await Result.create({
                candidateName: candidate.name,
                candidateEmail: candidate.email,
                answers: [],
                correctCount: 0,
                wrongCount: 0,
                score: 0,
                submittedAt: new Date()
            });
        }

        res.status(201).json({ message: 'Coding submission saved', submission });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};
