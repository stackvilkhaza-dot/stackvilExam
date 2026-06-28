import mongoose from 'mongoose';

const codingSubmissionSchema = new mongoose.Schema({
    candidateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Candidate',
        required: true
    },
    challengeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CodingChallenge',
        required: true
    },
    uiuxAnalysis: {
        type: String,
        default: ''
    },
    submittedHtml: {
        type: String,
        default: ''
    },
    submittedCss: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['Pending', 'Reviewed'],
        default: 'Pending'
    },
    marksAwarded: {
        type: Number,
        default: 0
    },
    comments: {
        type: String,
        default: ''
    },
    submissionTime: {
        type: Date,
        default: Date.now
    }
});

const CodingSubmission = mongoose.model('CodingSubmission', codingSubmissionSchema);

export default CodingSubmission;
