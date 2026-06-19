const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['present', 'absent', 'leave', 'holiday'],
        required: true
    },
    remarks: {
        type: String,
        default: ''
    }
}, { timestamps: true });

// Ek date par ek student ki ek hi entry ho sake, isliye compound index unique kiya
AttendanceSchema.index({ studentId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', AttendanceSchema);