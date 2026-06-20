const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Fee = require('../models/fee'); // ✅ Added
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// ✅ ADMIN ONLY: GET ALL STUDENTS
router.get('/', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const recentStudents = await User.find({ role: 'student' }).sort({ createdAt: -1 });

        const formattedStudents = recentStudents.map(s => ({
            _id: s._id,
            name: s.name || '—',
            rollNo: s.rollNo || '—',
            course: s.course || '—',
            branch: s.branch || '—',
            year: s.year || '—',
            feeStatus: "pending"
        }));

        return res.status(200).json(formattedStudents);
    } catch (err) {
        console.error("Students List Error:", err);
        return res.status(500).json({ error: true, message: "Internal server error." });
    }
});

// ✅ ADMIN ONLY: TOTAL STUDENTS COUNT
router.get('/count', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const totalStudents = await User.countDocuments({ role: 'student' });
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const newThisMonth = await User.countDocuments({
            role: 'student',
            createdAt: { $gte: startOfMonth }
        });

        return res.status(200).json({ total: totalStudents, newThisMonth });
    } catch (err) {
        return res.status(500).json({ error: true, message: "Internal error." });
    }
});

// ✅ STUDENT: APNA PROFILE DEKHO
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const studentId = req.user.id; // ✅ JWT se lo, header se nahi

        const student = await User.findById(studentId).select('-password'); // ✅ Password hide karo
        if (!student) return res.status(404).json({ message: "Student not found." });

        return res.status(200).json(student);
    } catch (err) {
        return res.status(500).json({ message: "Server error." });
    }
});

// ✅ STUDENT: APNA PROFILE UPDATE KARO
router.put('/me', authMiddleware, async (req, res) => {
    try {
        const studentId = req.user.id; // ✅ JWT se lo
        const { name, rollNo, course, branch, year } = req.body;

        const updatedStudent = await User.findByIdAndUpdate(
            studentId,
            { name, rollNo, course, branch, year },
            { new: true }
        ).select('-password');

        return res.status(200).json(updatedStudent);
    } catch (err) {
        return res.status(500).json({ message: "Server error." });
    }
});

// ✅ ADMIN ONLY: DELETE STUDENT
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const studentId = req.params.id;

        // ✅ Delete student's fee record first
        await Fee.deleteOne({ studentId });

        const deletedUser = await User.findByIdAndDelete(studentId);

        if (!deletedUser) {
            return res.status(404).json({ error: true, message: "Student not found." });
        }

        return res.status(200).json({ error: false, message: "Student deleted successfully! 🚀" });
    } catch (err) {
        console.error("Delete Error:", err);
        return res.status(500).json({ error: true, message: "Server error." });
    }
});

// ✅ ADMIN ONLY: UPDATE STUDENT
router.put('/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const studentId = req.params.id;
        const { name, rollNo, course, branch, year } = req.body;

        const updatedUser = await User.findByIdAndUpdate(
            studentId,
            { name, rollNo, course, branch, year },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ error: true, message: "Student not found." });
        }

        return res.status(200).json({ error: false, message: "Updated successfully!", student: updatedUser });
    } catch (err) {
        return res.status(500).json({ error: true, message: "Server error." });
    }
});

module.exports = router;
