import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
    question: {
        type: String,
        required: true,
    },
    options: {
        type: [{
            label: { type: String, required: true },
            text: { type: String, required: true }
        }],
        required: true,
        validate: [arrayLimit, '{PATH} exceeds the limit of 4']
    },
    correctAnswer: {
        type: String,
        required: true,
    },
    marks: {
        type: Number,
        default: 1,
    },
    examSetId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ExamSet',
        required: true
    },
    round: {
        type: Number,
        required: true,
        enum: [1, 2],
        default: 1
    },
    order: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now,
    }
});

function arrayLimit(val) {
    return val.length === 4;
}

const Question = mongoose.model('Question', questionSchema);

export default Question;
