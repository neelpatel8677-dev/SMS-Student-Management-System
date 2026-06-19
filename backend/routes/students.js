const express = require('express');
const router = express.Router();
const User = require('../models/User');

// 📋 ADMIN ACTION: GET ALL REGISTERED STUDENTS WITH RECENT FILTERS
router.get('/', async (req, res) => {
    try {
        console.log("Admin listing engine triggered!");
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
        console.error("Critical Backend Students List Fetch Crash:", err);
        return res.status(500).json({ error: true, message: "Internal server registry error." });
    }
});

// 📊 ADMIN ACTION: TOTAL STUDENTS ANALYTICS COUNTER CARD
router.get('/count', async (req, res) => {
    try {
        const totalStudents = await User.countDocuments({ role: 'student' });
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const newThisMonth = await User.countDocuments({
            role: 'student',
            createdAt: { $gte: startOfMonth }
        });

        return res.status(200).json({ total: totalStudents, newThisMonth: newThisMonth });
    } catch (err) {
        return res.status(500).json({ error: true, message: "Internal metrics crash." });
    }
});

// 📥 STUDENT ACTION: GET CURRENT LOGGED IN STUDENT DATA FOR PROFILE PANEL
router.get('/me', async (req, res) => {
    try {
        const studentId = req.headers['user-id'];
        if (!studentId) return res.status(400).json({ message: "User session identification header is missing." });

        const student = await User.findById(studentId);
        if (!student) return res.status(404).json({ message: "Student account records not found." });

        return res.status(200).json(student);
    } catch (err) {
        return res.status(500).json({ message: "Internal server error reading profile data." });
    }
});

// 💾 STUDENT ACTION: UPDATE SYSTEM PROFILE METADATA VIA INPUT FORMS
router.put('/me', async (req, res) => {
    try {
        const studentId = req.headers['user-id'];
        const { name, rollNo, course, branch, year } = req.body;

        const updatedStudent = await User.findByIdAndUpdate(
            studentId,
            { name, rollNo, course, branch, year },
            { new: true }
        );
        return res.status(200).json(updatedStudent);
    } catch (err) {
        return res.status(500).json({ message: "Internal server error modifying entry properties." });
    }
});

// ── 🛠️ NEW: ADMIN DELETION ENGINE (Jad se student hatane ke liye) ──
router.delete('/:id', async (req, res) => {
    try {
        const studentId = req.params.id;
        console.log(`Attempting to delete student with ID: ${studentId}`);
        
        const deletedUser = await User.findByIdAndDelete(studentId);
        if (!deletedUser) {
            return res.status(404).json({ error: true, message: "Student record not found in MongoDB." });
        }
        
        return res.status(200).json({ error: false, message: "Student record permanently deleted! 🚀" });
    } catch (err) {
        console.error("Delete Endpoint Failure Log:", err);
        return res.status(500).json({ error: true, message: "Database deletion query crashed." });
    }
});

// ── 🛠️ NEW: ADMIN EDIT/UPDATE HANDLER (Direct grid modifications ke liye) ──
router.put('/:id', async (req, res) => {
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
        
        return res.status(200).json({ error: false, message: "Updated safely!", student: updatedUser });
    } catch (err) {
        return res.status(500).json({ error: true, message: "Database edit query crashed." });
    }
});

module.exports = router;