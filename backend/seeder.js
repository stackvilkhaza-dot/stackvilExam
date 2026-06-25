import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import Admin from './models/Admin.js';
import Result from './models/Result.js';
import Candidate from './models/Candidate.js';
import connectDB from './config/db.js';

dotenv.config();
connectDB();

const importData = async () => {
    try {
        await Admin.deleteMany();
        await Result.deleteMany();
        await Candidate.deleteMany();

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('password', salt);

        await Admin.insertMany([
            { email: 'admin1@example.com', password: hashedPassword },
            { email: 'admin2@example.com', password: hashedPassword },
            { email: 'admin3@example.com', password: hashedPassword }
        ]);

        await Result.insertMany([
            { candidateName: 'John Doe', candidateEmail: 'john@example.com', score: 5, correctCount: 5, wrongCount: 0, answers: [] },
            { candidateName: 'Jane Smith', candidateEmail: 'jane@example.com', score: 3, correctCount: 3, wrongCount: 2, answers: [] },
            { candidateName: 'Bob Builder', candidateEmail: 'bob@example.com', score: 8, correctCount: 8, wrongCount: 1, answers: [] }
        ]);

        await Candidate.insertMany([
            { name: 'John Doe', email: 'john@example.com', password: hashedPassword },
            { name: 'Jane Smith', email: 'jane@example.com', password: hashedPassword },
            { name: 'Bob Builder', email: 'bob@example.com', password: hashedPassword }
        ]);

        console.log('3 Admin users seeded (e.g. admin1@example.com / password)');
        console.log('3 Candidate results seeded');
        console.log('3 Candidate profiles seeded');
        process.exit();
    } catch (error) {
        console.error(`Error with seeder: ${error}`);
        process.exit(1);
    }
};

importData();
