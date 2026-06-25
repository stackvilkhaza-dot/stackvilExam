import Admin from '../models/Admin.js';
import Question from '../models/Question.js';
import Result from '../models/Result.js';
import ExamSet from '../models/ExamSet.js';
import ExamAssignment from '../models/ExamAssignment.js';
import Candidate from '../models/Candidate.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PDFParse as pdfParse } from 'pdf-parse';

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
        const questions = await Question.find(query);
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
        const result = await Result.findById(req.params.id).populate('answers.questionId');

        if (!result) {
            return res.status(404).json({ message: 'Result not found' });
        }

        res.json(result);
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

    const { candidateId } = req.body;
    if (!candidateId) {
        return res.status(400).json({ message: 'Candidate ID is required' });
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

        // Create an ExamSet named for the candidate
        const newExamSet = await ExamSet.create({
            name: `${candidate.name}'s Exam - ${new Date().toLocaleDateString()}`,
            fileName: req.file.originalname,
            isActive: false
        });

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
                examSetId: newExamSet._id
            });
        }

        if (questions.length === 0) {
            await ExamSet.findByIdAndDelete(newExamSet._id);
            return res.status(400).json({ message: 'No questions could be extracted. Please check the PDF format.' });
        }

        const savedQuestions = await Question.insertMany(questions);

        // Assign the new exam set to the candidate automatically
        await ExamAssignment.findOneAndUpdate(
            { candidateEmail: candidate.email },
            { examSetId: newExamSet._id },
            { new: true, upsert: true }
        );

        res.status(201).json({
            message: `Successfully extracted ${savedQuestions.length} questions and assigned to ${candidate.name}.`,
            examSet: newExamSet,
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

// @desc    Get all exam assignments
// @route   GET /api/admin/assignments
// @access  Private
export const getAssignments = async (req, res) => {
    try {
        const assignments = await ExamAssignment.find().populate('examSetId', 'name fileName').sort({ assignedAt: -1 });
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
