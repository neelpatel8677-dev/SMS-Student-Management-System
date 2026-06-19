const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Result = require('../models/Result');
const User = require('../models/User');

// 📊 1. ADMIN ROUTE: GET ALL STUDENTS ACADEMIC RECORDS WITH POPULATED METADATA
router.get('/', async (req, res) => {
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
        console.error("Fetch Results Crash Log:", err);
        return res.status(500).json({ error: true, message: "Internal server registry error." });
    }
});

// 📊 2. STUDENT ROUTE: GET OWN EVALUATION SHEETS FOR CALC CARD DISPLAY
router.get('/me', async (req, res) => {
    try {
        const studentId = req.headers['user-id'];
        if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
            return res.status(400).json({ message: "Invalid or missing User ID" });
        }

        const results = await Result.find({ studentId: new mongoose.Types.ObjectId(studentId) }).sort({ createdAt: 1 });

        if (!results || results.length === 0) {
            return res.json({
                latestExam: "No exams recorded yet",
                latestScore: 0,
                examsList: []
            });
        }

        const latestRecord = results[results.length - 1];
        
        let latestTotalObtained = latestRecord.marksObtained;
        let latestTotalMax = latestRecord.totalMarks;
        const latestPercentage = latestTotalMax > 0 ? Math.round((latestTotalObtained / latestTotalMax) * 100) : 0;

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
        res.status(500).json({ message: "Server Error during performance evaluation check." });
    }
});

// 📊 3. ADMIN ROUTE: ASSIGN A NEW RESULT TRANSCRIPT SLIP (POST)
router.post('/', async (req, res) => {
    try {
        const { studentId, exam, date, passMarks, remarks, subjects, marksObtained, totalMarks, percentage, grade, result } = req.body;

        if (!studentId || !exam || !subjects || subjects.length === 0) {
            return res.status(400).json({ error: true, message: "Missing required compilation criteria." });
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
        return res.status(201).json({ error: false, message: "Academic report card created!" });
    } catch (err) {
        console.error("Create Result Crash:", err);
        return res.status(500).json({ error: true, message: "Internal server payload tracking error." });
    }
});

// 📊 4. ADMIN ROUTE: UPDATE AN EXISTING EXAM RECORD TRANSCRIPT (PUT)
router.put('/:id', async (req, res) => {
    try {
        const { exam, date, passMarks, remarks, subjects, marksObtained, totalMarks, percentage, grade, result } = req.body;

        const updated = await Result.findByIdAndUpdate(
            req.params.id,
            {
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
            },
            { new: true }
        );

        if (!updated) return res.status(404).json({ error: true, message: "Target document mismatch data scope." });
        return res.status(200).json({ error: false, message: "Report card modified successfully!" });
    } catch (err) {
        return res.status(500).json({ error: true, message: "Database updating metrics crash." });
    }
});

// 📊 5. ADMIN ROUTE: DELETE A PERMANENT TRANSCRIPT SHEET (DELETE)
router.delete('/:id', async (req, res) => {
    try {
        const target = await Result.findByIdAndDelete(req.params.id);
        if (!target) return res.status(404).json({ error: true, message: "Document not found." });
        return res.status(200).json({ error: false, message: "Record cleared permanently." });
    } catch (err) {
        return res.status(500).json({ error: true, message: "Database drop parameter crashed." });
    }
});

module.exports = router;