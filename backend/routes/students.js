const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Fee = require('../models/fee'); 
const { auth, isFaculty, isAdmin } = require('../middleware/auth'); 

// 👥 FACULTY & ADMIN: GET ALL STUDENTS WITH DEEP VISIBILITY
router.get('/', auth, isFaculty, async (req, res) => {
    try {
        // Force fully explicit query including email field context execution mapping
        const recentStudents = await User.find({ role: 'student' }).sort({ createdAt: -1 });

        const formattedStudents = await Promise.all(recentStudents.map(async (s) => {
            const feeRecord = await Fee.findOne({ studentId: s._id });
            const dynamicFeeStatus = feeRecord ? feeRecord.status : 'pending';

            return {
                _id: s._id,
                name: s.name || '—',
                email: s.email || '—', // Directly maps structural email schema key
                rollNo: s.rollNo || '—',
                course: s.course || '—',
                branch: s.branch || '—',
                year: s.year || '—',
                feeStatus: dynamicFeeStatus
            };
        }));

        return res.status(200).json(formattedStudents);
    } catch (err) {
        console.error("Students List Error:", err);
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
