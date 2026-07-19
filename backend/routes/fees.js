const express = require('express');
const router = express.Router();
const Fee = require('../models/fee');
const User = require('../models/User');
const mongoose = require('mongoose');
const { auth, isFaculty } = require('../middleware/auth'); // Updated to use new middleware framework

// 👥 FACULTY & ADMIN: GET ALL FEE RECORDS
router.get('/', auth, isFaculty, async (req, res) => {
    try {
        const feeRecords = await Fee.find({}).populate('studentId', 'name rollNo course branch year');

        const formattedFees = feeRecords
            .filter(f => f.studentId) // Hide deleted students
            .map(f => ({
                _id: f._id,
                studentId: f.studentId._id,
                studentName: f.studentId.name,
                rollNo: f.studentId.rollNo,
                course: f.studentId.course,
                year: f.studentId.year,
                totalFee: f.totalAmount,
                paidAmount: f.paidAmount,
                dueDate: f.dueDate,
                status: f.status,
                remarks: f.remarks || ''
            }));

        return res.status(200).json(formattedFees);
    } catch (err) {
        console.error("Fetch Fees Error:", err);
        return res.status(500).json({ error: true, message: "Server error." });
    }
});

// 🎓 STUDENT: APNI FEES DEKHO
router.get('/me', auth, async (req, res) => {
    try {
        const studentId = req.user.id; 

        let feeRecord = await Fee.findOne({ studentId });

        if (!feeRecord) {
            return res.json({
                status: "pending",
                totalAmount: 0,
                paidAmount: 0,
                due: 0,
                dueDate: null,
                transactions: []
            });
        }

        const dueAmount = Math.max(0, feeRecord.totalAmount - feeRecord.paidAmount);

        const formattedTransactions = feeRecord.transactions.map(t => ({
            id: t.txnId,
            date: t.date,
            amount: t.amount,
            status: t.status
        }));

        res.json({
            status: feeRecord.status,
            totalAmount: feeRecord.totalAmount,
            paidAmount: feeRecord.paidAmount,
            due: dueAmount,
            dueDate: feeRecord.dueDate,
            transactions: formattedTransactions
        });
    } catch (err) {
        console.error("Fees Fetch Error:", err);
        res.status(500).json({ message: "Server error." });
    }
});

// 👥 FACULTY & ADMIN: NEW FEE ASSIGN KARO
router.post('/', auth, isFaculty, async (req, res) => {
    try {
        const { studentId, totalFee, paidAmount, dueDate, status, remarks } = req.body;

        if (!studentId || !totalFee || !dueDate) {
            return res.status(400).json({ error: true, message: "Missing required fields." });
        }

        const generatedTxnId = "TXN" + Math.floor(100000 + Math.random() * 900000);
        const transactionArray = paidAmount > 0 ? [{
            txnId: generatedTxnId,
            date: new Date(),
            amount: paidAmount,
            method: 'Cash/Online',
            status: 'success'
        }] : [];

        const newFeeEntry = new Fee({
            studentId,
            status,
            totalAmount: totalFee,
            paidAmount,
            dueDate,
            remarks,
            transactions: transactionArray
        });

        await newFeeEntry.save();
        return res.status(201).json({ error: false, message: "Fee record assigned successfully!" });
    } catch (err) {
        console.error("Assign Fee Error:", err);
        return res.status(500).json({ error: true, message: "Server error." });
    }
});

// 👥 FACULTY & ADMIN: FEE UPDATE KARO
router.put('/:id', auth, isFaculty, async (req, res) => {
    try {
        const feeRecordId = req.params.id;
        const { totalFee, paidAmount, dueDate, status, remarks } = req.body;

        const currentFee = await Fee.findById(feeRecordId);
        if (!currentFee) return res.status(404).json({ error: true, message: "Fee record not found." });

        if (paidAmount > currentFee.paidAmount) {
            const addedDifference = paidAmount - currentFee.paidAmount;
            currentFee.transactions.push({
                txnId: "TXN" + Math.floor(100000 + Math.random() * 900000),
                date: new Date(),
                amount: addedDifference,
                method: 'Counter Update',
                status: 'success'
            });
        }

        currentFee.totalAmount = totalFee;
        currentFee.paidAmount = paidAmount;
        currentFee.dueDate = dueDate;
        currentFee.status = status;
        currentFee.remarks = remarks || '';

        await currentFee.save();
        return res.status(200).json({ error: false, message: "Fee updated successfully!" });
    } catch (err) {
        console.error("Update Fee Error:", err);
        return res.status(500).json({ error: true, message: "Server error." });
    }
});

module.exports = router;
