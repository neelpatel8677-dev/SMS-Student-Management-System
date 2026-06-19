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