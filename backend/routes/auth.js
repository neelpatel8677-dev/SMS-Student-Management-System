const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');

// 📝 1. REGISTER ROUTE
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, role, rollNo, course, branch, year, adminSecretKey } = req.body;

        // Validation
        if (!name || !email || !password || !role) {
            return res.status(400).json({ message: "Please fill all required fields." });
        }

        // Email already exists check
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: "User already exists with this email." });
        }

        // ✅ SECURITY: Admin secret key .env se check karo (hardcoded nahi)
        if (role === 'admin') {
            if (!adminSecretKey || adminSecretKey !== process.env.ADMIN_SECRET_KEY) {
                return res.status(403).json({
                    message: "Unauthorized! Incorrect or missing Admin Secret Key."
                });
            }
        }

        // ✅ SECURITY: Password bcrypt se hash karo (plain text nahi)
        const hashedPassword = await bcrypt.hash(password, 10);

        // Naya user banao
        user = new User({
            name,
            email,
            password: hashedPassword,
            role,
            rollNo: role === 'student' ? rollNo : undefined,
            course: role === 'student' ? course : undefined,
            branch: role === 'student' ? branch : undefined,
            year: role === 'student' ? year : undefined
        });

        await user.save();

        // Student register hone pe default fee record banao
        if (role === 'student') {
            const Fee = require('../models/fee');
            const defaultFee = new Fee({
                studentId: user._id,
                totalAmount: 60000,
                paidAmount: 0,
                status: 'pending',
                transactions: []
            });
            await defaultFee.save();
        }

        res.status(201).json({ message: "User registered successfully!" });

    } catch (err) {
        console.error("Registration Error:", err);
        res.status(500).json({ message: "Server error during registration." });
    }
});

// 🔑 2. LOGIN ROUTE
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Please enter all fields." });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "User does not exist. Please register first." });
        }

        // ✅ SECURITY: bcrypt se password compare karo
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials. Wrong password." });
        }

        // ✅ SECURITY: Real JWT token banao
        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.status(200).json({
            message: "Login success",
            token: token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).json({ message: "Server error during login." });
    }
});

// ⚙️ 3. UPDATE PROFILE ROUTE — Protected
router.put('/update-profile', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id; // ✅ Header se nahi, JWT se lo
        const { name, email } = req.body;

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { name, email },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ error: true, message: "User not found." });
        }

        return res.status(200).json({ error: false, message: "Profile updated successfully!" });
    } catch (err) {
        console.error("Update Profile Error:", err);
        return res.status(500).json({ error: true, message: "Server error updating profile." });
    }
});

// ⚙️ 4. CHANGE PASSWORD ROUTE — Protected
router.put('/change-password', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id; // ✅ JWT se lo
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: true, message: "Please provide both passwords." });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: true, message: "User not found." });
        }

        // ✅ bcrypt se current password verify karo
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: true, message: "Current password is incorrect." });
        }

        // ✅ Naya password bhi hash karo
        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

        return res.status(200).json({ error: false, message: "Password updated successfully! 🔒" });
    } catch (err) {
        console.error("Change Password Error:", err);
        return res.status(500).json({ error: true, message: "Server error changing password." });
    }
});

module.exports = router;
