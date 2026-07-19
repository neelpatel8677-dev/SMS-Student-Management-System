const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth'); // Updated to use the new middleware name

const JWT_SECRET = process.env.JWT_SECRET;

// 📝 1. REGISTER ROUTE
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, role, rollNo, course, branch, year, department } = req.body;

        // Validation
        if (!name || !email || !password || !role) {
            return res.status(400).json({ message: "Please fill all required fields." });
        }

        // STRICT SECURITY: Explicitly block anyone attempting to pass 'admin' or use the fixed admin email
        if (role === 'admin' || email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase()) {
            return res.status(403).json({ message: "Unauthorized! Admin registration is prohibited." });
        }

        // Email already exists check in database
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: "User already exists with this email." });
        }

        // SECURITY: Password bcrypt se hash karo
        const hashedPassword = await bcrypt.hash(password, 10);

        // Naya user banao (Only student or faculty allowed)
        user = new User({
            name,
            email,
            password: hashedPassword,
            role,
            rollNo: role === 'student' ? rollNo : undefined,
            course: role === 'student' ? course : undefined,
            branch: role === 'student' ? branch : undefined,
            year: role === 'student' ? year : undefined,
            department: role === 'faculty' ? department : undefined
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

        // 1. Check against the fixed environmental Super Admin credentials first
        if (email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase()) {
            if (password === process.env.ADMIN_PASSWORD) {
                const token = jwt.sign(
                    { id: "SUPER_ADMIN_ID", role: "admin" },
                    JWT_SECRET,
                    { expiresIn: '1d' }
                );
                return res.status(200).json({
                    message: "Login success",
                    token: token,
                    user: {
                        id: "SUPER_ADMIN_ID",
                        name: "System Admin",
                        email: process.env.ADMIN_EMAIL,
                        role: "admin"
                    }
                });
            } else {
                return res.status(401).json({ message: "Invalid credentials. Wrong password." });
            }
        }

        // 2. If it's not the Super Admin, look up the database for Faculty or Students
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "User does not exist. Please register first." });
        }

        // SECURITY: bcrypt se password compare karo
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials. Wrong password." });
        }

        // SECURITY: Real JWT token banao
        const token = jwt.sign(
            { id: user._id, role: user.role },
            JWT_SECRET,
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
router.put('/update-profile', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, email } = req.body;

        if (req.user.role === 'admin') {
            return res.status(400).json({ error: true, message: "Fixed system admin profiles cannot be changed here." });
        }

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
router.put('/change-password', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { currentPassword, newPassword } = req.body;

        if (req.user.role === 'admin') {
            return res.status(400).json({ error: true, message: "Fixed system admin credentials can only be updated in system settings." });
        }

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: true, message: "Please provide both passwords." });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: true, message: "User not found." });
        }

        // bcrypt se current password verify karo
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: true, message: "Current password is incorrect." });
        }

        // Naya password bhi hash karo
        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

        return res.status(200).json({ error: false, message: "Password updated successfully! 🔒" });
    } catch (err) {
        console.error("Change Password Error:", err);
        return res.status(500).json({ error: true, message: "Server error changing password." });
    }
});

module.exports = router;
