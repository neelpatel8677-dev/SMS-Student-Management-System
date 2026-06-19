// 1. MODULE IMPORTS (Saare imports sabse upar)
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path'); // 🟢 Niche se upar shift kiya
require('dotenv').config();

// 2. APP INITIALIZATION
const app = express();
const PORT = process.env.PORT || 5000;

// 3. MIDDLEWARES
app.use(cors({ origin: "*" }));
app.use(express.json());

// 4. API ROUTES (Pehle API hits check hone chahiye)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/students', require('./routes/students'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/fees', require('./routes/fees'));
app.use('/api/results', require('./routes/results'));

// 5. STATIC FILES & FRONTEND PAGES
// Pehle Home page ka redirect chalega
app.get("/", (req, res) => {
    res.redirect("/login.html");
});

// Phir baki static files serve hongi
app.use(express.static("frontend"));

// Health check
app.get("/health", (req, res) => {
    res.json({ status: "OK", db: "connected" });
});

// 6. CATCH-ALL ROUTE FOR HTML PAGES
app.get('/:page', (req, res, next) => {
    const page = req.params.page;
    if (page.endsWith('.html')) {
        res.sendFile(path.join(__dirname, 'frontend', page));
    } else {
        next();
    }
});

// 7. DATABASE CONNECTION & SERVER START
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('✅ MongoDB Connected');
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });
    })
    .catch(err => console.error('❌ DB Error:', err));