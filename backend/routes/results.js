const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Result = require('../models/Result');
const User = require('../models/User');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// ✅ ADMIN ONLY: ALL RESULTS DEKHO
router.get('/', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const records = await Result.find({}).populate('studentId', 'name rollNo course branch year');

        const formatted = records.map(r => ({
            _id: r._id,
            studentId: r.studentId ? r.studentId._id : null,
            studentName: r.studentId ? r.studentId.name : '—',
            rollNo: r.studentId ? r.studentId.rollNo : '—',
            course: r.studentId ? r.studentId.course : '—',
            year: r.studentId ? r.studentId.year : '—',
            exam: r.examName,
            date: r.date,
            passMarks: r.passMarks,
            marksObtained: r.marksObtained,
            totalMarks: r.totalMarks,
            percentage: r.percentage,
            grade: r.grade,
            result: r.result,
            remarks: r.remarks || '',
            subjects: r.subjects.map(s => ({
                name: s.name,
                obtained: s.obtained,
                total: s.total
            }))
        }));

        return res.status(200).json(formatted);
    } catch (err) {
        console.error("Fetch Results Error:", err);
        return res.status(500).json({ error: true, message: "Server error." });
    }
});

// ✅ STUDENT: APNE RESULTS DEKHO
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const studentId = req.user.id; // ✅ JWT se lo

        const results = await Result.find({
            studentId: new mongoose.Types.ObjectId(studentId)
        }).sort({ createdAt: 1 });

        if (!results || results.length === 0) {
            return res.json({
                latestExam: "No exams recorded yet",
                latestScore: 0,
                examsList: []
            });
        }

        const latestRecord = results[results.length - 1];
        const latestPercentage = latestRecord.totalMarks > 0
            ? Math.round((latestRecord.marksObtained / latestRecord.totalMarks) * 100)
            : 0;

        const formattedExamsList = results.map(exam => ({
            examName: exam.examName,
            percentage: exam.percentage,
            subjects: exam.subjects.map(s => ({
                name: s.name,
                obtained: s.obtained,
                total: s.total
            }))
        }));

        res.json({
            latestExam: latestRecord.examName,
            latestScore: latestPercentage,
            examsList: formattedExamsList
        });
    } catch (err) {
        console.error("Results Fetch Error:", err);
        res.status(500).json({ message: "Server error." });
    }
});

// ✅ ADMIN ONLY: NEW RESULT BANAO
router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { studentId, exam, date, passMarks, remarks, subjects, marksObtained, totalMarks, percentage, grade, result } = req.body;

        if (!studentId || !exam || !subjects || subjects.length === 0) {
            return res.status(400).json({ error: true, message: "Missing required fields." });
        }

        const newResult = new Result({
            studentId,
            examName: exam,
            date,
            passMarks,
            remarks,
            subjects,
            marksObtained,
            totalMarks,
            percentage,
            grade,
            result
        });

        await newResult.save();
        return res.status(201).json({ error: false, message: "Result created successfully!" });
    } catch (err) {
        console.error("Create Result Error:", err);
        return res.status(500).json({ error: true, message: "Server error." });
    }
});

// ✅ ADMIN ONLY: RESULT UPDATE KARO
router.put('/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { exam, date, passMarks, remarks, subjects, marksObtained, totalMarks, percentage, grade, result } = req.body;

        const updated = await Result.findByIdAndUpdate(
            req.params.id,
            { examName: exam, date, passMarks, remarks, subjects, marksObtained, totalMarks, percentage, grade, result },
            { new: true }
        );

        if (!updated) return res.status(404).json({ error: true, message: "Result not found." });
        return res.status(200).json({ error: false, message: "Result updated successfully!" });
    } catch (err) {
        return res.status(500).json({ error: true, message: "Server error." });
    }
});

// ✅ ADMIN ONLY: RESULT DELETE KARO
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const target = await Result.findByIdAndDelete(req.params.id);
        if (!target) return res.status(404).json({ error: true, message: "Result not found." });
        return res.status(200).json({ error: false, message: "Result deleted successfully." });
    } catch (err) {
        return res.status(500).json({ error: true, message: "Server error." });
    }
});

module.exports = router;
