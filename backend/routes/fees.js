const express = require('express');
const router = express.Router();
const Fee = require('../models/fee');
const User = require('../models/User');
const mongoose = require('mongoose');
const { auth, isFaculty } = require('../middleware/auth');

// 👥 1. FACULTY & ADMIN: GET ALL FEE RECORDS
router.get('/', auth, isFaculty, async (req, res) => {
    try {
        const feeRecords = await Fee.find({}).populate('studentId', 'name rollNo course branch year');

        const formattedFees = feeRecords
            .filter(f => f.studentId) // Delete hue students hide karein
            .map(f => ({
                _id: f._id,
                studentId: f.studentId._id,
                studentName: f.studentId.name,
                rollNo: f.studentId.rollNo,
                course: f.studentId.course,
                year: f.studentId.year,
                totalFee: f.totalAmount || 60000,
                totalAmount: f.totalAmount || 60000,
                paidAmount: f.paidAmount || (f.status === 'paid' ? (f.totalAmount || 60000) : 0),
                dueDate: f.dueDate,
                status: (f.status || 'pending').toLowerCase(),
                remarks: f.remarks || ''
            }));

        return res.status(200).json(formattedFees);
    } catch (err) {
        console.error("Fetch Fees Error:", err);
        return res.status(500).json({ error: true, message: "Server error." });
    }
});

// 🎓 2. STUDENT: APNI FEES DEKHO (SYNCED WITH FACULTY UPDATES)
router.get('/me', auth, async (req, res) => {
    try {
        const studentId = req.user.id || req.user._id; 

        let feeRecord = await Fee.findOne({ studentId });

        // Default layout mapping fallback agar direct record abhi tak na bana ho
        if (!feeRecord) {
            return res.json({
                status: "pending",
                totalFee: 60000,
                totalAmount: 60000,
                paidAmount: 0,
                due: 60000,
                dueDate: null,
                transactions: []
            });
        }

        const totalAmt = feeRecord.totalAmount || 60000;
        const currentStatus = (feeRecord.status || 'pending').toLowerCase();
        const paidAmt = currentStatus === 'paid' ? totalAmt : (feeRecord.paidAmount || 0);
        const dueAmount = Math.max(0, totalAmt - paidAmt);

        const formattedTransactions = (feeRecord.transactions || []).map(t => ({
            id: t.txnId || 'TXN10001',
            date: t.date || feeRecord.updatedAt,
            amount: t.amount,
            status: t.status || 'success'
        }));

        // Send BOTH totalFee and totalAmount keys so frontend never breaks
        res.json({
            status: currentStatus,
            totalFee: totalAmt,
            totalAmount: totalAmt,
            paidAmount: paidAmt,
            due: dueAmount,
            dueDate: feeRecord.dueDate,
            transactions: formattedTransactions
        });
    } catch (err) {
        console.error("Fees Fetch Error:", err);
        res.status(500).json({ message: "Server error." });
    }
});

// 👥 3. FACULTY & ADMIN: QUICK FEE STATUS UPDATE / ASSIGN (FLEXIBLE UPSERT)
router.post('/', auth, isFaculty, async (req, res) => {
    try {
        const { studentId, totalFee, paidAmount, dueDate, status, remarks } = req.body;

        if (!studentId) {
            return res.status(400).json({ error: true, message: "studentId is required." });
        }

        const targetTotal = parseInt(totalFee) || 60000;
        const targetStatus = (status || 'pending').toLowerCase();
        const targetPaid = targetStatus === 'paid' ? targetTotal : (parseInt(paidAmount) || 0);
        const targetDueDate = dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        // Build dynamic transaction entry if paid
        let txnArray = [];
        if (targetPaid > 0) {
            txnArray.push({
                txnId: "TXN" + Math.floor(100000 + Math.random() * 900000),
                date: new Date(),
                amount: targetPaid,
                method: 'Online/Counter',
                status: 'success'
            });
        }

        // Auto-Create or Update Record (UPSERT)
        const updatedFee = await Fee.findOneAndUpdate(
            { studentId },
            {
                status: targetStatus,
                totalAmount: targetTotal,
                paidAmount: targetPaid,
                dueDate: targetDueDate,
                remarks: remarks || '',
                $setOnInsert: { transactions: txnArray }
            },
            { upsert: true, new: true }
        );

        return res.status(200).json({ error: false, message: "Fee status updated successfully! 🚀", data: updatedFee });
    } catch (err) {
        console.error("Assign/Update Fee Error:", err);
        return res.status(500).json({ error: true, message: "Server error saving fee status." });
    }
});

// 👥 4. FACULTY & ADMIN: DIRECT PUT UPDATE BY RECORD ID
router.put('/:id', auth, isFaculty, async (req, res) => {
    try {
        const feeRecordId = req.params.id;
        const { totalFee, paidAmount, dueDate, status, remarks } = req.body;

        const currentFee = await Fee.findById(feeRecordId);
        if (!currentFee) return res.status(404).json({ error: true, message: "Fee record not found." });

        const targetStatus = (status || currentFee.status).toLowerCase();
        const targetTotal = parseInt(totalFee) || currentFee.totalAmount || 60000;
        const newPaidAmount = targetStatus === 'paid' ? targetTotal : (parseInt(paidAmount) || currentFee.paidAmount || 0);

        if (newPaidAmount > currentFee.paidAmount) {
            const addedDifference = newPaidAmount - currentFee.paidAmount;
            currentFee.transactions.push({
                txnId: "TXN" + Math.floor(100000 + Math.random() * 900000),
                date: new Date(),
                amount: addedDifference,
                method: 'Counter Update',
                status: 'success'
            });
        }

        currentFee.totalAmount = targetTotal;
        currentFee.paidAmount = newPaidAmount;
        if (dueDate) currentFee.dueDate = dueDate;
        currentFee.status = targetStatus;
        currentFee.remarks = remarks || '';

        await currentFee.save();
        return res.status(200).json({ error: false, message: "Fee updated successfully!" });
    } catch (err) {
        console.error("Update Fee Error:", err);
        return res.status(500).json({ error: true, message: "Server error." });
    }
});

module.exports = router;
/*
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
*/
