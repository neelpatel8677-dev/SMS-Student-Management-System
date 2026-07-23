const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const { auth, isFaculty } = require('../middleware/auth');

// 🎓 1. STUDENT: APNI ATTENDANCE DEKHO
router.get('/me', auth, async (req, res) => {
    try {
        const studentId = req.user.id || req.user._id;

        const logs = await Attendance.find({
            studentId: new mongoose.Types.ObjectId(studentId)
        }).sort({ date: 1 });

        if (!logs || logs.length === 0) {
            return res.json({ percentage: 0, present: 0, total: 0, history: [] });
        }

        const totalDays = logs.length;
        // Fix: Convert status to lowercase to match case-insensitive
        const presentDays = logs.filter(l => (l.status || '').toLowerCase() === 'present').length;
        const percentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

        res.json({
            percentage,
            present: presentDays,
            total: totalDays,
            history: logs.map(l => ({
                date: l.date,
                status: (l.status || '').toLowerCase(), // Always return normalized lowercase status
                remarks: l.remarks || ''
            }))
        });
    } catch (err) {
        console.error("Fetch Student Attendance Error:", err);
        res.status(500).json({ message: "Server error loading attendance." });
    }
});

// 👥 2. FACULTY & ADMIN: ATTENDANCE MARK KARO (HANDLES BOTH ROUTE MATCHING '/')
const markAttendanceHandler = async (req, res) => {
    try {
        let { studentId, rollNo, date, status, remarks } = req.body;

        if ((!studentId && !rollNo) || !date || !status) {
            return res.status(400).json({ message: "Please provide studentId or rollNo, date, and status." });
        }

        let targetStudentId = studentId;

        // If studentId is not provided directly, lookup by rollNo
        if (!targetStudentId && rollNo) {
            const student = await User.findOne({ rollNo, role: 'student' });
            if (!student) {
                return res.status(404).json({ message: "Student with this Roll Number not found." });
            }
            targetStudentId = student._id;
        }

        const targetDate = new Date(date);
        targetDate.setUTCHours(0, 0, 0, 0);

        // Normalize status to lowercase ('present', 'absent', etc.)
        const normalizedStatus = status.toLowerCase();

        await Attendance.findOneAndUpdate(
            { studentId: targetStudentId, date: targetDate },
            { status: normalizedStatus, remarks: remarks || '' },
            { upsert: true, new: true }
        );

        res.status(201).json({ message: "Attendance saved successfully! 🚀" });
    } catch (err) {
        console.error("Mark Attendance Error:", err);
        res.status(500).json({ message: "Server error saving attendance." });
    }
};

// Bind both routes ('/' and '/mark') so frontend calls never fail
router.post('/', auth, isFaculty, markAttendanceHandler);
router.post('/mark', auth, isFaculty, markAttendanceHandler);

// 👥 3. FACULTY & ADMIN: ATTENDANCE SUMMARY
router.get('/summary', auth, isFaculty, async (req, res) => {
    try {
        const totalStudents = await User.countDocuments({ role: 'student' });

        const allLogs = await Attendance.find({}).populate('studentId', 'name rollNo course');

        const todayStr = new Date().toLocaleDateString('en-CA');
        const todayLogs = allLogs.filter(l => l.date && new Date(l.date).toLocaleDateString('en-CA') === todayStr);

        const presentToday = todayLogs.filter(l => (l.status || '').toLowerCase() === 'present').length;
        const absentToday = todayLogs.filter(l => (l.status || '').toLowerCase() === 'absent').length;

        const allLogsCount = allLogs.length;
        const allPresentCount = allLogs.filter(l => (l.status || '').toLowerCase() === 'present').length;
        const avgPercent = allLogsCount > 0 ? Math.round((allPresentCount / allLogsCount) * 100) : 0;

        const formattedHistory = allLogs.map(l => ({
            studentName: l.studentId ? l.studentId.name : '—',
            rollNo: l.studentId ? l.studentId.rollNo : '—',
            course: l.studentId ? l.studentId.course : '—',
            date: l.date,
            status: (l.status || '').toLowerCase(),
            remarks: l.remarks || ''
        }));

        res.json({ totalStudents, presentToday, absentToday, avgPercent, history: formattedHistory });
    } catch (err) {
        console.error("Attendance Summary Error:", err);
        res.status(500).json({ message: "Server error." });
    }
});

module.exports = router;
/*
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const { auth, isFaculty } = require('../middleware/auth'); // Updated to use the new middleware framework

// 🎓 STUDENT: APNI ATTENDANCE DEKHO
router.get('/me', auth, async (req, res) => {
    try {
        const studentId = req.user.id; 

        const logs = await Attendance.find({
            studentId: new mongoose.Types.ObjectId(studentId)
        }).sort({ date: 1 });

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
        res.status(500).json({ message: "Server error loading attendance." });
    }
});

// 👥 FACULTY & ADMIN: ATTENDANCE MARK KARO
router.post('/mark', auth, isFaculty, async (req, res) => {
    try {
        const { rollNo, date, status, remarks } = req.body;

        if (!rollNo || !date || !status) {
            return res.status(400).json({ message: "Please fill all required fields." });
        }

        const student = await User.findOne({ rollNo, role: 'student' });
        if (!student) {
            return res.status(404).json({ message: "Student with this Roll Number not found." });
        }

        const targetDate = new Date(date);
        targetDate.setUTCHours(0, 0, 0, 0);

        await Attendance.findOneAndUpdate(
            { studentId: student._id, date: targetDate },
            { status, remarks: remarks || '' },
            { upsert: true, new: true }
        );

        res.status(201).json({ message: "Attendance saved successfully! 🚀" });
    } catch (err) {
        console.error("Mark Attendance Error:", err);
        res.status(500).json({ message: "Server error saving attendance." });
    }
});

// 👥 FACULTY & ADMIN: ATTENDANCE SUMMARY
router.get('/summary', auth, isFaculty, async (req, res) => {
    try {
        const totalStudents = await User.countDocuments({ role: 'student' });

        const allLogs = await Attendance.find({}).populate('studentId', 'name rollNo course');

        const todayStr = new Date().toLocaleDateString('en-CA');
        const todayLogs = allLogs.filter(l => l.date && new Date(l.date).toLocaleDateString('en-CA') === todayStr);

        const presentToday = todayLogs.filter(l => l.status === 'present').length;
        const absentToday = todayLogs.filter(l => l.status === 'absent').length;

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

        res.json({ totalStudents, presentToday, absentToday, avgPercent, history: formattedHistory });
    } catch (err) {
        console.error("Attendance Summary Error:", err);
        res.status(500).json({ message: "Server error." });
    }
});

module.exports = router;
*/
