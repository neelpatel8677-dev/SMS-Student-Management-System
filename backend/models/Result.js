const mongoose = require('mongoose');

const ResultSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Student ID is required']
    },
    examName: {
        type: String, 
        required: [true, 'Exam name is required'],
        trim: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    passMarks: {
        type: Number,
        default: 35
    },
    remarks: {
        type: String,
        default: '',
        trim: true
    },
    marksObtained: {
        type: Number,
        required: [true, 'Marks obtained is required']
    },
    totalMarks: {
        type: Number,
        required: [true, 'Total marks is required'],
        default: 100
    },
    percentage: {
        type: Number
    },
    grade: {
        type: String,
        default: 'C',
        trim: true
    },
    result: {
        type: String,
        enum: ['pass', 'fail'],
        lowercase: true, // ✅ Converts 'Pass' -> 'pass' to avoid enum validation errors
        trim: true,
        default: 'pass'
    },
    subjects: [
        {
            name: { type: String, required: true, trim: true },
            obtained: { type: Number, required: true },
            total: { type: Number, required: true, default: 100 }
        }
    ]
}, { timestamps: true });

// 🔄 Auto-calculate Percentage, Grade, & Pass/Fail status before saving
ResultSchema.pre('save', function (next) {
    if (this.totalMarks > 0) {
        this.percentage = Math.round((this.marksObtained / this.totalMarks) * 100);
    } else {
        this.percentage = 0;
    }

    if (this.percentage >= 85) this.grade = 'A+';
    else if (this.percentage >= 75) this.grade = 'A';
    else if (this.percentage >= 65) this.grade = 'B';
    else if (this.percentage >= 50) this.grade = 'C';
    else if (this.percentage >= 35) this.grade = 'D';
    else this.grade = 'F';

    this.result = this.percentage >= (this.passMarks || 35) ? 'pass' : 'fail';

    next();
});

module.exports = mongoose.model('Result', ResultSchema);
/*const mongoose = require('mongoose');

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
*/
