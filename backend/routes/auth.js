const express = require('express');
const router = express.Router();
const User = require('../models/User'); // Jo model banaya tha use import kiya

// 📝 1. SECURE REGISTER ROUTE (Naya Account Banane Ke Liye)
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, role, rollNo, course, branch, year, adminSecretKey } = req.body;

        // 1. Pehle check karein ki email pehle se register toh nahi hai
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: "User already exists with this email." });
        }

        // ⭐ 2. SECURITY GUARD: Agar koi 'admin' banne ki koshish kare
        if (role === 'admin') {
            // =========================================================================
            // 🚨 🚨 DETECTED: ADMIN SECRET KEY DEFINITION 🚨 🚨
            const ACTUAL_SECRET_KEY = "SUPER_SECRET_ADMIN_KEY_123"; // <-- YEH HAI AAPKI KEY!
            // =========================================================================

            // =========================================================================
            // 🚨 🚨 DETECTED: SECRET KEY VERIFICATION & CHECK 🚨 🚨
            if (!adminSecretKey || adminSecretKey !== ACTUAL_SECRET_KEY) {
                return res.status(403).json({
                    message: "Unauthorized! Incorrect or missing Admin Secret Key. You cannot register as an admin."
                });
            }
            // =========================================================================
        }

        // 3. Naya user create karein
        user = new User({
            name,
            email,
            password, // Plain-text matching sequence as requested in layout template
            role,
            rollNo: role === 'student' ? rollNo : undefined,
            course: role === 'student' ? course : undefined,
            branch: role === 'student' ? branch : undefined,
            year: role === 'student' ? year : undefined
        });

        await user.save();

        if (role === 'student') {
            const Fee = require('../models/fee');
            const defaultFee = new Fee({
                studentId: user._id,
                totalAmount: 60000, // Fixed college saal ki fees
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

// 🔑 2. ASLI LOGIN ROUTE (Database Se Check Karne Ke Liye)
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

        if (password !== user.password) {
            return res.status(400).json({ message: "Invalid credentials. Wrong password." });
        }

        const token = "real-database-session-token-" + user._id;

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

// ── 🛠️ NEW ADDITIONS FOR SETTINGS PANEL SYNC (LIFETIME SECURE) ──

// ⚙️ 3. UPDATE PROFILE ROUTE (Admin & User Metadata Updates)
router.put('/update-profile', async (req, res) => {
    try {
        const userId = req.headers['user-id'];
        const { name, email } = req.body;

        if (!userId) {
            return res.status(400).json({ error: true, message: "Session token verification missing." });
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { name, email },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ error: true, message: "Target account records missing." });
        }

        return res.status(200).json({ error: false, message: "Profile log successfully synchronized!" });
    } catch (err) {
        console.error("Update Profile Route Failure:", err);
        return res.status(500).json({ error: true, message: "Internal update registry transaction failed." });
    }
});

// ⚙️ 4. CHANGE PASSWORD ROUTE (Security Rotation Guard)
router.put('/change-password', async (req, res) => {
    try {
        const userId = req.headers['user-id'];
        const { currentPassword, newPassword } = req.body;

        if (!userId) {
            return res.status(400).json({ error: true, message: "Session identity parameters missing." });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: true, message: "Target account not tracked." });
        }

        // Verifies against existing plain-text password mapping chain
        if (currentPassword !== user.password) {
            return res.status(400).json({ error: true, message: "Current password validation incorrect." });
        }

        user.password = newPassword;
        await user.save();

        return res.status(200).json({ error: false, message: "Password updated successfully inside database! 🔒" });
    } catch (err) {
        console.error("Change Password Route Failure:", err);
        return res.status(500).json({ error: true, message: "Internal system security rotation crashed." });
    }
});

module.exports = router;

