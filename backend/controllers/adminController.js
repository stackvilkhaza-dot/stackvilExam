import Admin from '../models/Admin.js';
import Question from '../models/Question.js';
import Result from '../models/Result.js';
import ExamSet from '../models/ExamSet.js';
import ExamAssignment from '../models/ExamAssignment.js';
import Candidate from '../models/Candidate.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PDFParse as pdfParse } from 'pdf-parse';
import CodingChallenge from '../models/CodingChallenge.js';
import CodingSubmission from '../models/CodingSubmission.js';

// Generate JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// @desc    Authenticate admin
// @route   POST /api/admin/login
// @access  Public
export const loginAdmin = async (req, res) => {
    const { email, password } = req.body;

    try {
        const admin = await Admin.findOne({ email });

        if (admin && (await bcrypt.compare(password, admin.password))) {
            res.json({
                _id: admin.id,
                email: admin.email,
                token: generateToken(admin._id),
            });
        } else {
            res.status(400).json({ message: 'Invalid credentials' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get dashboard stats
// @route   GET /api/admin/dashboard
// @access  Private
export const getDashboardStats = async (req, res) => {
    try {
        const totalCandidates = await Result.countDocuments();
        const totalQuestions = await Question.countDocuments();
        const results = await Result.find();
        
        const totalSubmissions = results.length;
        let averageScore = 0;
        if (totalSubmissions > 0) {
            const sumScore = results.reduce((acc, curr) => acc + curr.score, 0);
            averageScore = (sumScore / totalSubmissions).toFixed(2);
        }

        res.json({
            totalCandidates,
            totalSubmissions,
            averageScore,
            totalQuestions
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get all questions (optionally by examSetId)
// @route   GET /api/admin/questions
// @access  Private
export const getQuestions = async (req, res) => {
    try {
        const query = req.query.examSetId ? { examSetId: req.query.examSetId } : {};
        const questions = await Question.find(query).sort({ order: 1 });
        res.json(questions);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Create a question
// @route   POST /api/admin/questions
// @access  Private
export const createQuestion = async (req, res) => {
    const { question, options, correctAnswer, marks, examSetId } = req.body;

    if (!question || !options || !correctAnswer || !examSetId) {
        return res.status(400).json({ message: 'Please add all fields, including examSetId' });
    }

    try {
        const newQuestion = await Question.create({
            question,
            options,
            correctAnswer,
            marks: marks || 1,
            examSetId
        });

        res.status(201).json(newQuestion);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update a question
// @route   PUT /api/admin/questions/:id
// @access  Private
export const updateQuestion = async (req, res) => {
    try {
        const question = await Question.findById(req.params.id);

        if (!question) {
            return res.status(404).json({ message: 'Question not found' });
        }

        const updatedQuestion = await Question.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
        });

        res.json(updatedQuestion);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Delete a question
// @route   DELETE /api/admin/questions/:id
// @access  Private
export const deleteQuestion = async (req, res) => {
    try {
        const question = await Question.findById(req.params.id);

        if (!question) {
            return res.status(404).json({ message: 'Question not found' });
        }

        await question.deleteOne();

        res.json({ id: req.params.id });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get all results
// @route   GET /api/admin/results
// @access  Private
export const getResults = async (req, res) => {
    try {
        const results = await Result.find().sort({ submittedAt: -1 });
        res.json(results);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get result by ID
// @route   GET /api/admin/results/:id
// @access  Private
export const getResultById = async (req, res) => {
    try {
        const result = await Result.findById(req.params.id).populate('answers.questionId').lean();

        if (!result) {
            return res.status(404).json({ message: 'Result not found' });
        }

        const candidate = await Candidate.findOne({ email: result.candidateEmail.toLowerCase().trim() });
        let codingSubmissions = [];
        if (candidate) {
             codingSubmissions = await CodingSubmission.find({ candidateId: candidate._id }).populate('challengeId');
        }

        res.json({ ...result, codingSubmissions });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Delete result
// @route   DELETE /api/admin/results/:id
// @access  Private
export const deleteResult = async (req, res) => {
    try {
        const result = await Result.findById(req.params.id);

        if (!result) {
            return res.status(404).json({ message: 'Result not found' });
        }

        await result.deleteOne();

        res.json({ id: req.params.id });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Upload PDF and extract questions
// @route   POST /api/admin/upload-pdf
// @access  Private
export const uploadPdf = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }

    const { candidateId, round } = req.body;
    if (!candidateId || !round) {
        return res.status(400).json({ message: 'Candidate ID and round are required' });
    }

    try {
        const candidate = await Candidate.findById(candidateId);
        if (!candidate) {
            return res.status(404).json({ message: 'Candidate not found' });
        }

        let text;
        try {
            const parser = new pdfParse({ data: req.file.buffer });
            const result = await parser.getText();
            text = result.text;
            await parser.destroy();
        } catch (parseError) {
            console.error(parseError);
            return res.status(500).json({ message: `Error parsing PDF file: ${parseError.message} | Stack: ${parseError.stack}` });
        }

        const regex = /(?:\d+\.\s*)([\s\S]*?)(?=[A-D]\.\s*)\s*A\.\s*([\s\S]*?)(?=\s*B\.\s*)\s*B\.\s*([\s\S]*?)(?=\s*C\.\s*)\s*C\.\s*([\s\S]*?)(?=\s*D\.\s*)\s*D\.\s*([\s\S]*?)(?=\s*Answer:\s*)\s*Answer:\s*([A-D])/g;
        
        let match;
        const questions = [];
        let orderIndex = 1;

        // Check if an ExamSet already exists for this candidate
        let existingAssignment = await ExamAssignment.findOne({ candidateEmail: candidate.email }).populate('examSetId');
        let examSet;

        if (existingAssignment && existingAssignment.examSetId) {
            examSet = existingAssignment.examSetId;
            if (round == 1) {
                examSet.fileNameRound1 = req.file.originalname;
            } else {
                examSet.fileNameRound2 = req.file.originalname;
            }
            await examSet.save();
        } else {
            // Create a new ExamSet
            examSet = await ExamSet.create({
                name: `${candidate.name}'s Exam - ${new Date().toLocaleDateString()}`,
                fileNameRound1: round == 1 ? req.file.originalname : '',
                fileNameRound2: round == 2 ? req.file.originalname : null,
                isActive: false
            });
        }

        while ((match = regex.exec(text)) !== null) {
            const questionText = match[1].trim();
            const options = [
                { label: 'A', text: match[2].trim() },
                { label: 'B', text: match[3].trim() },
                { label: 'C', text: match[4].trim() },
                { label: 'D', text: match[5].trim() }
            ];
            const answerLetter = match[6].trim();
            const correctAnswer = answerLetter;

            questions.push({
                question: questionText,
                options,
                correctAnswer,
                marks: 1,
                examSetId: examSet._id,
                round: Number(round),
                order: orderIndex++
            });
        }

        if (questions.length === 0) {
            if (!existingAssignment) await ExamSet.findByIdAndDelete(examSet._id);
            return res.status(400).json({ message: 'No questions could be extracted. Please check the PDF format.' });
        }

        const savedQuestions = await Question.insertMany(questions);

        if (!existingAssignment) {
            // Assign the new exam set to the candidate automatically
            await ExamAssignment.findOneAndUpdate(
                { candidateEmail: candidate.email },
                { examSetId: examSet._id },
                { new: true, upsert: true }
            );
        }

        res.status(201).json({
            message: `Successfully extracted ${savedQuestions.length} questions for Round ${round} and assigned to ${candidate.name}.`,
            examSet: examSet,
            questions: savedQuestions
        });

    } catch (error) {
        console.error('PDF Parse Error:', error);
        res.status(500).json({ message: 'Error parsing PDF file' });
    }
};

// @desc    Get all exam sets
// @route   GET /api/admin/exam-sets
// @access  Private
export const getExamSets = async (req, res) => {
    try {
        const examSets = await ExamSet.find().sort({ createdAt: -1 });
        res.json(examSets);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Set active exam set
// @route   PUT /api/admin/exam-sets/:id/activate
// @access  Private
export const setActiveExamSet = async (req, res) => {
    try {
        const examSet = await ExamSet.findById(req.params.id);
        if (!examSet) {
            return res.status(404).json({ message: 'Exam set not found' });
        }
        
        examSet.isActive = !examSet.isActive;
        await examSet.save();

        res.json(examSet);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Start all exams globally
// @route   PUT /api/admin/start-all-exams
// @access  Private
export const startAllExams = async (req, res) => {
    try {
        await ExamSet.updateMany({}, { isActive: true });
        res.json({ message: 'All exams have been started globally' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Stop all exams globally
// @route   PUT /api/admin/stop-all-exams
// @access  Private
export const stopAllExams = async (req, res) => {
    try {
        await ExamSet.updateMany({}, { isActive: false });
        res.json({ message: 'All exams have been stopped globally' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get all exam assignments
// @route   GET /api/admin/assignments
// @access  Private
export const getAssignments = async (req, res) => {
    try {
        const assignments = await ExamAssignment.find().populate('examSetId', 'name fileName fileNameRound1 fileNameRound2 isActive').sort({ assignedAt: -1 });
        res.json(assignments);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Assign an exam to a candidate
// @route   POST /api/admin/assignments
// @access  Private
export const createAssignment = async (req, res) => {
    const { candidateEmail, examSetId } = req.body;

    if (!candidateEmail || !examSetId) {
        return res.status(400).json({ message: 'Please provide email and select an Exam Set' });
    }

    try {
        // Upsert assignment
        const assignment = await ExamAssignment.findOneAndUpdate(
            { candidateEmail: candidateEmail.toLowerCase().trim() },
            { examSetId },
            { new: true, upsert: true }
        ).populate('examSetId', 'name');

        res.status(201).json(assignment);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Delete an assignment
// @route   DELETE /api/admin/assignments/:id
// @access  Private
export const deleteAssignment = async (req, res) => {
    try {
        const assignment = await ExamAssignment.findById(req.params.id);

        if (!assignment) {
            return res.status(404).json({ message: 'Assignment not found' });
        }

        await assignment.deleteOne();

        res.json({ id: req.params.id });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get all candidate profiles
// @route   GET /api/admin/candidates
// @access  Private
export const getCandidates = async (req, res) => {
    try {
        const candidates = await Candidate.find().sort({ name: 1 });
        res.json(candidates);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get single candidate profile
// @route   GET /api/admin/candidates/:id
// @access  Private
export const getCandidateById = async (req, res) => {
    try {
        const candidate = await Candidate.findById(req.params.id);
        if (!candidate) {
            return res.status(404).json({ message: 'Candidate not found' });
        }
        res.json(candidate);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Create a candidate
// @route   POST /api/admin/candidates
// @access  Private
export const createCandidate = async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Please provide name, email, and password' });
    }

    try {
        const candidateExists = await Candidate.findOne({ email: email.toLowerCase().trim() });
        if (candidateExists) {
            return res.status(400).json({ message: 'Candidate already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const candidate = await Candidate.create({
            name,
            email: email.toLowerCase().trim(),
            password: hashedPassword
        });

        res.status(201).json(candidate);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Reset the entire database (except Admin)
// @route   POST /api/admin/reset-db
// @access  Private
export const resetDatabase = async (req, res) => {
    try {
        await Candidate.deleteMany();
        await Result.deleteMany();
        await ExamSet.deleteMany();
        await ExamAssignment.deleteMany();
        await Question.deleteMany();

        res.json({ message: 'Database reset successfully' });
    } catch (error) {
        console.error('Error resetting database:', error);
        res.status(500).json({ message: 'Failed to reset database' });
    }
};

// @desc    Get all coding challenges for a candidate
// @route   GET /api/admin/candidates/:id/challenges
// @access  Private
export const getCandidateChallenges = async (req, res) => {
    try {
        const challenges = await CodingChallenge.find({ candidateId: req.params.id }).sort({ order: 1, createdAt: 1 });
        res.json(challenges);
    } catch (error) {
        res.status(500).json({ message: 'Server Error fetching challenges' });
    }
};

// @desc    Create a new coding challenge for a candidate
// @route   POST /api/admin/challenges
// @access  Private
export const createCodingChallenge = async (req, res) => {
    try {
        const { candidateId, challengeType, title, marks, timeLimit, description, referenceImage, order } = req.body;
        
        const newChallenge = await CodingChallenge.create({
            candidateId, challengeType, title, marks, timeLimit, description, referenceImage, order
        });

        res.status(201).json(newChallenge);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error creating challenge' });
    }
};

// @desc    Update a coding challenge (also used for reordering)
// @route   PUT /api/admin/challenges/:id
// @access  Private
export const updateCodingChallenge = async (req, res) => {
    try {
        const updatedC = await CodingChallenge.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedC) return res.status(404).json({ message: 'Challenge not found' });
        res.json(updatedC);
    } catch (error) {
        res.status(500).json({ message: 'Server Error updating challenge' });
    }
};

// @desc    Delete a coding challenge
// @route   DELETE /api/admin/challenges/:id
// @access  Private
export const deleteCodingChallenge = async (req, res) => {
    try {
        const deletedC = await CodingChallenge.findByIdAndDelete(req.params.id);
        if (!deletedC) return res.status(404).json({ message: 'Challenge not found' });
        res.json({ message: 'Challenge deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error deleting challenge' });
    }
};

// @desc    Upload an image for coding expected output
// @route   POST /api/admin/upload-image
// @access  Private
export const uploadImage = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No image uploaded' });
    }
    // Return the URL path
    res.status(201).json({ url: `/uploads/${req.file.filename}` });
};
