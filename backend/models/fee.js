const mongoose = require('mongoose');

const FeeSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Student ID is required'],
        unique: true // Guarantees 1 Fee Ledger record per student
    },
    status: {
        type: String,
        enum: ['paid', 'pending', 'overdue'],
        default: 'pending',
        lowercase: true, // Auto-converts 'Paid' -> 'paid' to prevent validation errors
        trim: true
    },
    totalAmount: {
        type: Number,
        required: true,
        default: 60000 // Synced with frontend and routes default course fee
    },
    paidAmount: {
        type: Number,
        default: 0
    },
    dueDate: {
        type: Date,
        default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Default 30 days from now
    },
    remarks: {
        type: String,
        default: '',
        trim: true
    },
    transactions: [
        {
            txnId: { type: String, required: true },
            date: { type: Date, default: Date.now },
            amount: { type: Number, required: true },
            method: { type: String, default: 'Online' },
            status: { type: String, default: 'success', lowercase: true }
        }
    ]
}, { timestamps: true });

// 🔄 Pre-save hook: Automatically calculate status based on payment and dates
FeeSchema.pre('save', function (next) {
    if (this.paidAmount >= this.totalAmount && this.totalAmount > 0) {
        this.status = 'paid';
    } else if (this.dueDate && new Date() > new Date(this.dueDate) && this.paidAmount < this.totalAmount) {
        this.status = 'overdue';
    } else {
        if (this.status !== 'paid') {
            this.status = 'pending';
        }
    }
    next();
});

module.exports = mongoose.model('Fee', FeeSchema);
/*
const mongoose = require('mongoose');

const FeeSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true // Ek student ka ek hi fee record hoga
    },
    status: {
        type: String,
        enum: ['paid', 'pending'],
        default: 'pending'
    },
    totalAmount: {
        type: Number,
        required: true,
        default: 50000
    },
    paidAmount: {
        type: Number,
        default: 0
    },
    dueDate: {
        type: Date
    },
    transactions: [
        {
            txnId: { type: String, required: true },
            date: { type: Date, default: Date.now },
            amount: { type: Number, required: true },
            method: { type: String, default: 'Online' },
            status: { type: String, default: 'success' }
        }
    ]
}, { timestamps: true });

module.exports = mongoose.model('Fee', FeeSchema);
*/
