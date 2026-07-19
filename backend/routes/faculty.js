const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { auth, isFaculty, isAdmin } = require('../middleware/auth'); 

// 👨‍🏫 FACULTY: APNA SELF PROFILE DEKHO
router.get('/me', auth, async (req, res) => {
    try {
        const faculty = await User.findById(req.user.id).select('-password');
        if (!faculty) {
            return res.status(404).json({ error: true, message: "Faculty profile not found." });
        }
        
        return res.status(200).json({
            _id: faculty._id,
            name: faculty.name,
            email: faculty.email,
            department: faculty.department || '—',
            role: faculty.role
        });
    } catch (err) {
        console.error("Faculty Me Fetching Error:", err);
        return res.status(500).json({ error: true, message: "Server error loading profile metrics." });
    }
});

// 👥 FACULTY & ADMIN: GET ALL REGISTERED FACULTY MEMBERS
router.get('/', auth, isFaculty, async (req, res) => {
    try {
        const facultyMembers = await User.find({ role: 'faculty' }).sort({ createdAt: -1 }).select('-password');
        return res.status(200).json(facultyMembers);
    } catch (err) {
        console.error("Fetch Faculty Error:", err);
        return res.status(500).json({ error: true, message: "Internal server error." });
    }
});

// 👥 FACULTY & ADMIN: TOTAL FACULTY COUNT FOR DASHBOARD
router.get('/count', auth, isFaculty, async (req, res) => {
    try {
        const totalFaculty = await User.countDocuments({ role: 'faculty' });
        return res.status(200).json({ total: totalFaculty });
    } catch (err) {
        return res.status(500).json({ error: true, message: "Internal server error." });
    }
});

// 🚫 SUPER ADMIN ONLY: DELETE A FACULTY MEMBER
router.delete('/:id', auth, isAdmin, async (req, res) => {
    try {
        const facultyId = req.params.id;
        const deletedFaculty = await User.findByIdAndDelete(facultyId);

        if (!deletedFaculty) {
            return res.status(404).json({ error: true, message: "Faculty member not found." });
        }

        return res.status(200).json({ error: false, message: "Faculty member deleted successfully!" });
    } catch (err) {
        console.error("Delete Faculty Error:", err);
        return res.status(500).json({ error: true, message: "Server error." });
    }
});

module.exports = router;
