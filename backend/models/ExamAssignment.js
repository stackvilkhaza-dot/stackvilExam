import mongoose from 'mongoose';

const examAssignmentSchema = new mongoose.Schema({
    candidateEmail: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
    },
    examSetId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ExamSet',
        required: true,
    },
    assignedAt: {
        type: Date,
        default: Date.now,
    }
});

// Ensure a candidate only has one active assignment at a time
examAssignmentSchema.index({ candidateEmail: 1 }, { unique: true });

const ExamAssignment = mongoose.model('ExamAssignment', examAssignmentSchema);

export default ExamAssignment;
