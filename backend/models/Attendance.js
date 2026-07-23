const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Student ID is required']
    },
    date: {
        type: Date,
        required: [true, 'Date is required']
    },
    status: {
        type: String,
        enum: ['present', 'absent', 'leave', 'holiday'],
        lowercase: true, // ✅ Auto-converts 'Present' -> 'present' to avoid Enum Validation errors
        trim: true,
        required: [true, 'Attendance status is required']
    },
    remarks: {
        type: String,
        default: '',
        trim: true
    }
}, { timestamps: true });

// ✅ Guarantee single attendance log per student per day
AttendanceSchema.index({ studentId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', AttendanceSchema);
/*const mongoose = require('mongoose');

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
*/
