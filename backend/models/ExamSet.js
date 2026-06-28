import mongoose from 'mongoose';

const examSetSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    fileNameRound1: {
        type: String,
        required: true,
    },
    fileNameRound2: {
        type: String,
        default: null,
    },
    isActive: {
        type: Boolean,
        default: false,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    }
});

const ExamSet = mongoose.model('ExamSet', examSetSchema);

export default ExamSet;
