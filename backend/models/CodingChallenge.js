import mongoose from 'mongoose';

const codingChallengeSchema = new mongoose.Schema({
    candidateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Candidate',
        required: true
    },
    challengeType: {
        type: String,
        required: true,
        enum: ['ImageToCode', 'DesignFromRequirements', 'UIUXRedesign']
    },
    title: { type: String, required: true },
    marks: { type: Number, required: true },
    timeLimit: { type: Number, required: true },
    description: { type: String, default: '' },
    referenceImage: { type: String, default: '' },
    order: { type: Number, default: 0 },
    createdAt: {
        type: Date,
        default: Date.now,
    }
});

const CodingChallenge = mongoose.model('CodingChallenge', codingChallengeSchema);

export default CodingChallenge;
