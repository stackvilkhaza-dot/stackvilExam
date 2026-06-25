import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admin from './models/Admin.js';
import Result from './models/Result.js';
import Candidate from './models/Candidate.js';
import ExamSet from './models/ExamSet.js';
import ExamAssignment from './models/ExamAssignment.js';
import Question from './models/Question.js';
import connectDB from './config/db.js';

dotenv.config();
connectDB();

const destroyData = async () => {
    try {
        await Candidate.deleteMany();
        await Result.deleteMany();
        await ExamSet.deleteMany();
        await ExamAssignment.deleteMany();
        await Question.deleteMany();

        console.log('All candidates, results, and exams have been DELETED.');
        console.log('Admins were kept so you can still log in!');
        process.exit();
    } catch (error) {
        console.error(`Error: ${error}`);
        process.exit(1);
    }
};

destroyData();
