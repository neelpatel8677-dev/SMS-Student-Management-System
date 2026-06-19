const mongoose = require('mongoose');

const ResultSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    examName: {
        type: String, 
        required: true
    },
    date: {
        type: Date
    },
    passMarks: {
        type: Number,
        default: 35
    },
    remarks: {
        type: String,
        default: ''
    },
    marksObtained: {
        type: Number,
        required: true
    },
    totalMarks: {
        type: Number,
        required: true
    },
    percentage: {
        type: Number,
        required: true
    },
    grade: {
        type: String,
        required: true
    },
    result: {
        type: String,
        enum: ['pass', 'fail'],
        required: true
    },
    subjects: [
        {
            name: { type: String, required: true },
            obtained: { type: Number, required: true },
            total: { type: Number, required: true, default: 100 }
        }
    ]
}, { timestamps: true });

module.exports = mongoose.model('Result', ResultSchema);