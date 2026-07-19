const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { auth, isAdmin } = require('../middleware/auth');

// 🛠️ SUPER ADMIN ONLY: GET ALL REGISTERED FACULTY MEMBERS
router.get('/', auth, isAdmin, async (req, res) => {
    try {
        const facultyMembers = await User.find({ role: 'faculty' }).sort({ createdAt: -1 }).select('-password');
        return res.status(200).json(facultyMembers);
    } catch (err) {
        console.error("Fetch Faculty Error:", err);
        return res.status(500).json({ error: true, message: "Internal server error." });
    }
});

// 🛠️ SUPER ADMIN ONLY: TOTAL FACULTY COUNT FOR DASHBOARD
router.get('/count', auth, isAdmin, async (req, res) => {
    try {
        const totalFaculty = await User.countDocuments({ role: 'faculty' });
        return res.status(200).json({ total: totalFaculty });
    } catch (err) {
        return res.status(500).json({ error: true, message: "Internal server error." });
    }
});

// 🛠️ SUPER ADMIN ONLY: DELETE A FACULTY MEMBER
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
