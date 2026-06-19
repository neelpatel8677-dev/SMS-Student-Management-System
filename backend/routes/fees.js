const express = require('express');
const router = express.Router();
const Fee = require('../models/Fee');
const User = require('../models/User');
const mongoose = require('mongoose');

// 💰 1. ADMIN ROUTE: GET ALL REGISTERED FEES RECORDS FOR THE DATA GRID GRID TABLE
router.get('/', async (req, res) => {
    try {
        // Fetch fee structures populating student user relational elements securely
        const feeRecords = await Fee.find({}).populate('studentId', 'name rollNo course branch year');
        
        const formattedFees = feeRecords.map(f => ({
            _id: f._id,
            studentId: f.studentId ? f.studentId._id : null,
            studentName: f.studentId ? f.studentId.name : '—',
            rollNo: f.studentId ? f.studentId.rollNo : '—',
            course: f.studentId ? f.studentId.course : '—',
            year: f.studentId ? f.studentId.year : '—',
            totalFee: f.totalAmount,
            paidAmount: f.paidAmount,
            dueDate: f.dueDate,
            status: f.status,
            remarks: f.remarks || ''
        }));

        return res.status(200).json(formattedFees);
    } catch (err) {
        console.error("Fetch Fees Registry Crash:", err);
        return res.status(500).json({ error: true, message: "Internal server billing error." });
    }
});

// 💰 2. STUDENT ROUTE: VIEW OWN FEE SUMMARY LEDGER FROM SESSION WINDOW
router.get('/me', async (req, res) => {
    try {
        const studentId = req.headers['user-id'];
        if (!studentId) return res.status(400).json({ message: "User ID missing" });

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
        res.status(500).json({ message: "Server Error during financial check." });
    }
});

// 💰 3. ADMIN ROUTE: ASSIGN A NEW INVOICE STRUCTURE TO STUDENT (POST)
router.post('/', async (req, res) => {
    try {
        const { studentId, totalFee, paidAmount, dueDate, status, remarks } = req.body;

        if (!studentId || !totalFee || !dueDate) {
            return res.status(400).json({ error: true, message: "Missing mandatory fee specifications parameters." });
        }

        // Generate custom transaction reference code sequence on cash additions parameters
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
            totalAmount: totalFee, // Mapped perfectly matching model fields
            paidAmount,
            dueDate,
            remarks,
            transactions: transactionArray
        });

        await newFeeEntry.save();
        return res.status(201).json({ error: false, message: "Fee records assigned successfully!" });
    } catch (err) {
        console.error("Assign Fee Failure Trace:", err);
        return res.status(500).json({ error: true, message: "Database write error assignation logic." });
    }
});

// 💰 4. ADMIN ROUTE: UPDATE AN EXISTING STATEMENT SLIP BALANCE (PUT)
router.put('/:id', async (req, res) => {
    try {
        const feeRecordId = req.params.id;
        const { totalFee, paidAmount, dueDate, status, remarks } = req.body;

        const currentFee = await Fee.findById(feeRecordId);
        if (!currentFee) return res.status(404).json({ error: true, message: "Billing statement document context mismatch window." });

        // Add transaction entry block if amount payment received increments
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
        return res.status(200).json({ error: false, message: "Fee structure normalized successfully inside server database layers!" });
    } catch (err) {
        console.error("Update statement failed:", err);
        return res.status(500).json({ error: true, message: "Database edit query crashed." });
    }
});

module.exports = router;