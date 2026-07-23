const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Fee = require('../models/fee'); 
const Attendance = require('../models/Attendance'); 
const { auth, isFaculty, isAdmin } = require('../middleware/auth'); 

// 🎓 1. STUDENT: APNA SELF PROFILE DEKHO
router.get('/me', auth, async (req, res) => {
    try {
        const student = await User.findById(req.user.id).select('-password'); 
        if (!student) {
            return res.status(404).json({ error: true, message: "Student profile not found." });
        }
        
        const feeRecord = await Fee.findOne({ studentId: student._id });
        const dynamicFeeStatus = feeRecord ? feeRecord.status : 'pending';

        return res.status(200).json({
            _id: student._id,
            name: student.name,
            email: student.email,
            rollNo: student.rollNo || '—',
            course: student.course || '—',
            branch: student.branch || '—',
            year: student.year || '—',
            role: student.role,
            feeStatus: dynamicFeeStatus
        });
    } catch (err) {
        console.error("Student Me Fetching Error:", err);
        return res.status(500).json({ error: true, message: "Server error loading profile metrics." });
    }
});

// 🎓 2. STUDENT: APNI PROFILE EDIT / UPDATE KARO
router.put('/me', auth, async (req, res) => {
    try {
        const { name, rollNo, course, branch, year } = req.body;
        
        const updatedStudent = await User.findByIdAndUpdate(
            req.user.id,
            { 
                $set: { 
                    ...(name && { name }),
                    ...(rollNo && { rollNo }),
                    ...(course && { course }),
                    ...(branch && { branch }),
                    ...(year && { year: parseInt(year) })
                } 
            },
            { new: true, runValidators: true }
        ).select('-password');

        if (!updatedStudent) {
            return res.status(404).json({ error: true, message: "Student profile not found." });
        }

        return res.status(200).json({ 
            error: false, 
            message: "Profile updated successfully!", 
            student: updatedStudent 
        });
    } catch (err) {
        console.error("Profile Update Error:", err);
        return res.status(500).json({ error: true, message: "Server error updating profile details." });
    }
});

// 👥 3. FACULTY & ADMIN: GET ALL STUDENTS WITH TODAY'S ATTENDANCE STATUS
router.get('/', auth, isFaculty, async (req, res) => {
    try {
        const recentStudents = await User.find({ role: 'student' }).sort({ createdAt: -1 });

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const studentIds = recentStudents.map(s => s._id);

        // Safe Queries using explicit Models
        const feeRecords = await Fee.find({ studentId: { $in: studentIds } }).catch(() => []);
        const todayAttendanceRecords = await Attendance.find({
            studentId: { $in: studentIds },
            date: { $gte: todayStart, $lte: todayEnd }
        }).catch(() => []);

        const feeMap = new Map(feeRecords.map(f => [f.studentId ? f.studentId.toString() : '', f.status]));
        const attMap = new Map(todayAttendanceRecords.map(a => [a.studentId ? a.studentId.toString() : '', a.status]));

        const formattedStudents = recentStudents.map(s => {
            const sIdStr = s._id.toString();
            return {
                _id: s._id,
                name: s.name || '—',
                email: s.email || '—', 
                rollNo: s.rollNo || '—',
                course: s.course || '—',
                branch: s.branch || '—',
                year: s.year || '—',
                feeStatus: feeMap.get(sIdStr) || 'pending',
                todayStatus: attMap.get(sIdStr) || 'Not Marked'
            };
        });

        return res.status(200).json(formattedStudents);
    } catch (err) {
        console.error("Students List Master Error:", err);
        return res.status(500).json({ error: true, message: "Internal server error loading students." });
    }
});

// 📊 4. FACULTY & ADMIN: TOTAL STUDENTS COUNT
router.get('/count', auth, isFaculty, async (req, res) => {
    try {
        const totalStudents = await User.countDocuments({ role: 'student' });
        
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const newThisMonth = await User.countDocuments({
            role: 'student',
            createdAt: { $gte: startOfMonth }
        });

        return res.status(200).json({ total: totalStudents, newThisMonth });
    } catch (err) {
        return res.status(500).json({ error: true, message: "Internal error." });
    }
});

// 🚫 5. SUPER ADMIN & FACULTY: DELETE STUDENT
router.delete('/:id', auth, isFaculty, async (req, res) => {
    try {
        const studentId = req.params.id;
        await Fee.deleteOne({ studentId }).catch(() => {});
        await Attendance.deleteMany({ studentId }).catch(() => {});
        const deletedUser = await User.findByIdAndDelete(studentId);
        if (!deletedUser) return res.status(404).json({ error: true, message: "Student not found." });
        return res.status(200).json({ error: false, message: "Student deleted successfully!" });
    } catch (err) {
        return res.status(500).json({ error: true, message: "Server error." });
    }
});

module.exports = router;
/*
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Fee = require('../models/fee'); 
const mongoose = require('mongoose');
const { auth, isFaculty, isAdmin } = require('../middleware/auth'); 

// 🎓 STUDENT: APNA SELF PROFILE DEKHO
router.get('/me', auth, async (req, res) => {
    try {
        const student = await User.findById(req.user.id).select('-password'); 
        if (!student) {
            return res.status(404).json({ error: true, message: "Student profile not found." });
        }
        
        // Live financial fee status verification
        const feeRecord = await Fee.findOne({ studentId: student._id });
        const dynamicFeeStatus = feeRecord ? feeRecord.status : 'pending';

        return res.status(200).json({
            _id: student._id,
            name: student.name,
            email: student.email,
            rollNo: student.rollNo || '—',
            course: student.course || '—',
            branch: student.branch || '—',
            year: student.year || '—',
            role: student.role,
            feeStatus: dynamicFeeStatus
        });
    } catch (err) {
        console.error("Student Me Fetching Error:", err);
        return res.status(500).json({ error: true, message: "Server error loading profile metrics." });
    }
});

// 👥 FACULTY & ADMIN: GET ALL STUDENTS WITH LIVE TODAY'S ATTENDANCE STATUS
router.get('/', auth, isFaculty, async (req, res) => {
    try {
        const recentStudents = await User.find({ role: 'student' }).sort({ createdAt: -1 });

        // Today's dynamic system date tracking boundaries
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        // Accessing dynamic attendance database collections safely via mongoose model connection stream
        const AttendanceModel = mongoose.model('Attendance');

        const formattedStudents = await Promise.all(recentStudents.map(async (s) => {
            // 1. Live financial tracking evaluation
            const feeRecord = await Fee.findOne({ studentId: s._id });
            const dynamicFeeStatus = feeRecord ? feeRecord.status : 'pending';

            // 2. 📅 LIVE TODAY'S ATTENDANCE CHECK WITH FIXED DATABASE SYNC HOOKS
            let todayStatus = 'Not Marked';
            try {
                const todayAttendance = await AttendanceModel.findOne({
                    studentId: s._id,
                    date: { $gte: todayStart, $lte: todayEnd }
                });
                if (todayAttendance && todayAttendance.status) {
                    todayStatus = todayAttendance.status;
                }
            } catch (innerErr) {
                console.error(`Attendance mapping failed for user ${s._id}:`, innerErr);
            }

            return {
                _id: s._id,
                name: s.name || '—',
                email: s.email || '—', 
                rollNo: s.rollNo || '—',
                course: s.course || '—',
                branch: s.branch || '—',
                year: s.year || '—',
                feeStatus: dynamicFeeStatus,
                todayStatus: todayStatus 
            };
        }));

        return res.status(200).json(formattedStudents);
    } catch (err) {
        console.error("Students List Master Error:", err);
        return res.status(500).json({ error: true, message: "Internal server error." });
    }
});

// 📊 FACULTY & ADMIN: TOTAL STUDENTS COUNT
router.get('/count', auth, isFaculty, async (req, res) => {
    try {
        const totalStudents = await User.countDocuments({ role: 'student' });
        return res.status(200).json({ total: totalStudents });
    } catch (err) {
        return res.status(500).json({ error: true, message: "Internal error." });
    }
});

// 🚫 SUPER ADMIN ONLY: DELETE STUDENT
router.delete('/:id', auth, isAdmin, async (req, res) => {
    try {
        const studentId = req.params.id;
        await Fee.deleteOne({ studentId });
        const deletedUser = await User.findByIdAndDelete(studentId);
        if (!deletedUser) return res.status(404).json({ error: true, message: "Student not found." });
        return res.status(200).json({ error: false, message: "Student deleted successfully!" });
    } catch (err) {
        return res.status(500).json({ error: true, message: "Server error." });
    }
});

module.exports = router;
*/
