const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Result = require('../models/Result');
const User = require('../models/User');
const { auth, isFaculty, isAdmin } = require('../middleware/auth');

// Helper function to compute grade from percentage
function calculateGrade(pct) {
    if (pct >= 85) return 'A+';
    if (pct >= 75) return 'A';
    if (pct >= 65) return 'B';
    if (pct >= 50) return 'C';
    if (pct >= 35) return 'D';
    return 'F';
}

// 👥 1. FACULTY & ADMIN: ALL RESULTS DEKHO
router.get('/', auth, isFaculty, async (req, res) => {
    try {
        const records = await Result.find({}).populate('studentId', 'name rollNo course branch year');

        const formatted = records
            .filter(r => r.studentId) // Deleted students hide
            .map(r => ({
                _id: r._id,
                studentId: r.studentId ? r.studentId._id : null,
                studentName: r.studentId ? r.studentId.name : '—',
                rollNo: r.studentId ? r.studentId.rollNo : '—',
                course: r.studentId ? r.studentId.course : '—',
                year: r.studentId ? r.studentId.year : '—',
                exam: r.examName || 'Examination',
                date: r.date || r.createdAt,
                passMarks: r.passMarks || 35,
                marksObtained: r.marksObtained || 0,
                totalMarks: r.totalMarks || 100,
                percentage: r.percentage || 0,
                grade: r.grade || 'C',
                result: r.result || 'Pass',
                remarks: r.remarks || '',
                subjects: (r.subjects && r.subjects.length > 0) ? r.subjects.map(s => ({
                    name: s.name,
                    obtained: s.obtained,
                    total: s.total
                })) : [{
                    name: r.examName || 'General',
                    obtained: r.marksObtained || 0,
                    total: r.totalMarks || 100
                }]
            }));

        return res.status(200).json(formatted);
    } catch (err) {
        console.error("Fetch Results Error:", err);
        return res.status(500).json({ error: true, message: "Server error." });
    }
});

// 🎓 2. STUDENT: APNE RESULTS DEKHO (SYNCED)
router.get('/me', auth, async (req, res) => {
    try {
        const studentId = req.user.id || req.user._id;

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
        const latestPercentage = latestRecord.percentage || (latestRecord.totalMarks > 0
            ? Math.round((latestRecord.marksObtained / latestRecord.totalMarks) * 100)
            : 0);

        const formattedExamsList = results.map(exam => ({
            examName: exam.examName || 'Examination',
            percentage: exam.percentage || Math.round(((exam.marksObtained || 0) / (exam.totalMarks || 100)) * 100),
            subjects: (exam.subjects && exam.subjects.length > 0) ? exam.subjects.map(s => ({
                name: s.name,
                obtained: s.obtained,
                total: s.total
            })) : [{
                name: exam.examName || 'General Subject',
                obtained: exam.marksObtained || 0,
                total: exam.totalMarks || 100
            }]
        }));

        res.json({
            latestExam: latestRecord.examName || "Latest Exam",
            latestScore: latestPercentage,
            examsList: formattedExamsList
        });
    } catch (err) {
        console.error("Results Fetch Error:", err);
        res.status(500).json({ message: "Server error." });
    }
});

// 👥 3. FACULTY & ADMIN: NEW RESULT BANAO (SUPPORT BOTH PATHS & FLEXIBLE PAYLOADS)
const createResultHandler = async (req, res) => {
    try {
        let { studentId, exam, subject, date, passMarks, remarks, subjects, marksObtained, totalMarks, maxMarks, percentage, grade, result } = req.body;

        if (!studentId) {
            return res.status(400).json({ error: true, message: "studentId is required." });
        }

        const targetExamName = exam || subject || "Sem1";
        const targetObtained = parseInt(marksObtained) || 0;
        const targetTotal = parseInt(totalMarks || maxMarks) || 100;
        const targetPass = parseInt(passMarks) || 35;
        const computedPct = percentage || Math.round((targetObtained / targetTotal) * 100);
        const computedGrade = grade || calculateGrade(computedPct);
        const computedResult = result || (computedPct >= 35 ? 'Pass' : 'Fail');

        // Build array structure if single subject was provided
        const finalSubjects = (subjects && Array.isArray(subjects) && subjects.length > 0)
            ? subjects
            : [{ name: targetExamName, obtained: targetObtained, total: targetTotal }];

        const newResult = new Result({
            studentId,
            examName: targetExamName,
            date: date || new Date(),
            passMarks: targetPass,
            remarks: remarks || '',
            subjects: finalSubjects,
            marksObtained: targetObtained,
            totalMarks: targetTotal,
            percentage: computedPct,
            grade: computedGrade,
            result: computedResult
        });

        await newResult.save();
        return res.status(201).json({ error: false, message: "Result created successfully! 🚀", data: newResult });
    } catch (err) {
        console.error("Create Result Error:", err);
        return res.status(500).json({ error: true, message: "Server error creating result." });
    }
};

router.post('/', auth, isFaculty, createResultHandler);
router.post('/upload', auth, isFaculty, createResultHandler);

// 👥 4. FACULTY & ADMIN: RESULT UPDATE KARO
router.put('/:id', auth, isFaculty, async (req, res) => {
    try {
        const { exam, subject, date, passMarks, remarks, subjects, marksObtained, totalMarks, maxMarks, percentage, grade, result } = req.body;

        const targetObtained = parseInt(marksObtained);
        const targetTotal = parseInt(totalMarks || maxMarks);
        const computedPct = percentage || (targetTotal > 0 ? Math.round((targetObtained / targetTotal) * 100) : undefined);

        const updateData = {};
        if (exam || subject) updateData.examName = exam || subject;
        if (date) updateData.date = date;
        if (passMarks) updateData.passMarks = passMarks;
        if (remarks !== undefined) updateData.remarks = remarks;
        if (subjects) updateData.subjects = subjects;
        if (!isNaN(targetObtained)) updateData.marksObtained = targetObtained;
        if (!isNaN(targetTotal)) updateData.totalMarks = targetTotal;
        if (computedPct !== undefined) updateData.percentage = computedPct;
        if (grade || computedPct) updateData.grade = grade || calculateGrade(computedPct);
        if (result || computedPct) updateData.result = result || (computedPct >= 35 ? 'Pass' : 'Fail');

        const updated = await Result.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );

        if (!updated) return res.status(404).json({ error: true, message: "Result not found." });
        return res.status(200).json({ error: false, message: "Result updated successfully!" });
    } catch (err) {
        return res.status(500).json({ error: true, message: "Server error." });
    }
});

// 🚫 5. SUPER ADMIN ONLY: RESULT DELETE KARO
router.delete('/:id', auth, isAdmin, async (req, res) => {
    try {
        const target = await Result.findByIdAndDelete(req.params.id);
        if (!target) return res.status(404).json({ error: true, message: "Result not found." });
        return res.status(200).json({ error: false, message: "Result deleted successfully." });
    } catch (err) {
        return res.status(500).json({ error: true, message: "Server error." });
    }
});

module.exports = router;
/*
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Result = require('../models/Result');
const User = require('../models/User');
const { auth, isFaculty, isAdmin } = require('../middleware/auth'); // Updated to use the new middleware framework

// 👥 FACULTY & ADMIN: ALL RESULTS DEKHO
router.get('/', auth, isFaculty, async (req, res) => {
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

// 🎓 STUDENT: APNE RESULTS DEKHO
router.get('/me', auth, async (req, res) => {
    try {
        const studentId = req.user.id; 

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

// 👥 FACULTY & ADMIN: NEW RESULT BANAO
router.post('/', auth, isFaculty, async (req, res) => {
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

// 👥 FACULTY & ADMIN: RESULT UPDATE KARO
router.put('/:id', auth, isFaculty, async (req, res) => {
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

// 🚫 SUPER ADMIN ONLY: RESULT DELETE KARO
router.delete('/:id', auth, isAdmin, async (req, res) => {
    try {
        const target = await Result.findByIdAndDelete(req.params.id);
        if (!target) return res.status(404).json({ error: true, message: "Result not found." });
        return res.status(200).json({ error: false, message: "Result deleted successfully." });
    } catch (err) {
        return res.status(500).json({ error: true, message: "Server error." });
    }
});

module.exports = router;
*/
