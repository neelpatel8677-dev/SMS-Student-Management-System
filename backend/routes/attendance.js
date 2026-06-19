const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
const User = require('../models/User');

// 📋 1. STUDENT PHASE ENDPOINT: APNI ATTENDANCE LIVE DATABASE SE DEKH SAKE
router.get('/me', async (req, res) => {
    try {
        const studentId = req.headers['user-id'];
        if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
            return res.status(400).json({ message: "Invalid or missing User ID" });
        }

        const logs = await Attendance.find({ studentId: new mongoose.Types.ObjectId(studentId) }).sort({ date: 1 });

        if (!logs || logs.length === 0) {
            return res.json({ percentage: 0, present: 0, total: 0, history: [] });
        }

        const totalDays = logs.length;
        const presentDays = logs.filter(l => l.status === 'present').length;
        const percentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

        res.json({
            percentage,
            present: presentDays,
            total: totalDays,
            history: logs.map(l => ({
                date: l.date,
                status: l.status,
                remarks: l.remarks || ''
            }))
        });
    } catch (err) {
        console.error("Fetch Student Attendance Error:", err);
        res.status(500).json({ message: "Server Error loading attendance grid." });
    }
});

// 📋 2. ADMIN PHASE ACTION: STUDENT KI ATTENDANCE MARK/SAVE KAREIN
router.post('/mark', async (req, res) => {
    try {
        const { rollNo, date, status, remarks } = req.body;

        if (!rollNo || !date || !status) {
            return res.status(400).json({ message: "Please fill up required fields." });
        }

        const student = await User.findOne({ rollNo, role: 'student' });
        if (!student) {
            return res.status(404).json({ message: "Student with this Roll Number not found." });
        }

        // Exact date structure normalized safely to prevent timezone gaps
        const targetDate = new Date(date);
        targetDate.setUTCHours(0,0,0,0);

        await Attendance.findOneAndUpdate(
            { studentId: student._id, date: targetDate },
            { status, remarks: remarks || '' },
            { upsert: true, new: true }
        );

        res.status(201).json({ message: "Attendance saved and updated successfully! 🚀" });
    } catch (err) {
        console.error("Mark Attendance Error:", err);
        res.status(500).json({ message: "Server error while saving attendance." });
    }
});

// 📋 3. ADMIN DASHBOARD SUMMARY ENDPOINT: DYNAMIC STATISTICS COUNTERS & HISTORY
router.get('/summary', async (req, res) => {
    try {
        const totalStudents = await User.countDocuments({ role: 'student' });

        // 🛠️ BUG FIX: Normalized comprehensive global history listing matching both tables
        const allLogs = await Attendance.find({}).populate('studentId', 'name rollNo course');

        // Extract statistics metrics criteria matching context timeframe
        const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local format
        const todayLogs = allLogs.filter(l => l.date && new Date(l.date).toLocaleDateString('en-CA') === todayStr);

        const presentToday = todayLogs.filter(l => l.status === 'present').length;
        const absentToday  = todayLogs.filter(l => l.status === 'absent').length;

        const allLogsCount = allLogs.length;
        const allPresentCount = allLogs.filter(l => l.status === 'present').length;
        const avgPercent = allLogsCount > 0 ? Math.round((allPresentCount / allLogsCount) * 100) : 0;

        const formattedHistory = allLogs.map(l => ({
            studentName: l.studentId ? l.studentId.name : '—',
            rollNo: l.studentId ? l.studentId.rollNo : '—',
            course: l.studentId ? l.studentId.course : '—',
            date: l.date,
            status: l.status,
            remarks: l.remarks || ''
        }));

        res.json({
            totalStudents,
            presentToday,
            absentToday,
            avgPercent,
            history: formattedHistory
        });
    } catch (err) {
        console.error("Attendance Summary Crash Log:", err);
        res.status(500).json({ message: "Server Error rendering logs." });
    }
});

module.exports = router;