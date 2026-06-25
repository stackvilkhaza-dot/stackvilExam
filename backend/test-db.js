import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Candidate from './models/Candidate.js';
import connectDB from './config/db.js';

dotenv.config();

const test = async () => {
    await connectDB();
    const c = await Candidate.findOne();
    console.log(c.email);
    process.exit(0);
};
test();
    const questions = await Question.find();
    console.log(JSON.stringify(questions[0], null, 2));
    process.exit(0);
};
test();
