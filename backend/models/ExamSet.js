import mongoose from 'mongoose';

const examSetSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    fileName: {
        type: String,
        required: true,
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
