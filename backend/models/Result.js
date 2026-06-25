import mongoose from 'mongoose';

const resultSchema = new mongoose.Schema({
    candidateName: {
        type: String,
        required: true,
    },
    candidateEmail: {
        type: String,
        required: true,
    },
    answers: [{
        questionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Question',
            required: true
        },
        selectedAnswer: {
            type: String,
            required: true
        },
        isCorrect: {
            type: Boolean,
            required: true
        }
    }],
    correctCount: {
        type: Number,
        required: true,
    },
    wrongCount: {
        type: Number,
        required: true,
    },
    score: {
        type: Number,
        required: true,
    },
    submittedAt: {
        type: Date,
        default: Date.now,
    }
});

const Result = mongoose.model('Result', resultSchema);

export default Result;
