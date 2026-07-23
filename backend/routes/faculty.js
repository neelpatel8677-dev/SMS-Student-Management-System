const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { auth, isFaculty, isAdmin } = require('../middleware/auth');

// 👨‍🏫 1. FACULTY: APNA SELF PROFILE DEKHO
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
            department: faculty.department || 'General Faculty',
            role: faculty.role
        });
    } catch (err) {
        console.error("Faculty Me Fetching Error:", err);
        return res.status(500).json({ error: true, message: "Server error loading profile metrics." });
    }
});

// 👨‍🏫 2. FACULTY: APNI PROFILE EDIT / UPDATE KARO (FIXED MISSING ENDPOINT)
router.put('/me', auth, isFaculty, async (req, res) => {
    try {
        const { name, department } = req.body;
        
        const updatedFaculty = await User.findByIdAndUpdate(
            req.user.id,
            {
                $set: {
                    ...(name && { name }),
                    ...(department && { department })
                }
            },
            { new: true, runValidators: true }
        ).select('-password');

        if (!updatedFaculty) {
            return res.status(404).json({ error: true, message: "Faculty profile not found." });
        }

        return res.status(200).json({
            error: false,
            message: "Profile updated successfully! 🎉",
            faculty: updatedFaculty
        });
    } catch (err) {
        console.error("Faculty Profile Update Error:", err);
        return res.status(500).json({ error: true, message: "Server error updating profile details." });
    }
});

// 👥 3. FACULTY & ADMIN: GET ALL REGISTERED FACULTY MEMBERS
router.get('/', auth, isFaculty, async (req, res) => {
    try {
        const facultyMembers = await User.find({ role: 'faculty' })
            .sort({ createdAt: -1 })
            .select('-password');
            
        return res.status(200).json(facultyMembers);
    } catch (err) {
        console.error("Fetch Faculty Error:", err);
        return res.status(500).json({ error: true, message: "Internal server error." });
    }
});

// 👥 4. FACULTY & ADMIN: TOTAL FACULTY COUNT FOR DASHBOARD
router.get('/count', auth, isFaculty, async (req, res) => {
    try {
        const totalFaculty = await User.countDocuments({ role: 'faculty' });
        
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const newThisMonth = await User.countDocuments({
            role: 'faculty',
            createdAt: { $gte: startOfMonth }
        });

        return res.status(200).json({ total: totalFaculty, newThisMonth });
    } catch (err) {
        return res.status(500).json({ error: true, message: "Internal server error." });
    }
});

// 🚫 5. SUPER ADMIN ONLY: NAYA FACULTY DIRECT ADD KARO
router.post('/', auth, isAdmin, async (req, res) => {
    try {
        const { name, email, password, department } = req.body;

        if (!name || !email || !password || !department) {
            return res.status(400).json({ error: true, message: "Please fill all required fields." });
        }

        const emailLower = email.toLowerCase().trim();
        const existing = await User.findOne({ email: emailLower });
        if (existing) {
            return res.status(400).json({ error: true, message: "User with this email already exists." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newFaculty = new User({
            name,
            email: emailLower,
            password: hashedPassword,
            role: 'faculty',
            department
        });

        await newFaculty.save();
        return res.status(201).json({ error: false, message: "Faculty member added successfully! 🚀" });
    } catch (err) {
        console.error("Add Faculty Error:", err);
        return res.status(500).json({ error: true, message: "Server error creating faculty." });
    }
});

// 🚫 6. SUPER ADMIN ONLY: FACULTY RECORD BY ID UPDATE KARO
router.put('/:id', auth, isAdmin, async (req, res) => {
    try {
        const { name, email, department } = req.body;
        
        const updated = await User.findByIdAndUpdate(
            req.params.id,
            {
                $set: {
                    ...(name && { name }),
                    ...(email && { email: email.toLowerCase().trim() }),
                    ...(department && { department })
                }
            },
            { new: true }
        ).select('-password');

        if (!updated) {
            return res.status(404).json({ error: true, message: "Faculty record not found." });
        }

        return res.status(200).json({ error: false, message: "Faculty details updated!", faculty: updated });
    } catch (err) {
        return res.status(500).json({ error: true, message: "Server error updating faculty." });
    }
});

// 🚫 7. SUPER ADMIN ONLY: DELETE A FACULTY MEMBER
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
/*
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
*/
